'use strict';

const { db } = require('../config/firebase');
const { cleanStr, safeNum } = require('./helpers');
const { engineState } = require('../engines/crashEngine');

const colChess = () => db.collection('chess_rooms');
const colOnlinePisti = () => db.collection('pisti_online_rooms');
const colCrashBets = () => db.collection('crash_bets');


function isCrashPhaseResumable(phase = '') {
  return ['COUNTDOWN', 'FLYING'].includes(cleanStr(phase || '', 24).toUpperCase());
}

async function listActiveCrashSessionsForUid(uid = '') {
  const safeUid = cleanStr(uid || '', 160);
  const crashState = engineState?.crashState || {};
  const roundId = cleanStr(crashState.roundId || '', 160);
  const phase = cleanStr(crashState.phase || '', 24).toUpperCase();
  if (!safeUid || !roundId || !isCrashPhaseResumable(phase)) return [];

  const betIds = [1, 2].map((box) => `${roundId}_${safeUid}_${box}`);
  const betSnaps = await Promise.all(betIds.map((betId) => colCrashBets().doc(betId).get().catch(() => null)));
  const activeBets = betSnaps
    .filter((snap) => snap && snap.exists)
    .map((snap) => ({ id: snap.id, ...(snap.data() || {}) }))
    .filter((bet) => {
      if (cleanStr(bet.uid || '', 160) !== safeUid) return false;
      if (cleanStr(bet.roundId || '', 160) !== roundId) return false;
      if (cleanStr(bet.settlementStatus || '', 24) !== 'active') return false;
      return cleanStr(bet.status || '', 24) === 'active';
    });

  if (!activeBets.length) return [];

  const updatedAt = Math.max(...activeBets.map((bet) => safeNum(bet.updatedAt, 0)), safeNum(crashState.startedAt, 0));
  return [{
    gameType: 'crash',
    roomId: roundId,
    roundId,
    status: 'playing',
    phase: phase.toLowerCase(),
    cleanupAt: Math.max(Date.now() + 60 * 1000, safeNum(crashState.startedAt, 0) + 10 * 60 * 1000),
    updatedAt,
    lastActivityAt: updatedAt,
    settlementStatus: 'active',
    resultCode: '',
    canResume: true,
    canReview: false,
    activeBets: activeBets.map((bet) => ({
      betId: bet.id,
      box: safeNum(bet.box, 0),
      amount: safeNum(bet.amount, 0),
      autoCashout: safeNum(bet.autoCashout, 0)
    }))
  }];
}


async function listActiveSessionsForUid(uid = '') {
  const safeUid = cleanStr(uid || '', 160);
  if (!safeUid) return [];

  const [chessHostSnap, chessGuestSnap, pistiParticipantSnap, pistiRecentSnap] = await Promise.all([
    colChess().where('host.uid', '==', safeUid).limit(20).get().catch(() => ({ docs: [] })),
    colChess().where('guest.uid', '==', safeUid).limit(20).get().catch(() => ({ docs: [] })),
    colOnlinePisti().where('participantUids', 'array-contains', safeUid).limit(20).get().catch(() => ({ docs: [] })),
    colOnlinePisti().orderBy('updatedAt', 'desc').limit(100).get().catch(() => ({ docs: [] }))
  ]);

  const sessions = [];
  sessions.push(...await listActiveCrashSessionsForUid(safeUid));

  const chessDocs = new Map();
  [...(chessHostSnap.docs || []), ...(chessGuestSnap.docs || [])].forEach((doc) => chessDocs.set(doc.id, doc));
  for (const doc of chessDocs.values()) {
    const data = doc.data() || {};
    const status = cleanStr(data.status || '', 24);
    const participants = [cleanStr(data.host?.uid || '', 160), cleanStr(data.guest?.uid || '', 160)].filter(Boolean);
    if (!participants.includes(safeUid)) continue;
    const cleanupAt = safeNum(data.cleanupAt, 0);
    const lastActivityAt = Math.max(safeNum(data.lastActivityAt, 0), safeNum(data.updatedAt, 0), safeNum(data.host?.lastPing, 0), safeNum(data.guest?.lastPing, 0));
    sessions.push({
      gameType: 'chess',
      roomId: doc.id,
      status,
      cleanupAt,
      updatedAt: safeNum(data.updatedAt, 0),
      lastActivityAt,
      settlementStatus: cleanStr(data.settlementStatus || '', 24),
      resultCode: cleanStr(data.resultCode || '', 64),
      canResume: ['waiting', 'playing'].includes(status),
      canReview: ['finished', 'abandoned'].includes(status) && cleanupAt > Date.now()
    });
  }

  const pistiDocs = new Map();
  [...(pistiParticipantSnap.docs || []), ...(pistiRecentSnap.docs || [])].forEach((doc) => pistiDocs.set(doc.id, doc));
  for (const doc of pistiDocs.values()) {
    const data = doc.data() || {};
    const status = cleanStr(data.status || '', 24);
    const players = Array.isArray(data.players) ? data.players : [];
    const participantUids = Array.isArray(data.participantUids) ? data.participantUids.map((item) => cleanStr(item || '', 160)).filter(Boolean) : [];
    if (!participantUids.includes(safeUid) && !players.some((player) => cleanStr(player?.uid || '', 160) === safeUid)) continue;
    const cleanupAt = safeNum(data.cleanupAt, 0);
    const lastActivityAt = Math.max(safeNum(data.updatedAt, 0), ...players.map((player) => safeNum(player?.lastPing, 0)));
    sessions.push({
      gameType: 'pisti',
      roomId: doc.id,
      status,
      cleanupAt,
      updatedAt: safeNum(data.updatedAt, 0),
      lastActivityAt,
      settlementStatus: cleanStr(data.settlementStatus || '', 24),
      resultCode: cleanStr(data.resultCode || '', 64),
      canResume: ['waiting', 'playing'].includes(status),
      canReview: ['finished', 'abandoned'].includes(status) && cleanupAt > Date.now()
    });
  }

  sessions.sort((a, b) => safeNum(b.cleanupAt || 0, 0) - safeNum(a.cleanupAt || 0, 0));
  return sessions.slice(0, 20);
}

async function assertNoOtherActiveGame(uid = '', { allowGameType = '', allowRoomId = '' } = {}) {
  const safeUid = cleanStr(uid || '', 160);
  if (!safeUid) return true;
  const sessions = await listActiveSessionsForUid(safeUid);
  const blocked = sessions.find((item) => {
    if (!['waiting', 'playing'].includes(cleanStr(item.status || '', 24))) return false;
    if (allowRoomId && cleanStr(item.roomId || '', 160) === cleanStr(allowRoomId || '', 160)) return false;
    if (allowGameType && cleanStr(item.gameType || '', 24) === cleanStr(allowGameType || '', 24)) return false;
    return true;
  });
  if (blocked) {
    const blockedType = cleanStr(blocked.gameType || '', 24);
    const label = blockedType === 'pisti' ? 'Pişti' : blockedType === 'chess' ? 'Satranç' : blockedType === 'crash' ? 'Crash' : 'oyun';
    throw new Error(`Başka aktif bir ${label} oturumun var.`);
  }
  return true;
}

module.exports = {
  listActiveSessionsForUid,
  assertNoOtherActiveGame
};
