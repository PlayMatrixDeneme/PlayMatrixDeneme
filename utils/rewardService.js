'use strict';

const { db, admin } = require('../config/firebase');
const { cleanStr, safeNum, nowMs } = require('./helpers');
const { createNotification } = require('./notifications');
const { normalizeRewardSource, buildLedgerDocId, normalizeRewardLedgerItem } = require('./rewardLedger');
const { getRewardDefinition, getRewardAmount, buildRewardGrantMessage } = require('../config/rewardCatalog');
const { buildProgressionPatch } = require('./economyCore');

const colUsers = () => db.collection('users');
const colRewardLedger = () => db.collection('reward_ledger');
const colAdminBulkRewardRuns = () => db.collection('admin_bulk_reward_runs');
const REWARD_SERVICE_VERSION = 1;

function sanitizeRewardAmount(source = '', amount = 0) {
  const definition = getRewardDefinition(source);
  const fixedAmount = getRewardAmount(source, 0);
  const requested = Math.floor(safeNum(amount, 0));
  if (requested > 0) return requested;
  if (fixedAmount > 0) return fixedAmount;
  if (definition?.grantType === 'variable' || definition?.grantType === 'range' || definition?.grantType === 'ladder' || definition?.grantType === 'pot_based') {
    throw new Error(`REWARD_AMOUNT_REQUIRED:${definition.source}`);
  }
  throw new Error(`INVALID_REWARD_AMOUNT:${cleanStr(source || '', 80)}`);
}

function sanitizeRewardGrantInput(input = {}) {
  const safeUid = cleanStr(input.uid || '', 160);
  if (!safeUid) throw new Error('REWARD_UID_REQUIRED');
  const normalized = normalizeRewardSource(input.source || 'reward', input.meta || {});
  const definition = getRewardDefinition(normalized.source);
  if (!definition) throw new Error(`UNKNOWN_REWARD_SOURCE:${normalized.source}`);
  const amount = sanitizeRewardAmount(normalized.source, input.amount);
  const currency = cleanStr(input.currency || definition.currency || 'MC', 16) || definition.currency || 'MC';
  const referenceId = cleanStr(input.referenceId || '', 180);
  const idempotencyKey = cleanStr(input.idempotencyKey || '', 220);
  const actorUid = cleanStr(input.actorUid || '', 160);
  const reason = cleanStr(input.reason || normalized.meta?.reason || '', 240);
  const meta = {
    ...(normalized.meta && typeof normalized.meta === 'object' ? normalized.meta : {}),
    ...(input.meta && typeof input.meta === 'object' ? input.meta : {})
  };
  if (actorUid) meta.actorUid = actorUid;
  if (reason) meta.reason = reason;
  return { uid: safeUid, amount, currency, source: normalized.source, originalSource: normalized.originalSource, referenceId, idempotencyKey, actorUid, reason, meta, definition };
}

function buildRewardLedgerPayload(grant = {}) {
  const createdAt = nowMs();
  return {
    uid: grant.uid,
    amount: grant.amount,
    currency: grant.currency,
    source: grant.source,
    originalSource: grant.originalSource,
    referenceId: grant.referenceId,
    meta: grant.meta || {},
    idempotencyKey: grant.idempotencyKey || '',
    policyVersion: REWARD_SERVICE_VERSION,
    status: 'committed',
    createdAt,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function applyRewardGrantInTransaction(tx, input = {}) {
  if (!tx || typeof tx.get !== 'function') throw new Error('REWARD_TRANSACTION_REQUIRED');
  const grant = sanitizeRewardGrantInput(input);
  const ledgerId = buildLedgerDocId({ uid: grant.uid, currency: grant.currency, source: grant.source, referenceId: grant.referenceId, idempotencyKey: grant.idempotencyKey });
  const ledgerRef = colRewardLedger().doc(ledgerId);
  const ledgerSnap = await tx.get(ledgerRef);
  if (ledgerSnap.exists) {
    return { ...normalizeRewardLedgerItem(ledgerSnap), id: ledgerRef.id, duplicated: true, notificationRequired: false };
  }
  const payload = buildRewardLedgerPayload(grant);
  const userRef = input.userRef || colUsers().doc(grant.uid);
  const updateUser = input.updateUser !== false;
  const userPatch = input.userPatch && typeof input.userPatch === 'object' ? input.userPatch : {};
  const creditBalance = input.creditBalance !== false && grant.currency === 'MC';
  const creditProgression = input.creditProgression !== false && grant.currency === 'XP';
  const committedAt = nowMs();
  let progressionPatch = null;
  if (updateUser && creditProgression) {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error('REWARD_USER_NOT_FOUND');
    const progress = buildProgressionPatch(userSnap.data() || {}, {
      xpEarned: grant.amount,
      activityEarned: safeNum(grant.meta?.activityEarned, 0),
      roundsEarned: safeNum(grant.meta?.roundsEarned, 0),
      spentMc: safeNum(grant.meta?.spentMc, 0),
      source: grant.source,
      referenceId: grant.referenceId,
      updatedAt: committedAt
    });
    progressionPatch = progress.patch;
  }
  tx.set(ledgerRef, payload, { merge: false });
  if (updateUser) {
    const patch = { updatedAt: committedAt, lastRewardAt: committedAt, lastRewardSource: grant.source, lastRewardAmount: grant.amount, lastRewardLedgerId: ledgerRef.id, ...userPatch };
    if (creditBalance) patch.balance = admin.firestore.FieldValue.increment(grant.amount);
    if (progressionPatch) Object.assign(patch, progressionPatch);
    tx.set(userRef, patch, { merge: true });
  }
  return { ...payload, id: ledgerRef.id, duplicated: false, notificationRequired: true, definition: grant.definition };
}

async function createRewardNotificationForGrant(grant = {}, options = {}) {
  if (!grant || grant.duplicated || grant.notificationRequired === false) return null;
  const source = cleanStr(grant.source || '', 80);
  const amount = Math.floor(safeNum(grant.amount, 0));
  const uid = cleanStr(grant.uid || '', 160);
  if (!uid || !source || amount <= 0) return null;
  const message = buildRewardGrantMessage(source, { amount, currency: grant.currency || 'MC', meta: grant.meta || {}, title: options.title });
  const data = { source: message.source, amount, amountLabel: message.amountLabel, currency: grant.currency || message.currency || 'MC', referenceId: cleanStr(grant.referenceId || '', 180), ledgerId: cleanStr(grant.id || '', 180), ...(options.data && typeof options.data === 'object' ? options.data : {}) };
  return createNotification({ uid, type: 'reward', title: message.title, body: options.body || message.body, data, idempotencyKey: cleanStr(options.idempotencyKey || `reward_notification:${grant.id || `${uid}:${source}:${grant.referenceId}`}`, 220) });
}

async function grantReward(input = {}) {
  const grant = await db.runTransaction((tx) => applyRewardGrantInTransaction(tx, input));
  const notification = await createRewardNotificationForGrant(grant, input.notification || {}).catch(() => null);
  return { ...grant, notification };
}

function chunkArray(items = [], size = 10) {
  const chunks = [];
  const safeSize = Math.max(1, Math.floor(safeNum(size, 10)));
  for (let i = 0; i < items.length; i += safeSize) chunks.push(items.slice(i, i + safeSize));
  return chunks;
}

function sanitizeBulkRewardRunInput(input = {}) {
  const source = normalizeRewardSource(input.source || 'admin_bulk_grant', input.meta || {}).source;
  const amount = sanitizeRewardAmount(source, input.amount);
  const bulkId = cleanStr(input.bulkId || input.referenceId || '', 180);
  if (!bulkId) throw new Error('BULK_REWARD_ID_REQUIRED');
  const actorUid = cleanStr(input.actorUid || '', 160);
  const reason = cleanStr(input.reason || '', 240);
  const currency = cleanStr(input.currency || getRewardDefinition(source)?.currency || 'MC', 16) || 'MC';
  const meta = input.meta && typeof input.meta === 'object' ? { ...input.meta } : {};
  return { bulkId, source, amount, currency, actorUid, reason, meta };
}

function assertCompatibleBulkRewardRun(previous = {}, next = {}) {
  const checks = ['source', 'amount', 'currency', 'actorUid', 'reason'];
  for (const key of checks) {
    if (cleanStr(previous[key] ?? '', 240) !== cleanStr(next[key] ?? '', 240)) {
      const error = new Error(`BULK_REWARD_IDEMPOTENCY_CONFLICT:${key}`);
      error.code = 'BULK_REWARD_IDEMPOTENCY_CONFLICT';
      throw error;
    }
  }
}

async function ensureAdminBulkRewardRun(input = {}) {
  const normalized = sanitizeBulkRewardRunInput(input);
  const runRef = colAdminBulkRewardRuns().doc(normalized.bulkId);
  const payload = {
    ...normalized,
    status: 'running',
    createdAt: nowMs(),
    updatedAt: nowMs(),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(runRef);
    if (snap.exists) {
      const previous = snap.data() || {};
      assertCompatibleBulkRewardRun(previous, normalized);
      tx.set(runRef, { status: 'running', updatedAt: nowMs(), replayedAt: nowMs() }, { merge: true });
      return { id: runRef.id, duplicated: true, data: previous };
    }
    tx.set(runRef, payload, { merge: false });
    return { id: runRef.id, duplicated: false, data: payload };
  });
  return result;
}

async function finalizeAdminBulkRewardRun(bulkId = '', summary = {}) {
  const safeBulkId = cleanStr(bulkId || '', 180);
  if (!safeBulkId) return false;
  await colAdminBulkRewardRuns().doc(safeBulkId).set({
    status: summary.failedCount > 0 ? 'completed_with_errors' : 'completed',
    totalScanned: Math.max(0, Math.floor(safeNum(summary.totalScanned, 0))),
    totalGranted: Math.max(0, Math.floor(safeNum(summary.totalGranted, 0))),
    totalDuplicated: Math.max(0, Math.floor(safeNum(summary.totalDuplicated, 0))),
    failedCount: Math.max(0, Math.floor(safeNum(summary.failedCount, 0))),
    updatedAt: nowMs(),
    completedAt: nowMs(),
    summary: {
      failed: Array.isArray(summary.failed) ? summary.failed.slice(0, 50) : []
    }
  }, { merge: true });
  return true;
}

async function grantRewardToAllUsers(input = {}) {
  const source = input.source || 'admin_bulk_grant';
  const bulkId = cleanStr(input.bulkId || input.referenceId || `bulk:${nowMs()}`, 180);
  const run = await ensureAdminBulkRewardRun({ ...input, source, bulkId, referenceId: bulkId });
  const pageSize = Math.max(1, Math.min(250, Math.floor(safeNum(input.pageSize, 100))));
  const concurrency = Math.max(1, Math.min(20, Math.floor(safeNum(input.concurrency, 8))));
  let lastDoc = null;
  let totalScanned = 0;
  let totalGranted = 0;
  let totalDuplicated = 0;
  const failed = [];
  while (true) {
    let query = colUsers().orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (lastDoc) query = query.startAfter(lastDoc.id);
    const snap = await query.get();
    if (snap.empty) break;
    totalScanned += snap.size;
    for (const group of chunkArray(snap.docs, concurrency)) {
      const settled = await Promise.allSettled(group.map((doc) => grantReward({ uid: doc.id, amount: input.amount, source, referenceId: bulkId, idempotencyKey: `bulk:${bulkId}:${doc.id}`, actorUid: input.actorUid, reason: input.reason, meta: { ...(input.meta && typeof input.meta === 'object' ? input.meta : {}), bulkId, reason: cleanStr(input.reason || '', 240), actorUid: cleanStr(input.actorUid || '', 160) }, notification: input.notification || {} })));
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value?.duplicated) totalDuplicated += 1;
          else totalGranted += 1;
        } else {
          failed.push({ uid: group[index]?.id || '', error: String(result.reason?.message || result.reason || 'grant_failed') });
        }
      });
    }
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
  const summary = { totalScanned, totalGranted, totalDuplicated, failedCount: failed.length, failed: failed.slice(0, 50), bulkId, runDuplicated: !!run.duplicated };
  await finalizeAdminBulkRewardRun(bulkId, summary).catch(() => null);
  return summary;
}

module.exports = { REWARD_SERVICE_VERSION, sanitizeRewardGrantInput, applyRewardGrantInTransaction, createRewardNotificationForGrant, grantReward, sanitizeBulkRewardRunInput, ensureAdminBulkRewardRun, finalizeAdminBulkRewardRun, grantRewardToAllUsers };
