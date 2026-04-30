'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const contains = (file, needle) => read(file).includes(needle);

const gamePages = [
  'online-games/Crash.html',
  'online-games/Pisti.html',
  'online-games/Satranc.html',
  'classic-games/PatternMaster.html',
  'classic-games/SnakePro.html',
  'classic-games/SpacePro.html'
];

gamePages.forEach((file) => {
  must(contains(file, 'public/js/games/game-account-sync.js'), `${file}: live account sync missing`);
});

must(contains('public/js/games/game-account-sync.js', 'pm:game-account-mutated'), 'game account sync mutation event missing');
must(contains('public/js/games/game-account-sync.js', 'uiAccountLevelBar'), 'game account sync level bar missing');
must(contains('public/js/games/game-account-sync.js', "['uiBalance', 'ui-balance']"), 'game account sync dual balance ids missing');

[
  'public/js/games/classic/pattern-master/index.js',
  'public/js/games/classic/snake-pro/index.js',
  'public/js/games/classic/space-pro/index.js',
  'public/js/games/crash/crash-app.js',
  'online-games/pisti.js',
  'online-games/chess.js'
].forEach((file) => {
  must(contains(file, '__PM_GAME_ACCOUNT_SYNC__'), `${file}: sync hook missing`);
});

const chessRoutes = read('routes/chess.routes.js');
const pistiRoutes = read('routes/pisti.routes.js');
must(!/where\('status',\s*'==',\s*'waiting'\)\.orderBy\('createdAt'/.test(chessRoutes), 'chess lobby still needs Firestore composite index');
must(!/where\('status',\s*'==',\s*'waiting'\)\.orderBy\('createdAt'/.test(pistiRoutes), 'pisti lobby still needs Firestore composite index');
must(/degraded:\s*true,\s*rooms:\s*\[\]/.test(chessRoutes), 'chess lobby degraded empty fallback missing');
must(/degraded:\s*true,\s*rooms:\s*\[\]/.test(pistiRoutes), 'pisti lobby degraded empty fallback missing');

const stability = read('public/js/home/stability-guard.js');
must(!stability.includes("report('home.leaderboard.fallbackFetch'"), 'leaderboard fallback fetch still reports benign network errors');
must(stability.includes('/api/leaderboard?t='), 'leaderboard fallback endpoint missing');

must(contains('utils/errorMonitor.js', 'isBenignClientRuntimeError'), 'benign client error filter missing');
must(contains('public/css/static-inline.css', '#playerStatsModal .ps-modal-content'), 'player stats modal layout guard missing');

console.log('✅ Faz 10/11 live hotfix kontrolleri başarılı.');
