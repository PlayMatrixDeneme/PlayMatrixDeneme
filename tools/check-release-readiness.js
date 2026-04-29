#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const phase0Mode = args.has('--phase=0') || args.has('--phase0');
const phase1Mode = args.has('--phase=1') || args.has('--phase1');
const phase2Mode = args.has('--phase=2') || args.has('--phase2');
const strictMode = args.has('--strict') || (!phase0Mode && !phase1Mode && !phase2Mode);
const executeAllMode = args.has('--execute-all');

const groups = [
  {
    name: 'Faz 0 / Kilitleme ve kalite kapısı',
    requiredForPhase0: true,
    checks: [
      ['check:server', 'syntax:server.js'],
      ['check:env-contract', 'tools/check-env-contract.js'],
      ['check:routes', 'tools/check-routes.js'],
      ['check:html', 'tools/check-html-inline-scripts.js'],
      ['check:maintenance', 'tools/check-maintenance-route.js'],
      ['check:security-phase0', 'tools/check-security-phase0.js'],
      ['check:render-runtime', 'tools/check-render-runtime.js'],
      ['check:bootstrap', 'tools/check-bootstrap-rewards.js'],
      ['check:errors', 'tools/check-error-visibility.js'],
      ['check:firebase-key-contract', 'tools/check-firebase-key-contract.js']
    ]
  },
  {
    name: 'Faz 1 / Deploy, ENV, domain, route ve maintenance',
    requiredForPhase0: false,
    requiredForPhase1: true,
    checks: [
      ['check:deploy-phase1', 'tools/check-deploy-phase1.js'],
      ['check:asset-paths', 'tools/check-asset-paths.js'],
      ['check:file-path-routes', 'tools/check-file-path-routes.js'],
      ['check:no-url-collapse', 'tools/check-no-url-collapse.js']
    ]
  },
  {
    name: 'Faz 2 / Güvenlik sertleştirme, auth, session, CSP ve admin gate',
    requiredForPhase0: false,
    requiredForPhase2: true,
    checks: [
      ['check:security-phase2', 'tools/check-security-phase2.js'],
      ['check:admin-matrix', 'tools/check-admin-matrix-flow.js'],
      ['check:security-phase0', 'tools/check-security-phase0.js']
    ]
  },
  {
    name: 'Genel repo kontratları',
    requiredForPhase0: false,
    checks: [
      ['check:avatars', 'tools/check-avatar-catalog.js'],
      ['check:frames', 'tools/check-frame-picker.js'],
      ['check:progression', 'tools/check-progression.js'],
      ['check:file-path-routes', 'tools/check-file-path-routes.js'],
      ['check:no-url-collapse', 'tools/check-no-url-collapse.js'],
      ['check:asset-paths', 'tools/check-asset-paths.js'],
      ['check:boot-bindings', 'tools/check-boot-bindings.js'],
      ['check:runtime-hardening', 'tools/check-runtime-hardening.js'],
      ['check:economy-phase5', 'tools/check-economy-phase5.js'],
      ['check:playmatrix-compat', 'tools/check-playmatrix-compat.js'],
      ['check:admin-matrix', 'tools/check-admin-matrix-flow.js'],
      ['check:module-boundary', 'tools/check-reference-module-boundary.js'],
      ['check:runtime-api-phase4', 'tools/check-runtime-api-phase4.js'],
      ['check:admin-phase5', 'tools/check-admin-phase5.js'],
      ['check:ledger-phase6', 'tools/check-ledger-phase6.js'],
      ['check:phase7', 'tools/check-phase7-progression-activity.js'],
      ['check:phase8', 'tools/check-phase8-avatar-frame.js'],
      ['check:phase9', 'tools/check-social-phase9.js'],
      ['check:phase10-games', 'tools/check-phase10-games.js'],
      ['check:phase11-classic-games', 'tools/check-phase11-classic-games.js'],
      ['check:render-modal-game-hotfix', 'tools/check-render-modal-game-hotfix.js'],
      ['check:phase10-11-live-hotfix', 'tools/check-phase10-11-live-hotfix.js']
    ]
  },
  {
    name: 'Bilinen gelecek faz blokajları',
    requiredForPhase0: false,
    checks: [
      ['check:legacy-phase9', 'tools/check-legacy-clean-phase9.js'],
      ['check:chat-phase11', 'tools/check-chat-retention-phase11.js'],
      ['check:economy-phase1', 'tools/check-economy-phase1.js'],
      ['check:viewport-contract', 'tools/check-viewport-contract.js'],
      ['check:csp-strict', 'tools/check-csp-strict.js'],
      ['check:no-inline-events', 'tools/check-no-inline-events.js'],
      ['check:no-inline-styles', 'tools/check-no-inline-styles.js'],
      ['check:large-files', 'tools/check-large-files.js'],
      ['audit:repo', 'tools/repo-audit.js']
    ]
  }
];

function runNode(nodeArgs, timeoutMs = 60000) {
  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 8,
    env: process.env
  });
  const timedOut = result.error && result.error.code === 'ETIMEDOUT';
  return {
    ok: !timedOut && Number(result.status || 0) === 0,
    status: timedOut ? 124 : Number(result.status || 0),
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
    error: timedOut ? `Kontrol zaman aşımına uğradı: ${nodeArgs.join(' ')}` : (result.error ? (result.error.stack || result.error.message || String(result.error)) : '')
  };
}

function runCheck(label, target) {
  if (target.startsWith('syntax:')) {
    return { label, target, ...runNode(['--check', path.join(ROOT, target.slice('syntax:'.length))], 30000) };
  }
  return { label, target, ...runNode([path.join(ROOT, target)], 60000) };
}

function checkToolRegistered(label, target) {
  if (target.startsWith('syntax:')) {
    const rel = target.slice('syntax:'.length);
    const exists = fs.existsSync(path.join(ROOT, rel));
    return { label, target, registeredOnly: true, ok: exists, status: exists ? 0 : 1, stdout: '', stderr: '', error: exists ? '' : `Dosya bulunamadı: ${rel}` };
  }
  const exists = fs.existsSync(path.join(ROOT, target));
  return { label, target, registeredOnly: true, ok: exists, status: exists ? 0 : 1, stdout: '', stderr: '', error: exists ? '' : `Dosya bulunamadı: ${target}` };
}

function printResult(item, required) {
  const marker = item.registeredOnly && item.ok ? 'REGISTERED' : (item.ok ? 'OK' : (required ? 'FAIL' : 'BLOCKED'));
  console.log(`[${marker}] ${item.label}`);
  if (!item.ok) {
    const detail = [item.stderr, item.error, item.stdout].filter(Boolean).join('\n').split(/\r?\n/).slice(0, 12).join('\n');
    if (detail) console.log(detail.split(/\r?\n/).map((line) => `  ${line}`).join('\n'));
  }
}

const requiredFailures = [];
const knownBlockers = [];
let passed = 0;
let total = 0;
let executed = 0;
let registeredOnly = 0;

console.log(`PlayMatrix release readiness (${phase0Mode ? 'phase0' : (phase1Mode ? 'phase1' : (phase2Mode ? 'phase2' : 'strict'))})`);

for (const group of groups) {
  const required = strictMode || group.requiredForPhase0 || (phase1Mode && group.requiredForPhase1) || (phase2Mode && (group.requiredForPhase1 || group.requiredForPhase2));
  if (phase0Mode && !group.requiredForPhase0) continue;
  if (phase1Mode && !(group.requiredForPhase0 || group.requiredForPhase1)) continue;
  if (phase2Mode && !(group.requiredForPhase0 || group.requiredForPhase1 || group.requiredForPhase2)) continue;
  console.log(`\n## ${group.name}`);
  for (const [label, target] of group.checks) {
    total += 1;
    const shouldExecute = group.requiredForPhase0 || (phase1Mode && group.requiredForPhase1) || (phase2Mode && (group.requiredForPhase1 || group.requiredForPhase2)) || executeAllMode || strictMode;
    const result = shouldExecute ? runCheck(label, target) : checkToolRegistered(label, target);
    if (result.registeredOnly) registeredOnly += 1;
    else executed += 1;
    if (result.ok && !result.registeredOnly) passed += 1;
    printResult(result, required);
    if (!result.ok && required) requiredFailures.push(result);
    if (!result.ok && !required) knownBlockers.push(result);
  }
}

console.log(`\nÖzet: ${passed}/${executed} çalıştırılan kontrol geçti. Kayıt doğrulanan kontrol: ${registeredOnly}. Toplam madde: ${total}.`);
if (!executeAllMode && !phase0Mode && !phase1Mode && !phase2Mode) {
  console.log('Not: --execute-all verilmediği için Faz 0/1/2 dışı kontroller kayıt/dosya varlığı seviyesinde doğrulandı.');
}
if (knownBlockers.length && phase0Mode) {
  console.log('Gelecek faz blokajları raporlandı; Faz 0 kalite kapısını kırmaz:');
  knownBlockers.forEach((item) => console.log(`- ${item.label}`));
}
if (requiredFailures.length) {
  console.error('Zorunlu kalite kapısı başarısız:');
  requiredFailures.forEach((item) => console.error(`- ${item.label}`));
  process.exit(1);
}
console.log('check:release-readiness OK');
process.exit(0);
