#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const homeViewport = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />';
const legacyViewport = '<meta name="viewport" content="width=device-width, initial-scale=0.90, maximum-scale=0.90, minimum-scale=0.90, user-scalable=no, viewport-fit=cover" />';
const classicViewport = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />';
const targets = [
  ['index.html', homeViewport],
  ['online-games/crash.html', legacyViewport],
  ['online-games/pisti.html', legacyViewport],
  ['online-games/satranc.html', legacyViewport],
  ['classic-games/snake-pro.html', classicViewport],
  ['classic-games/pattern-master.html', classicViewport],
  ['classic-games/space-pro.html', classicViewport],
  ['public/admin/index.html', legacyViewport],
  ['public/admin/admin.html', legacyViewport],
  ['public/admin/health.html', legacyViewport],
  ['maintenance/index.html', legacyViewport]
];

const failures = [];
for (const [rel, required] of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { failures.push(`${rel}: dosya yok`); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const match = html.match(/<meta\s+name=["']viewport["'][^>]*>/i);
  if (!match) failures.push(`${rel}: viewport meta yok`);
  else if (match[0] !== required) failures.push(`${rel}: viewport standard dışı => ${match[0]}`);
}

if (failures.length) {
  console.error('Viewport kontratı başarısız:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Viewport kontratı başarılı. Dosya: ${targets.length}`);
process.exit(0);
