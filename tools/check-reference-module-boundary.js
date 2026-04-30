'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];

const forbiddenPathPatterns = [
  /(^|\/)BlackJack(\/|$)/i,
  /(^|\/)Mines(\/|$)/i,
  /(^|\/)Party(\/|$)/i,
  /(^|\/)frames\/frame-(?:19|[2-9]\d|100)\.png$/i
];

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

for (const rel of walk('.')) {
  if (rel.startsWith('node_modules/') || rel.startsWith('.git/')) continue;
  for (const pattern of forbiddenPathPatterns) {
    if (pattern.test(rel)) failures.push(`Legacy kapsam dışı dosya kaldı: ${rel}`);
  }
}

if (!fs.existsSync(path.join(root, 'config', 'asciiRoutes.js'))) {
  failures.push('config/asciiRoutes.js yok.');
}

if (failures.length) {
  console.error('Module boundary kontrolü başarısız:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Module boundary OK. ASCII rota ve kapsam dışı legacy dosya sınırı doğrulandı.');
