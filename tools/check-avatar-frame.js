#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`[check:phase8] ${message}`);
  process.exit(1);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const registry = read('public/avatar-registry.js');
const runtime = read('public/avatar-frame.js');
const css = read('public/avatar-frame.css');
const profileRoute = read('routes/profile.routes.js');
const adminRoute = read('routes/admin.routes.js');
const accountState = read('utils/accountState.js');
const avatarManifest = read('utils/avatarManifest.js');
const sockets = read('sockets/index.js');
const chatRoute = read('routes/chat.routes.js');
const chessRoute = read('routes/chess.routes.js');
const pistiRoute = read('routes/pisti.routes.js');
const crashRoute = read('routes/crash.routes.js');

if (!registry.includes('GENERATED_AVATAR_FRAME_REGISTRY_PHASE8')) fail('avatar registry generated marker eksik.');
if (!registry.includes('frameAssets') || !registry.includes('avatars')) fail('avatar registry avatar/frame listesi eksik.');

[
  'window.PMAvatar',
  'isRegisteredAvatarUrl',
  'isRegisteredFrameAssetIndex',
  'data-avatar-registered',
  'data-frame-registered',
  "node.style.setProperty('--pm-avatar-scale'"
].forEach((token) => { if (!runtime.includes(token)) fail(`avatar-frame.js içinde ${token} eksik.`); });

[
  'PHASE8_AVATAR_FRAME_UNIFIED_FIT',
  'clip-path: circle',
  '.ps-modal.is-closing',
  '.frame-picker-modal.is-closing'
].forEach((token) => { if (!css.includes(token)) fail(`avatar-frame.css içinde ${token} eksik.`); });

[
  'validateAvatarUrl(avatar, { storage: true })',
  'assertSelectedFrameSelectable(safeSelectedFrame, u)',
  'updates.selectedFrame = safeSelectedFrame'
].forEach((token) => { if (!profileRoute.includes(token)) fail(`profile route içinde ${token} eksik.`); });

[
  'normalizeAdminIdentityPatch',
  'FORBIDDEN_COSMETIC_PATCH_KEYS',
  'validateAvatarUrl(patch.avatar, { storage: true })',
  'assertSelectedFrameSelectable(safeSelectedFrame, mergedForFrame)'
].forEach((token) => { if (!adminRoute.includes(token)) fail(`admin route içinde ${token} eksik.`); });

[
  'frameLevel <= 0',
  'return isSelectedFrameSelectable(resolved, { ...user, accountLevel }) ? resolved : 0'
].forEach((token) => { if (!accountState.includes(token)) fail(`accountState içinde ${token} eksik.`); });

if (!avatarManifest.includes('sanitizePublicAvatarForOutput')) fail('utils/avatarManifest.js sanitizePublicAvatarForOutput helper eksik.');
[
  ['routes/chat.routes.js', chatRoute],
  ['routes/chess.routes.js', chessRoute],
  ['routes/pisti.routes.js', pistiRoute],
  ['routes/crash.routes.js', crashRoute],
  ['sockets/index.js', sockets]
].forEach(([name, source]) => {
  if (!source.includes('sanitizePublicAvatarForOutput')) fail(`${name} kayıtlı avatar çıktı sanitizasyonu kullanmıyor.`);
});

for (let index = 1; index <= 18; index += 1) {
  if (!exists(`frames/frame-${index}.png`)) fail(`frames/frame-${index}.png eksik.`);
}
const firstForbiddenFrame = `frames/frame-${18 + 1}.png`;
if (exists(firstForbiddenFrame)) fail(`frame-${18 + 1} geri gelmiş; Faz 3 kararına aykırı.`);

['index.html', 'online-games/crash.html', 'online-games/pisti.html', 'online-games/satranc.html'].forEach((rel) => {
  const html = read(rel);
  if (!html.includes('avatar-registry.js') || !html.includes('avatar-frame.js')) fail(`${rel} avatar registry/runtime sırası eksik.`);
  if (html.indexOf('avatar-registry.js') > html.indexOf('avatar-frame.js')) fail(`${rel} avatar-registry.js avatar-frame.js öncesinde yüklenmeli.`);
});

console.log('[check:phase8] OK - kayıtlı avatar/frame enforcement, tek PMAvatar kontratı, oyun/chat/socket çıktı sanitizasyonu ve modal geçiş standardı aktif.');
process.exit(0);
