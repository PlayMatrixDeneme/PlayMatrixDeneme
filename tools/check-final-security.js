'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];

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

if (fs.existsSync(path.join(root, 'docs'))) failures.push('docs klasörü kaldırılmamış.');
for (const rel of walk('.')) {
  if (rel.startsWith('node_modules/')) continue;
  if (/\.md$/i.test(rel)) failures.push(`MD dosyası kaldı: ${rel}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts || !packageJson.scripts['check:final-release']) {
  failures.push('check:final-release scripti yok.');
}

['utils/adminOpsSecurity.js', 'utils/supportSecurity.js', 'middlewares/admin.middleware.js'].forEach((rel) => {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`${rel} yok.`);
});

if (failures.length) {
  console.error('Final security kontrolü başarısız:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('check:final-security OK');
