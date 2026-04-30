#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const progression = require('../utils/progression');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'public', 'data', 'progression-policy.js');
const source = fs.readFileSync(outPath, 'utf8');

if (progression.ACCOUNT_PROGRESSION_VERSION !== 6) throw new Error('BACKEND_PROGRESSION_VERSION_MISMATCH');
if (progression.ACCOUNT_LEVEL_CURVE_MODE !== 'MD_FACTORIAL_OPTION_A_BIGINT') throw new Error('BACKEND_CURVE_MODE_MISMATCH');
if (!source.includes('GENERATED_FROM_BACKEND_PROGRESSION_POLICY')) throw new Error('FRONTEND_POLICY_NOT_GENERATED');
if (!source.includes(JSON.stringify(progression.ACCOUNT_LEVEL_THRESHOLDS_EXACT[99]))) throw new Error('FRONTEND_POLICY_THRESHOLD_MISMATCH');

console.log(`[sync:progression-policy] OK - v${progression.ACCOUNT_PROGRESSION_VERSION}, ${progression.ACCOUNT_LEVEL_CURVE_MODE}, ${progression.ACCOUNT_LEVEL_CAP} levels.`);
process.exit(0);
