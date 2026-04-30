#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function assertIncludes(rel, needle, label) {
  const body = read(rel);
  if (!body.includes(needle)) {
    console.error(`[check:render-modal-game-hotfix] FAIL ${label}: ${rel} missing ${needle}`);
    process.exit(1);
  }
}
function assertNotIncludes(rel, needle, label) {
  const body = read(rel);
  if (body.includes(needle)) {
    console.error(`[check:render-modal-game-hotfix] FAIL ${label}: ${rel} still contains ${needle}`);
    process.exit(1);
  }
}

assertIncludes('index.html', 'release-20260430', 'fresh home cache-bust');
assertIncludes('script.js', 'release-20260430', 'fresh script cache-bust');
assertIncludes('public/js/home/app.js', 'release-20260430', 'fresh app cache-bust');
assertIncludes('online-games/crash.html', 'release-20260430', 'fresh crash cache-bust');
assertIncludes('online-games/pisti.html', 'release-20260430', 'fresh pisti cache-bust');
assertIncludes('online-games/satranc.html', 'release-20260430', 'fresh chess cache-bust');
assertIncludes('index.html', 'stability-guard.js', 'home stability guard loaded');
assertIncludes('public/js/home/stability-guard.js', 'hydrateLeaderboardFallback', 'leaderboard fallback hydration');
assertIncludes('public/js/home/stability-guard.js', 'pm-home-stability-guard', 'home visibility stabilizer');
assertIncludes('public/js/home/stability-guard.js', 'pm_open_login_after_home', 'online game login redirect hint');
assertIncludes('public/js/home/fast-home-paint.js', 'openLoginSheetFallback', 'fast paint online auth guard');
assertIncludes('online-games/crash.html', 'online-boot-guard.js', 'crash boot guard loaded');
assertIncludes('online-games/pisti.html', 'online-boot-guard.js', 'pisti boot guard loaded');
assertIncludes('online-games/satranc.html', 'online-boot-guard.js', 'chess boot guard loaded');
assertIncludes('public/js/home/dom-utils.js', 'export function createEl', 'home module createEl export');
assertIncludes('public/pm-online-core.js', 'function createUnavailableCore', 'online core degraded fallback');
assertNotIncludes('public/pm-online-core.js', 'from \"https://www.gstatic.com/firebasejs', 'online core has no static remote firebase imports');

assertIncludes('server.js', "Cache-Control', 'no-store, max-age=0'", 'runtime no-store cache headers');
assertIncludes('public/js/home/legacy-home.runtime.js', 'safeRenderGameShowcaseSkeleton', 'home skeleton safe fallback');
assertIncludes('public/js/home/legacy-home.runtime.js', 'window.renderGameShowcaseSkeleton = window.renderGameShowcaseSkeleton || safeRenderGameShowcaseSkeleton', 'global skeleton compatibility');
assertNotIncludes('public/js/home/legacy-home.runtime.js', "typeof renderGameShowcaseSkeleton === 'function'", 'direct skeleton reference removed');

assertIncludes('public/js/games/crash/crash-app.js', 'function playCrashSfx', 'crash sfx fallback exists');
assertIncludes('public/js/games/crash/crash-app.js', 'window.playCrashSfx = window.playCrashSfx || playCrashSfx', 'global crash sfx compatibility');

for (const rel of ['online-games/pisti.js', 'online-games/chess.js']) {
  assertIncludes(rel, 'function getSafeWebStorage', `${rel} safe storage`);
  assertIncludes(rel, 'function safeGetPendingAutoJoinRoom', `${rel} safe pending room`);
  assertIncludes(rel, 'boot degraded to lobby', `${rel} non-fatal boot degradation`);
}

assertIncludes('public/js/home/profile-panel.js', 'profileModalFallbackBound', 'avatar/frame delegated fallback');
assertIncludes('public/js/home/leaderboard.js', 'leaderboardStatsFallbackBound', 'leaderboard stats delegated fallback');

for (const rel of [
  'public/js/games/classic/pattern-master/index.js',
  'public/js/games/classic/snake-pro/index.js',
  'public/js/games/classic/space-pro/index.js'
]) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    console.error(`[check:render-modal-game-hotfix] FAIL missing classic module: ${rel}`);
    process.exit(1);
  }
}

console.log('[check:render-modal-game-hotfix] OK');
