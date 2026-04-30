#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredRoutes = [
  '/online-games/crash',
  '/online-games/pisti',
  '/online-games/chess',
  '/classic-games/snake-pro',
  '/classic-games/pattern-master',
  '/classic-games/space-pro'
];
const canonicalSources = [
  'config/asciiRoutes.js',
  'public/js/home/home-games.data.js'
];
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const failures = [];

for (const route of requiredRoutes) {
  if (!server.includes(route)) failures.push(`server.js: canonical route eksik: ${route}`);
}
if (!server.includes('CANONICAL_GAME_PAGES')) failures.push('server.js: CANONICAL_GAME_PAGES standardı yok');
if (!server.includes('mountCanonicalGamePage')) failures.push('server.js: mountCanonicalGamePage yok');

const forbiddenHomePatterns = [
  'online-games/Crash.html', 'online-games/Pisti.html', 'online-games/Satranc.html',
  'classic-games/SnakePro.html', 'classic-games/PatternMaster.html', 'classic-games/SpacePro.html'
];
for (const rel of canonicalSources) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  if (rel.startsWith('public/js/home/')) {
    for (const forbidden of forbiddenHomePatterns) {
      if (source.includes(forbidden)) failures.push(rel + '\: eski .html oyun yolu kaldı\: ' + forbidden);
    }
  }
  for (const route of requiredRoutes) {
    if (!source.includes(route)) failures.push(rel + '\: canonical oyun yolu eksik\: ' + route);
  }
}

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (home.includes('static-game-card')) failures.push('index.html: statik oyun kartı kalıntısı var');
if (!home.includes('data-home-games-grid="1"')) failures.push('index.html: data-driven oyun grid kontratı yok');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '__MACOSX'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(?:js|html|css|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (rel === 'tools/check-file-path-routes.js') continue;
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('.//online-games/') || source.includes('"//online-games/') || source.includes("'//online-games/") || source.includes('`//online-games/')) {
    failures.push(`${rel}: çift slash içeren online-games yolu kaldı`);
  }
  if (source.includes('.//classic-games/') || source.includes('"//classic-games/') || source.includes("'//classic-games/") || source.includes('`//classic-games/')) {
    failures.push(`${rel}: çift slash içeren classic-games yolu kaldı`);
  }
}

if (failures.length) {
  console.error('Dosya yolu route kontrolü başarısız:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Dosya yolu route kontrolü başarılı. Canonical route: ${requiredRoutes.length}`);
process.exit(0);
