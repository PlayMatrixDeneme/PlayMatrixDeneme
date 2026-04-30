'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];

function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function fail(message) { failures.push(message); }
function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

['online-games', 'classic-games', 'frames', 'maintenance', 'config/asciiRoutes.js'].forEach((rel) => {
  if (!exists(rel)) fail(`${rel} yok.`);
});

['Online Oyunlar', 'Klasik Oyunlar', 'Cerceve', 'Bakim', 'Bakım', 'docs'].forEach((rel) => {
  if (exists(rel)) fail(`Legacy fiziksel yol kaldı: ${rel}`);
});

for (const rel of walk('.')) {
  if (rel.startsWith('node_modules/')) continue;
  if (/phase\d|phase4|PHASE/i.test(path.basename(rel))) fail(`Phase içeren dosya adı kaldı: ${rel}`);
}

const routes = require('../config/asciiRoutes');
for (const route of routes.GAME_ROUTE_MAP) {
  if (!route.canonical || !route.canonical.startsWith('/')) fail(`canonical route hatalı: ${route.id}`);
  if (!exists(route.file)) fail(`canonical html dosyası yok: ${route.file}`);
}

const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
if (!server.includes("require('./config/asciiRoutes')")) fail('server.js asciiRoutes kullanmıyor.');
if (!server.includes('LEGACY_ASSET_ALIASES')) fail('legacy asset alias mount eksik.');

if (failures.length) {
  console.error('ASCII route kontrolü başarısız:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('check:ascii-routes OK');
