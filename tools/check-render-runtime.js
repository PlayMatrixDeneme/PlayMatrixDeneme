#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const failures = [];
function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function mustContain(file, needle, label) { if (!read(file).includes(needle)) failures.push(`${label} eksik: ${file}`); }
function mustNotContain(file, needle, label) { if (read(file).includes(needle)) failures.push(`${label} bulundu: ${file}`); }

mustContain('config/firebase.js', 'parseFirebaseKey', 'FIREBASE_KEY parser');
mustContain('config/firebase.js', "mode: 'admin-sdk'", 'Firebase admin-sdk health mode');
mustContain('config/firebase.js', 'degraded: false', 'Firebase degraded=false kontratı');
mustContain('config/firebase.js', 'firebase_admin_startup_failed', 'Firebase hard-fail startup log');
mustNotContain('config/firebase.js', 'createMemoryFirestore', 'Firebase memory fallback');
mustNotContain('config/firebase.js', 'rest-auth-memory-store', 'Firebase degraded memory mode');
mustNotContain('config/firebase.js', 'firebase_admin_degraded_mode_enabled', 'Firebase degraded mode log');
mustContain('server.js', 'startup env summary', 'compact runtime startup summary');
mustNotContain('server.js', 'sanitized env report:', 'verbose public env dump');
mustContain('server.js', 'getFirebaseStatus({ exposeError: false })', 'public health sanitized Firebase status');

mustContain('public/js/home/legacy-home.runtime.js', 'function renderGameShowcaseSkeleton', 'home games skeleton renderer');
mustContain('public/js/home/legacy-home.runtime.js', 'modal.hidden = false', 'home modal open removes hidden attribute');
mustContain('public/js/home/legacy-home.runtime.js', 'modal.hidden = true', 'home modal close restores hidden attribute');
mustContain('public/js/home/legacy-home.runtime.js', 'window.openAvatarSelectionModal', 'avatar seçim modal global fallback');
mustContain('public/js/home/legacy-home.runtime.js', 'window.openFrameSelectionModal', 'çerçeve seçim modal global fallback');
mustContain('public/pm-online-core.js', 'maybeAuthOrHandler', 'online core backward-compatible auth listener');
mustContain('public/pm-online-core.js', 'handler missing; listener skipped', 'online core missing listener guard');
[
  'public/js/games/crash/crash-app.js',
  'Online Oyunlar/Satranc.phase4-module-1.js',
  'Online Oyunlar/Pisti.phase4-module-1.js'
].forEach((file) => mustNotContain(file, 'onAuthStateChanged(auth,', 'Online core auth listener yanlış imzası'));

[
  'public/js/games/classic/pattern-master/index.js',
  'public/js/games/classic/snake-pro/index.js',
  'public/js/games/classic/space-pro/index.js'
].forEach((file) => mustContain(file, 'onAuthStateChanged(auth,', 'Klasik Firebase modular auth listener imzası'));

mustContain('public/js/home/legacy-home.runtime.js', 'function safeRenderGameShowcaseSkeleton', 'home skeleton safe fallback');
mustContain('public/js/home/legacy-home.runtime.js', 'leaderboardStatsDelegationBound', 'leaderboard stats modal delegation');
mustContain('public/js/games/crash/crash-app.js', 'function playCrashSfx', 'Crash SFX helper');
mustContain('Online Oyunlar/Pisti.phase4-module-1.js', 'function ensureRealtimeShell', 'Pişti realtime shell helper');
mustContain('Online Oyunlar/Satranc.phase4-module-1.js', 'function ensureRealtimeShell', 'Satranç realtime shell helper');
mustContain('Online Oyunlar/Pisti.phase4-module-1.js', 'function showRealtimeToast', 'Pişti toast helper');
mustContain('Online Oyunlar/Satranc.phase4-module-1.js', 'function showRealtimeToast', 'Satranç toast helper');
mustContain('Online Oyunlar/Pisti.phase4-module-1.js', 'function playSfx', 'Pişti SFX helper');
mustContain('Online Oyunlar/Satranc.phase4-module-1.js', 'function playSfx', 'Satranç SFX helper');
mustContain('Online Oyunlar/Pisti.phase4-module-1.js', 'function showRealtimeInviteModal', 'Pişti invite modal fallback');

if (failures.length) {
  console.error('Render runtime kontrolü başarısız:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('check:render-runtime OK');

// phase10-11-runtime-fix-20260426g cache-bust check
