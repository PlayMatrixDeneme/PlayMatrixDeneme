#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
function must(file, needle, label) {
  const body = read(file);
  if (!body.includes(needle)) failures.push(`${label}: ${file} içinde bulunamadı -> ${needle}`);
}
function mustMatch(file, pattern, label) {
  const body = read(file);
  if (!pattern.test(body)) failures.push(`${label}: ${file} deseni geçemedi -> ${pattern}`);
}

must('utils/rewardLedger.js', 'buildLedgerDocId', 'Ledger idempotency doc id standardı');
must('utils/rewardService.js', 'applyRewardGrantInTransaction', 'Tek transaction reward service');
must('utils/rewardService.js', 'grant.currency === \'XP\'', 'XP ledger/progression desteği');
must('utils/rewardService.js', 'grant.currency === \'MC\'', 'MC credit ledger desteği');
must('utils/accountBootstrap.js', 'signup_reward', 'Kayıt ödülü ledger kaydı');
must('utils/accountBootstrap.js', 'email_verify_reward', 'E-posta ödülü ledger kaydı');
must('utils/accountBootstrap.js', 'buildBootstrapLedgerPayload', 'Kayıt/e-posta ödülleri transaction içinde ledger payload üretir');
must('utils/accountBootstrap.js', 'trx.set(signupLedger.ledgerRef, signupLedger.payload', 'Kayıt ödülü ledger + bakiye aynı transaction içinde yazılır');
must('utils/accountBootstrap.js', 'trx.set(emailLedger.ledgerRef, emailLedger.payload', 'E-posta ödülü ledger + bakiye aynı transaction içinde yazılır');
must('routes/profile.routes.js', 'promoClaimId', 'Promo claim registry çoklu kullanımda geçmiş kaybı yaşamaz');
must('routes/profile.routes.js', 'referenceId: promoDocId', 'Promo ledger canonical promo doc id kullanır');
must('routes/profile.routes.js', "source: 'wheel_spin'", 'Çark ledger source');
must('routes/profile.routes.js', 'crypto.randomInt(0, rewards.length)', 'Çark sonucu server-side üretiliyor');
must('routes/profile.routes.js', "source: 'promo_code'", 'Promo ledger source');
must('routes/profile.routes.js', 'colPromoClaims', 'Promo claim registry');
must('routes/profile.routes.js', 'limitLeft: admin.firestore.FieldValue.increment(-1)', 'Promo kullanım limiti server-side azalıyor');
must('routes/profile.routes.js', "source: 'referral_inviter'", 'Davet eden ledger source');
must('routes/profile.routes.js', "source: 'referral_invitee'", 'Davet edilen ledger source');
must('routes/chess.routes.js', "source: 'chess_win'", 'Satranç ledger source');
must('routes/pisti.routes.js', "source: 'pisti_online_win'", 'Pişti ledger source');
must('routes/crash.routes.js', "source: 'crash_spend_progress'", 'Crash XP ledger source');
must('routes/classic.routes.js', "source: 'classic_score_progress'", 'Klasik oyun XP ledger source');
must('crons/tasks.js', "source: 'monthly_active_reward'", 'Aylık aktiflik ledger source');
must('routes/admin.routes.js', "source: 'admin_manual_grant'", 'Admin manuel reward source');
must('routes/admin.routes.js', "source: 'admin_bulk_grant'", 'Admin bulk reward source');
must('routes/profile.routes.js', 'onePerAccount ? `promo_code:${promoDocId}:${req.user.uid}`', 'Promo one-per-account idempotency');
mustMatch('routes/profile.routes.js', /idempotencyKey:\s*`wheel_spin:\$\{req\.user\.uid\}:\$\{spinAt\}`/, 'Wheel idempotency');

if (failures.length) {
  console.error('[check:ledger-phase6] başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[check:ledger-phase6] OK - MC/XP ledger, idempotency, promo limit ve server-side wheel doğrulandı.');
process.exit(0);
