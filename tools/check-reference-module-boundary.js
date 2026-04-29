'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};
const ok = (message) => console.log(`✅ ${message}`);

const forbiddenFilePatterns = [
  /(^|\/)Casino(\/|$)/i,
  /blackjack/i,
  /mines/i,
  /(^|\/)party\.routes\.js$/i,
  /(^|\/)vip/i,
  /(^|\/)config\/vip\.js$/i,
  /(^|\/)utils\/vip/i,
  /(^|\/)Cerceve\/frame-(?:19|[2-9]\d|100)\.png$/i
];

const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.html', '.css', '.json']);
const ignoredDirs = new Set(['node_modules', '.git']);
const ignoredFiles = new Set([
  'package-lock.json',
  'docs/MODULE_DECISION_PHASE3.md',
  'docs/PLAYMATRIX_REFERENCE_COMPATIBILITY.md',
  'tools/check-reference-module-boundary.js'
]);

const sourceForbiddenPatterns = [
  /require\(['"][^'"]*(?:blackjack|mines|party)\.routes['"]\)/i,
  /\/api\/(?:blackjack|mines|party)\b/i,
  /\/Casino\b/i,
  /\bVIP\b(?! tamamen kaldırılacak)/,
  /\bvip(?:Tier|Center|Status|Role|Benefits?)\b/i,
  /frame-(?:19|[2-9]\d|100)\.png/i
];

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(item.name)) continue;
    const abs = path.join(dir, item.name);
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (item.isDirectory()) {
      out.push(...walk(abs, []));
    } else {
      out.push(rel);
    }
  }
  return out;
}

const files = walk(root);
const forbiddenFiles = files.filter((rel) => forbiddenFilePatterns.some((pattern) => pattern.test(rel)));
if (forbiddenFiles.length) {
  fail(`Geri alınmayacak modül/asset dosyası bulundu: ${forbiddenFiles.join(', ')}`);
}

for (const rel of files) {
  if (ignoredFiles.has(rel)) continue;
  const ext = path.extname(rel).toLowerCase();
  if (!sourceExtensions.has(ext)) continue;
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  const bad = sourceForbiddenPatterns.find((pattern) => pattern.test(text));
  if (bad) {
    fail(`Geri alınmayacak modül referansı bulundu: ${rel} :: ${bad}`);
  }
}

ok('Faz 3 modül sınırı doğrulandı: Casino/BlackJack/Mines/Party/VIP/frame-19..100 yok.');
