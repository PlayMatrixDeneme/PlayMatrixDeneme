'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function assertIncludes(file, needle, label) {
  const body = read(file);
  if (!body.includes(needle)) failures.push(`${label}: ${file} içinde bulunamadı -> ${needle}`);
}

function extractIfBlock(body = "", condition = "") {
  const start = body.indexOf(condition);
  if (start === -1) return "";
  const open = body.indexOf("{", start);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < body.length; i += 1) {
    const char = body[i];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return body.slice(start, i + 1);
    }
  }
  return "";
}

function assertNotIncludesInWindowClosedBranch(file) {
  const body = read(file);
  const monthlyBranch = extractIfBlock(body, "if (!resetMeta.isMonthlyRewardWindowOpen)");
  const activityBranch = extractIfBlock(body, "if (!resetMeta.isActivityResetWindowOpen)");
  if (!monthlyBranch || monthlyBranch.includes("lastProcessedPeriodKey")) failures.push("monthly reward pencere kapalı branch içinde lastProcessedPeriodKey yazmamalı.");
  if (!activityBranch || activityBranch.includes("lastProcessedPeriodKey")) failures.push("activity reset pencere kapalı branch içinde lastProcessedPeriodKey yazmamalı.");
}

assertIncludes('utils/rewardService.js', 'applyRewardGrantInTransaction', 'Merkezi reward service');
assertIncludes('utils/rewardService.js', 'buildLedgerDocId', 'Ledger idempotency');
assertIncludes('utils/rewardService.js', 'grantRewardToAllUsers', 'Toplu reward service');
assertIncludes('utils/economyCore.js', 'applyProgressionPatchInTransaction', 'Merkezi XP progression transaction helper');
assertIncludes('utils/economyCore.js', 'buildProgressionPatch', 'Merkezi progression patch builder');
assertIncludes('utils/rewardService.js', "grant.currency === 'XP'", 'Reward service XP ledger/progression currency support');
assertIncludes('utils/progression.js', 'ACCOUNT_LEVEL_STEPS_EXACT', 'BigInt exact XP step table');
assertIncludes('utils/progression.js', 'accountXpExact', 'Exact XP field support');
assertIncludes('public/data/progression-policy.js', 'ACCOUNT_LEVEL_STEPS_EXACT', 'Frontend exact XP policy');
assertIncludes('utils/helpers.js', 'sanitizerEngine', 'xss fallback warning spam kapalı');
assertIncludes('crons/tasks.js', "require('../utils/rewardService')", 'Cron merkezi reward service kullanımı');
assertIncludes('crons/tasks.js', "idempotencyKey: `monthly_active_reward:${rewardMonthKey}:${item.doc.id}`", 'Aylık reward idempotency');
assertNotIncludesInWindowClosedBranch('crons/tasks.js');
assertIncludes('crons/tasks.js', 'MONTHLY_REWARD_STATE', 'Monthly reward state machine');
assertIncludes('crons/tasks.js', "WINDOW_CLOSED: 'WINDOW_CLOSED'", 'Monthly reward WINDOW_CLOSED state');
assertIncludes('crons/tasks.js', "WINDOW_OPEN: 'WINDOW_OPEN'", 'Monthly reward WINDOW_OPEN state');
assertIncludes('crons/tasks.js', "REWARD_GRANTED: 'REWARD_GRANTED'", 'Monthly reward REWARD_GRANTED state');
assertIncludes('crons/tasks.js', "RESET_DONE: 'RESET_DONE'", 'Monthly reward RESET_DONE state');
assertIncludes('routes/admin.routes.js', 'grantRewardToAllUsers', 'Admin reward-all merkezi service');
assertIncludes('routes/admin.routes.js', 'ledgerId: grant.id', 'Admin tekil ödül ledger cevabı');
assertIncludes('routes/profile.routes.js', 'applyRewardGrantInTransaction', 'Wheel/promo transaction reward service');
assertIncludes('routes/profile.routes.js', 'promo_code:${code}:${req.user.uid}', 'Promo duplicate guard');
assertIncludes('routes/profile.routes.js', 'referral_inviter:${code}', 'Referral duplicate guard');
assertIncludes('config/rewardCatalog.js', 'classic_score_progress', 'Classic XP catalog');
assertIncludes('config/rewardCatalog.js', 'crash_spend_progress', 'Crash XP catalog');
assertIncludes('config/rewardCatalog.js', 'pisti_spend_progress', 'Pisti XP catalog');
assertIncludes('config/rewardCatalog.js', 'admin_bulk_grant', 'Admin bulk reward catalog');
assertIncludes('routes/admin.routes.js', "source: 'admin_bulk_grant'", 'Admin reward-all bulk source');
assertIncludes('routes/classic.routes.js', "currency: 'XP'", 'Classic XP ledger');
assertIncludes('routes/crash.routes.js', "source: 'crash_spend_progress'", 'Crash XP ledger');
assertIncludes('routes/pisti.routes.js', "source: 'pisti_spend_progress'", 'Pişti XP ledger');
assertIncludes('routes/pisti.routes.js', "recordPistiProgressLedger(uid, progressReward, `pisti_online:${roomData.id}:${uid}:open`", 'Pişti play-open ledger roomData.id standardı');
assertIncludes('routes/pisti.routes.js', "progressReward = applySpendProgression(tx, uRef, uSnap.data() || {}, bet, 'PISTI_ONLINE_BET')", 'Pişti özel oda XP transaction dönüşü');
assertIncludes('routes/pisti.routes.js', "return sendPistiError(res, e)", 'Pişti HTTP hata statüsü standardı');
assertIncludes('routes/pisti.routes.js', 'applyPistiPotRewardsInTransaction', 'Pişti pot reward transaction');
assertIncludes('routes/crash.routes.js', 'alreadySettled', 'Crash manuel cashout idempotency guard');
assertIncludes('engines/crashEngine.js', 'isCrashBetAlreadySettled', 'Crash auto/loss settlement idempotency guard');
assertIncludes('engines/crashEngine.js', 'settleSingleCrashLoss', 'Crash loss settlement transaction guard');
assertIncludes('routes/chess.routes.js', 'applyRewardGrantInTransaction', 'Satranç ödül transaction ledger standardı');
assertIncludes('routes/chess.routes.js', 'createRewardNotificationForGrant(result.rewardGrant', 'Satranç ödül notification ledger bağlantısı');



const pistiBody = read('routes/pisti.routes.js');
if (pistiBody.includes('pisti_online:${roomId}:${uid}:join')) failures.push('Pişti play-open içinde dış scope roomId ledger referansı kalmamalı.');
if (pistiBody.includes('progressReward = progressReward =')) failures.push('Pişti progressReward çift ataması kalmamalı.');

const adminBody = read('routes/admin.routes.js');
const rewardAllRoute = adminBody.split("router.post('/admin/matrix/reward-all'")[1]?.split("router.post('/admin/matrix/promo-codes'")[0] || '';
if (rewardAllRoute.includes('FieldValue.increment(amount)')) failures.push('Admin reward-all içinde doğrudan balance increment kalmamalı.');

if (failures.length) {
  console.error('Faz 2 ekonomi ve veri bütünlüğü kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Faz 2 ekonomi ve veri bütünlüğü kontrolü başarılı.');
if (!process.exitCode) process.exit(0);
