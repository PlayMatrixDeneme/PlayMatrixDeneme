#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message) { failures.push(message); }
function mustContain(rel, needle, label = needle) {
  if (!read(rel).includes(needle)) fail(`${label} eksik: ${rel}`);
}
function mustNotContain(rel, needle, label = needle) {
  if (read(rel).includes(needle)) fail(`${label} kaldırılmalı: ${rel}`);
}
function mustMatch(rel, regex, label = String(regex)) {
  if (!regex.test(read(rel))) fail(`${label} eksik: ${rel}`);
}
function mustNotMatch(rel, regex, label = String(regex)) {
  if (regex.test(read(rel))) fail(`${label} kaldırılmalı: ${rel}`);
}

const realtime = read('utils/realtimeState.js');
const claimStart = realtime.indexOf('async function claimMatchmakingCandidate');
const claimBody = claimStart >= 0 ? realtime.slice(claimStart, realtime.indexOf('async function createInvite', claimStart)) : '';
if (!claimBody) fail('claimMatchmakingCandidate bulunamadı.');
const txGetIndex = claimBody.indexOf('const snap = await tx.get(query)');
const txDeleteIndex = claimBody.indexOf('tx.delete(selfRef)');
const txSetIndex = claimBody.indexOf('tx.set(selfRef');
if (txGetIndex < 0 || txDeleteIndex < 0 || txSetIndex < 0) fail('Matchmaking transaction get/delete/set markerları eksik.');
if (!(txGetIndex >= 0 && txDeleteIndex > txGetIndex && txSetIndex > txGetIndex)) {
  fail('Firestore matchmaking transaction read-before-write sırası bozuk.');
}
mustContain('utils/realtimeState.js', 'Firestore transaction contract: all reads must be completed before any write', 'Firestore transaction açıklaması');

mustContain('sockets/index.js', "gameType === 'pisti' ? cleanStr(data?.mode || '2-52'", 'Pişti matchmaking mode payload');
mustContain('sockets/index.js', "gameType === 'pisti' ? Math.max(1, Math.floor(safeNum(data?.bet, 1000)))", 'Pişti matchmaking bet payload');
mustContain('sockets/index.js', "if (safeGameType === 'pisti')", 'Pişti matchmaking room branch');
mustContain('sockets/index.js', 'startPistiMatchmakingRoom', 'Pişti quick match game starter');
mustContain('sockets/index.js', 'pisti_matchmaking_stake', 'Pişti matchmaking ledger stake');
mustContain('sockets/index.js', "gamePath: '/online-games/pisti'", 'Pişti matchmaking route');

mustContain('public/js/home/home-games.data.js', "quickMatch: Object.freeze({ gameType: 'pisti'", 'Pişti quick-match katalog kontratı');
mustContain('public/js/home/home-games.data.js', "quickMatch: Object.freeze({ gameType: 'chess'", 'Satranç quick-match katalog kontratı');
mustContain('public/js/home/home-game-card.js', 'game-quick-match-btn', 'Game card quick-match button');
mustContain('public/js/home/home-game-card.js', 'quickButton.dataset.quickMatchGame = game.quickMatch.gameType', 'Quick-match dataset');
mustContain('public/js/home/home-route-resolver.js', 'isProtectedHomeGameRoute', 'Merkezi game auth guard');
mustContain('public/js/home/home-games.data.js', '/classic-games/pattern-master', 'Pattern Master canonical route');
mustContain('public/js/home/home-games.data.js', '/classic-games/space-pro', 'Space Pro canonical route');
mustContain('public/js/home/home-games.data.js', '/classic-games/snake-pro', 'Snake Pro canonical route');

['public/js/home/fast-home-paint.js', 'public/js/home/game-catalog.js', 'public/js/home/stability-guard.js', 'public/js/home/home-games.data.js'].forEach((rel) => {
  mustNotMatch(rel, /category:\s*['"]classic['"],\s*access:\s*['"]free['"]/, 'Klasik oyunlar free access');
});

mustContain('config/asciiRoutes.js', 'requiresAuth: true', 'Oyun route auth guard');
mustContain('server.js', 'sendGuardedGamePage', 'Server game auth guard helper');
mustContain('server.js', 'buildLoginRedirect', 'Server login redirect helper');
mustContain('server.js', 'requiresAuth: route.requiresAuth === true', 'Server auth flag config binding');

mustContain('public/css/social.css', 'Release recheck: mobile social center full-height fix', 'Sosyal merkez full-height CSS');
mustContain('public/css/social.css', 'height: 100dvh', 'Sosyal merkez dvh yüksekliği');
mustContain('public/css/social.css', 'display: none !important', 'Sosyal merkez pseudo blur disable');
mustContain('public/css/static-inline.css', 'Release recheck: stable quick-match button group', 'Quick-match button CSS');
mustContain('public/css/static-inline.css', '.game-quick-match-btn', 'Quick-match button class CSS');

mustNotContain('index.html', 'static-game-card', 'Statik oyun kartları');
mustContain('index.html', 'data-home-games-grid="1"', 'Data-driven oyun grid');

if (failures.length) {
  console.error('AnaSayfa recheck kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('check:home-recheck OK. Data-driven oyun vitrini, merkezi route resolver ve auth guard doğrulandı.');
