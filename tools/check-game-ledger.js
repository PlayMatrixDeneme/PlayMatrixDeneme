#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const fail = (message) => { console.error(`[FAZ7-LEDGER] ${message}`); process.exitCode = 1; };
const mustExist = (file) => { if (!exists(file)) fail(`${file} dosyası yok.`); };
const mustContain = (file, needle, label = needle) => { if (!read(file).includes(needle)) fail(`${file} içinde zorunlu kalıp yok: ${label}`); };
const checkCjsSyntax = (file) => {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { encoding: 'utf8' });
  if (result.status !== 0) fail(`${file} CJS syntax kontrolü başarısız:\n${result.stderr || result.stdout}`);
};

[
  'utils/gameLedger.js',
  'utils/gameSession.js',
  'routes/pisti.routes.js',
  'routes/chess.routes.js',
  'routes/crash.routes.js',
  'engines/crashEngine.js'
].forEach(mustExist);

[
  'utils/gameLedger.js',
  'utils/gameSession.js',
  'routes/pisti.routes.js',
  'routes/chess.routes.js',
  'routes/crash.routes.js',
  'engines/crashEngine.js'
].forEach(checkCjsSyntax);

mustContain('utils/gameLedger.js', 'recordGameLedgerInTransaction', 'transaction içinde oyun ledger kaydı');
mustContain('utils/gameLedger.js', "db.collection('game_ledger')", 'game_ledger koleksiyonu');
mustContain('routes/pisti.routes.js', 'pisti_bet_stake', 'Pişti stake ledger kaydı');
mustContain('routes/pisti.routes.js', 'pisti_match_result', 'Pişti sonuç ledger kaydı');
mustContain('routes/pisti.routes.js', 'buildLedgerDocId', 'Pişti idempotent ledger anahtarı');
mustContain('routes/chess.routes.js', 'chess_match_result', 'Satranç sonuç ledger kaydı');
mustContain('routes/chess.routes.js', 'GAME_RESULT_CODES.CHESS_DISCONNECT_WIN', 'Satranç disconnect result code');
mustContain('routes/crash.routes.js', 'crash_bet_stake', 'Crash stake ledger kaydı');
mustContain('routes/crash.routes.js', 'crash_cashout_payout', 'Crash manual cashout ledger kaydı');
mustContain('engines/crashEngine.js', 'crash_auto_cashout_payout', 'Crash auto cashout settlement ledger kaydı');
mustContain('engines/crashEngine.js', 'crash_crashed_loss', 'Crash loss settlement ledger kaydı');
mustContain('utils/gameSession.js', 'isStaleWaitingSession', 'stale waiting session kilidi temizliği');
mustContain('utils/gameSession.js', 'ACTIVE_WAITING_STALE_MS', 'aktif oyun stale waiting süresi');

if (process.exitCode) process.exit(process.exitCode);
console.log('[FAZ7-LEDGER] OK');
