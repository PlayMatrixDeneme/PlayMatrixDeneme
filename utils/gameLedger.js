'use strict';

const crypto = require('crypto');
const { db, admin } = require('../config/firebase');
const { cleanStr, nowMs, safeNum, safeSignedNum } = require('./helpers');

const colGameLedger = () => db.collection('game_ledger');

function buildGameLedgerDocId({ uid = '', gameType = '', source = '', referenceId = '', idempotencyKey = '' } = {}) {
  const safeIdempotencyKey = cleanStr(idempotencyKey || '', 220);
  if (safeIdempotencyKey) return `idem_${safeIdempotencyKey}`;
  const basis = [cleanStr(uid || '', 160), cleanStr(gameType || '', 32), cleanStr(source || '', 80), cleanStr(referenceId || '', 180)].join('|');
  const digest = crypto.createHash('sha256').update(basis).digest('hex');
  return `auto_${digest.slice(0, 56)}`;
}

function normalizeGameLedgerPayload(input = {}) {
  const uid = cleanStr(input.uid || '', 160);
  const gameType = cleanStr(input.gameType || '', 32).toLowerCase();
  const source = cleanStr(input.source || '', 80).toLowerCase();
  const referenceId = cleanStr(input.referenceId || input.roomId || input.roundId || '', 180);
  if (!uid || !gameType || !source || !referenceId) return null;

  const amount = Math.floor(safeSignedNum(input.amount, 0));
  const stake = Math.max(0, Math.floor(safeNum(input.stake, 0)));
  const payout = Math.max(0, Math.floor(safeNum(input.payout, 0)));
  const createdAt = safeNum(input.createdAt, nowMs());
  const idempotencyKey = cleanStr(input.idempotencyKey || '', 220);

  return {
    uid,
    gameType,
    source,
    referenceId,
    roomId: cleanStr(input.roomId || '', 160),
    roundId: cleanStr(input.roundId || '', 160),
    betId: cleanStr(input.betId || '', 180),
    matchId: cleanStr(input.matchId || input.roomId || '', 180),
    amount,
    currency: cleanStr(input.currency || 'MC', 16) || 'MC',
    direction: amount > 0 ? 'credit' : (amount < 0 ? 'debit' : 'neutral'),
    stake,
    payout,
    balanceDelta: amount,
    resultCode: cleanStr(input.resultCode || '', 64),
    settlementStatus: cleanStr(input.settlementStatus || '', 24),
    actorUid: cleanStr(input.actorUid || uid, 160),
    subjectUid: cleanStr(input.subjectUid || uid, 160),
    status: cleanStr(input.status || 'committed', 32) || 'committed',
    idempotencyKey,
    meta: input.meta && typeof input.meta === 'object' ? input.meta : {},
    createdAt,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
}

function recordGameLedgerInTransaction(tx, input = {}) {
  if (!tx || typeof tx.set !== 'function') throw new Error('GAME_LEDGER_TRANSACTION_REQUIRED');
  const payload = normalizeGameLedgerPayload(input);
  if (!payload) return null;
  const docId = buildGameLedgerDocId(payload);
  const ref = colGameLedger().doc(docId);
  tx.set(ref, payload, { merge: true });
  return { id: docId, ...payload };
}

async function recordGameLedger(input = {}) {
  const payload = normalizeGameLedgerPayload(input);
  if (!payload) return null;
  const docId = buildGameLedgerDocId(payload);
  const ref = colGameLedger().doc(docId);
  await ref.set(payload, { merge: true });
  return { id: docId, ...payload };
}

module.exports = {
  buildGameLedgerDocId,
  normalizeGameLedgerPayload,
  recordGameLedger,
  recordGameLedgerInTransaction
};
