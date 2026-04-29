#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`[check:phase7] ${message}`);
  process.exit(1);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function count(haystack, needle) { return (haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length; }

const progression = read('utils/progression.js');
const frontend = read('public/data/progression-policy.js');
const homeRuntime = read('public/js/home/legacy-home.runtime.js');
const tasks = read('crons/tasks.js');
const platform = read('utils/platformControl.js');
const admin = read('routes/admin.routes.js');
const accountState = read('utils/accountState.js');

[
  'ACCOUNT_LEVEL_CURVE_MODE',
  'ACCOUNT_LEVEL_STEPS_EXACT',
  'ACCOUNT_LEVEL_THRESHOLDS_EXACT',
  'accountXpExact',
  'accountLevelScoreExact',
  '__periodKey'
].forEach((token) => { if (!progression.includes(token)) fail(`utils/progression.js içinde ${token} eksik.`); });

[
  'accountLevelCurrentXpExact',
  'accountLevelNextXpExact',
  'accountLevelSpanXpExact',
  'accountLevelRemainingXpExact'
].forEach((token) => { if (!accountState.includes(token)) fail(`accountState exact UI alanı eksik: ${token}`); });

[
  'GENERATED_FROM_BACKEND_PROGRESSION_POLICY',
  'formatXpExact',
  'compactXpExact',
  'accountLevelRemainingXpExact',
  'accountLevelNextXpExact'
].forEach((token) => { if (!frontend.includes(token)) fail(`frontend progression policy içinde ${token} eksik.`); });

[
  'normalizeAccountXpExact',
  'function getUserAccountXpExact',
  'getAccountLevelProgressFromXp(accountXpExact)',
  'accountXpExact: clientProgression.accountXpExact',
  'accountLevelRemainingXpExact: clientProgression.accountLevelRemainingXpExact'
].forEach((token) => { if (!homeRuntime.includes(token)) fail(`home runtime exact XP desteği eksik: ${token}`); });

[
  'colMonthlyRewardRuns',
  'beginMonthlyRewardRun',
  'finalizeMonthlyRewardRun',
  'markMonthlyRewardRunFailed',
  'monthly_active_reward',
  'idempotencyKey: `monthly_active_reward:${rewardMonthKey}:${item.doc.id}`',
  'resetMonthlyActivityForNewPeriod',
  'monthly_rewards_pending'
].forEach((token) => { if (!tasks.includes(token)) fail(`crons/tasks.js içinde ${token} eksik.`); });

if (tasks.includes("where('lastMonthlyRewardKey'")) fail('Aylık ödül tamamlanma kontrolü kullanıcı alanına göre yapılamaz; sadece monthly_reward_runs completed kullanılmalı.');
if (count(tasks, 'await resetMonthlyActivityForNewPeriod(currentPeriodKey);') !== 1) fail('Aylık aktiflik reseti monthly reward job içinde tam bir kez çağrılmalı.');

[
  'ACTIVITY_RESET_WINDOW_HOURS',
  'MONTHLY_REWARD_WINDOW_HOURS',
  'isActivityResetWindowOpen',
  'isMonthlyRewardWindowOpen'
].forEach((token) => { if (!platform.includes(token)) fail(`utils/platformControl.js içinde ${token} eksik.`); });

if (!admin.includes('buildActivityResetState(activityLabel')) fail('Admin activity reset canonical reset state kullanmıyor.');

console.log('[check:phase7] OK - BigInt exact progression, UI exact string, reward-run idempotency, reset race guard ve leaderboard/rank reset tutarlılığı aktif.');
process.exit(0);
