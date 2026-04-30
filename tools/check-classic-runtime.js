#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function must(cond, msg) { if (!cond) failures.push(msg); }
function mustExist(rel, label) { must(exists(rel), `${label} eksik: ${rel}`); }
function mustContain(rel, needle, label) { must(read(rel).includes(needle), `${label} eksik: ${rel}`); }
function mustNotContain(rel, needle, label) { must(!read(rel).includes(needle), `${label} kaldırılmalı: ${rel}`); }

const htmlFiles = [
  'classic-games/PatternMaster.html',
  'classic-games/SnakePro.html',
  'classic-games/SpacePro.html'
];
const cssFiles = [
  'classic-games/pattern-master.css',
  'classic-games/snake-pro.css',
  'classic-games/space-pro.css'
];
const gameScripts = [
  'classic-games/pattern-master.js',
  'classic-games/snake-pro.js',
  'classic-games/space-pro.js'
];
const modules = [
  'public/js/games/classic/pattern-master/index.js',
  'public/js/games/classic/snake-pro/index.js',
  'public/js/games/classic/space-pro/index.js'
];

[
  'public/js/games/shared/classic-runtime.js',
  'public/js/games/shared/score-submit-validator.js',
  'public/js/games/shared/reward-normalizer.js',
  'public/js/games/shared/auth-guard-ui.js',
  'public/js/games/shared/mobile-canvas.js',
  'public/js/games/shared/topbar.js'
].forEach((rel) => mustExist(rel, 'Phase 8 shared classic helper'));

htmlFiles.forEach((rel) => {
  mustContain(rel, 'initial-scale=1', 'Mobil viewport scale standardı');
  mustContain(rel, 'public/js/games/game-account-sync.js', 'Game account sync preload');
  mustContain(rel, 'uiAccountAvatarHost', 'Topbar avatar slot');
  mustContain(rel, '../public/avatar-frame.css', 'Avatar frame CSS');
  mustContain(rel, '../public/avatar-registry.js', 'Avatar registry');
});

cssFiles.forEach((rel) => {
  mustContain(rel, 'Phase 8 classic runtime', 'Phase 8 CSS bloğu');
  mustContain(rel, '100dvh', 'Mobil dinamik viewport');
  mustContain(rel, 'pm-classic-auth-guard', 'Auth guard UI CSS');
  mustContain(rel, 'data-pm-mobile-canvas-ready', 'Mobile canvas CSS guard');
});

modules.forEach((rel) => {
  mustContain(rel, 'createClassicGameRuntime', 'Shared classic runtime kullanımı');
  mustContain(rel, 'onAuthStateChanged(auth,', 'Firebase auth state listener');
  mustContain(rel, '/api/classic/submit', 'Classic score endpoint contract');
  mustContain(rel, '__PM_GAME_ACCOUNT_SYNC__', 'Topbar live account sync hook');
  mustNotContain(rel, 'gameActive = false', 'Modül oyun iç state değişimi yapmamalı');
  mustNotContain(rel, 'started = false', 'Modül oyun iç state değişimi yapmamalı');
  mustNotContain(rel, 'state.running = false', 'Modül oyun iç state değişimi yapmamalı');
});

mustContain('public/js/games/classic/snake-pro/index.js', 'installMobileCanvasResize', 'Snake mobile canvas helper');
mustContain('public/js/games/classic/space-pro/index.js', 'installMobileCanvasResize', 'Space mobile canvas helper');

gameScripts.forEach((rel) => {
  mustContain(rel, 'window.__PM_CLASSIC__', 'Auth-required boot gate');
  mustContain(rel, 'finishRun', 'Reward submit hook');
});
mustContain('classic-games/pattern-master.js', '__PM_PATTERN_MASTER_GAME__', 'Pattern auth hook');
mustContain('classic-games/snake-pro.js', '__PM_SNAKE_PRO_GAME__', 'Snake auth hook');
mustContain('classic-games/space-pro.js', '__PM_SPACE_PRO_GAME__', 'Space auth hook');

mustContain('routes/classic.routes.js', "res.set('Cache-Control', 'no-store, max-age=0')", 'Classic submit no-store header');
mustContain('routes/classic.routes.js', 'normalizeSubmittedScore', 'Server score normalizer');
mustContain('routes/classic.routes.js', 'validateRunTiming', 'Server timing validator');
mustContain('routes/classic.routes.js', 'DUPLICATE_RUN', 'Run idempotency validator');
mustContain('routes/classic.routes.js', 'CLASSIC_XP_DAILY_LIMIT', 'Daily XP abuse limiter');
mustContain('routes/classic.routes.js', 'rewardGrant', 'Reward response normalizer payload');
mustContain('routes/classic.routes.js', 'accountSync', 'Account sync payload');
mustContain('routes/classic.routes.js', "source: 'classic_score_progress'", 'Ledger reward source');

mustContain('public/js/games/shared/topbar.js', 'resolveAccountSnapshot', 'Shared topbar resolver');
mustContain('public/js/games/shared/topbar.js', 'uiAccountAvatarHost', 'Shared topbar avatar renderer');
mustContain('public/js/games/shared/reward-normalizer.js', 'normalizeRewardResponse', 'Reward response normalizer');
mustContain('public/js/games/shared/score-submit-validator.js', 'buildClassicScoreSubmission', 'Client score submit validator');

const pkg = JSON.parse(read('package.json'));
must(pkg.scripts?.['check:phase8-classic-runtime'] === 'node tools/check-classic-runtime.js', 'package.json check:phase8-classic-runtime scripti eksik.');
must(pkg.scripts?.['check:phase8-classic-games'], 'package.json check:phase8-classic-games scripti eksik.');

if (failures.length) {
  console.error('Faz 8 klasik oyun runtime kontrolü başarısız:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('check:phase8-classic-runtime OK');
