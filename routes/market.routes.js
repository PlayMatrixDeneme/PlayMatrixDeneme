'use strict';

const express = require('express');
const router = express.Router();

const { db, admin } = require('../config/firebase');
const { verifyAuth } = require('../middlewares/auth.middleware');
const { safeNum, cleanStr, nowMs } = require('../utils/helpers');
const { logCaughtError } = require('../utils/logger');
const { buildCanonicalUserState, normalizeOwnedFrameLevels } = require('../utils/accountState');
const {
  MARKET_CURRENCY,
  FRAME_MARKET_POLICY_VERSION,
  getMarketItem,
  listMarketItemsForUser,
  normalizeOwnedFrames
} = require('../utils/marketCatalog');

const colUsers = () => db.collection('users');
const colMarketLedger = () => db.collection('market_ledger');
const colMarketPurchases = () => db.collection('market_purchases');

function buildMarketPurchaseId(uid = '', itemId = '') {
  return `${cleanStr(uid || '', 160)}__${cleanStr(itemId || '', 80).toLowerCase()}`.replace(/[^a-zA-Z0-9_:.-]/g, '_');
}

function buildMarketLedgerId(uid = '', itemId = '') {
  return `market_purchase:${buildMarketPurchaseId(uid, itemId)}`;
}

router.get('/market/items', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await colUsers().doc(uid).get();
    const user = snap.exists ? (snap.data() || {}) : {};
    const canonical = buildCanonicalUserState(user, { defaultFrame: 0 });
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({
      ok: true,
      currency: MARKET_CURRENCY,
      policyVersion: FRAME_MARKET_POLICY_VERSION,
      items: listMarketItemsForUser({ ...user, ...canonical }),
      ownedFrames: normalizeOwnedFrames(user.ownedFrames || user.unlockedFrames || [])
    });
  } catch (error) {
    logCaughtError('market.items', error, { requestId: req.requestId || null, uid: req.user?.uid || '' }, 'error');
    return res.status(500).json({ ok: false, error: 'Market şu anda yüklenemedi.', requestId: req.requestId || null });
  }
});

router.post('/market/purchase', verifyAuth, async (req, res) => {
  const requestId = req.requestId || null;
  try {
    const uid = req.user.uid;
    const itemId = cleanStr(req.body?.itemId || '', 80).toLowerCase();
    const item = getMarketItem(itemId);
    if (!item) return res.status(400).json({ ok: false, error: 'Geçersiz market ürünü.', requestId });

    const purchaseId = buildMarketPurchaseId(uid, item.id);
    const ledgerId = buildMarketLedgerId(uid, item.id);
    let responsePayload = null;

    await db.runTransaction(async (tx) => {
      const userRef = colUsers().doc(uid);
      const purchaseRef = colMarketPurchases().doc(purchaseId);
      const ledgerRef = colMarketLedger().doc(ledgerId);

      // Firestore transaction contract: all reads first.
      const [userSnap, purchaseSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(purchaseRef)
      ]);

      if (!userSnap.exists) throw new Error('Kullanıcı bulunamadı.');
      const user = userSnap.data() || {};
      const canonical = buildCanonicalUserState(user, { defaultFrame: 0 });
      const ownedFrames = normalizeOwnedFrameLevels(user.ownedFrames || user.unlockedFrames || []);
      const alreadyOwned = item.type === 'frame' && ownedFrames.includes(item.frameLevel);

      if (purchaseSnap.exists || alreadyOwned) {
        responsePayload = {
          duplicated: true,
          balance: safeNum(user.balance, 0),
          ownedFrames,
          item
        };
        return;
      }

      const price = Math.max(0, Math.floor(safeNum(item.price, 0)));
      const balance = Math.max(0, Math.floor(safeNum(user.balance, 0)));
      if (price <= 0) throw new Error('Market ürün fiyatı geçersiz.');
      if (balance < price) {
        const error = new Error('Bakiye yetersiz.');
        error.statusCode = 400;
        throw error;
      }

      const nextOwnedFrames = normalizeOwnedFrameLevels([...ownedFrames, item.frameLevel]);
      const nextBalance = balance - price;
      const now = nowMs();

      tx.set(purchaseRef, {
        uid,
        itemId: item.id,
        itemType: item.type,
        frameLevel: item.frameLevel,
        frameId: item.frameId,
        assetIndex: item.assetIndex,
        price,
        currency: item.currency || MARKET_CURRENCY,
        status: 'owned',
        policyVersion: FRAME_MARKET_POLICY_VERSION,
        createdAt: now,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: false });

      tx.set(ledgerRef, {
        uid,
        itemId: item.id,
        itemType: item.type,
        amount: -price,
        currency: item.currency || MARKET_CURRENCY,
        direction: 'debit',
        source: 'market_purchase',
        referenceId: purchaseId,
        idempotencyKey: ledgerId,
        policyVersion: FRAME_MARKET_POLICY_VERSION,
        status: 'committed',
        createdAt: now,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: false });

      tx.set(userRef, {
        ...canonical,
        balance: nextBalance,
        ownedFrames: nextOwnedFrames,
        unlockedFrames: nextOwnedFrames,
        marketUpdatedAt: now
      }, { merge: true });

      responsePayload = {
        duplicated: false,
        balance: nextBalance,
        ownedFrames: nextOwnedFrames,
        item
      };
    });

    return res.json({ ok: true, ...(responsePayload || { item }) });
  } catch (error) {
    const status = Math.max(400, Math.min(500, safeNum(error.statusCode, /bakiye|geçersiz|bulunamadı/i.test(error.message || '') ? 400 : 500)));
    logCaughtError('market.purchase', error, { requestId, uid: req.user?.uid || '', itemId: req.body?.itemId || '' }, status >= 500 ? 'error' : 'warn');
    return res.status(status).json({ ok: false, error: error.message || 'Satın alma tamamlanamadı.', requestId });
  }
});

module.exports = router;
