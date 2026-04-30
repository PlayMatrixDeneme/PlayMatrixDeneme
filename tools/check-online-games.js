#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const fail = (message) => {
  console.error(`[FAZ10-GAMES] ${message}`);
  process.exitCode = 1;
};
const mustContain = (file, needle, label = needle) => {
  const content = read(file);
  if (!content.includes(needle)) fail(`${file} içinde zorunlu kalıp yok: ${label}`);
};
const mustExist = (file) => {
  if (!fs.existsSync(path.join(ROOT, file))) fail(`${file} dosyası yok.`);
};

mustExist('utils/gameLedger.js');
mustContain('utils/gameLedger.js', "db.collection('game_ledger')", 'kalıcı oyun ledger koleksiyonu');
mustContain('utils/gameLedger.js', 'recordGameLedgerInTransaction', 'transaction uyumlu oyun ledger kaydı');

mustContain('config/constants.js', 'CHESS_TIMEOUT_WIN', 'satranç süre aşımı sonucu');
mustContain('config/constants.js', 'PISTI_NORMAL_WIN', 'pişti normal sonuç kodu');
mustContain('config/constants.js', 'PISTI_DISCONNECT_WIN', 'pişti disconnect sonuç kodu');
mustContain('config/constants.js', 'PISTI_WAITING_CANCELLED', 'pişti bekleme odası iptal sonucu');
mustContain('config/constants.js', 'CHESS_INITIAL_CLOCK_MS', 'sunucu satranç başlangıç süresi');
mustContain('config/constants.js', 'CHESS_INCREMENT_MS', 'sunucu satranç hamle artışı');

mustContain('routes/crash.routes.js', "router.get('/resume'", 'Crash aktif session resume endpoint');
mustContain('routes/crash.routes.js', "router.get('/history'", 'Crash history endpoint');
mustContain('routes/crash.routes.js', "router.get('/audit'", 'Crash audit endpoint');
mustContain('routes/crash.routes.js', 'crash_bet_stake', 'Crash bahis ledger kaydı');
mustContain('routes/crash.routes.js', 'crash_cashout_payout', 'Crash manuel cashout ledger kaydı');
mustContain('routes/crash.routes.js', "assertNoOtherActiveGame(uid, { allowGameType: 'crash' })", 'Crash katılımında başka oyun oturumu engeli');
mustContain('public/js/games/crash/crash-app.js', 'async function restoreActiveBets', 'Crash istemci aktif bet resume akışı');
mustContain('public/js/games/crash/crash-app.js', 'async function placeBet', 'Crash istemci bet akışı');
mustContain('public/js/games/crash/crash-app.js', 'async function cashOut', 'Crash istemci cashout akışı');
mustContain('public/js/games/crash/crash-app.js', 'function checkAutoBets', 'Crash istemci auto bet akışı');
mustContain('public/js/games/crash/crash-app.js', 'function handleServerData', 'Crash socket state işleyici');
mustContain('public/js/games/crash/crash-app.js', 'function handleTick', 'Crash socket tick işleyici');
mustContain('engines/crashEngine.js', 'crash_auto_cashout_payout', 'Crash auto cashout settlement ledger kaydı');
mustContain('engines/crashEngine.js', 'crash_crashed_loss', 'Crash kayıp settlement ledger kaydı');
mustContain('engines/crashEngine.js', "where('roundId', '==', safeRoundId)", 'Crash round kapanışında Firestore aktif bahis taraması');
mustContain('engines/crashEngine.js', 'settlementPending', 'Crash auto cashout kalıcı settlement bekleme kilidi');
mustContain('engines/crashEngine.js', 'nextRetryAt', 'Crash auto cashout kontrollü retry kuyruğu');

mustContain('routes/chess.routes.js', "router.get('/resume'", 'Satranç session resume endpoint');
mustContain('routes/chess.routes.js', 'createChessClock', 'Satranç sunucu saat durumu');
mustContain('routes/chess.routes.js', 'getExpiredChessColor', 'Satranç süre aşımı doğrulaması');
mustContain('routes/chess.routes.js', 'applyChessMoveClock', 'Satranç hamle sonrası saat güncellemesi');
mustContain('routes/chess.routes.js', 'chess_match_result', 'Satranç match result oyun ledger kaydı');
mustContain('routes/chess.routes.js', 'await assertNoOtherActiveGame(uid);', 'Satranç oda açarken başka aktif oyun engeli');
mustContain('routes/chess.routes.js', "await assertNoOtherActiveGame(uid, { allowRoomId: roomId || '' });", 'Satranç oda katılımında sadece aynı oda resume izni');
mustContain('routes/chess.routes.js', 'Bu satranç odasında ping yetkiniz yok', 'Satranç ping yetki doğrulaması');

mustContain('routes/pisti.routes.js', "router.get('/online/resume'", 'Pişti session resume endpoint');
mustContain('routes/pisti.routes.js', 'recordPistiStakeLedgerInTransaction', 'Pişti bahis ledger kaydı');
mustContain('routes/pisti.routes.js', 'recordPistiSettlementLedgerInTransaction', 'Pişti settlement oyun ledger kaydı');
mustContain('routes/pisti.routes.js', 'persistPistiSettlementArtifacts', 'Pişti match history + audit kalıcılığı');
mustContain('routes/pisti.routes.js', 'await persistPistiSettlementArtifacts', 'Pişti settlement artifact yazımı cevap öncesi beklenir');
mustContain('routes/pisti.routes.js', 'pisti_match_result', 'Pişti sonuç ledger kaynağı');
mustContain('routes/pisti.routes.js', 'await assertNoOtherActiveGame(uid);', 'Pişti masa açarken başka aktif oyun engeli');
mustContain('routes/pisti.routes.js', "await assertNoOtherActiveGame(uid, { allowRoomId: roomId || '' });", 'Pişti masa katılımında sadece aynı oda resume izni');
mustContain('routes/pisti.routes.js', 'Bu Pişti odasında ping yetkiniz yok', 'Pişti ping yetki doğrulaması');
mustContain('routes/pisti.routes.js', "where('participantUids', 'array-contains', uid)", 'Pişti resume hedefli katılımcı sorgusu');
mustContain('routes/pisti.routes.js', 'refundSnapshot', 'Pişti bekleme iadesinde silmeden önce audit snapshot');
mustContain('routes/pisti.routes.js', 'Bu Pişti odasında ayrılma yetkiniz yok', 'Pişti leave yetki doğrulaması');
mustContain('routes/pisti.routes.js', 'waiting_room_cancelled', 'Pişti bekleme odası iptal audit kaydı');

mustContain('utils/gameSession.js', 'listActiveCrashSessionsForUid', 'global session taramasında Crash resume desteği');
mustContain('utils/gameSession.js', "status: 'playing'", 'aktif Crash bahsi global oturum kilidine playing olarak girer');
mustContain('utils/gameSession.js', "where('host.uid', '==', safeUid)", 'Satranç global oturum kilidi hedefli host sorgusu');
mustContain('utils/gameSession.js', "where('participantUids', 'array-contains', safeUid)", 'Pişti global oturum kilidi hedefli katılımcı sorgusu');
mustContain('routes/pisti.routes.js', 'syncPistiParticipantUids', 'Pişti odalarında hedefli session resume katılımcı indeksi');
mustContain('routes/live.routes.js', 'findCrashLiveSession', 'live session endpointinde Crash resume desteği');
mustContain('routes/live.routes.js', "status: 'playing'", 'live session Crash durumunu oynanıyor olarak döndürür');

if (!process.exitCode) {
  console.log('[FAZ10-GAMES] Crash, Satranç ve Pişti sunucu-otoriteli oyun kontrolleri başarılı.');
  process.exit(0);
}
