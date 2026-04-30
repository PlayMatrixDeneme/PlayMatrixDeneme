#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function fail(message) {
  failures.push(message);
}
function mustExist(rel, label) {
  if (!exists(rel)) fail(`${label} eksik: ${rel}`);
}
function mustContain(rel, needle, label) {
  if (!read(rel).includes(needle)) fail(`${label} eksik: ${rel}`);
}
function mustNotContain(rel, needle, label) {
  if (exists(rel) && read(rel).includes(needle)) fail(`${label} kaldırılmalı: ${rel}`);
}
function walk(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(abs, entry.name);
    if (entry.isDirectory()) walk(path.relative(ROOT, p).replace(/\\/g, '/'), out);
    else out.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return out;
}

[
  'public/js/games/classic/pattern-master/index.js',
  'public/js/games/classic/snake-pro/index.js',
  'public/js/games/classic/space-pro/index.js'
].forEach((rel) => {
  mustExist(rel, 'Kalıcı klasik oyun modülü');
  mustContain(rel, 'onAuthStateChanged(auth,', 'Firebase modular auth listener');
  mustContain(rel, '/api/classic/submit', 'Server-side skor gönderimi');
});

mustContain('classic-games/pattern-master.html', '../public/js/games/classic/pattern-master/index.js', 'PatternMaster kalıcı modül yolu');
mustContain('classic-games/snake-pro.html', '../public/js/games/classic/snake-pro/index.js', 'SnakePro kalıcı modül yolu');
mustContain('classic-games/space-pro.html', '../public/js/games/classic/space-pro/index.js', 'SpacePro kalıcı modül yolu');

walk('classic-games').forEach((rel) => {
  if (/\.html$/i.test(rel) || /\.js$/i.test(rel)) mustNotContain(rel, 'phase4-module', 'phase4-module referansı');
});

mustContain('routes/classic.routes.js', 'computeClassicLevelPoints', 'Klasik seviye puanı hesaplayıcı');
mustContain('routes/classic.routes.js', 'levelPointMultiplier: 10', 'PatternMaster level başına 10 puan');
mustContain('routes/classic.routes.js', 'levelPointMultiplier: 1', 'SnakePro/SpacePro score başına 1 puan');
mustContain('routes/classic.routes.js', 'classic_award_windows', 'Günlük abuse koruma penceresi');
mustContain('routes/classic.routes.js', 'validateRunTiming', 'Server-side skor süre doğrulaması');
mustContain('routes/classic.routes.js', 'DUPLICATE_RUN', 'Run idempotency koruması');
mustContain('middlewares/rateLimiters.js', 'classicScoreLimiter', 'Klasik skor rate limiter');
mustContain('server.js', "mountStaticAlias('/public', publicStaticDir", 'Public kalıcı modül statik alias');

const pkg = JSON.parse(read('package.json'));
if (pkg.scripts?.['check:phase11-classic-games'] !== 'node tools/check-classic-games.js') {
  fail('package.json check:phase11-classic-games scripti eksik.');
}

if (failures.length) {
  console.error('Faz 11 klasik oyun kontrolü başarısız:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('check:classic-games OK');
