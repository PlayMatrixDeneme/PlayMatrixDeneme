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

mustContain('public/js/home/fast-home-paint.js', 'game-quick-match-btn', 'Fast paint quick match button');
mustContain('public/js/home/fast-home-paint.js', "quickBtn.dataset.quickMatchGame = game.name === 'Pişti' ? 'pisti' : 'chess'", 'Pişti quick match dataset');
mustContain('public/js/home/legacy-home.runtime.js', 'startMatchmaking(game.name === "Satranç" ? "chess" : "pisti"', 'Legacy Pişti/Satranç quick match action');

['public/js/home/fast-home-paint.js', 'public/js/home/game-catalog.js', 'public/js/home/legacy-home.runtime.js', 'public/js/home/stability-guard.js'].forEach((rel) => {
  mustNotMatch(rel, /category:\s*['"]classic['"],\s*access:\s*['"]free['"]/, 'Klasik oyunlar free access');
});
mustContain('public/js/home/game-catalog.js', 'PatternMaster|SpacePro|SnakePro', 'Klasik oyun auth wall regex');
mustContain('server.js', 'requiresAuth: true', 'Klasik oyun server auth guard');
mustContain('server.js', 'sendGuardedGamePage', 'Server game auth guard helper');
mustContain('server.js', 'buildLoginRedirect', 'Server login redirect helper');

mustContain('public/css/social.css', 'Release recheck: mobile social center full-height fix', 'Sosyal merkez full-height CSS');
mustContain('public/css/social.css', 'height: 100dvh', 'Sosyal merkez dvh yüksekliği');
mustContain('public/css/social.css', 'display: none !important', 'Sosyal merkez pseudo blur disable');
mustContain('public/css/static-inline.css', 'Release recheck: stable quick-match button group', 'Quick-match button CSS');
mustContain('public/css/static-inline.css', '.game-quick-match-btn', 'Quick-match button class CSS');

if (failures.length) {
  console.error('Faz 5 recheck hotfix kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('check:phase5-recheck-hotfix OK. Satranç/Pişti quick-match, klasik auth wall ve sosyal mobil layout doğrulandı.');
