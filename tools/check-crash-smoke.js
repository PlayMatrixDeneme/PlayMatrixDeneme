#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const fail = (message) => { console.error(`[FAZ7-CRASH] ${message}`); process.exitCode = 1; };
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
  'public/js/games/crash/crash-app.js',
  'routes/crash.routes.js',
  'engines/crashEngine.js',
  'public/js/games/shared/room-state.js',
  'public/js/games/shared/topbar.js',
  'public/js/games/shared/reward-client.js'
].forEach(mustExist);

checkModuleSyntax('public/js/games/crash/crash-app.js');
checkCjsSyntax('routes/crash.routes.js');

mustContain('public/js/games/crash/crash-app.js', 'scheduleGameBoot(() =>', 'geç yüklenen ESM için güvenli boot bağı');
mustContain('public/js/games/crash/crash-app.js', 'hydrateGameTopbar(d)', 'ortak topbar hydration');
mustContain('public/js/games/crash/crash-app.js', 'applyGameAccountSnapshot(d)', 'ortak hesap snapshot bridge');
mustContain('public/js/games/crash/crash-app.js', 'notifyGameAccountMutation({ ...payload', 'ortak reward/account mutation bridge');
mustContain('public/js/games/crash/crash-app.js', 'async function restoreActiveBets', 'aktif bet resume akışı');
mustContain('public/js/games/crash/crash-app.js', 'async function placeBet', 'bahis akışı');
mustContain('public/js/games/crash/crash-app.js', 'async function cashOut', 'cashout akışı');
mustContain('routes/crash.routes.js', 'crash_bet_stake', 'Crash bahis ledger kaydı');
mustContain('routes/crash.routes.js', 'crash_cashout_payout', 'Crash cashout ledger kaydı');
mustContain('routes/crash.routes.js', "assertNoOtherActiveGame(uid, { allowGameType: 'crash' })", 'Crash başka aktif oyun kilidi');
mustContain('engines/crashEngine.js', 'crash_auto_cashout_payout', 'Crash auto cashout ledger kaydı');
mustContain('engines/crashEngine.js', 'crash_crashed_loss', 'Crash kayıp settlement ledger kaydı');
mustNotContain('public/js/games/crash/crash-app.js', "window.addEventListener('load', () => {", 'load sonrası kaçan eski boot bağı');

if (process.exitCode) process.exit(process.exitCode);
console.log('[FAZ7-CRASH] OK');
