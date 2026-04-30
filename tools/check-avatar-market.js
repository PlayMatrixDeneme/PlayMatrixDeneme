#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function fail(message) { failures.push(message); }
function mustExist(rel) { if (!exists(rel)) fail(`${rel} bulunamadı.`); }
function mustContain(rel, needle, label = needle) { if (!read(rel).includes(needle)) fail(`${label} eksik: ${rel}`); }
function mustNotContain(rel, needle, label = needle) { if (read(rel).includes(needle)) fail(`${label} kaldırılmalı: ${rel}`); }

[
  'utils/marketCatalog.js',
  'routes/market.routes.js',
  'public/js/home/market.js'
].forEach(mustExist);

mustContain('utils/accountState.js', 'normalizeOwnedFrameLevels', 'owned frame normalizer');
mustContain('utils/accountState.js', 'isSelectedFrameSelectable', 'server frame selectable validator');
mustContain('utils/accountState.js', 'assertSelectedFrameSelectable', 'server frame assert validator');
mustContain('routes/profile.routes.js', 'assertSelectedFrameSelectable(safeSelectedFrame, u)', 'profile server frame ownership validation');
mustContain('routes/admin.routes.js', 'assertSelectedFrameSelectable(safeSelectedFrame, mergedForFrame)', 'admin server frame ownership validation');

mustContain('utils/avatarManifest.js', 'function validateAvatarUrl', 'avatar URL validator');
mustContain('routes/profile.routes.js', 'validateAvatarUrl(avatar, { storage: true })', 'profile avatar validator');
mustContain('routes/admin.routes.js', 'validateAvatarUrl(patch.avatar, { storage: true })', 'admin avatar validator');

mustContain('public/avatar-frame.js', 'function AvatarFrame(input = {})', 'AvatarFrame component contract');
mustContain('public/avatar-frame.js', 'normalizeAvatarFrameContract', 'AvatarFrame normalizer');
mustContain('public/avatar-frame.js', 'mountAvatarFrame', 'AvatarFrame mount helper');
mustContain('public/avatar-frame.css', 'FAZ 6 — AvatarFrame ortak görsel kontratı', 'AvatarFrame CSS contract');
mustContain('public/js/home/renderers.js', 'createAvatarFrameNode', 'safe AvatarFrame renderer');
mustContain('public/js/home/app.js', 'installMarketStateModule', 'home market frontend module');

mustContain('routes/market.routes.js', "router.get('/market/items'", 'market items endpoint');
mustContain('routes/market.routes.js', "router.post('/market/purchase'", 'market purchase endpoint');

mustContain('routes/market.routes.js', 'Firestore transaction contract: all reads first', 'market transaction read-before-write comment');
mustContain('routes/market.routes.js', 'tx.get(userRef)', 'market user read');
mustContain('routes/market.routes.js', 'tx.get(purchaseRef)', 'market purchase read');
mustContain('routes/market.routes.js', 'tx.set(purchaseRef', 'market purchase write');
mustContain('routes/market.routes.js', 'tx.set(ledgerRef', 'market ledger write');
mustContain('routes/market.routes.js', 'ownedFrames', 'market ownership write');
mustContain('routes/market.routes.js', 'idempotencyKey', 'market idempotency key');
mustContain('server.js', "const marketRoutes = require('./routes/market.routes')", 'market route import');
mustContain('server.js', "app.use('/api', marketRoutes)", 'market route mount');

mustContain('public/js/profile/frame-picker.js', 'card.disabled = isLocked', 'locked frame passive UI');
mustContain('public/avatar-frame.css', 'data-frame-locked="true"', 'locked frame visual standard');


mustContain('package.json', 'check:phase6', 'phase6 package script');

if (failures.length) {
  console.error('Faz 6 avatar/frame/market kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('check:phase6-avatar-market OK. AvatarFrame contract, frame ownership validator, market transaction guard ve avatar URL validator doğrulandı.');
