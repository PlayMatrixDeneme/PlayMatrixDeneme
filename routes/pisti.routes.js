'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { db, admin } = require('../config/firebase');
const { verifyAuth } = require('../middlewares/auth.middleware');
const { bjActionLimiter } = require('../middlewares/rateLimiters');
const { safeNum, cleanStr, nowMs, sha256Hex } = require('../utils/helpers');
const { assertNoOtherActiveGame } = require('../utils/gameSession');
const { recordRewardLedger, buildLedgerDocId } = require('../utils/rewardLedger');
const { recordGameLedgerInTransaction } = require('../utils/gameLedger');
const { recordGameAudit } = require('../utils/gameAudit');
const { createNotification } = require('../utils/notifications');
const { saveMatchHistory } = require('../utils/matchHistory');
const { buildTimelineEvent, appendTimelineEntry, bumpStateVersion, applySettlement } = require('../utils/gameFlow');
const { getCanonicalSelectedFrame } = require('../utils/accountState');
const { assertGamesAllowed } = require('../utils/userRestrictions');
const { applyProgressionPatchInTransaction, buildAccountSyncPayload } = require('../utils/economyCore');
const { sanitizePublicAvatarForOutput } = require('../utils/avatarManifest');
const { GAME_SETTLEMENT_STATUS, GAME_RESULT_CODES } = require('../config/constants');

const colPisti = () => db.collection('pisti_sessions');
const colOnlinePisti = () => db.collection('pisti_online_rooms');
const colUsers = () => db.collection('users');

function statusForPistiError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('bakiye yetersiz')) return 402;
  if (message.includes('bulunamad') || message.includes('oda yok')) return 404;
  if (message.includes('yetki') || message.includes('görüntüleme')) return 403;
  if (message.includes('dolmuş') || message.includes('zaten') || message.includes('aktif')) return 409;
  if (message.includes('geçersiz') || message.includes('gerekli') || message.includes('şifre') || message.includes('sifre')) return 400;
  return 500;
}

function sendPistiError(res, error) {
  return res.status(statusForPistiError(error)).json({ ok: false, error: error?.message || 'Pişti işlemi tamamlanamadı.' });
}


const PISTI_DISCONNECT_GRACE_MS = 90 * 1000;
const PISTI_RESULT_RETENTION_MS = 2 * 60 * 1000;

function applyPistiCloseWindow(room = {}, delayMs = PISTI_RESULT_RETENTION_MS) {
  const cleanupAt = nowMs() + Math.max(PISTI_DISCONNECT_GRACE_MS, safeNum(delayMs, PISTI_RESULT_RETENTION_MS));
  room.cleanupAt = cleanupAt;
  room.resumeAvailableUntil = cleanupAt;
  return room;
}

function schedulePistiRoomRemoval(roomId = '', delayMs = PISTI_RESULT_RETENTION_MS) {
  const safeRoomId = cleanStr(roomId, 160);
  if (!safeRoomId) return;
  setTimeout(() => colOnlinePisti().doc(safeRoomId).delete().catch(() => null), Math.max(PISTI_DISCONNECT_GRACE_MS, safeNum(delayMs, PISTI_RESULT_RETENTION_MS)));
}


function getPistiParticipantUids(room = {}) {
  return Array.isArray(room.players) ? room.players.map((player) => cleanStr(player?.uid || '', 160)).filter(Boolean) : [];
}

function syncPistiParticipantUids(room = {}) {
  room.participantUids = getPistiParticipantUids(room);
  return room;
}

function getPistiLastPlayerPing(room = {}) {
  const players = Array.isArray(room.players) ? room.players : [];
  return Math.max(0, ...players.map((player) => safeNum(player?.lastPing, 0)), safeNum(room.updatedAt, 0), safeNum(room.createdAt, 0));
}

function isOnlinePistiLobbyVisible(room = {}, now = nowMs()) {
  const status = cleanStr(room.status || '', 24);
  if (!['waiting', 'playing'].includes(status)) return false;
  if (status === 'waiting' && getPistiLastPlayerPing(room) && now - getPistiLastPlayerPing(room) > PISTI_DISCONNECT_GRACE_MS * 2) return false;
  const cleanupAt = safeNum(room.cleanupAt, 0);
  if (cleanupAt && cleanupAt < now && !['waiting', 'playing'].includes(status)) return false;
  return true;
}

function resolvePistiResultCode(room = {}, reason = '') {
  const safeReason = cleanStr(reason || room.finishReason || '', 48);
  const winners = Array.isArray(room.winner) ? room.winner.filter(Boolean) : [];
  if (cleanStr(room.status || '', 24) === 'abandoned') return GAME_RESULT_CODES.PISTI_ABANDONED;
  if (safeReason === 'leave') return GAME_RESULT_CODES.PISTI_LEAVE_WIN;
  if (safeReason === 'disconnect') return GAME_RESULT_CODES.PISTI_DISCONNECT_WIN;
  if (winners.length > 1) return GAME_RESULT_CODES.PISTI_DRAW;
  return GAME_RESULT_CODES.PISTI_NORMAL_WIN;
}

function recordPistiStakeLedgerInTransaction(tx, { uid = '', roomId = '', bet = 0, action = 'join', mode = '' } = {}) {
  const safeUid = cleanStr(uid || '', 160);
  const safeRoomId = cleanStr(roomId || '', 160);
  const safeBet = Math.max(0, Math.floor(safeNum(bet, 0)));
  if (!safeUid || !safeRoomId || safeBet <= 0) return null;
  return recordGameLedgerInTransaction(tx, {
    uid: safeUid,
    gameType: 'pisti',
    source: 'pisti_bet_stake',
    referenceId: safeRoomId,
    roomId: safeRoomId,
    matchId: safeRoomId,
    amount: -safeBet,
    stake: safeBet,
    payout: 0,
    resultCode: 'pisti_bet_placed',
    settlementStatus: GAME_SETTLEMENT_STATUS.ACTIVE,
    actorUid: safeUid,
    subjectUid: safeUid,
    meta: { action: cleanStr(action || 'join', 32), mode: cleanStr(mode || '', 16) },
    idempotencyKey: `pisti:${safeRoomId}:${safeUid}:stake`
  });
}

function recordPistiSettlementLedgerInTransaction(tx, { room = {}, roomId = '', payoutByUid = {}, resultCode = '', reason = '' } = {}) {
  const safeRoomId = cleanStr(roomId || room.id || '', 160);
  const safeResultCode = cleanStr(resultCode || resolvePistiResultCode(room, reason), 64);
  const safeReason = cleanStr(reason || room.finishReason || '', 48);
  const participantUids = getPistiParticipantUids(room);
  participantUids.forEach((uid) => {
    const payout = Math.max(0, Math.floor(safeNum(payoutByUid?.[uid], 0)));
    recordGameLedgerInTransaction(tx, {
      uid,
      gameType: 'pisti',
      source: 'pisti_match_result',
      referenceId: safeRoomId,
      roomId: safeRoomId,
      matchId: safeRoomId,
      amount: payout,
      stake: safeNum(room.bet, 0),
      payout,
      resultCode: safeResultCode,
      settlementStatus: cleanStr(room.settlementStatus || GAME_SETTLEMENT_STATUS.SETTLED, 24),
      actorUid: cleanStr(room.settledByUid || '', 160),
      subjectUid: uid,
      meta: {
        reason: safeReason,
        winners: Array.isArray(room.winner) ? room.winner.filter(Boolean) : [],
        mode: cleanStr(room.mode || '', 16),
        score: Object.fromEntries((room.players || []).map((player) => [cleanStr(player?.uid || '', 160), safeNum(player?.score, 0)]))
      },
      idempotencyKey: `pisti:${safeRoomId}:${uid}:settlement:${safeResultCode}`
    });
  });
}


function pickUserSelectedFrame(user = {}) {
  return getCanonicalSelectedFrame(user, { defaultFrame: 0 });
}



function calculatePistiSpendProgressReward(spendMc = 0, source = '') {
  const spend = Math.max(0, Math.floor(safeNum(spendMc, 0)));
  if (spend <= 0) return { xpEarned: 0, activityEarned: 0, roundsEarned: 0, spentMc: 0, source: cleanStr(source || 'PISTI_SPEND', 64) };
  let xpEarned = 0;
  if (spend >= 200000) xpEarned = 110;
  else if (spend >= 100000) xpEarned = 64;
  else if (spend >= 40000) xpEarned = 36;
  else if (spend >= 20000) xpEarned = 20;
  else if (spend >= 10000) xpEarned = 12;
  else if (spend >= 1000) xpEarned = 5;
  return { xpEarned, activityEarned: 1, roundsEarned: 1, spentMc: spend, source: cleanStr(source || 'PISTI_SPEND', 64) || 'PISTI_SPEND' };
}

function applySpendProgression(tx, userRef, userData = {}, spendMc = 0, source = '') {
  const reward = calculatePistiSpendProgressReward(spendMc, source);
  const progressionOut = applyProgressionPatchInTransaction(tx, userRef, userData, {
    xpEarned: reward.xpEarned,
    activityEarned: reward.activityEarned,
    roundsEarned: reward.roundsEarned,
    spentMc: reward.spentMc,
    source: reward.source,
    updatedAt: nowMs()
  });
  return { ...reward, progressionOut };
}

function recordPistiProgressLedger(uid = '', reward = {}, referenceId = '', meta = {}) {
  const xpEarned = Math.max(0, Math.floor(safeNum(reward?.xpEarned, 0)));
  if (!uid || xpEarned <= 0 || !referenceId) return;
  recordRewardLedger({
    uid,
    amount: xpEarned,
    currency: 'XP',
    source: 'pisti_spend_progress',
    referenceId,
    idempotencyKey: `pisti_spend_progress:${referenceId}:${uid}`,
    meta: { ...meta, spentMc: safeNum(reward?.spentMc, 0), activityEarned: safeNum(reward?.activityEarned, 0), roundsEarned: safeNum(reward?.roundsEarned, 0) }
  }).catch(() => null);
}


async function applyPistiPotRewardsInTransaction(tx, { winners = [], reward = 0, room = {}, roomId = '', reason = 'normal_finish' } = {}) {
  const safeReward = Math.max(0, Math.floor(safeNum(reward, 0)));
  const safeRoomId = cleanStr(roomId || room.id || room.updatedAt || room.createdAt || '', 160);
  const winnerUids = Array.from(new Set((Array.isArray(winners) ? winners : []).map((uid) => cleanStr(uid || '', 160)).filter(Boolean)));
  if (!tx || !safeRoomId || safeReward <= 0 || !winnerUids.length) return [];

  const grants = winnerUids.map((uid) => {
    const stableRewardKey = `pisti_reward_${safeRoomId}_${uid}`;
    const ledgerId = buildLedgerDocId({
      uid,
      currency: 'MC',
      source: 'pisti_online_win',
      referenceId: safeRoomId,
      idempotencyKey: `${stableRewardKey}_ledger`
    });
    return {
      uid,
      ledgerId,
      ledgerRef: db.collection('reward_ledger').doc(ledgerId),
      userRef: colUsers().doc(uid),
      stableRewardKey
    };
  });

  const ledgerSnaps = await Promise.all(grants.map((grant) => tx.get(grant.ledgerRef)));
  const committedAt = nowMs();
  grants.forEach((grant, index) => {
    if (ledgerSnaps[index]?.exists) return;
    const meta = { mode: cleanStr(room?.mode || '', 16), reason: cleanStr(reason || 'normal_finish', 48), roomId: safeRoomId };
    tx.set(grant.ledgerRef, {
      uid: grant.uid,
      amount: safeReward,
      currency: 'MC',
      source: 'pisti_online_win',
      referenceId: safeRoomId,
      meta,
      idempotencyKey: `${grant.stableRewardKey}_ledger`,
      policyVersion: 2,
      status: 'committed',
      createdAt: committedAt,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: false });
    tx.set(grant.userRef, {
      balance: admin.firestore.FieldValue.increment(safeReward),
      updatedAt: committedAt,
      lastRewardAt: committedAt,
      lastRewardSource: 'pisti_online_win',
      lastRewardAmount: safeReward,
      lastRewardLedgerId: grant.ledgerId
    }, { merge: true });
  });
  return grants.map((grant, index) => ({ uid: grant.uid, ledgerId: grant.ledgerId, duplicated: !!ledgerSnaps[index]?.exists }));
}

function hashRoomPassword(password = '', roomId = '') {
  const raw = String(password || '');
  if (!raw) return '';
  return sha256Hex(`${String(roomId || '').trim()}::${raw}`);
}

function verifyRoomPassword(room = {}, password = '', roomId = '') {
  const storedHash = cleanStr(room.passwordHash || '', 200);
  const storedPassword = typeof room.password === 'string' ? room.password : '';
  if (storedHash) return storedHash === hashRoomPassword(password, roomId);
  return storedPassword === String(password || '');
}

function createMultiPistiDeck(deckCount = 1) {
  const suits = ['H', 'D', 'C', 'S'];
  const vals = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K'];
  const deck = [];
  for (let d = 0; d < deckCount; d++) {
    for (const s of suits) for (const v of vals) deck.push(`${v + s}|${crypto.randomBytes(4).toString('hex')}`);
  }
  for (let i = deck.length - 1; i > 0; i--) { const j = crypto.randomInt(0, i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}

function baseCard(code) { return typeof code === 'string' ? code.split('|')[0] : ''; }
function cardBasePoints(cardCode) {
  const c = baseCard(cardCode);
  if (c === '0D') return 3; if (c === '2C') return 2;
  if (c[0] === 'A' || c[0] === 'J') return 1;
  return 0;
}
function calculateCardPointsMulti(cards) {
  let pts = 0; for (const c of cards || []) pts += cardBasePoints(c); return pts;
}

function checkPistiCaptureMulti(tableCards, playedCard) {
  if (!Array.isArray(tableCards) || tableCards.length === 0) return { captured: false, isPisti: false, points: 0, collected: [] };
  const topCardBase = baseCard(tableCards[tableCards.length - 1]);
  const playedBase = baseCard(playedCard);
  const isJack = playedBase[0] === 'J'; const isMatch = playedBase[0] === topCardBase[0];

  if (!isJack && !isMatch) return { captured: false, isPisti: false, points: 0, collected: [] };

  const collected = [...tableCards, playedCard];
  const isPisti = tableCards.length === 1 && isMatch;
  const pistiPoints = isPisti ? (isJack ? 20 : 10) : 0;
  return { captured: true, isPisti, points: pistiPoints + calculateCardPointsMulti(collected), collected };
}

function modeConfig(mode) {
  if (mode === '2-104') return { maxPlayers: 2, deckCount: 2 };
  if (mode === '4-104') return { maxPlayers: 4, deckCount: 2 };
  return { maxPlayers: 2, deckCount: 1 };
}

function dealIfNeeded(room) {
  const allEmpty = (room.players || []).every(player => (player.hand || []).length === 0);
  if (!allEmpty || !Array.isArray(room.deck) || room.deck.length === 0) return;

  let cardsToDealEach = 4;
  const cardsNeeded = (room.players || []).length * 4;

  if (room.deck.length === (room.players || []).length * 4 + 4) cardsToDealEach = room.deck.length / room.players.length;
  else if (room.deck.length < cardsNeeded) cardsToDealEach = Math.floor(room.deck.length / room.players.length);

  if (cardsToDealEach > 0) {
    for (const player of room.players || []) {
      player.hand = []; player.processingUntil = 0;
      for (let i = 0; i < cardsToDealEach; i++) player.hand.push(room.deck.pop());
    }
  } else { room.deck = []; }
}

function startGame(room) {
  room.status = 'playing'; room.finishReason = ''; room.winner = []; room.settlementStatus = GAME_SETTLEMENT_STATUS.ACTIVE; room.resultCode = ''; room.resultReason = ''; room.settledAt = 0; room.startedAt = nowMs();
  room.deck = createMultiPistiDeck(room.deckCount);
  room.tableCards = [room.deck.pop(), room.deck.pop(), room.deck.pop(), room.deck.pop()];
  for (const player of room.players || []) {
    player.hand = [room.deck.pop(), room.deck.pop(), room.deck.pop(), room.deck.pop()];
    player.processingUntil = 0;
  }
  room.turn = crypto.randomInt(0, room.players.length);
  room.isFirstDeal = true; room.lastCapturer = null; room.lastEvent = null;
}

async function finalizeGame(room, tx, roomId = '') {
  if ((room.tableCards || []).length > 0 && room.lastCapturer) {
    const lastCap = (room.players || []).find(player => player.uid === room.lastCapturer);
    if (lastCap) { lastCap.cardCount = safeNum(lastCap.cardCount, 0) + room.tableCards.length; lastCap.score = safeNum(lastCap.score, 0) + calculateCardPointsMulti(room.tableCards); }
  }

  let maxCards = -1; let maxUid = null; let tie = false;
  for (const player of room.players || []) {
    const cc = safeNum(player.cardCount, 0);
    if (cc > maxCards) { maxCards = cc; maxUid = player.uid; tie = false; } else if (cc === maxCards) { tie = true; }
  }
  if (!tie && maxUid) { const player = (room.players || []).find(item => item.uid === maxUid); if (player) player.score = safeNum(player.score, 0) + 3; }

  let best = -Infinity; let winners = [];
  for (const player of room.players || []) {
    const score = safeNum(player.score, 0);
    if (score > best) { best = score; winners = [player.uid]; } else if (score === best) { winners.push(player.uid); }
  }

  const finishReason = winners.length > 1 ? 'draw' : 'normal_finish';
  const resultCode = resolvePistiResultCode({ ...room, winner: winners, status: 'finished', finishReason }, finishReason);
  room.status = 'finished'; room.finishReason = finishReason; room.winner = winners; syncPistiParticipantUids(room); applyPistiCloseWindow(room);
  applySettlement(room, {
    status: GAME_SETTLEMENT_STATUS.SETTLED,
    resultCode,
    reason: finishReason,
    settledAt: nowMs(),
    actorUid: '',
    winnerUid: winners[0] || '',
    loserUid: getPistiParticipantUids(room).find((uid) => !winners.includes(uid)) || '',
    meta: { winners, mode: cleanStr(room.mode || '', 16), bet: safeNum(room.bet, 0) }
  });
  appendTimelineEntry(room, buildTimelineEvent('match_finished', { gameKey: 'pisti', status: 'finished', reason: finishReason, participantUids: (room.players || []).map((player) => cleanStr(player?.uid || '', 160)), meta: { winners, mode: cleanStr(room.mode || '', 16), bet: safeNum(room.bet, 0), resultCode } })); bumpStateVersion(room);
  const pool = safeNum(room.bet, 0) * safeNum((room.players || []).length, 0);
  const rake = Math.floor(pool * 0.05);
  const distributable = pool - rake;
  const reward = winners.length > 0 ? Math.floor(distributable / winners.length) : 0;
  room.payoutByUid = Object.fromEntries(winners.map((uid) => [uid, reward]));

  await applyPistiPotRewardsInTransaction(tx, { winners, reward, room, roomId, reason: finishReason });
  recordPistiSettlementLedgerInTransaction(tx, { room, roomId, payoutByUid: room.payoutByUid, resultCode, reason: finishReason });
  return { room };
}

function sanitizeOnlinePistiPlayer(player, viewerUid) {
  const safePlayer = { uid: String(player?.uid || ''), username: cleanStr(player?.username || 'Oyuncu') || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(player?.avatar), selectedFrame: player?.selectedFrame ?? 0, score: safeNum(player?.score, 0), cardCount: safeNum(player?.cardCount, 0) };
  if (safePlayer.uid === viewerUid) { safePlayer.hand = Array.isArray(player?.hand) ? [...player.hand] : []; } 
  else { safePlayer.opponentCardCount = Array.isArray(player?.hand) ? player.hand.length : safeNum(player?.opponentCardCount, 0); }
  return safePlayer;
}

function sanitizeOnlinePistiLastEvent(lastEvent) {
  if (!lastEvent) return null;
  const hideFirstThree = !!lastEvent.hideFirstThree;
  const safeTableBefore = Array.isArray(lastEvent.tableBefore) ? lastEvent.tableBefore.map((card, index) => (hideFirstThree && index < 3 ? 'BACK' : card)) : [];
  return { type: cleanStr(lastEvent.type || 'play') || 'play', uid: String(lastEvent.uid || ''), card: typeof lastEvent.card === 'string' ? lastEvent.card : '', tableBefore: safeTableBefore, ts: safeNum(lastEvent.ts, 0) };
}

function prepareRoomForSocket(room, viewerUid) {
  if (!room) return null;
  const safeTableCards = (room.tableCards || []).map((card, index) => { if (room.isFirstDeal && index < 3) return 'BACK'; return card; });
  return {
    id: String(room.id || ''), roomName: cleanStr(room.roomName || 'Oda') || 'Oda', mode: cleanStr(room.mode || '2-52') || '2-52', bet: safeNum(room.bet, 0),
    maxPlayers: safeNum(room.maxPlayers, 0), isPrivate: !!room.isPrivate, status: cleanStr(room.status || 'waiting') || 'waiting',
    createdAt: safeNum(room.createdAt, 0), updatedAt: safeNum(room.updatedAt, 0), turn: safeNum(room.turn, 0), deckCount: Array.isArray(room.deck) ? room.deck.length : safeNum(room.deckCount, 0),
    tableCards: safeTableCards, winner: Array.isArray(room.winner) ? [...room.winner] : [], finishReason: cleanStr(room.finishReason || ''),
    settlementStatus: cleanStr(room.settlementStatus || '', 24), resultCode: cleanStr(room.resultCode || '', 64), settledAt: safeNum(room.settledAt, 0), payoutByUid: room.payoutByUid && typeof room.payoutByUid === 'object' ? room.payoutByUid : {},
    lastEvent: sanitizeOnlinePistiLastEvent(room.lastEvent), players: Array.isArray(room.players) ? room.players.map(player => sanitizeOnlinePistiPlayer(player, viewerUid)) : []
  };
}

async function finalizeOnlinePistiByDisconnect(room, tx, droppedUids = [], roomId = '', reason = 'disconnect') {
  const droppedSet = new Set((Array.isArray(droppedUids) ? droppedUids : []).filter(Boolean));
  const remainingPlayers = (room.players || []).filter(player => !droppedSet.has(player.uid));

  const safeReason = cleanStr(reason || 'disconnect', 48) || 'disconnect';
  room.updatedAt = nowMs(); room.finishReason = safeReason; syncPistiParticipantUids(room);

  if (remainingPlayers.length === 0) {
    const resultCode = GAME_RESULT_CODES.PISTI_ABANDONED;
    room.status = 'abandoned'; room.winner = []; applyPistiCloseWindow(room);
    applySettlement(room, {
      status: GAME_SETTLEMENT_STATUS.ABANDONED,
      resultCode,
      reason: safeReason,
      settledAt: nowMs(),
      actorUid: droppedUids[0] || '',
      winnerUid: '',
      loserUid: '',
      meta: { droppedUids }
    });
    room.payoutByUid = Object.fromEntries((room.players || []).map((player) => [player.uid, safeNum(room.bet, 0)]));
    appendTimelineEntry(room, buildTimelineEvent('match_abandoned', { gameKey: 'pisti', status: 'abandoned', reason: safeReason, participantUids: (room.players || []).map((player) => cleanStr(player?.uid || '', 160)), meta: { resultCode, droppedUids } })); bumpStateVersion(room);
    for (const player of room.players || []) tx.update(colUsers().doc(player.uid), { balance: admin.firestore.FieldValue.increment(room.bet) });
    recordPistiSettlementLedgerInTransaction(tx, { room, roomId, payoutByUid: room.payoutByUid, resultCode, reason: safeReason });
    return { room };
  }

  const winners = remainingPlayers.map(player => player.uid);
  const resultCode = resolvePistiResultCode({ ...room, winner: winners, status: 'finished', finishReason: safeReason }, safeReason);
  room.status = 'finished'; room.winner = winners; applyPistiCloseWindow(room);
  applySettlement(room, {
    status: GAME_SETTLEMENT_STATUS.SETTLED,
    resultCode,
    reason: safeReason,
    settledAt: nowMs(),
    actorUid: droppedUids[0] || '',
    winnerUid: winners[0] || '',
    loserUid: getPistiParticipantUids(room).find((uid) => !winners.includes(uid)) || '',
    meta: { droppedUids, winners }
  });
  appendTimelineEntry(room, buildTimelineEvent('match_finished', { gameKey: 'pisti', status: 'finished', reason: safeReason, participantUids: (room.players || []).map((player) => cleanStr(player?.uid || '', 160)), meta: { winners: room.winner, resultCode } })); bumpStateVersion(room);
  const pool = safeNum(room.bet, 0) * safeNum((room.players || []).length, 0);
  const rake = Math.floor(pool * 0.05);
  const distributable = Math.max(0, pool - rake);
  const reward = Math.floor(distributable / remainingPlayers.length);
  room.payoutByUid = Object.fromEntries(winners.map((uid) => [uid, reward]));

  await applyPistiPotRewardsInTransaction(tx, { winners, reward, room, roomId, reason: safeReason });
  recordPistiSettlementLedgerInTransaction(tx, { room, roomId, payoutByUid: room.payoutByUid, resultCode, reason: safeReason });
  return { room };
}


function savePistiMatchHistory(room, roomId, reason = '', rewardAmount = 0) {
  if (!room || !['finished', 'abandoned'].includes(cleanStr(room.status || '', 24))) return Promise.resolve(false);
  const participants = Array.isArray(room.players) ? room.players.map((player) => cleanStr(player?.uid || '', 160)).filter(Boolean) : [];
  const winnerList = Array.isArray(room.winner) ? room.winner.filter(Boolean) : [];
  const loserUid = participants.find((uid) => !winnerList.includes(uid)) || '';
  const scoreboard = Object.fromEntries((room.players || []).map((player) => [cleanStr(player?.uid || '', 160), safeNum(player?.score, 0)]));
  return saveMatchHistory({
    id: `pisti_${cleanStr(roomId || '', 160) || 'room'}`,
    gameType: 'pisti',
    roomId,
    status: cleanStr(room.status || 'finished', 24),
    result: reason || (winnerList.length > 1 ? 'draw' : 'win'),
    winnerUid: winnerList[0] || '',
    loserUid,
    participants,
    score: scoreboard,
    rewards: { mc: safeNum(rewardAmount, 0), winners: winnerList },
    meta: { reason, mode: cleanStr(room.mode || '2-52', 16), bet: safeNum(room.bet, 0) },
    createdAt: safeNum(room.updatedAt, nowMs())
  });
}



function persistPistiSettlementArtifacts(room, roomId, reason = '', rewardAmount = 0) {
  if (!room || !['finished', 'abandoned'].includes(cleanStr(room.status || '', 24))) return Promise.resolve(false);
  const safeRoomId = cleanStr(roomId || room.id || '', 160);
  const resultCode = cleanStr(room.resultCode || resolvePistiResultCode(room, reason), 64);
  const participants = getPistiParticipantUids(room);
  const winners = Array.isArray(room.winner) ? room.winner.filter(Boolean) : [];
  const scoreboard = Object.fromEntries((room.players || []).map((player) => [cleanStr(player?.uid || '', 160), safeNum(player?.score, 0)]));
  return Promise.allSettled([
    savePistiMatchHistory(room, safeRoomId, cleanStr(reason || room.finishReason || '', 48), rewardAmount),
    recordGameAudit({
      gameType: 'pisti',
      entityType: 'match',
      entityId: safeRoomId,
      roomId: safeRoomId,
      eventType: 'match_settled',
      resultCode,
      reason: cleanStr(reason || room.finishReason || '', 48),
      status: cleanStr(room.settlementStatus || (room.status === 'abandoned' ? GAME_SETTLEMENT_STATUS.ABANDONED : GAME_SETTLEMENT_STATUS.SETTLED), 24),
      actorUid: cleanStr(room.settledByUid || '', 160),
      subjectUid: winners[0] || participants[0] || '',
      amount: safeNum(rewardAmount, 0),
      payout: safeNum(rewardAmount, 0),
      meta: { winners, participants, scoreboard, mode: cleanStr(room.mode || '', 16), bet: safeNum(room.bet, 0) },
      idempotencyKey: `pisti:${safeRoomId}:settlement:${resultCode}`
    })
  ]);
}

function getOnlinePistiRewardAmount(room = {}) {
  const winners = Array.isArray(room?.winner) ? room.winner.filter(Boolean) : [];
  if (!winners.length) return 0;
  const playerCount = Array.isArray(room?.players) ? room.players.length : 0;
  const pool = Math.max(0, safeNum(room?.bet, 0) * playerCount);
  const rake = Math.floor(pool * 0.05);
  return Math.max(0, Math.floor((pool - rake) / winners.length));
}

function emitPistiRewardSideEffects(room, roomId, rewardAmount = 0, source = 'pisti_win') {
  const winners = Array.isArray(room?.winner) ? room.winner.filter(Boolean) : [];
  const safeReward = Math.max(0, Math.floor(safeNum(rewardAmount, 0)));
  const safeRoomId = cleanStr(roomId || '', 160);
  if (!winners.length || safeReward <= 0 || !safeRoomId) return;
  Promise.allSettled(winners.flatMap((winnerUid) => {
    const stableRewardKey = `pisti_reward_${safeRoomId}_${cleanStr(winnerUid, 160)}`;
    return ([
      recordRewardLedger({ uid: winnerUid, amount: safeReward, source: 'pisti_online_win', referenceId: safeRoomId, meta: { mode: cleanStr(room?.mode || '', 16), reason: cleanStr(source || 'normal', 24) || 'normal' }, idempotencyKey: `${stableRewardKey}_ledger` }),
      createNotification({ uid: winnerUid, type: 'reward', title: 'Pişti ödülü', body: `${safeReward} MC hesabına eklendi.`, data: { source: 'pisti_online_win', roomId: safeRoomId, amount: safeReward, mode: cleanStr(room?.mode || '', 16), reason: cleanStr(source || 'normal', 24) || 'normal' }, idempotencyKey: `${stableRewardKey}_notification` })
    ]);
  })).catch(() => null);
}

router.get('/online/lobby', verifyAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const [waitingSnap, playingSnap] = await Promise.all([
      colOnlinePisti().where('status', '==', 'waiting').limit(60).get(),
      colOnlinePisti().where('status', '==', 'playing').limit(40).get()
    ]);
    const rooms = [];
    const now = nowMs();
    [...waitingSnap.docs, ...playingSnap.docs].forEach((doc) => {
      const d = doc.data() || {};
      if (!isOnlinePistiLobbyVisible(d, now)) {
        if (cleanStr(d.status || '', 24) === 'waiting') doc.ref.delete().catch(() => null);
        return;
      }
      rooms.push({
        id: doc.id,
        roomName: d.roomName || 'Oda',
        hostName: d.players?.[0]?.username || '',
        currentPlayers: (d.players || []).length,
        maxPlayers: d.maxPlayers,
        mode: d.mode,
        bet: d.bet,
        status: d.status,
        isPrivate: !!d.isPrivate,
        createdAt: safeNum(d.createdAt, 0),
        updatedAt: safeNum(d.updatedAt, 0)
      });
    });
    rooms.sort((a, b) => Math.max(safeNum(b.updatedAt, 0), safeNum(b.createdAt, 0)) - Math.max(safeNum(a.updatedAt, 0), safeNum(a.createdAt, 0)));
    res.json({ ok: true, rooms: rooms.slice(0, 40) });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({ ok: true, degraded: true, rooms: [], error: 'Pişti lobisi şu an boş veya geçici olarak alınamadı.' });
  }
});

router.get('/online/resume', verifyAuth, async (req, res) => {
  try {
    const uid = cleanStr(req.user.uid || '', 160);
    const [targetedSnap, recentSnap] = await Promise.all([
      colOnlinePisti().where('participantUids', 'array-contains', uid).limit(20).get().catch(() => ({ docs: [] })),
      colOnlinePisti().orderBy('updatedAt', 'desc').limit(100).get().catch(() => ({ docs: [] }))
    ]);
    const docsById = new Map();
    [...(targetedSnap.docs || []), ...(recentSnap.docs || [])].forEach((doc) => docsById.set(doc.id, doc));
    const room = Array.from(docsById.values())
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter((item) => ['waiting', 'playing'].includes(cleanStr(item.status || '', 24)))
      .filter((item) => {
        const participantUids = Array.isArray(item.participantUids) ? item.participantUids.map((value) => cleanStr(value || '', 160)).filter(Boolean) : [];
        return participantUids.includes(uid) || (Array.isArray(item.players) && item.players.some((player) => cleanStr(player?.uid || '', 160) === uid));
      })
      .sort((a, b) => safeNum(b.updatedAt || b.createdAt, 0) - safeNum(a.updatedAt || a.createdAt, 0))[0] || null;
    res.json({ ok: true, canResume: !!room, gameType: 'pisti', room: room ? prepareRoomForSocket(room, uid) : null });
  } catch (e) { return sendPistiError(res, e); }
});

router.post('/online/play-open', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid; const mode = req.body?.mode || '2-52'; const bet = safeNum(req.body?.bet, 1000); const createOnly = req.body?.createOnly === true || req.body?.forceCreate === true || req.body?.createOnly === 'true';
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    await assertNoOtherActiveGame(uid);
    if (isNaN(bet) || bet < 1 || bet > 10000000) throw new Error('Bahis tutarı 1 ile 10.000.000 MC arasında olmalıdır.');

    const { maxPlayers, deckCount } = modeConfig(mode);
    let progressReward = null;
    let accountSync = null;
    let candidateId = null;
    if (!createOnly) {
      const snap = await colOnlinePisti().where('status', '==', 'waiting').where('isPrivate', '==', false).where('mode', '==', mode).where('bet', '==', bet).limit(8).get();
      const now = nowMs();
      for (const doc of snap.docs) {
        const data = doc.data() || {};
        if (!isOnlinePistiLobbyVisible(data, now)) { doc.ref.delete().catch(() => null); continue; }
        if ((data.players || []).length < data.maxPlayers && !(data.players || []).some(player => player.uid === uid)) { candidateId = doc.id; break; }
      }
    }

    const roomData = await db.runTransaction(async (tx) => {
      const uRef = colUsers().doc(uid); const uSnap = await tx.get(uRef);
      const rRef = candidateId ? colOnlinePisti().doc(candidateId) : null;
      const rSnap = rRef ? await tx.get(rRef) : null;
      const uBal = safeNum(uSnap.data()?.balance, 0);
      if (uBal < bet) throw new Error('Bakiye yetersiz.');

      tx.update(uRef, { balance: admin.firestore.FieldValue.increment(-bet) });
      const userData = uSnap.data() || {};
      progressReward = applySpendProgression(tx, uRef, userData, bet, 'PISTI_ONLINE_BET');
      accountSync = buildAccountSyncPayload(progressReward?.progressionOut?.nextUser || userData, { balance: uBal - bet });

      if (candidateId && rRef && rSnap?.exists) {
        const r = rSnap.data() || {};
        if (r.status === 'waiting' && (r.players || []).length < r.maxPlayers && !(r.players || []).some(player => player.uid === uid)) {
          const players = [...(r.players || []), { uid, username: uSnap.data()?.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(uSnap.data()?.avatar), selectedFrame: pickUserSelectedFrame(uSnap.data() || {}), score: 0, cardCount: 0, hand: [], lastPing: nowMs(), processingUntil: 0 }];
          recordPistiStakeLedgerInTransaction(tx, { uid, roomId: candidateId, bet, action: 'open_join', mode });
          const updated = syncPistiParticipantUids({ ...r, players, updatedAt: nowMs(), finishReason: '' });
          appendTimelineEntry(updated, buildTimelineEvent('player_joined', { actorUid: uid, roomId: candidateId, gameKey: 'pisti', status: updated.status, participantUids: players.map((player) => cleanStr(player?.uid || '', 160)) }));
          bumpStateVersion(updated);
          if (players.length === r.maxPlayers) startGame(updated);
          tx.update(rRef, updated); return { id: candidateId, ...updated };
        }
      }

      const newRoomRef = colOnlinePisti().doc();
      const roomId = newRoomRef.id;
      recordPistiStakeLedgerInTransaction(tx, { uid, roomId, bet, action: 'open_create', mode });
      const newRoom = { mode, maxPlayers, deckCount, bet, isPrivate: false, roomName: 'Açık Masa', password: '', players: [{ uid, username: uSnap.data()?.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(uSnap.data()?.avatar), selectedFrame: pickUserSelectedFrame(uSnap.data() || {}), score: 0, cardCount: 0, hand: [], lastPing: nowMs(), processingUntil: 0 }], participantUids: [uid], tableCards: [], deck: [], turn: 0, status: 'waiting', finishReason: '', cleanupAt: 0, resumeAvailableUntil: 0, createdAt: nowMs(), updatedAt: nowMs(), stateVersion: 1, settlementStatus: GAME_SETTLEMENT_STATUS.ACTIVE, resultCode: '', resultReason: '', settledAt: 0, payoutByUid: {}, timeline: [buildTimelineEvent('room_created', { actorUid: uid, roomId, gameKey: 'pisti', status: 'waiting', participantUids: [uid], meta: { mode, bet, createOnly } })] };
      syncPistiParticipantUids(newRoom); tx.set(newRoomRef, newRoom); return { id: roomId, ...newRoom };
    });

    recordPistiProgressLedger(uid, progressReward, `pisti_online:${roomData.id}:${uid}:open`, { mode, bet, action: 'open', roomId: roomData.id });
    res.json({ ok: true, room: prepareRoomForSocket(roomData, uid), ...(accountSync || {}) });
    const io = req.app.get('io');
    if (io) io.to(`pisti_${roomData.id}`).emit('pisti:update', { id: roomData.id, sender: 'system' });
  } catch (e) { return sendPistiError(res, e); }
});

router.post('/online/create-private', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid; const bet = safeNum(req.body?.bet, 1000);
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    await assertNoOtherActiveGame(uid);
    const { maxPlayers, deckCount } = modeConfig(req.body?.mode || '2-52');
    if (isNaN(bet) || bet < 1 || bet > 10000000) throw new Error('Bahis tutarı 1 ile 10.000.000 MC arasında olmalıdır.');
    let progressReward = null;
    let accountSync = null;

    const roomData = await db.runTransaction(async (tx) => {
      const uRef = colUsers().doc(uid); const uSnap = await tx.get(uRef);
      const userData = uSnap.data() || {};
      const userBal = safeNum(userData.balance, 0);
      if (userBal < bet) throw new Error('Bakiye yetersiz.');
      tx.update(uRef, { balance: admin.firestore.FieldValue.increment(-bet) });
      progressReward = applySpendProgression(tx, uRef, uSnap.data() || {}, bet, 'PISTI_ONLINE_BET');
      accountSync = buildAccountSyncPayload(progressReward?.progressionOut?.nextUser || userData, { balance: userBal - bet });

      const newRoomRef = colOnlinePisti().doc();
      const roomId = newRoomRef.id;
      recordPistiStakeLedgerInTransaction(tx, { uid, roomId, bet, action: 'private_create', mode: req.body?.mode || '2-52' });
      const newRoom = { mode: req.body?.mode || '2-52', maxPlayers, deckCount, bet, isPrivate: true, roomName: req.body?.roomName || 'Özel Oda', passwordHash: hashRoomPassword(req.body?.password || '', roomId), players: [{ uid, username: uSnap.data()?.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(uSnap.data()?.avatar), selectedFrame: pickUserSelectedFrame(uSnap.data() || {}), score: 0, cardCount: 0, hand: [], lastPing: nowMs(), processingUntil: 0 }], participantUids: [uid], tableCards: [], deck: [], turn: 0, status: 'waiting', finishReason: '', cleanupAt: 0, resumeAvailableUntil: 0, createdAt: nowMs(), updatedAt: nowMs(), stateVersion: 1, settlementStatus: GAME_SETTLEMENT_STATUS.ACTIVE, resultCode: '', resultReason: '', settledAt: 0, payoutByUid: {}, timeline: [buildTimelineEvent('room_created', { actorUid: uid, roomId, gameKey: 'pisti', status: 'waiting', participantUids: [uid], meta: { mode: req.body?.mode || '2-52', bet, private: true } })] };
      syncPistiParticipantUids(newRoom); tx.set(newRoomRef, newRoom); return { id: roomId, ...newRoom };
    });
    recordPistiProgressLedger(uid, progressReward, `pisti_online:${roomData.id}:${uid}:private`, { mode: req.body?.mode || '2-52', bet, action: 'private' });
    res.json({ ok: true, room: prepareRoomForSocket(roomData, uid), ...(accountSync || {}) });
  } catch (e) { return sendPistiError(res, e); }
});

router.post('/online/join', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid; const roomId = req.body?.roomId;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    await assertNoOtherActiveGame(uid, { allowRoomId: roomId || '' });
    let progressReward = null;
    let accountSync = null;
    const roomData = await db.runTransaction(async (tx) => {
      const uRef = colUsers().doc(uid); const uSnap = await tx.get(uRef);
      const rRef = colOnlinePisti().doc(roomId); const rSnap = await tx.get(rRef);
      if (!rSnap.exists) throw new Error('Oda bulunamadı.');
      const r = rSnap.data() || {};

      if ((r.players || []).some(player => player.uid === uid)) {
        const players = (r.players || []).map((player) => player.uid === uid ? { ...player, username: uSnap.data()?.username || player.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(uSnap.data()?.avatar || player.avatar), selectedFrame: pickUserSelectedFrame(uSnap.data() || {}), lastPing: nowMs() } : player);
        const updatedExisting = syncPistiParticipantUids({ ...r, players, updatedAt: nowMs() });
        bumpStateVersion(updatedExisting);
        tx.update(rRef, updatedExisting); return { id: roomId, ...updatedExisting };
      }

      if (r.status !== 'waiting') throw new Error('Bu oda dolmuş.');
      if ((r.players || []).length >= safeNum(r.maxPlayers, 0)) throw new Error('Bu oda dolmuş.');
      if (r.isPrivate && !verifyRoomPassword(r, req.body?.password || '', roomId)) throw new Error('Hatalı Şifre!');
      const userData = uSnap.data() || {};
      const userBal = safeNum(userData.balance, 0);
      if (userBal < r.bet) throw new Error('Bakiye yetersiz.');

      tx.update(uRef, { balance: admin.firestore.FieldValue.increment(-r.bet) });
      progressReward = applySpendProgression(tx, uRef, userData, r.bet, 'PISTI_ONLINE_JOIN');
      accountSync = buildAccountSyncPayload(progressReward?.progressionOut?.nextUser || userData, { balance: userBal - r.bet });
      recordPistiStakeLedgerInTransaction(tx, { uid, roomId, bet: r.bet, action: 'join', mode: r.mode });

      const players = [...(r.players || []), { uid, username: uSnap.data()?.username || 'Oyuncu', avatar: sanitizePublicAvatarForOutput(uSnap.data()?.avatar), selectedFrame: pickUserSelectedFrame(uSnap.data() || {}), score: 0, cardCount: 0, hand: [], lastPing: nowMs(), processingUntil: 0 }];
      const updated = syncPistiParticipantUids({ ...r, players, updatedAt: nowMs(), finishReason: '' });
      appendTimelineEntry(updated, buildTimelineEvent('player_joined', { actorUid: uid, roomId, gameKey: 'pisti', status: updated.status, participantUids: players.map((player) => cleanStr(player?.uid || '', 160)) }));
      bumpStateVersion(updated);
      if (players.length === r.maxPlayers) startGame(updated);
      tx.update(rRef, updated); return { id: roomId, ...updated };
    });

    recordPistiProgressLedger(uid, progressReward, `pisti_online:${roomData.id}:${uid}:join`, { bet: safeNum(roomData?.bet, 0), action: 'join', roomId: roomData.id });
    res.json({ ok: true, room: prepareRoomForSocket(roomData, uid), ...(accountSync || {}) });
    const io = req.app.get('io');
    if (io && roomData.status === 'playing') io.to(`pisti_${roomData.id}`).emit('pisti:update', { id: roomData.id, sender: 'system' });
  } catch (e) { return sendPistiError(res, e); }
});

router.post('/online/leave', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid; const roomId = req.body?.roomId;
    if (!roomId) throw new Error('Oda ID gerekli.');
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});

    const result = await db.runTransaction(async (tx) => {
      const rRef = colOnlinePisti().doc(roomId); const rSnap = await tx.get(rRef);
      if (!rSnap.exists) return null;

      const r = rSnap.data() || {};
      if (r.status === 'finished' || r.status === 'abandoned') return { room: { id: roomId, ...r } };
      const isPlayer = (r.players || []).some(player => player.uid === uid);
      if (!isPlayer) throw new Error('Bu Pişti odasında ayrılma yetkiniz yok.');

      if (r.status === 'waiting') {
        tx.update(colUsers().doc(uid), { balance: admin.firestore.FieldValue.increment(r.bet) });
        recordGameLedgerInTransaction(tx, {
          uid,
          gameType: 'pisti',
          source: 'pisti_waiting_refund',
          referenceId: roomId,
          roomId,
          matchId: roomId,
          amount: Math.floor(safeNum(r.bet, 0)),
          stake: safeNum(r.bet, 0),
          payout: safeNum(r.bet, 0),
          resultCode: GAME_RESULT_CODES.PISTI_WAITING_CANCELLED,
          settlementStatus: GAME_SETTLEMENT_STATUS.CANCELLED,
          actorUid: uid,
          subjectUid: uid,
          meta: { reason: 'leave_waiting', mode: cleanStr(r.mode || '', 16) },
          idempotencyKey: `pisti:${roomId}:${uid}:waiting_refund`
        });
        const remaining = (r.players || []).filter(player => player.uid !== uid);
        const refundSnapshot = syncPistiParticipantUids({ ...r, id: roomId, players: remaining, updatedAt: nowMs() });
        appendTimelineEntry(refundSnapshot, buildTimelineEvent('player_left', { actorUid: uid, roomId, gameKey: 'pisti', status: refundSnapshot.status, reason: 'leave_waiting', participantUids: remaining.map((player) => cleanStr(player?.uid || '', 160)), meta: { resultCode: GAME_RESULT_CODES.PISTI_WAITING_CANCELLED, refundedUid: uid, refundAmount: safeNum(r.bet, 0) } }));
        bumpStateVersion(refundSnapshot);
        if (remaining.length === 0) {
          tx.delete(rRef);
          return { deleted: true, room: { id: roomId, ...refundSnapshot }, waitingRefund: true, resultCode: GAME_RESULT_CODES.PISTI_WAITING_CANCELLED };
        }
        tx.update(rRef, refundSnapshot);
        return { room: { id: roomId, ...refundSnapshot }, waitingRefund: true, resultCode: GAME_RESULT_CODES.PISTI_WAITING_CANCELLED };
      }

      const now = nowMs(); const droppedUids = [];
      for (const player of r.players || []) {
        if (player.uid === uid) { droppedUids.push(player.uid); continue; }
        if (now - safeNum(player.lastPing, 0) > PISTI_DISCONNECT_GRACE_MS) droppedUids.push(player.uid);
      }

      const finalized = await finalizeOnlinePistiByDisconnect(r, tx, droppedUids, roomId, 'leave');
      tx.update(rRef, finalized.room); return { room: { id: roomId, ...finalized.room } };
    });

    if (result?.waitingRefund) {
        await recordGameAudit({
          gameType: 'pisti',
          entityType: 'match',
          entityId: roomId,
          roomId,
          eventType: 'waiting_room_cancelled',
          resultCode: GAME_RESULT_CODES.PISTI_WAITING_CANCELLED,
          reason: 'leave_waiting',
          status: GAME_SETTLEMENT_STATUS.CANCELLED,
          actorUid: uid,
          subjectUid: uid,
          amount: safeNum(result?.room?.bet, 0),
          payout: safeNum(result?.room?.bet, 0),
          meta: { mode: cleanStr(result?.room?.mode || '', 16) },
          idempotencyKey: `pisti:${roomId}:${uid}:waiting_cancelled`
        }).catch(() => null);
    }

    if (result?.room && ['finished', 'abandoned'].includes(cleanStr(result.room.status || '', 24))) {
        const rewardAmount = getOnlinePistiRewardAmount(result.room);
        await persistPistiSettlementArtifacts(result.room, roomId, result.room.finishReason || 'leave', rewardAmount);
        emitPistiRewardSideEffects(result.room, roomId, rewardAmount, 'pisti_leave_win');
    }

    const io = req.app.get('io');
    if (io && result && !result.deleted) io.to(`pisti_${roomId}`).emit('pisti:update', { id: roomId, sender: 'system' });
    res.json({ ok: true, room: result && !result.deleted ? prepareRoomForSocket(result.room, uid) : null });
  } catch (e) { return sendPistiError(res, e); }
});

router.get('/online/state/:id', verifyAuth, async (req, res) => {
  try {
    const snap = await colOnlinePisti().doc(req.params.id).get();
    if (!snap.exists) throw new Error('Oda bulunamadı.');
    const room = { id: req.params.id, ...(snap.data() || {}) };
    const isPlayerInRoom = (room.players || []).some(player => player.uid === req.user.uid);
    if (!isPlayerInRoom) throw new Error('Bu odanın durumunu görüntüleme yetkiniz yok.');
    res.json({ ok: true, room: prepareRoomForSocket(room, req.user.uid) });
  } catch (e) { return sendPistiError(res, e); }
});

router.post('/online/ping', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid; const roomId = req.body?.roomId;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    const result = await db.runTransaction(async (tx) => {
      const rRef = colOnlinePisti().doc(roomId); const snap = await tx.get(rRef);
      if (!snap.exists) throw new Error('Oda Yok');
      const r = snap.data() || {};

      if (r.status === 'finished' || r.status === 'abandoned') return { room: { id: roomId, ...r } };
      const isPlayerInRoom = (r.players || []).some(player => cleanStr(player?.uid || '', 160) === uid);
      if (!isPlayerInRoom) throw new Error('Bu Pişti odasında ping yetkiniz yok.');
      const now = nowMs(); const droppedUids = [];
      const nextPlayers = (r.players || []).map(player => {
        const nextPlayer = { ...player };
        if (nextPlayer.uid === uid) nextPlayer.lastPing = now;
        if (now - safeNum(nextPlayer.lastPing, 0) > PISTI_DISCONNECT_GRACE_MS) droppedUids.push(nextPlayer.uid);
        return nextPlayer;
      });

      r.players = nextPlayers; syncPistiParticipantUids(r); r.updatedAt = now;
      if (r.status === 'playing' && droppedUids.length > 0) {
        const finalized = await finalizeOnlinePistiByDisconnect(r, tx, droppedUids, roomId, 'disconnect');
        tx.update(rRef, finalized.room); return { room: { id: roomId, ...finalized.room } };
      }

      tx.update(rRef, { players: r.players, updatedAt: now }); return { room: { id: roomId, ...r } };
    });

    if (result?.room && ['finished', 'abandoned'].includes(cleanStr(result.room.status || '', 24))) {
        const rewardAmount = getOnlinePistiRewardAmount(result.room);
        await persistPistiSettlementArtifacts(result.room, roomId, result.room.finishReason || 'disconnect', rewardAmount);
        emitPistiRewardSideEffects(result.room, roomId, rewardAmount, 'pisti_disconnect_win');
    }

    const io = req.app.get('io');
    const room = result?.room || null;

    if (room && (room.status === 'finished' || room.status === 'abandoned')) {
      schedulePistiRoomRemoval(roomId, room.status === 'finished' ? PISTI_RESULT_RETENTION_MS : PISTI_DISCONNECT_GRACE_MS);
      if (io) io.to(`pisti_${roomId}`).emit('pisti:update', { id: roomId, sender: 'system' });
    }

    res.json({ ok: true, status: room?.status, room: prepareRoomForSocket(room, uid) });
  } catch (e) { return sendPistiError(res, e); }
});

router.post('/online/play', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid; const roomId = req.body?.roomId;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    const cardIndex = safeNum(req.body?.cardIndex, -1); const cardToken = typeof req.body?.cardToken === 'string' ? req.body.cardToken : '';

    const result = await db.runTransaction(async (tx) => {
      const rRef = colOnlinePisti().doc(roomId); const rSnap = await tx.get(rRef);
      if (!rSnap.exists) throw new Error('Oda bulunamadı.');
      const r = rSnap.data() || {};

      if (r.status !== 'playing') throw new Error('Oyun aktif değil.');
      const playerIdx = (r.players || []).findIndex(player => player.uid === uid);
      if (playerIdx === -1) throw new Error('Oyuncu odada bulunamadı.');
      if (r.turn !== playerIdx) throw new Error('Sıra sizde değil.');

      const player = r.players[playerIdx]; const now = nowMs();
      player.lastPing = now;
      if (safeNum(player.processingUntil, 0) > now) throw new Error('Hamleniz işleniyor.');
      if (cardIndex < 0 || cardIndex >= (player.hand || []).length) throw new Error('Geçersiz kart.');
      if (!cardToken || player.hand[cardIndex] !== cardToken) throw new Error('Kart doğrulaması başarısız.');

      player.processingUntil = now + 1500;
      const tableBefore = [...(r.tableCards || [])]; const playedCard = player.hand.splice(cardIndex, 1)[0];
      const capture = checkPistiCaptureMulti(r.tableCards || [], playedCard); const hideFirstThree = !!r.isFirstDeal;

      r.lastEvent = { type: capture.isPisti ? 'pisti' : (capture.captured ? 'capture' : 'play'), uid, card: playedCard, tableBefore, hideFirstThree, ts: now };

      if (capture.captured) {
        player.score = safeNum(player.score, 0) + capture.points;
        player.cardCount = safeNum(player.cardCount, 0) + capture.collected.length;
        r.lastCapturer = uid; r.tableCards = []; r.isFirstDeal = false;
      } else { r.tableCards.push(playedCard); }

      r.turn = (r.turn + 1) % r.players.length; dealIfNeeded(r);

      if ((r.players || []).every(pl => (pl.hand || []).length === 0) && (!Array.isArray(r.deck) || r.deck.length === 0)) {
        const finalized = await finalizeGame(r, tx, roomId);
        Object.assign(r, finalized.room);
      }

      r.updatedAt = nowMs(); bumpStateVersion(r); tx.update(rRef, r); return { room: { id: roomId, ...r } };
    });

    if (result?.room?.status === 'finished') {
        const rewardAmount = getOnlinePistiRewardAmount(result.room);
        await persistPistiSettlementArtifacts(result.room, roomId, result.room.finishReason || 'normal_finish', rewardAmount);
        emitPistiRewardSideEffects(result.room, roomId, rewardAmount, 'pisti_win');
    }

    const io = req.app.get('io');
    if (result.room.status === 'finished') schedulePistiRoomRemoval(roomId, PISTI_RESULT_RETENTION_MS);
    if (io) io.to(`pisti_${roomId}`).emit('pisti:update', { id: roomId, sender: uid });

    res.json({ ok: true, room: prepareRoomForSocket(result.room, uid) });
  } catch (e) { return sendPistiError(res, e); }
});

function createPistiDeck() {
    const suits = ["H", "D", "C", "S"]; 
    const vals = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "0", "J", "Q", "K"]; 
    let deck = [];
    suits.forEach(s => vals.forEach(v => deck.push(v + s)));
    for (let i = deck.length - 1; i > 0; i--) { const j = crypto.randomInt(0, i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
}
function calculateCardPoints(cards) {
    let pts = 0;
    for (let c of cards) { if (c === '0D') pts += 3; else if (c === '2C') pts += 2; else if (c[0] === 'A' || c[0] === 'J') pts += 1; }
    return pts;
}
function checkPistiCaptureSingle(tableCards, playedCard) {
    if (tableCards.length === 0) return { captured: false, isPisti: false, points: 0, collected: [] };
    const topCard = tableCards[tableCards.length - 1];
    const isJack = playedCard[0] === 'J'; const isMatch = playedCard[0] === topCard[0];
    if (isJack || isMatch) {
        const collected = [...tableCards, playedCard];
        const isPisti = (tableCards.length === 1 && isMatch); 
        let pistiPoints = isPisti ? (isJack ? 20 : 10) : 0;
        return { captured: true, isPisti: isPisti, points: pistiPoints + calculateCardPoints(collected), collected: collected };
    }
    return { captured: false, isPisti: false, points: 0, collected: [] };
}

router.get('/state', verifyAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
        const [snap, uSnap] = await Promise.all([colPisti().doc(uid).get(), colUsers().doc(uid).get()]);
        const balance = uSnap.exists ? safeNum(uSnap.data()?.balance, 0) : 0;
        if (!snap.exists) return res.json({ ok: true, state: null, balance });
        const data = snap.data();
        res.json({ ok: true, state: { status: data.status, bet: data.bet, playerHand: data.playerHand, botCardCount: data.botHand.length, tableCards: data.tableCards, playerScore: data.playerScore, botScore: data.botScore, round: data.round }, balance });
    } catch(e) { res.json({ ok: false, error: e.message }); }
});

router.post('/start', verifyAuth, async (req, res) => {
    try {
        const uid = req.user.uid; const bet = safeNum(req.body.bet, 0);
        if (isNaN(bet) || bet < 1 || bet > 10000000) throw new Error('Bahis tutarı 1 ile 10.000.000 MC arasında olmalıdır.');
        let progressReward = null;
        const { session, balanceAfter } = await db.runTransaction(async (tx) => {
            const existing = await tx.get(colPisti().doc(uid));
            if (existing.exists && existing.data().status === 'playing') throw new Error('Devam eden oyununuz var.');
            const uSnap = await tx.get(colUsers().doc(uid));
            const userBal = safeNum(uSnap.data()?.balance, 0);
            if (userBal < bet) throw new Error('Bakiye yetersiz.');
            tx.update(colUsers().doc(uid), { balance: admin.firestore.FieldValue.increment(-bet) });
            progressReward = applySpendProgression(tx, colUsers().doc(uid), uSnap.data() || {}, bet, 'PISTI_BET');
            const balanceAfter = userBal - bet;
            const deck = createPistiDeck();
            const tableCards = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
            const playerHand = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
            const botHand = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
            const newSession = { uid, status: 'playing', bet, deck, tableCards, playerHand, botHand, playerScore: 0, botScore: 0, playerCardCount: 0, botCardCount: 0, lastCapturer: null, round: 1, updatedAt: nowMs() };
            tx.set(colPisti().doc(uid), newSession); return { session: newSession, balanceAfter };
        });
        res.json({
            ok: true,
            state: { status: session.status, bet: session.bet, playerHand: session.playerHand, botCardCount: session.botHand.length, tableCards: session.tableCards, playerScore: session.playerScore, botScore: session.botScore, round: session.round },
            balance: balanceAfter,
            ...buildAccountSyncPayload(progressReward?.progressionOut?.nextUser || {}, { balance: balanceAfter })
        });
    } catch(e) { res.json({ ok: false, error: e.message }); }
});

router.post('/play', verifyAuth, bjActionLimiter, async (req, res) => {
    try {
        const uid = req.user.uid; const cardIndex = safeNum(req.body.cardIndex, -1);
        const result = await db.runTransaction(async (tx) => {
            const [sSnap, uSnap] = await Promise.all([tx.get(colPisti().doc(uid)), tx.get(colUsers().doc(uid))]);
            if (!sSnap.exists || sSnap.data().status !== 'playing') throw new Error('Aktif oyun yok.');
            const s = sSnap.data(); let balanceAfter = uSnap.exists ? safeNum(uSnap.data()?.balance, 0) : 0;
            if (cardIndex < 0 || cardIndex >= s.playerHand.length) throw new Error('Geçersiz kart.');

            let actionLog = { playerAction: null, botAction: null, roundOver: false, gameOver: false, winAmount: 0 };
            const playedCard = s.playerHand.splice(cardIndex, 1)[0];
            const pCapture = checkPistiCaptureSingle(s.tableCards, playedCard);
            actionLog.playerAction = { card: playedCard, isPisti: pCapture.isPisti, captured: pCapture.captured };

            if (pCapture.captured) { s.playerScore += pCapture.points; s.playerCardCount += pCapture.collected.length; s.lastCapturer = 'player'; s.tableCards = []; } 
            else { s.tableCards.push(playedCard); }

            if (s.botHand.length > 0) {
                let botCardIdx = -1;
                if (s.tableCards.length > 0) {
                    const topCard = s.tableCards[s.tableCards.length - 1];
                    botCardIdx = s.botHand.findIndex(c => c[0] === topCard[0]); 
                    if (botCardIdx === -1 && s.tableCards.length >= 2) botCardIdx = s.botHand.findIndex(c => c[0] === 'J'); 
                }
                if (botCardIdx === -1) { botCardIdx = s.botHand.findIndex(c => c[0] !== 'J'); if(botCardIdx === -1) botCardIdx = 0; }
                const botCard = s.botHand.splice(botCardIdx, 1)[0];
                const bCapture = checkPistiCaptureSingle(s.tableCards, botCard);
                actionLog.botAction = { card: botCard, isPisti: bCapture.isPisti, captured: bCapture.captured };

                if (bCapture.captured) { s.botScore += bCapture.points; s.botCardCount += bCapture.collected.length; s.lastCapturer = 'bot'; s.tableCards = []; } 
                else { s.tableCards.push(botCard); }
            }

            if (s.playerHand.length === 0 && s.botHand.length === 0) {
                if (s.deck.length >= 8) {
                    s.playerHand = [s.deck.pop(), s.deck.pop(), s.deck.pop(), s.deck.pop()]; s.botHand = [s.deck.pop(), s.deck.pop(), s.deck.pop(), s.deck.pop()];
                    s.round += 1; actionLog.roundOver = true;
                } else {
                    s.status = 'finished'; actionLog.gameOver = true;
                    if (s.tableCards.length > 0 && s.lastCapturer) {
                        const finalPts = calculateCardPoints(s.tableCards);
                        if(s.lastCapturer === 'player') { s.playerCardCount += s.tableCards.length; s.playerScore += finalPts; }
                        else { s.botCardCount += s.tableCards.length; s.botScore += finalPts; }
                    }
                    if (s.playerCardCount > s.botCardCount) s.playerScore += 3;
                    else if (s.botCardCount > s.playerCardCount) s.botScore += 3;

                    if (s.playerScore > s.botScore) { actionLog.winAmount = s.bet * 2; tx.update(colUsers().doc(uid), { balance: admin.firestore.FieldValue.increment(actionLog.winAmount) }); balanceAfter += actionLog.winAmount; } 
                    else if (s.playerScore === s.botScore) { actionLog.winAmount = s.bet; tx.update(colUsers().doc(uid), { balance: admin.firestore.FieldValue.increment(actionLog.winAmount) }); balanceAfter += actionLog.winAmount; }
                }
            }
            s.updatedAt = nowMs(); tx.set(colPisti().doc(uid), s);
            return { state: { status: s.status, bet: s.bet, playerHand: s.playerHand, botCardCount: s.botHand.length, tableCards: s.tableCards, playerScore: s.playerScore, botScore: s.botScore, round: s.round }, log: actionLog, balance: balanceAfter };
        });

        if (result.state.status === 'finished') { setTimeout(() => colPisti().doc(uid).delete().catch(()=>null), 5000); }
        res.json({ ok: true, ...result });
    } catch(e) { res.json({ ok: false, error: e.message }); }
});

module.exports = router;