'use strict';

const { db, admin } = require('../config/firebase');
const { cleanStr, safeNum, nowMs } = require('../utils/helpers');
const { getDefaultMarketItems, COSMETIC_TYPES, MARKET_CATALOG_VERSION, RARITY_ORDER } = require('../config/marketCatalog');
const { recordAuditLog, logCaughtError } = require('../utils/logger');

const colUsers = () => db.collection('users');
const colMarketItems = () => db.collection('market_items');
const colInventory = () => db.collection('user_inventory');
const colMarketLedger = () => db.collection('market_ledger');

const VALID_TYPES = new Set(Object.values(COSMETIC_TYPES));
const VALID_RARITIES = new Set(RARITY_ORDER);
const MAX_PRICE = 999999999;

function normalizeId(value = '', max = 120) {
  return cleanStr(value || '', max).replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, max);
}

function inventoryDocId(uid = '', itemId = '') {
  return `${normalizeId(uid, 160)}_${normalizeId(itemId, 120)}`;
}

function ledgerDocId(parts = []) {
  return parts.map((part) => normalizeId(part, 160)).filter(Boolean).join('_').slice(0, 420);
}

function normalizePrice(value, fallback = 0) {
  const numeric = Math.floor(safeNum(value, fallback));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > MAX_PRICE) throw new Error('MARKET_INVALID_PRICE');
  return numeric;
}

function normalizeMarketItem(raw = {}, fallback = {}) {
  const merged = { ...(fallback || {}), ...(raw || {}) };
  const id = normalizeId(merged.id || fallback.id || '', 120);
  const type = cleanStr(merged.type || fallback.type || '', 40);
  if (!id || !VALID_TYPES.has(type)) return null;
  const rarity = cleanStr(merged.rarity || fallback.rarity || 'common', 24).toLowerCase();
  const price = normalizePrice(merged.priceMcExact ?? merged.priceMc ?? fallback.priceMcExact ?? 0, 0);
  return {
    id,
    type,
    name: cleanStr(merged.name || fallback.name || id, 80),
    description: cleanStr(merged.description || fallback.description || '', 240),
    priceMcExact: String(price),
    priceMc: price,
    assetUrl: cleanStr(merged.assetUrl || fallback.assetUrl || '', 260),
    rarity: VALID_RARITIES.has(rarity) ? rarity : 'common',
    active: merged.active !== false,
    refundable: merged.refundable !== false,
    revocable: merged.revocable !== false,
    sortOrder: Math.floor(safeNum(merged.sortOrder ?? fallback.sortOrder, 9999)),
    previewClass: cleanStr(merged.previewClass || fallback.previewClass || '', 80),
    tags: Array.isArray(merged.tags) ? merged.tags.map((tag) => cleanStr(tag, 32)).filter(Boolean).slice(0, 12) : [],
    catalogVersion: cleanStr(merged.catalogVersion || MARKET_CATALOG_VERSION, 80)
  };
}

function publicMarketItem(item = {}, owned = false, equipped = false) {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    description: item.description,
    priceMcExact: item.priceMcExact,
    assetUrl: item.assetUrl,
    rarity: item.rarity,
    active: !!item.active,
    owned: !!owned,
    equipped: !!equipped,
    refundable: !!item.refundable,
    previewClass: item.previewClass || '',
    sortOrder: item.sortOrder,
    tags: item.tags || []
  };
}

async function listMarketItems(options = {}) {
  const includeInactive = !!options.includeInactive;
  const defaults = new Map(getDefaultMarketItems().map((item) => [item.id, normalizeMarketItem(item)]));
  const overrides = await colMarketItems().get().catch((error) => {
    logCaughtError('market.items.overrides', error);
    return null;
  });
  if (overrides) {
    overrides.docs.forEach((doc) => {
      const fallback = defaults.get(doc.id) || { id: doc.id };
      const normalized = normalizeMarketItem({ id: doc.id, ...(doc.data() || {}) }, fallback);
      if (normalized) defaults.set(normalized.id, normalized);
    });
  }
  return Array.from(defaults.values())
    .filter((item) => includeInactive || item.active)
    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'tr'));
}

async function getMarketItem(itemId = '', options = {}) {
  const safeId = normalizeId(itemId, 120);
  if (!safeId) return null;
  const items = await listMarketItems({ includeInactive: !!options.includeInactive });
  return items.find((item) => item.id === safeId) || null;
}

async function getUserInventory(uid = '') {
  const safeUid = normalizeId(uid, 160);
  if (!safeUid) return [];
  const snap = await colInventory().where('uid', '==', safeUid).where('status', '==', 'active').limit(500).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}

function normalizeEquippedCosmetics(user = {}) {
  const source = user?.equippedCosmetics && typeof user.equippedCosmetics === 'object' ? user.equippedCosmetics : {};
  const out = {};
  Object.values(COSMETIC_TYPES).forEach((type) => {
    const value = normalizeId(source[type] || '', 120);
    if (value) out[type] = value;
  });
  return out;
}

async function buildMarketPayload(uid = '', options = {}) {
  const safeUid = normalizeId(uid, 160);
  const [items, inventory] = await Promise.all([
    listMarketItems({ includeInactive: !!options.includeInactive }),
    safeUid ? getUserInventory(safeUid) : Promise.resolve([])
  ]);
  let equipped = {};
  let balance = 0;
  if (safeUid) {
    const userSnap = await colUsers().doc(safeUid).get();
    if (userSnap.exists) {
      const user = userSnap.data() || {};
      equipped = normalizeEquippedCosmetics(user);
      balance = Math.floor(safeNum(user.balance, 0));
    }
  }
  const owned = new Set(inventory.map((row) => cleanStr(row.itemId || '', 120)).filter(Boolean));
  return {
    ok: true,
    catalogVersion: MARKET_CATALOG_VERSION,
    balance,
    inventoryCount: owned.size,
    equippedCosmetics: equipped,
    items: items.map((item) => publicMarketItem(item, owned.has(item.id), equipped[item.type] === item.id))
  };
}

function assertUserId(uid = '') {
  const safeUid = normalizeId(uid, 160);
  if (!safeUid) {
    const error = new Error('MARKET_AUTH_REQUIRED');
    error.statusCode = 401;
    throw error;
  }
  return safeUid;
}

async function purchaseMarketItem({ uid = '', itemId = '', requestId = '' } = {}) {
  const safeUid = assertUserId(uid);
  const safeItemId = normalizeId(itemId, 120);
  if (!safeItemId) throw new Error('MARKET_ITEM_REQUIRED');
  const item = await getMarketItem(safeItemId);
  if (!item || !item.active) {
    const error = new Error('MARKET_ITEM_NOT_AVAILABLE');
    error.statusCode = 404;
    throw error;
  }
  const price = normalizePrice(item.priceMcExact, 0);
  const userRef = colUsers().doc(safeUid);
  const inventoryRef = colInventory().doc(inventoryDocId(safeUid, item.id));
  const ledgerRef = colMarketLedger().doc(ledgerDocId(['purchase', safeUid, item.id]));
  const now = nowMs();
  return db.runTransaction(async (tx) => {
    const [userSnap, inventorySnap, ledgerSnap] = await Promise.all([tx.get(userRef), tx.get(inventoryRef), tx.get(ledgerRef)]);
    if (!userSnap.exists) {
      const error = new Error('MARKET_USER_NOT_FOUND');
      error.statusCode = 404;
      throw error;
    }
    if (inventorySnap.exists && inventorySnap.data()?.status === 'active') {
      return { ok: true, duplicated: true, alreadyOwned: true, item: publicMarketItem(item, true, false), balance: Math.floor(safeNum(userSnap.data()?.balance, 0)) };
    }
    if (ledgerSnap.exists) {
      tx.set(inventoryRef, {
        uid: safeUid,
        itemId: item.id,
        type: item.type,
        status: 'active',
        acquiredBy: 'purchase_replay',
        restoredAt: now,
        updatedAt: now
      }, { merge: true });
      return { ok: true, duplicated: true, item: publicMarketItem(item, true, false), balance: Math.floor(safeNum(userSnap.data()?.balance, 0)) };
    }
    const balance = Math.floor(safeNum(userSnap.data()?.balance, 0));
    if (balance < price) {
      const error = new Error('MARKET_INSUFFICIENT_MC');
      error.statusCode = 409;
      throw error;
    }
    tx.set(ledgerRef, {
      uid: safeUid,
      itemId: item.id,
      type: item.type,
      action: 'purchase',
      currency: 'MC',
      amount: price,
      delta: -price,
      balanceBefore: balance,
      balanceAfter: balance - price,
      idempotencyKey: ledgerRef.id,
      requestId: cleanStr(requestId || '', 120),
      itemSnapshot: publicMarketItem(item, false, false),
      status: 'committed',
      createdAt: now,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: false });
    tx.set(inventoryRef, {
      uid: safeUid,
      itemId: item.id,
      type: item.type,
      status: 'active',
      pricePaidMc: price,
      purchaseLedgerId: ledgerRef.id,
      acquiredBy: 'purchase',
      createdAt: now,
      updatedAt: now,
      itemSnapshot: publicMarketItem(item, true, false)
    }, { merge: false });
    tx.set(userRef, {
      balance: admin.firestore.FieldValue.increment(-price),
      totalSpentMc: admin.firestore.FieldValue.increment(price),
      ownedMarketItems: admin.firestore.FieldValue.arrayUnion(item.id),
      updatedAt: now,
      lastMarketPurchaseAt: now,
      lastMarketPurchaseItemId: item.id,
      lastMarketLedgerId: ledgerRef.id
    }, { merge: true });
    return { ok: true, duplicated: false, item: publicMarketItem(item, true, false), balance: balance - price, ledgerId: ledgerRef.id };
  });
}

async function equipMarketItem({ uid = '', itemId = '', type = '' } = {}) {
  const safeUid = assertUserId(uid);
  const safeItemId = normalizeId(itemId, 120);
  const requestedType = cleanStr(type || '', 40);
  if (!safeItemId) throw new Error('MARKET_ITEM_REQUIRED');
  const item = await getMarketItem(safeItemId, { includeInactive: true });
  if (!item) {
    const error = new Error('MARKET_ITEM_NOT_FOUND');
    error.statusCode = 404;
    throw error;
  }
  if (requestedType && requestedType !== item.type) {
    const error = new Error('MARKET_ITEM_TYPE_MISMATCH');
    error.statusCode = 400;
    throw error;
  }
  const userRef = colUsers().doc(safeUid);
  const inventoryRef = colInventory().doc(inventoryDocId(safeUid, item.id));
  const now = nowMs();
  return db.runTransaction(async (tx) => {
    const [userSnap, invSnap] = await Promise.all([tx.get(userRef), tx.get(inventoryRef)]);
    if (!userSnap.exists) {
      const error = new Error('MARKET_USER_NOT_FOUND');
      error.statusCode = 404;
      throw error;
    }
    if (!invSnap.exists || invSnap.data()?.status !== 'active') {
      const error = new Error('MARKET_ITEM_NOT_OWNED');
      error.statusCode = 403;
      throw error;
    }
    const equipped = normalizeEquippedCosmetics(userSnap.data() || {});
    equipped[item.type] = item.id;
    tx.set(userRef, { equippedCosmetics: equipped, updatedAt: now, lastCosmeticEquipAt: now }, { merge: true });
    tx.set(inventoryRef, { equipped: true, equippedAt: now, updatedAt: now }, { merge: true });
    return { ok: true, equippedCosmetics: equipped, item: publicMarketItem(item, true, true) };
  });
}

async function updateMarketItemAdmin({ adminUid = '', itemId = '', patch = {}, reason = '', requestId = '' } = {}) {
  const safeItemId = normalizeId(itemId, 120);
  if (!safeItemId) throw new Error('MARKET_ITEM_REQUIRED');
  const current = await getMarketItem(safeItemId, { includeInactive: true });
  if (!current) {
    const error = new Error('MARKET_ITEM_NOT_FOUND');
    error.statusCode = 404;
    throw error;
  }
  const update = { id: safeItemId, updatedAt: nowMs(), updatedBy: normalizeId(adminUid, 160), catalogVersion: MARKET_CATALOG_VERSION };
  if (Object.prototype.hasOwnProperty.call(patch, 'priceMcExact') || Object.prototype.hasOwnProperty.call(patch, 'priceMc')) {
    update.priceMcExact = String(normalizePrice(patch.priceMcExact ?? patch.priceMc, current.priceMc));
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'active')) update.active = patch.active !== false;
  if (Object.prototype.hasOwnProperty.call(patch, 'name')) update.name = cleanStr(patch.name, 80) || current.name;
  if (Object.prototype.hasOwnProperty.call(patch, 'description')) update.description = cleanStr(patch.description, 240);
  if (Object.prototype.hasOwnProperty.call(patch, 'sortOrder')) update.sortOrder = Math.floor(safeNum(patch.sortOrder, current.sortOrder));
  if (Object.prototype.hasOwnProperty.call(patch, 'rarity')) {
    const rarity = cleanStr(patch.rarity, 24).toLowerCase();
    if (VALID_RARITIES.has(rarity)) update.rarity = rarity;
  }
  await colMarketItems().doc(safeItemId).set(update, { merge: true });
  await recordAuditLog({
    actorUid: normalizeId(adminUid, 160),
    action: 'market.item.update',
    targetType: 'market_item',
    targetId: safeItemId,
    status: 'success',
    metadata: { before: current, patch: update, reason: cleanStr(reason, 240), requestId: cleanStr(requestId, 120) }
  }).catch(() => null);
  return { ok: true, item: await getMarketItem(safeItemId, { includeInactive: true }) };
}

async function refundOrRevokeMarketItem({ adminUid = '', uid = '', itemId = '', mode = 'revoke', reason = '', requestId = '' } = {}) {
  const safeAdminUid = normalizeId(adminUid, 160);
  const safeUid = assertUserId(uid);
  const safeItemId = normalizeId(itemId, 120);
  const action = mode === 'refund' ? 'refund' : 'revoke';
  const item = await getMarketItem(safeItemId, { includeInactive: true });
  if (!item) {
    const error = new Error('MARKET_ITEM_NOT_FOUND');
    error.statusCode = 404;
    throw error;
  }
  const userRef = colUsers().doc(safeUid);
  const invRef = colInventory().doc(inventoryDocId(safeUid, item.id));
  const ledgerRef = colMarketLedger().doc(ledgerDocId([action, safeUid, item.id, requestId || reason || 'admin']));
  const now = nowMs();
  const result = await db.runTransaction(async (tx) => {
    const [userSnap, invSnap, ledgerSnap] = await Promise.all([tx.get(userRef), tx.get(invRef), tx.get(ledgerRef)]);
    if (!userSnap.exists) throw new Error('MARKET_USER_NOT_FOUND');
    if (ledgerSnap.exists) return { ok: true, duplicated: true, ledgerId: ledgerRef.id };
    if (!invSnap.exists || invSnap.data()?.status !== 'active') {
      return { ok: true, skipped: true, reason: 'inventory_not_active' };
    }
    const inv = invSnap.data() || {};
    const refundAmount = action === 'refund' ? Math.max(0, Math.floor(safeNum(inv.pricePaidMc, item.priceMc))) : 0;
    const equipped = normalizeEquippedCosmetics(userSnap.data() || {});
    if (equipped[item.type] === item.id) delete equipped[item.type];
    tx.set(ledgerRef, {
      uid: safeUid,
      itemId: item.id,
      type: item.type,
      action,
      currency: 'MC',
      amount: refundAmount,
      delta: refundAmount,
      idempotencyKey: ledgerRef.id,
      adminUid: safeAdminUid,
      reason: cleanStr(reason, 240),
      requestId: cleanStr(requestId, 120),
      status: 'committed',
      createdAt: now,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: false });
    tx.set(invRef, { status: action === 'refund' ? 'refunded' : 'revoked', revokedAt: now, refundedAt: action === 'refund' ? now : 0, updatedAt: now, revokedBy: safeAdminUid, revokeReason: cleanStr(reason, 240), equipped: false }, { merge: true });
    tx.set(userRef, {
      equippedCosmetics: equipped,
      ownedMarketItems: admin.firestore.FieldValue.arrayRemove(item.id),
      balance: admin.firestore.FieldValue.increment(refundAmount),
      updatedAt: now,
      lastMarketAdminActionAt: now
    }, { merge: true });
    return { ok: true, action, refundAmount, ledgerId: ledgerRef.id };
  });
  await recordAuditLog({
    actorUid: safeAdminUid,
    action: `market.item.${action}`,
    targetType: 'user_inventory',
    targetId: `${safeUid}:${safeItemId}`,
    status: 'success',
    metadata: { uid: safeUid, itemId: safeItemId, reason: cleanStr(reason, 240), requestId: cleanStr(requestId, 120), result }
  }).catch(() => null);
  return result;
}

module.exports = {
  COSMETIC_TYPES,
  MARKET_CATALOG_VERSION,
  normalizeMarketItem,
  listMarketItems,
  getMarketItem,
  getUserInventory,
  buildMarketPayload,
  purchaseMarketItem,
  equipMarketItem,
  updateMarketItemAdmin,
  refundOrRevokeMarketItem
};
