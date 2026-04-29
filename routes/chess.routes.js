'use strict';

const express = require('express');
const router = express.Router();
const { Chess } = require('chess.js');

const { db, admin } = require('../config/firebase');
const { verifyAuth } = require('../middlewares/auth.middleware');
const { safeNum, cleanStr, nowMs } = require('../utils/helpers');
const { getIstanbulDateKey } = require('../utils/activity');
const { applyRewardGrantInTransaction, createRewardNotificationForGrant } = require('../utils/rewardService');
const { assertNoOtherActiveGame } = require('../utils/gameSession');
const { saveMatchHistory } = require('../utils/matchHistory');
const { recordGameLedger } = require('../utils/gameLedger');
const { getCanonicalSelectedFrame } = require('../utils/accountState');
const { applyProgressionPatchInTransaction } = require('../utils/economyCore');
const { assertGamesAllowed } = require('../utils/userRestrictions');
const { buildTimelineEvent, appendTimelineEntry, bumpStateVersion, applySettlement, isRecordSettled } = require('../utils/gameFlow');
const { recordGameAudit } = require('../utils/gameAudit');
const { sanitizePublicAvatarForOutput } = require('../utils/avatarManifest');
const {
  CHESS_DISCONNECT_GRACE_MS,
  CHESS_RESULT_RETENTION_MS,
  CHESS_INITIAL_CLOCK_MS,
  CHESS_INCREMENT_MS,
  GAME_SETTLEMENT_STATUS,
  GAME_RESULT_CODES
} = require('../config/constants');

const colUsers = () => db.collection('users');
const colChess = () => db.collection('chess_rooms');

function applyChessCloseWindow(room = {}, delayMs = CHESS_RESULT_RETENTION_MS) {
  const cleanupAt = nowMs() + Math.max(CHESS_DISCONNECT_GRACE_MS, safeNum(delayMs, CHESS_RESULT_RETENTION_MS));
  room.cleanupAt = cleanupAt;
  room.resumeAvailableUntil = cleanupAt;
  return room;
}

function scheduleChessRoomRemoval(roomId = '', delayMs = CHESS_RESULT_RETENTION_MS) {
  const safeRoomId = cleanStr(roomId, 160);
  if (!safeRoomId) return;
  setTimeout(() => colChess().doc(safeRoomId).delete().catch(() => null), Math.max(CHESS_DISCONNECT_GRACE_MS, safeNum(delayMs, CHESS_RESULT_RETENTION_MS)));
}

function pickUserSelectedFrame(user = {}) {
  return getCanonicalSelectedFrame(user, { defaultFrame: 0 });
}

function createChessClock(now = nowMs(), status = 'running') {
  const safeNow = safeNum(now, nowMs());
  const isRunning = cleanStr(status || 'running', 24) === 'running';
  return {
    initialMs: CHESS_INITIAL_CLOCK_MS,
    incrementMs: CHESS_INCREMENT_MS,
    status: isRunning ? 'running' : 'waiting',
    activeColor: isRunning ? 'w' : '',
    startedAt: isRunning ? safeNow : 0,
    updatedAt: safeNow,
    w: { remainingMs: CHESS_INITIAL_CLOCK_MS, lastStartedAt: isRunning ? safeNow : 0 },
    b: { remainingMs: CHESS_INITIAL_CLOCK_MS, lastStartedAt: 0 }
  };
}

function ensureMutableChessClock(room = {}, now = nowMs()) {
  if (!room.clock || typeof room.clock !== 'object') room.clock = createChessClock(now, cleanStr(room.status || '', 24) === 'playing' ? 'running' : 'waiting');
  const clock = room.clock;
  clock.initialMs = Math.max(60 * 1000, safeNum(clock.initialMs, CHESS_INITIAL_CLOCK_MS));
  clock.incrementMs = Math.max(0, safeNum(clock.incrementMs, CHESS_INCREMENT_MS));
  if (!clock.w || typeof clock.w !== 'object') clock.w = { remainingMs: clock.initialMs, lastStartedAt: 0 };
  if (!clock.b || typeof clock.b !== 'object') clock.b = { remainingMs: clock.initialMs, lastStartedAt: 0 };
  clock.w.remainingMs = Math.max(0, safeNum(clock.w.remainingMs, clock.initialMs));
  clock.b.remainingMs = Math.max(0, safeNum(clock.b.remainingMs, clock.initialMs));
  if (cleanStr(room.status || '', 24) === 'playing') {
    const activeColor = cleanStr(clock.activeColor || room.turn || 'w', 1) === 'b' ? 'b' : 'w';
    clock.status = 'running';
    clock.activeColor = activeColor;
    if (!safeNum(clock[activeColor].lastStartedAt, 0)) clock[activeColor].lastStartedAt = now;
    if (!safeNum(clock.startedAt, 0)) clock.startedAt = now;
  }
  clock.updatedAt = now;
  return clock;
}

function getChessRemainingMs(room = {}, color = 'w', now = nowMs()) {
  const clock = room.clock || {};
  const safeColor = color === 'b' ? 'b' : 'w';
  const entry = clock[safeColor] || {};
  let remainingMs = Math.max(0, safeNum(entry.remainingMs, CHESS_INITIAL_CLOCK_MS));
  if (cleanStr(room.status || '', 24) === 'playing'
    && cleanStr(clock.status || '', 24) === 'running'
    && cleanStr(clock.activeColor || '', 1) === safeColor) {
    remainingMs -= Math.max(0, now - safeNum(entry.lastStartedAt || clock.updatedAt, now));
  }
  return Math.max(0, Math.floor(remainingMs));
}

function getExpiredChessColor(room = {}, now = nowMs()) {
  if (cleanStr(room.status || '', 24) !== 'playing') return '';
  const clock = ensureMutableChessClock(room, now);
  const activeColor = cleanStr(clock.activeColor || room.turn || 'w', 1) === 'b' ? 'b' : 'w';
  return getChessRemainingMs(room, activeColor, now) <= 0 ? activeColor : '';
}

function applyChessMoveClock(room = {}, movingColor = 'w', nextColor = 'w', now = nowMs(), spentRemainingMs = null) {
  const clock = ensureMutableChessClock(room, now);
  const safeMovingColor = movingColor === 'b' ? 'b' : 'w';
  const safeNextColor = nextColor === 'b' ? 'b' : 'w';
  const remaining = spentRemainingMs === null ? getChessRemainingMs(room, safeMovingColor, now) : Math.max(0, safeNum(spentRemainingMs, 0));
  clock[safeMovingColor].remainingMs = Math.max(0, remaining + safeNum(clock.incrementMs, CHESS_INCREMENT_MS));
  clock[safeMovingColor].lastStartedAt = 0;
  clock.activeColor = safeNextColor;
  clock.status = 'running';
  clock[safeNextColor].lastStartedAt = now;
  clock.updatedAt = now;
  return clock;
}

function stopChessClock(room = {}, now = nowMs()) {
  if (!room.clock || typeof room.clock !== 'object') return room.clock;
  const clock = ensureMutableChessClock(room, now);
  ['w', 'b'].forEach((color) => {
    clock[color].remainingMs = getChessRemainingMs(room, color, now);
    clock[color].lastStartedAt = 0;
  });
  clock.activeColor = '';
  clock.status = 'stopped';
  clock.updatedAt = now;
  return clock;
}

function getChessClockView(room = {}, now = nowMs()) {
  const clock = room.clock || {};
  return {
    initialMs: Math.max(60 * 1000, safeNum(clock.initialMs, CHESS_INITIAL_CLOCK_MS)),
    incrementMs: Math.max(0, safeNum(clock.incrementMs, CHESS_INCREMENT_MS)),
    status: cleanStr(clock.status || (cleanStr(room.status || '', 24) === 'playing' ? 'running' : 'waiting'), 24),
    activeColor: cleanStr(clock.activeColor || (cleanStr(room.status || '', 24) === 'playing' ? room.turn || 'w' : ''), 1),
    serverNow: now,
    w: { remainingMs: getChessRemainingMs(room, 'w', now) },
    b: { remainingMs: getChessRemainingMs(room, 'b', now) }
  };
}

function colorToWinnerOnTimeout(expiredColor = 'w') {
  return expiredColor === 'b' ? 'white' : 'black';
}

function resolveWinnerUid(room = {}) {
  if (cleanStr(room.winner || '', 16) === 'white') return cleanStr(room.host?.uid || '', 160);
  if (cleanStr(room.winner || '', 16) === 'black') return cleanStr(room.guest?.uid || '', 160);
  return '';
}

function resolveLoserUid(room = {}) {
  const winnerUid = resolveWinnerUid(room);
  if (!winnerUid) return '';
  return winnerUid === cleanStr(room.host?.uid || '', 160)
    ? cleanStr(room.guest?.uid || '', 160)
    : cleanStr(room.host?.uid || '', 160);
}



function applyChessProgression(tx, uidA, uidB, outcome) {
  const aRef = colUsers().doc(uidA);
  const bRef = colUsers().doc(uidB);
  return Promise.all([tx.get(aRef), tx.get(bRef)]).then(([aSnap, bSnap]) => {
    if (!aSnap.exists || !bSnap.exists) return { applied: false, reason: 'USER_NOT_FOUND' };

    const a = aSnap.data() || {};
    const b = bSnap.data() || {};
    const aLast = cleanStr(a.chessLastOppUid || '');
    const aStreak = safeNum(a.chessOppStreak, 0);
    const bLast = cleanStr(b.chessLastOppUid || '');
    const bStreak = safeNum(b.chessOppStreak, 0);
    const aNextStreak = (aLast === uidB) ? (aStreak + 1) : 1;
    const bNextStreak = (bLast === uidA) ? (bStreak + 1) : 1;
    const boostBlocked = (aNextStreak > 3) || (bNextStreak > 3);

    const scoring = outcome === 'A_WIN'
      ? { aXp: 180, bXp: 60, aActivity: 16, bActivity: 8 }
      : (outcome === 'B_WIN'
        ? { aXp: 60, bXp: 180, aActivity: 8, bActivity: 16 }
        : { aXp: 110, bXp: 110, aActivity: 10, bActivity: 10 });

    const applyUserState = (ref, current, opponentUid, nextStreak, xpGain, activityGain) => {
      applyProgressionPatchInTransaction(tx, ref, current, {
        xpEarned: boostBlocked ? 0 : xpGain,
        activityEarned: boostBlocked ? 0 : activityGain,
        roundsEarned: 1,
        source: 'CHESS_MATCH',
        updatedAt: nowMs()
      });
      tx.set(ref, {
        chessLastOppUid: opponentUid,
        chessOppStreak: nextStreak
      }, { merge: true });
    };

    applyUserState(aRef, a, uidB, aNextStreak, scoring.aXp, scoring.aActivity);
    applyUserState(bRef, b, uidA, bNextStreak, scoring.bXp, scoring.bActivity);
    return {
      applied: true,
      boostBlocked,
      aXpEarned: boostBlocked ? 0 : scoring.aXp,
      bXpEarned: boostBlocked ? 0 : scoring.bXp,
      aActivityEarned: boostBlocked ? 0 : scoring.aActivity,
      bActivityEarned: boostBlocked ? 0 : scoring.bActivity
    };
  });
}

function serializeChessRoom(roomId = '', room = {}) {
  const cleanupAt = safeNum(room.cleanupAt, 0);
  const resumeAvailableUntil = safeNum(room.resumeAvailableUntil, cleanupAt);
  const status = cleanStr(room.status || '', 24);
  return {
    id: cleanStr(roomId || room.id || '', 160),
    ...room,
    cleanupAt,
    resumeAvailableUntil,
    resultCode: cleanStr(room.resultCode || '', 64),
    resultReason: cleanStr(room.resultReason || '', 48),
    settlementStatus: cleanStr(room.settlementStatus || '', 24),
    settledAt: safeNum(room.settledAt, 0),
    clock: getChessClockView(room),
    canResume: ['waiting', 'playing'].includes(status),
    canReview: ['finished', 'abandoned'].includes(status) && resumeAvailableUntil > Date.now()
  };
}

function finalizeChessRoom(room = {}, { actorUid = '', winner = 'draw', resultCode = '', reason = '', status = 'finished', meta = {} } = {}) {
  const safeActorUid = cleanStr(actorUid || '', 160);
  const now = nowMs();
  room.status = cleanStr(status || 'finished', 24) || 'finished';
  room.winner = winner;
  room.updatedAt = now;
  room.lastActivityAt = now;
  stopChessClock(room, now);
  applyChessCloseWindow(room);
  const winnerUid = winner === 'white' ? cleanStr(room.host?.uid || '', 160) : winner === 'black' ? cleanStr(room.guest?.uid || '', 160) : '';
  const loserUid = winnerUid ? (winnerUid === cleanStr(room.host?.uid || '', 160) ? cleanStr(room.guest?.uid || '', 160) : cleanStr(room.host?.uid || '', 160)) : '';
  applySettlement(room, {
    status: room.status === 'abandoned' ? GAME_SETTLEMENT_STATUS.ABANDONED : GAME_SETTLEMENT_STATUS.SETTLED,
    resultCode,
    reason,
    settledAt: now,
    actorUid: safeActorUid,
    winnerUid,
    loserUid,
    meta
  });
  appendTimelineEntry(room, buildTimelineEvent(
    room.status === 'abandoned' ? 'match_abandoned' : 'match_finished',
    {
      actorUid: safeActorUid,
      roomId: cleanStr(room.id || '', 160),
      gameKey: 'chess',
      reason,
      status: room.status,
      participantUids: [cleanStr(room.host?.uid || '', 160), cleanStr(room.guest?.uid || '', 160)],
      meta: { ...meta, winner: cleanStr(room.winner || '', 16), resultCode: cleanStr(resultCode || '', 64) }
    }
  ));
  bumpStateVersion(room);
  return room;
}

function buildChessHistoryEntry({ roomId = '', room = {}, resultCode = '', winAmount = 0, createdAt = 0 } = {}) {
  const winnerUid = resolveWinnerUid(room);
  const loserUid = resolveLoserUid(room);
  return {
    id: `chess_${roomId}_${safeNum(createdAt || room.settledAt || room.updatedAt, nowMs())}`,
    gameType: 'chess',
    roomId,
    status: cleanStr(room.status || 'finished', 24),
    result: cleanStr(resultCode || '', 64) === GAME_RESULT_CODES.CHESS_DRAW ? 'draw' : cleanStr(resultCode || '', 64).replace(/^chess_/, ''),
    winnerUid,
    loserUid,
    participants: [cleanStr(room.host?.uid || '', 160), cleanStr(room.guest?.uid || '', 160)].filter(Boolean),
    rewards: { mc: safeNum(winAmount, 0) },
    meta: {
      resultCode: cleanStr(resultCode || '', 64),
      reason: cleanStr(room.resultReason || '', 48),
      winner: cleanStr(room.winner || '', 16)
    },
    createdAt: safeNum(createdAt || room.settledAt || room.updatedAt, nowMs())
  };
}

async function persistChessSettlementArtifacts({ roomId = '', room = {}, resultCode = '', winAmount = 0 } = {}) {
  const winnerUid = resolveWinnerUid(room);
  const loserUid = resolveLoserUid(room);
  const reason = cleanStr(room.resultReason || '', 48);
  const participants = [cleanStr(room.host?.uid || '', 160), cleanStr(room.guest?.uid || '', 160)].filter(Boolean);
  const settledAt = safeNum(room.settledAt || room.updatedAt, nowMs());
  const tasks = [
    saveMatchHistory(buildChessHistoryEntry({ roomId, room, resultCode, winAmount, createdAt: settledAt })),
    ...participants.map((participantUid) => recordGameLedger({
      uid: participantUid,
      gameType: 'chess',
      source: 'chess_match_result',
      referenceId: roomId,
      roomId,
      matchId: roomId,
      amount: participantUid === winnerUid ? Math.floor(safeNum(winAmount, 0)) : 0,
      stake: 0,
      payout: participantUid === winnerUid ? safeNum(winAmount, 0) : 0,
      resultCode,
      settlementStatus: cleanStr(room.settlementStatus || GAME_SETTLEMENT_STATUS.SETTLED, 24),
      actorUid: cleanStr(room.settledByUid || '', 160),
      subjectUid: participantUid,
      meta: { winnerUid, loserUid, status: cleanStr(room.status || '', 24), reason },
      idempotencyKey: `chess:${roomId}:ledger:${participantUid}:${cleanStr(resultCode || '', 64)}`
    })),
    recordGameAudit({
      gameType: 'chess',
      entityType: 'match',
      entityId: cleanStr(roomId || '', 160),
      roomId,
      eventType: 'match_settled',
      resultCode,
      reason,
      status: cleanStr(room.settlementStatus || GAME_SETTLEMENT_STATUS.SETTLED, 24),
      actorUid: cleanStr(room.settledByUid || '', 160),
      subjectUid: winnerUid || loserUid,
      amount: safeNum(winAmount, 0),
      payout: safeNum(winAmount, 0),
      meta: { winnerUid, loserUid, status: cleanStr(room.status || '', 24) },
      idempotencyKey: `chess:${roomId}:settlement:${cleanStr(resultCode || '', 64)}`
    })
  ];


  await Promise.allSettled(tasks);

  return { winnerUid, loserUid };
}

async function rewardChessWinner(tx, winnerUid, options = {}) {
  const safeWinnerUid = cleanStr(winnerUid || '', 160);
  if (!safeWinnerUid) return { amount: 0, limitReached: false, grant: null };
  const uRef = colUsers().doc(safeWinnerUid);
  const uSnap = await tx.get(uRef);
  if (!uSnap.exists) return { amount: 0, limitReached: false, grant: null };

  const u = uSnap.data() || {};
  const todayStr = getIstanbulDateKey();

  let currentWins = safeNum(u.chessWinCount, 0);
  const lastWinDate = cleanStr(u.chessWinDate || '', 32);

  if (lastWinDate !== todayStr) currentWins = 0;
  if (currentWins >= 10) return { amount: 0, limitReached: true, dateKey: todayStr, grant: null };

  const reason = cleanStr(options.reason || 'win', 48) || 'win';
  const resultCode = cleanStr(options.resultCode || '', 64);
  const roomId = cleanStr(options.roomId || '', 160);
  const amount = 5000;
  const grant = await applyRewardGrantInTransaction(tx, {
    uid: safeWinnerUid,
    amount,
    source: 'chess_win',
    referenceId: roomId || todayStr,
    idempotencyKey: `chess:${roomId || todayStr}:win:${safeWinnerUid}:${reason || resultCode || 'normal'}`,
    meta: { roomId, reason, resultCode, dateKey: todayStr },
    userRef: uRef
  });

  if (!grant.duplicated) {
    tx.update(uRef, {
      chessWinCount: currentWins + 1,
      chessWinDate: todayStr
    });
  }

  return { amount: grant.duplicated ? 0 : amount, limitReached: false, dateKey: todayStr, duplicated: !!grant.duplicated, grant };
}

router.get('/lobby', verifyAuth, async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const [snapWait, snapPlay] = await Promise.all([
      colChess().where('status', '==', 'waiting').limit(40).get(),
      colChess().where('status', '==', 'playing').limit(40).get()
    ]);

    const rooms = [];
    snapWait.forEach((doc) => {
      const d = doc.data() || {};
      rooms.push({ id: doc.id, hostUid: d.host?.uid || '', host: d.host?.username || 'Oyuncu', guest: null, status: d.status, createdAt: safeNum(d.createdAt, 0) });
    });
    snapPlay.forEach((doc) => {
      const d = doc.data() || {};
      rooms.push({ id: doc.id, hostUid: d.host?.uid || '', host: d.host?.username || 'Oyuncu', guest: d.guest ? d.guest.username : 'Bilinmeyen', status: d.status, createdAt: safeNum(d.createdAt, 0) });
    });

    rooms.sort((a, b) => safeNum(b.createdAt, 0) - safeNum(a.createdAt, 0));
    res.json({ ok: true, rooms: rooms.slice(0, 20) });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({ ok: true, degraded: true, rooms: [], error: 'Satranç lobisi şu an boş veya geçici olarak alınamadı.' });
  }
});

router.get('/resume', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const [hostSnap, guestSnap] = await Promise.all([
      colChess().where('host.uid', '==', uid).limit(10).get().catch(() => ({ docs: [] })),
      colChess().where('guest.uid', '==', uid).limit(10).get().catch(() => ({ docs: [] }))
    ]);
    const rooms = [...(hostSnap.docs || []), ...(guestSnap.docs || [])]
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter((room) => ['waiting', 'playing'].includes(cleanStr(room.status || '', 24)))
      .sort((a, b) => safeNum(b.updatedAt || b.createdAt, 0) - safeNum(a.updatedAt || a.createdAt, 0));
    const room = rooms[0] || null;
    res.json({ ok: true, canResume: !!room, gameType: 'chess', room: room ? serializeChessRoom(room.id, room) : null });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/create', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    await assertNoOtherActiveGame(uid);
    const roomData = await db.runTransaction(async (tx) => {
      const uSnap = await tx.get(colUsers().doc(uid));
      if (!uSnap.exists) throw new Error('Kullanıcı bulunamadı.');
      const u = uSnap.data() || {};

      const activeRooms = await tx.get(colChess().where('host.uid', '==', uid).where('status', '==', 'waiting'));
      if (!activeRooms.empty) throw new Error('Zaten bekleyen bir odanız var.');

      const createdAt = nowMs();
      const newRoomRef = colChess().doc();
      const newRoom = {
        id: newRoomRef.id,
        host: { uid, username: u.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(u.avatar), selectedFrame: pickUserSelectedFrame(u), lastPing: createdAt },
        guest: null,
        status: 'waiting',
        bet: 0,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        winner: null,
        cleanupAt: 0,
        resumeAvailableUntil: 0,
        clock: createChessClock(createdAt, 'waiting'),
        createdAt,
        updatedAt: createdAt,
        lastActivityAt: createdAt,
        stateVersion: 1,
        settlementStatus: GAME_SETTLEMENT_STATUS.ACTIVE,
        resultCode: '',
        resultReason: '',
        settledAt: 0,
        timeline: [buildTimelineEvent('room_created', { actorUid: uid, roomId: newRoomRef.id, gameKey: 'chess', status: 'waiting', participantUids: [uid] })]
      };
      tx.set(newRoomRef, newRoom);
      return serializeChessRoom(newRoomRef.id, newRoom);
    });
    res.json({ ok: true, room: roomData });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/join', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const roomId = req.body.roomId ? cleanStr(req.body.roomId) : null;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    await assertNoOtherActiveGame(uid, { allowRoomId: roomId || '' });

    const roomData = await db.runTransaction(async (tx) => {
      const uSnap = await tx.get(colUsers().doc(uid));
      if (!uSnap.exists) throw new Error('Kullanıcı bulunamadı.');
      const u = uSnap.data() || {};
      const now = nowMs();
      if (roomId) {
        const roomRef = colChess().doc(roomId);
        const rSnap = await tx.get(roomRef);
        if (!rSnap.exists) throw new Error('Oda bulunamadı.');
        const r = rSnap.data() || {};

        const isHost = cleanStr(r.host?.uid || '', 160) === uid;
        const isGuest = cleanStr(r.guest?.uid || '', 160) === uid;

        if (isHost || isGuest) {
          if (isHost) r.host = { ...r.host, username: u.username || r.host?.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(u.avatar || r.host?.avatar), selectedFrame: pickUserSelectedFrame(u), lastPing: now };
          if (isGuest) r.guest = { ...r.guest, username: u.username || r.guest?.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(u.avatar || r.guest?.avatar), selectedFrame: pickUserSelectedFrame(u), lastPing: now };
          r.updatedAt = now;
          r.lastActivityAt = now;
          r.resumeAvailableUntil = Math.max(safeNum(r.resumeAvailableUntil, 0), now + CHESS_DISCONNECT_GRACE_MS);
          bumpStateVersion(r);
          tx.update(roomRef, r);
          return serializeChessRoom(roomId, r);
        }

        if (cleanStr(r.status || '', 24) !== 'waiting') throw new Error('Bu oda artık müsait değil.');
        r.guest = { uid, username: u.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(u.avatar), selectedFrame: pickUserSelectedFrame(u), lastPing: now };
        r.status = 'playing';
        r.updatedAt = now;
        r.lastActivityAt = now;
        r.resumeAvailableUntil = now + CHESS_DISCONNECT_GRACE_MS;
        r.clock = createChessClock(now, 'running');
        appendTimelineEntry(r, buildTimelineEvent('match_started', { actorUid: uid, targetUid: cleanStr(r.host?.uid || '', 160), roomId, gameKey: 'chess', status: 'playing', participantUids: [cleanStr(r.host?.uid || '', 160), uid] }));
        bumpStateVersion(r);
        tx.update(roomRef, r);
        return serializeChessRoom(roomId, r);
      }

      const snap = await tx.get(colChess().where('status', '==', 'waiting'));
      if (snap.empty) throw new Error('Müsait oda bulunamadı. Lütfen yeni oda kurun.');
      let docToJoin = null;
      snap.forEach((doc) => {
        if (cleanStr(doc.data()?.host?.uid || '', 160) !== uid && !docToJoin) docToJoin = doc;
      });
      if (!docToJoin) throw new Error('Şu an sadece kendi kurduğunuz oda var.');

      const r = docToJoin.data() || {};
      r.guest = { uid, username: u.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(u.avatar), selectedFrame: pickUserSelectedFrame(u), lastPing: now };
      r.status = 'playing';
      r.updatedAt = now;
      r.lastActivityAt = now;
      r.resumeAvailableUntil = now + CHESS_DISCONNECT_GRACE_MS;
      r.clock = createChessClock(now, 'running');
      appendTimelineEntry(r, buildTimelineEvent('match_started', { actorUid: uid, targetUid: cleanStr(r.host?.uid || '', 160), roomId: docToJoin.id, gameKey: 'chess', status: 'playing', participantUids: [cleanStr(r.host?.uid || '', 160), uid] }));
      bumpStateVersion(r);
      tx.update(docToJoin.ref, r);
      return serializeChessRoom(docToJoin.id, r);
    });
    res.json({ ok: true, room: roomData });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/state/:id', verifyAuth, async (req, res) => {
  try {
    const roomId = cleanStr(req.params.id);
    const snap = await colChess().doc(roomId).get();
    if (!snap.exists) throw new Error('Oda bulunamadı.');
    const room = snap.data() || {};
    const isPlayer = cleanStr(room.host?.uid || '', 160) === req.user.uid || cleanStr(room.guest?.uid || '', 160) === req.user.uid;
    if (!isPlayer) return res.status(403).json({ ok: false, error: 'Bu odanın durumunu görüntüleme yetkiniz yok.' });
    res.json({ ok: true, room: serializeChessRoom(roomId, room) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/ping', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const roomId = cleanStr(req.body.roomId);
    if (!roomId) throw new Error('Oda ID yok');

    const result = await db.runTransaction(async (tx) => {
      const roomRef = colChess().doc(roomId);
      const snap = await tx.get(roomRef);
      if (!snap.exists) throw new Error('Oda Yok');
      const r = snap.data() || {};
      if (cleanStr(r.status || '', 24) === 'finished' || cleanStr(r.status || '', 24) === 'abandoned') {
        return { room: serializeChessRoom(roomId, r), status: r.status, message: 'Oyun bitti.', resultCode: cleanStr(r.resultCode || '', 64) };
      }

      const now = nowMs();
      const isHost = cleanStr(r.host?.uid || '', 160) === uid;
      const isGuest = cleanStr(r.guest?.uid || '', 160) === uid;
      if (!isHost && !isGuest) throw new Error('Bu satranç odasında ping yetkiniz yok.');
      if (isHost) r.host.lastPing = now;
      if (isGuest) r.guest.lastPing = now;
      r.updatedAt = now;
      r.lastActivityAt = now;

      if (cleanStr(r.status || '', 24) === 'playing') {
        const expiredColor = getExpiredChessColor(r, now);
        if (expiredColor) {
          const winnerUid = expiredColor === 'w' ? cleanStr(r.guest?.uid || '', 160) : cleanStr(r.host?.uid || '', 160);
          const loserUid = expiredColor === 'w' ? cleanStr(r.host?.uid || '', 160) : cleanStr(r.guest?.uid || '', 160);
          finalizeChessRoom(r, {
            actorUid: uid,
            winner: colorToWinnerOnTimeout(expiredColor),
            resultCode: GAME_RESULT_CODES.CHESS_TIMEOUT_WIN,
            reason: 'timeout',
            meta: { expiredColor }
          });
          let reward = { amount: 0, limitReached: false };
          if (winnerUid) {
            reward = await rewardChessWinner(tx, winnerUid, { roomId, resultCode: GAME_RESULT_CODES.CHESS_TIMEOUT_WIN, reason: 'timeout' });
            if (loserUid) await applyChessProgression(tx, winnerUid, loserUid, 'A_WIN');
          }
          tx.update(roomRef, r);
          return {
            room: serializeChessRoom(roomId, r),
            status: r.status,
            message: reward.limitReached ? 'Süre doldu. Günlük ödül limiti dolu.' : 'Rakibin süresi doldu. Galibiyet işlendi.',
            resultCode: GAME_RESULT_CODES.CHESS_TIMEOUT_WIN,
            winAmount: reward.amount,
            rewardGrant: reward.grant || null
          };
        }

        const hostDrop = now - safeNum(r.host?.lastPing, 0) > CHESS_DISCONNECT_GRACE_MS;
        const guestDrop = now - safeNum(r.guest?.lastPing, 0) > CHESS_DISCONNECT_GRACE_MS;

        if (hostDrop || guestDrop) {
          if (isRecordSettled(r)) {
            return { room: serializeChessRoom(roomId, r), status: r.status, message: 'Oyun zaten sonuçlandı.', resultCode: cleanStr(r.resultCode || '', 64) };
          }
          if (hostDrop && guestDrop) {
            finalizeChessRoom(r, { actorUid: uid, winner: 'none', status: 'abandoned', resultCode: GAME_RESULT_CODES.CHESS_ABANDONED_DOUBLE_DISCONNECT, reason: 'double_disconnect' });
            tx.update(roomRef, r);
            return { room: serializeChessRoom(roomId, r), status: 'abandoned', message: 'Her iki oyuncunun bağlantısı koptu. Oyun iptal edildi.', resultCode: GAME_RESULT_CODES.CHESS_ABANDONED_DOUBLE_DISCONNECT };
          }

          const loserIsHost = hostDrop;
          const winnerUid = loserIsHost ? cleanStr(r.guest?.uid || '', 160) : cleanStr(r.host?.uid || '', 160);
          const loserUid = loserIsHost ? cleanStr(r.host?.uid || '', 160) : cleanStr(r.guest?.uid || '', 160);
          finalizeChessRoom(r, {
            actorUid: uid,
            winner: loserIsHost ? 'black' : 'white',
            resultCode: GAME_RESULT_CODES.CHESS_DISCONNECT_WIN,
            reason: 'disconnect'
          });

          let reward = { amount: 0, limitReached: false };
          if (winnerUid) {
            reward = await rewardChessWinner(tx, winnerUid, { roomId, resultCode: GAME_RESULT_CODES.CHESS_DISCONNECT_WIN, reason: 'disconnect' });
            if (loserUid) {
              await applyChessProgression(tx, winnerUid, loserUid, 'A_WIN');
            }
          }
          tx.update(roomRef, r);
          return {
            room: serializeChessRoom(roomId, r),
            status: r.status,
            message: reward.limitReached ? 'Rakibin bağlantısı koptu. Günlük ödül limitin dolu.' : 'Rakibin bağlantısı koptu. Galibiyet işlendi.',
            resultCode: GAME_RESULT_CODES.CHESS_DISCONNECT_WIN,
            winAmount: reward.amount,
            rewardGrant: reward.grant || null
          };
        }
      }

      tx.update(roomRef, r);
      return { room: serializeChessRoom(roomId, r), status: r.status, message: '', resultCode: cleanStr(r.resultCode || '', 64) };
    });

    const io = req.app.get('io');
    if ([GAME_RESULT_CODES.CHESS_DISCONNECT_WIN, GAME_RESULT_CODES.CHESS_TIMEOUT_WIN].includes(cleanStr(result?.resultCode || '', 64)) && result?.room) {
      await persistChessSettlementArtifacts({ roomId, room: result.room, resultCode: cleanStr(result?.resultCode || '', 64), winAmount: safeNum(result.winAmount, 0) });
      createRewardNotificationForGrant(result.rewardGrant, { data: { source: 'chess_win', roomId, amount: safeNum(result.winAmount, 0), reason: cleanStr(result?.room?.resultReason || 'disconnect', 48) } }).catch(() => null);
      scheduleChessRoomRemoval(roomId);
    } else if (cleanStr(result?.resultCode || '', 64) === GAME_RESULT_CODES.CHESS_ABANDONED_DOUBLE_DISCONNECT) {
      await persistChessSettlementArtifacts({ roomId, room: result.room, resultCode: GAME_RESULT_CODES.CHESS_ABANDONED_DOUBLE_DISCONNECT, winAmount: 0 });
      scheduleChessRoomRemoval(roomId);
    }

    res.json({ ok: true, room: result?.room || result, status: result?.status, message: result?.message || '', resultCode: result?.resultCode || '' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/move', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { roomId, from, to, promotion } = req.body;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});

    const result = await db.runTransaction(async (tx) => {
      const roomRef = colChess().doc(roomId);
      const rSnap = await tx.get(roomRef);
      if (!rSnap.exists) throw new Error('Oda bulunamadı.');
      const r = rSnap.data() || {};

      if (cleanStr(r.status || '', 24) !== 'playing') throw new Error('Oyun aktif değil.');
      if (isRecordSettled(r)) throw new Error('Bu maç zaten sonuçlandı.');
      const isWhite = cleanStr(r.host?.uid || '', 160) === uid;
      const isBlack = cleanStr(r.guest?.uid || '', 160) === uid;
      if (!isWhite && !isBlack) throw new Error('Bu odada oyuncu değilsiniz.');
      if ((r.turn === 'w' && !isWhite) || (r.turn === 'b' && !isBlack)) throw new Error('Sıra sizde değil.');

      const now = nowMs();
      const movingColor = cleanStr(r.turn || 'w', 1) === 'b' ? 'b' : 'w';
      ensureMutableChessClock(r, now);
      const remainingBeforeMove = getChessRemainingMs(r, movingColor, now);
      if (remainingBeforeMove <= 0) {
        const winnerUid = movingColor === 'w' ? cleanStr(r.guest?.uid || '', 160) : cleanStr(r.host?.uid || '', 160);
        const loserUid = movingColor === 'w' ? cleanStr(r.host?.uid || '', 160) : cleanStr(r.guest?.uid || '', 160);
        finalizeChessRoom(r, {
          actorUid: uid,
          winner: colorToWinnerOnTimeout(movingColor),
          resultCode: GAME_RESULT_CODES.CHESS_TIMEOUT_WIN,
          reason: 'timeout',
          meta: { expiredColor: movingColor }
        });
        const reward = await rewardChessWinner(tx, winnerUid, { roomId, resultCode: GAME_RESULT_CODES.CHESS_TIMEOUT_WIN, reason: 'timeout' });
        await applyChessProgression(tx, winnerUid, loserUid, 'A_WIN');
        tx.update(roomRef, r);
        return {
          room: serializeChessRoom(roomId, r),
          moveStr: '',
          winAmount: reward.amount,
          gameOverMessage: reward.limitReached ? 'Süre doldu. (Günlük Kredi Kazanma Limitiniz Doldu)' : 'Süre doldu. 5000 MC KAZANDINIZ!',
          resultCode: GAME_RESULT_CODES.CHESS_TIMEOUT_WIN,
          rewardGrant: reward.grant || null
        };
      }

      const chess = new Chess(r.fen);
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (move === null) throw new Error('Geçersiz hamle! Kural dışı oynanamaz.');

      r.fen = chess.fen();
      r.turn = chess.turn();
      applyChessMoveClock(r, movingColor, r.turn, now, remainingBeforeMove);
      r.updatedAt = now;
      r.lastActivityAt = now;
      if (isWhite) r.host.lastPing = now;
      if (isBlack) r.guest.lastPing = now;
      bumpStateVersion(r);
      let winAmount = 0;
      let gameOverMessage = null;
      let resultCode = '';
      let rewardGrant = null;

      if (chess.in_checkmate()) {
        const winnerUid = isWhite ? cleanStr(r.host?.uid || '', 160) : cleanStr(r.guest?.uid || '', 160);
        const loserUid = isWhite ? cleanStr(r.guest?.uid || '', 160) : cleanStr(r.host?.uid || '', 160);
        finalizeChessRoom(r, {
          actorUid: uid,
          winner: isWhite ? 'white' : 'black',
          resultCode: GAME_RESULT_CODES.CHESS_CHECKMATE_WIN,
          reason: 'checkmate',
          meta: { move: move.san }
        });
        const reward = await rewardChessWinner(tx, winnerUid, { roomId, resultCode: GAME_RESULT_CODES.CHESS_CHECKMATE_WIN, reason: 'checkmate' });
        winAmount = reward.amount;
        rewardGrant = reward.grant || null;
        const progressOut = await applyChessProgression(tx, winnerUid, loserUid, 'A_WIN');
        resultCode = GAME_RESULT_CODES.CHESS_CHECKMATE_WIN;
        if (progressOut?.boostBlocked) gameOverMessage = 'ŞAH MAT! (Aynı rakiple üst üste eşleşme sınırı nedeniyle ilerleme puanı işlenmedi)';
        else if (reward.limitReached) gameOverMessage = 'ŞAH MAT! (Günlük Kredi Kazanma Limitiniz Doldu)';
        else gameOverMessage = 'ŞAH MAT! 5000 MC KAZANDINIZ!';
      } else if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) {
        const aUid = cleanStr(r.host?.uid || '', 160);
        const bUid = cleanStr(r.guest?.uid || '', 160);
        finalizeChessRoom(r, {
          actorUid: uid,
          winner: 'draw',
          resultCode: GAME_RESULT_CODES.CHESS_DRAW,
          reason: 'draw',
          meta: { move: move.san }
        });
        const progressOut = await applyChessProgression(tx, aUid, bUid, 'DRAW');
        resultCode = GAME_RESULT_CODES.CHESS_DRAW;
        gameOverMessage = progressOut?.boostBlocked ? 'BERABERE! (İlerleme puanı bu eşleşmede işlenmedi)' : 'BERABERE!';
      }

      tx.update(roomRef, r);
      return { room: serializeChessRoom(roomId, r), moveStr: move.san, winAmount, gameOverMessage, resultCode, rewardGrant };
    });

    const io = req.app.get('io');
    if (result.room.status === 'finished' || result.room.status === 'abandoned') {
      await persistChessSettlementArtifacts({ roomId, room: result.room, resultCode: result.resultCode, winAmount: result.winAmount });
      createRewardNotificationForGrant(result.rewardGrant, { data: { source: 'chess_win', roomId, amount: safeNum(result.winAmount, 0), reason: cleanStr(result.room?.resultReason || '', 48) } }).catch(() => null);
      scheduleChessRoomRemoval(roomId);
    }
    res.json({ ok: true, ...result });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/leave', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    const roomId = cleanStr(req.body?.roomId || '');
    if (!roomId) throw new Error('Oda ID gerekli.');

    const result = await db.runTransaction(async (tx) => {
      const roomRef = colChess().doc(roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists) return { deleted: true };

      const room = roomSnap.data() || {};
      const isHost = cleanStr(room.host?.uid || '', 160) === uid;
      const isGuest = cleanStr(room.guest?.uid || '', 160) === uid;
      if (!isHost && !isGuest) throw new Error('Bu odada yetkiniz yok.');

      if (cleanStr(room.status || '', 24) === 'waiting') {
        tx.delete(roomRef);
        return { deleted: true, waiting: true, resultCode: GAME_RESULT_CODES.CHESS_WAITING_CANCELLED };
      }
      if (cleanStr(room.status || '', 24) === 'finished' || cleanStr(room.status || '', 24) === 'abandoned' || isRecordSettled(room)) {
        return { room: serializeChessRoom(roomId, room), alreadyClosed: true, resultCode: cleanStr(room.resultCode || '', 64) };
      }

      const winnerUid = isHost ? cleanStr(room.guest?.uid || '', 160) : cleanStr(room.host?.uid || '', 160);
      const loserUid = isHost ? cleanStr(room.host?.uid || '', 160) : cleanStr(room.guest?.uid || '', 160);
      finalizeChessRoom(room, {
        actorUid: uid,
        winner: isHost ? 'black' : 'white',
        resultCode: GAME_RESULT_CODES.CHESS_LEAVE_WIN,
        reason: 'leave'
      });
      let reward = { amount: 0, limitReached: false };
      if (winnerUid) {
        reward = await rewardChessWinner(tx, winnerUid, { roomId, resultCode: GAME_RESULT_CODES.CHESS_LEAVE_WIN, reason: 'leave' });
        if (loserUid) {
          await applyChessProgression(tx, winnerUid, loserUid, 'A_WIN');
        }
      }
      tx.update(roomRef, room);
      return {
        room: serializeChessRoom(roomId, room),
        winAmount: reward.amount,
        gameOverMessage: reward.limitReached ? 'Rakip masadan ayrıldı. (Günlük limit dolu)' : 'Rakip masadan ayrıldı. 5000 MC KAZANDINIZ!',
        resultCode: GAME_RESULT_CODES.CHESS_LEAVE_WIN,
        rewardGrant: reward.grant || null
      };
    });

    if (result.waiting) {
      await recordGameAudit({
        gameType: 'chess',
        entityType: 'match',
        entityId: roomId,
        roomId,
        eventType: 'waiting_room_cancelled',
        resultCode: GAME_RESULT_CODES.CHESS_WAITING_CANCELLED,
        reason: 'leave',
        status: GAME_SETTLEMENT_STATUS.CANCELLED,
        actorUid: uid,
        subjectUid: uid,
        idempotencyKey: `chess:${roomId}:waiting_cancelled`
      }).catch(() => null);
    } else if (result?.room && !result.alreadyClosed) {
      await persistChessSettlementArtifacts({ roomId, room: result.room, resultCode: GAME_RESULT_CODES.CHESS_LEAVE_WIN, winAmount: result.winAmount });
      createRewardNotificationForGrant(result.rewardGrant, { data: { source: 'chess_win', roomId, amount: safeNum(result.winAmount, 0), reason: 'leave' } }).catch(() => null);
      scheduleChessRoomRemoval(roomId);
    }
    res.json({ ok: true, ...result });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/resign', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const roomId = cleanStr(req.body?.roomId || '');
    if (!roomId) throw new Error('Oda ID gerekli.');
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    const result = await db.runTransaction(async (tx) => {
      const roomRef = colChess().doc(roomId);
      const rSnap = await tx.get(roomRef);
      if (!rSnap.exists) throw new Error('Oda bulunamadı.');
      const r = rSnap.data() || {};

      if (cleanStr(r.status || '', 24) !== 'playing') throw new Error('Oyun aktif değil.');
      if (isRecordSettled(r)) throw new Error('Bu maç zaten sonuçlandı.');
      const isWhite = cleanStr(r.host?.uid || '', 160) === uid;
      const isBlack = cleanStr(r.guest?.uid || '', 160) === uid;
      if (!isWhite && !isBlack) throw new Error('Yetkiniz yok.');

      const winnerUid = isWhite ? cleanStr(r.guest?.uid || '', 160) : cleanStr(r.host?.uid || '', 160);
      const loserUid = isWhite ? cleanStr(r.host?.uid || '', 160) : cleanStr(r.guest?.uid || '', 160);
      finalizeChessRoom(r, {
        actorUid: uid,
        winner: isWhite ? 'black' : 'white',
        resultCode: GAME_RESULT_CODES.CHESS_RESIGN_WIN,
        reason: 'resign'
      });
      const reward = await rewardChessWinner(tx, winnerUid, { roomId, resultCode: GAME_RESULT_CODES.CHESS_RESIGN_WIN, reason: 'resign' });
      await applyChessProgression(tx, winnerUid, loserUid, 'A_WIN');
      tx.update(roomRef, r);
      return {
        room: serializeChessRoom(roomId, r),
        winAmount: reward.amount,
        gameOverMessage: reward.limitReached ? 'Rakip Pes Etti. (Günlük Limitiniz Doldu)' : 'Rakip Pes Etti. 5000 MC KAZANDINIZ!',
        resultCode: GAME_RESULT_CODES.CHESS_RESIGN_WIN,
        rewardGrant: reward.grant || null
      };
    });

    await persistChessSettlementArtifacts({ roomId, room: result.room, resultCode: GAME_RESULT_CODES.CHESS_RESIGN_WIN, winAmount: result.winAmount });
    createRewardNotificationForGrant(result.rewardGrant, { data: { source: 'chess_win', roomId, amount: safeNum(result.winAmount, 0), reason: 'resign' } }).catch(() => null);
    scheduleChessRoomRemoval(roomId);
    res.json({ ok: true, ...result });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

module.exports = router;
