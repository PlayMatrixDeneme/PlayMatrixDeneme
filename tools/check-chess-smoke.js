#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const fail = (message) => { console.error(`[FAZ7-CHESS] ${message}`); process.exitCode = 1; };
const mustExist = (file) => { if (!exists(file)) fail(`${file} dosyası yok.`); };
const mustContain = (file, needle, label = needle) => { if (!read(file).includes(needle)) fail(`${file} içinde zorunlu kalıp yok: ${label}`); };
const mustNotContain = (file, needle, label = needle) => { if (read(file).includes(needle)) fail(`${file} içinde kaldırılması gereken kalıp var: ${label}`); };
const checkModuleSyntax = (file) => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: read(file), encoding: 'utf8' });
  if (result.status !== 0) fail(`${file} ESM syntax kontrolü başarısız:\n${result.stderr || result.stdout}`);
};
const checkCjsSyntax = (file) => {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { encoding: 'utf8' });
  if (result.status !== 0) fail(`${file} CJS syntax kontrolü başarısız:\n${result.stderr || result.stdout}`);
};

[
  'online-games/chess.js',
  'online-games/Satranc.html',
  'routes/chess.routes.js',
  'public/js/games/shared/room-state.js',
  'public/js/games/shared/topbar.js',
  'public/js/games/shared/reward-client.js',
  'public/js/games/shared/navigation.js'
].forEach(mustExist);

checkModuleSyntax('online-games/chess.js');
checkCjsSyntax('routes/chess.routes.js');

mustContain('online-games/chess.js', 'scheduleGameBoot(() =>', 'geç yüklenen ESM için güvenli boot bağı');
mustContain('online-games/chess.js', 'hydrateGameTopbar(res', 'ortak topbar hydration');
mustContain('online-games/chess.js', 'notifyGameAccountMutation(res)', 'ortak reward/account mutation bridge');
mustContain('online-games/chess.js', "setActiveGameRoom('chess'", 'ortak active room persistence');
mustContain('online-games/chess.js', "window.createRoom = async", 'oda kur istemci akışı');
mustContain('online-games/chess.js', "window.joinRoom = async", 'hızlı katıl/katıl istemci akışı');
mustContain('online-games/Satranc.html', 'ODA KUR', 'oda kur butonu');
mustContain('online-games/Satranc.html', 'HIZLI KATIL', 'hızlı katıl butonu');
mustContain('routes/chess.routes.js', 'isChessLobbyVisible', 'stale Satranç oda filtresi');
mustContain('routes/chess.routes.js', 'tx.delete(doc.ref)', 'stale bekleyen Satranç oda temizliği');
mustContain('routes/chess.routes.js', "await assertNoOtherActiveGame(uid);", 'oda açarken başka aktif oyun kilidi');
mustContain('routes/chess.routes.js', "await assertNoOtherActiveGame(uid, { allowRoomId: roomId || '' });", 'katılımda aynı oda resume izni');
mustContain('routes/chess.routes.js', 'chess_match_result', 'Satranç match result ledger kaydı');
mustNotContain('online-games/chess.js', "window.addEventListener('load', () => {", 'load sonrası kaçan eski boot bağı');

if (process.exitCode) process.exit(process.exitCode);
console.log('[FAZ7-CHESS] OK');
