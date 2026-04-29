'use strict';

const express = require('express');
const { verifyAuth, tryVerifyOptionalAuth } = require('../middlewares/auth.middleware');
const { verifyAdmin, requireAdminPermission } = require('../middlewares/admin.middleware');
const { apiLimiter, adminLimiter } = require('../middlewares/rateLimiters');
const { cleanStr } = require('../utils/helpers');
const { logCaughtError } = require('../utils/logger');
const {
  buildMarketPayload,
  purchaseMarketItem,
  equipMarketItem,
  listMarketItems,
  updateMarketItemAdmin,
  refundOrRevokeMarketItem
} = require('../services/market.service');

const router = express.Router();

function marketError(res, error, fallback = 500) {
  const status = Number(error?.statusCode || error?.status || fallback) || fallback;
  return res.status(status).json({
    ok: false,
    error: cleanStr(error?.message || 'Market işlemi tamamlanamadı.', 180),
    requestId: res.req?.requestId || null
  });
}

router.get('/market/catalog', tryVerifyOptionalAuth, apiLimiter, async (req, res) => {
  try {
    const payload = await buildMarketPayload(req.user?.uid || '', { includeInactive: false });
    return res.json(payload);
  } catch (error) {
    logCaughtError('market.catalog', error, { requestId: req.requestId || null });
    return marketError(res, error);
  }
});

router.get('/market/me', verifyAuth, apiLimiter, async (req, res) => {
  try {
    const payload = await buildMarketPayload(req.user.uid, { includeInactive: false });
    return res.json(payload);
  } catch (error) {
    logCaughtError('market.me', error, { uid: req.user?.uid || '', requestId: req.requestId || null });
    return marketError(res, error);
  }
});

router.post('/market/purchase', verifyAuth, apiLimiter, async (req, res) => {
  try {
    const itemId = cleanStr(req.body?.itemId || '', 120);
    const result = await purchaseMarketItem({ uid: req.user.uid, itemId, requestId: req.requestId || '' });
    return res.json(result);
  } catch (error) {
    logCaughtError('market.purchase', error, { uid: req.user?.uid || '', requestId: req.requestId || null });
    return marketError(res, error);
  }
});

router.post('/market/equip', verifyAuth, apiLimiter, async (req, res) => {
  try {
    const itemId = cleanStr(req.body?.itemId || '', 120);
    const type = cleanStr(req.body?.type || '', 40);
    const result = await equipMarketItem({ uid: req.user.uid, itemId, type });
    return res.json(result);
  } catch (error) {
    logCaughtError('market.equip', error, { uid: req.user?.uid || '', requestId: req.requestId || null });
    return marketError(res, error);
  }
});

router.get('/admin/market/items', verifyAdmin, adminLimiter, async (req, res) => {
  try {
    const items = await listMarketItems({ includeInactive: true });
    return res.json({ ok: true, items });
  } catch (error) {
    logCaughtError('admin.market.items', error, { requestId: req.requestId || null });
    return marketError(res, error);
  }
});

router.patch('/admin/market/items/:itemId', requireAdminPermission('rewards.write'), adminLimiter, async (req, res) => {
  try {
    const result = await updateMarketItemAdmin({
      adminUid: req.user?.uid || '',
      itemId: req.params.itemId,
      patch: req.body || {},
      reason: cleanStr(req.body?.reason || '', 240),
      requestId: req.requestId || ''
    });
    return res.json(result);
  } catch (error) {
    logCaughtError('admin.market.item.update', error, { requestId: req.requestId || null });
    return marketError(res, error);
  }
});

router.post('/admin/market/refund', requireAdminPermission('rewards.write'), adminLimiter, async (req, res) => {
  try {
    const result = await refundOrRevokeMarketItem({
      adminUid: req.user?.uid || '',
      uid: req.body?.uid || req.body?.userId || '',
      itemId: req.body?.itemId || '',
      mode: 'refund',
      reason: req.body?.reason || '',
      requestId: req.requestId || ''
    });
    return res.json(result);
  } catch (error) {
    logCaughtError('admin.market.refund', error, { requestId: req.requestId || null });
    return marketError(res, error);
  }
});

router.post('/admin/market/revoke', requireAdminPermission('rewards.write'), adminLimiter, async (req, res) => {
  try {
    const result = await refundOrRevokeMarketItem({
      adminUid: req.user?.uid || '',
      uid: req.body?.uid || req.body?.userId || '',
      itemId: req.body?.itemId || '',
      mode: 'revoke',
      reason: req.body?.reason || '',
      requestId: req.requestId || ''
    });
    return res.json(result);
  } catch (error) {
    logCaughtError('admin.market.revoke', error, { requestId: req.requestId || null });
    return marketError(res, error);
  }
});

module.exports = router;
