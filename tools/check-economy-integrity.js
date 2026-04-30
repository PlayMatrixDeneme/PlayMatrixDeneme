#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const must = (file, needle, label) => {
  if (!read(file).includes(needle)) failures.push(`${label}: ${file} içinde bulunamadı -> ${needle}`);
};
const mustNot = (file, needle, label) => {
  if (read(file).includes(needle)) failures.push(`${label}: ${file} içinde kaldırılması gerekiyor -> ${needle}`);
};

must('utils/progression.js', 'ACCOUNT_LEVEL_STEPS_EXACT', 'Backend exact XP step table');
must('utils/progression.js', 'ACCOUNT_LEVEL_THRESHOLDS_EXACT', 'Backend exact XP threshold table');
must('utils/progression.js', 'accountXpExact', 'Backend exact account XP contract');
must('public/data/progression-policy.js', 'ACCOUNT_LEVEL_STEPS_EXACT', 'Frontend exact XP step table');
must('utils/rewardService.js', 'buildLedgerDocId', 'Reward ledger idempotency');
must('utils/rewardService.js', 'applyRewardGrantInTransaction', 'Atomic reward transaction service');
must('utils/economyCore.js', 'applyProgressionPatchInTransaction', 'Atomic progression transaction helper');
must('routes/profile.routes.js', 'promo_code:${code}:${req.user.uid}', 'Promo guard standard');
must('routes/profile.routes.js', 'promoGuardRefs', 'Promo canonical guard refs');
mustNot('routes/profile.routes.js', 'colPromoClaims().doc(`_`)', 'Promo sabit claim dokümanı');
must('crons/tasks.js', 'MONTHLY_REWARD_STATE', 'Monthly reward state machine');
must('crons/tasks.js', "WINDOW_CLOSED: 'WINDOW_CLOSED'", 'Monthly WINDOW_CLOSED state');
must('crons/tasks.js', "WINDOW_OPEN: 'WINDOW_OPEN'", 'Monthly WINDOW_OPEN state');
must('crons/tasks.js', "REWARD_GRANTED: 'REWARD_GRANTED'", 'Monthly REWARD_GRANTED state');
must('crons/tasks.js', "RESET_DONE: 'RESET_DONE'", 'Monthly RESET_DONE state');
must('crons/tasks.js', 'monthlyRewardState: MONTHLY_REWARD_STATE.WINDOW_CLOSED', 'Monthly window closed state write');
must('crons/tasks.js', 'monthlyRewardState: MONTHLY_REWARD_STATE.RESET_DONE', 'Monthly reset-done state write');
must('crons/tasks.js', 'idempotencyKey: `monthly_active_reward:${rewardMonthKey}:${item.doc.id}`', 'Monthly reward idempotency key');
must('routes/pisti.routes.js', "progressReward = applySpendProgression(tx, uRef, uSnap.data() || {}, bet, 'PISTI_ONLINE_BET')", 'Pişti private XP transaction standard');
must('routes/classic.routes.js', "currency: 'XP'", 'Classic game XP ledger');
must('routes/crash.routes.js', "source: 'crash_spend_progress'", 'Crash spend XP ledger');
must('routes/pisti.routes.js', "source: 'pisti_spend_progress'", 'Pişti spend XP ledger');

if (failures.length) {
  console.error('Faz 3 ekonomi bütünlüğü kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Faz 3 ekonomi, seviye, ödül, promosyon ve ledger bütünlüğü kontrolü başarılı.');

process.exit(0);
