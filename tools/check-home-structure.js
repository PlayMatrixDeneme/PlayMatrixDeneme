#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function fail(message) {
  failures.push(message);
}
function mustExist(rel) {
  if (!exists(rel)) fail(`${rel} bulunamadı.`);
}
function mustContain(rel, needle, label = needle) {
  if (!read(rel).includes(needle)) fail(`${label} eksik: ${rel}`);
}
function mustNotContain(rel, needle, label = needle) {
  if (read(rel).includes(needle)) fail(`${label} kaldırılmalı: ${rel}`);
}
function mustNotMatch(rel, pattern, label = String(pattern)) {
  if (pattern.test(read(rel))) fail(`${label} kaldırılmalı: ${rel}`);
}

[
  'public/js/home/state.js',
  'public/js/home/api.js',
  'public/js/home/renderers.js',
  'public/js/home/modals.js',
  'public/js/home/mobile-scroll.js',
  'public/js/home/account.js',
  'public/js/home/matchmaking.js'
].forEach(mustExist);

mustContain('public/js/home/app.js', 'installHomeStateBridge', 'home/state module');
mustContain('public/js/home/app.js', 'installSafeRenderGuards', 'safe render module');
mustContain('public/js/home/app.js', 'installMobileGesturePolicy', 'mobile scroll module');
mustContain('public/js/home/app.js', 'installHomeModalManager', 'modal manager module');
mustContain('public/js/home/app.js', 'installAccountStateModule', 'account state module');
mustContain('public/js/home/app.js', 'installMatchmakingStateModule', 'matchmaking state module');
if (!read('public/js/home/app.js').includes('phase: 5') && !read('public/js/home/app.js').includes('phase: 6')) {
  fail('home module phase 5/6 marker eksik: public/js/home/app.js');
}

mustNotMatch('public/js/home/stability-guard.js', /\.innerHTML\s*=/, 'stability-guard innerHTML assignment');
mustNotMatch('public/js/home/stability-guard.js', /onerror\s*=/, 'inline image onerror');
mustNotMatch('public/js/home/dom-utils.js', /\.innerHTML\s*=/, 'dom-utils unsafe HTML write');
mustNotContain('public/js/home/dom-utils.js', 'opts.html', 'dom-utils html option');

mustNotContain('public/js/home/legacy-home.runtime.js', 'style.touchAction = "manipulation"', 'global touchAction manipulation');
mustContain('public/js/home/legacy-home.runtime.js', 'pm-mobile-scroll-policy', 'legacy runtime mobile policy class');
mustContain('public/js/home/mobile-scroll.js', 'document.documentElement.style.removeProperty', 'mobile scroll removes global touch-action');
mustContain('public/js/home/mobile-scroll.js', 'touchmove', 'mobile touchmove containment');
mustContain('public/js/home/mobile-scroll.js', 'pm-modal-scroll-locked', 'modal scroll lock class');
mustContain('public/css/responsive.css', 'Faz 5 mobile gesture and modal scroll policy', 'mobile gesture CSS');
mustContain('public/css/responsive.css', 'touch-action: pan-y', 'scoped pan-y rule');
mustContain('public/css/responsive.css', 'overscroll-behavior: contain', 'overscroll containment');

mustContain('public/js/home/renderers.js', 'setSafeImage', 'safe image renderer');
mustContain('public/js/home/account.js', 'updateAccountProgress', 'account progress state module');
mustContain('public/js/home/state.js', 'createHomeStore', 'home state store');

mustContain('package.json', 'check:phase5-home', 'phase5 home package script');
mustContain('package.json', 'check:phase5', 'phase5 release package script');

if (failures.length) {
  console.error('Faz 5 home integrity kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('check:phase5-home OK. Home state/render/modal/mobile-scroll kontratı doğrulandı.');
