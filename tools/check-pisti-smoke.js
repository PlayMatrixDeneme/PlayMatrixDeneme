#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const fail = (message) => { console.error(`[FAZ7-PISTI] ${message}`); process.exitCode = 1; };
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
  'public/js/games/shared/dom-sanitize.js',
  'public/js/games/shared/room-state.js',
  'public/js/games/shared/topbar.js',
  'public/js/games/shared/reward-client.js',
  'public/js/games/shared/navigation.js',
  'public/js/games/shared/socket-events.js',
  'online-games/pisti.js',
  'online-games/Pisti.html',
  'online-games/pisti.css',
  'routes/pisti.routes.js'
].forEach(mustExist);

checkModuleSyntax('online-games/pisti.js');
checkModuleSyntax('public/js/games/shared/dom-sanitize.js');
checkModuleSyntax('public/js/games/shared/room-state.js');
checkCjsSyntax('routes/pisti.routes.js');

mustContain('online-games/pisti.js', 'import { escapeHTML } from "../public/js/games/shared/dom-sanitize.js"', 'ortak DOM sanitize importu');
mustContain('online-games/pisti.js', 'scheduleGameBoot(() =>', 'geç yüklenen ESM için güvenli boot bağı');
mustContain('online-games/pisti.js', 'window.quickJoinPistiTable', 'hızlı masa bul istemci akışı');
mustContain('online-games/pisti.js', 'createOnly: true', 'yeni masa kur force-create bayrağı');
mustContain('online-games/pisti.js', "setActiveGameRoom('pisti'", 'ortak active room persistence');
mustContain('online-games/pisti.js', "emitSocketIfConnected(socket, 'pisti:join'", 'güvenli socket join emit');
mustContain('online-games/pisti.js', 'notifyGameAccountMutation(res)', 'ortak reward/account mutation bridge');
mustContain('online-games/Pisti.html', 'YENİ MASA KUR', 'buton metni güncellendi');
mustContain('online-games/Pisti.html', 'HIZLI MASA BUL', 'hızlı masa butonu eklendi');
mustContain('online-games/pisti.css', 'btn-lux-secondary', 'hızlı masa butonu stili');
mustContain('routes/pisti.routes.js', 'const createOnly =', 'backend createOnly kontratı');
mustContain('routes/pisti.routes.js', 'isOnlinePistiLobbyVisible', 'stale Pişti oda filtresi');
mustContain('routes/pisti.routes.js', "doc.ref.delete().catch(() => null)", 'stale bekleyen Pişti oda temizliği');
mustContain('routes/pisti.routes.js', 'recordPistiStakeLedgerInTransaction', 'Pişti stake ledger akışı');
mustContain('routes/pisti.routes.js', 'recordPistiSettlementLedgerInTransaction', 'Pişti settlement ledger akışı');
mustNotContain('online-games/pisti.js', "window.addEventListener('load', () => {", 'load sonrası kaçan eski boot bağı');

if (process.exitCode) process.exit(process.exitCode);
console.log('[FAZ7-PISTI] OK');
