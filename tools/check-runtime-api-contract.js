#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function fail(message) { failures.push(message); }
function mustContain(file, needle, label) {
  if (!read(file).includes(needle)) fail(`${label} eksik: ${file}`);
}
function mustNotContain(file, needle, label) {
  if (read(file).includes(needle)) fail(`${label} kaldırılmalı: ${file}`);
}
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

walk(root).filter((file) => /\.html$/i.test(file)).forEach((file) => {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  if (/meta\s+name=["']playmatrix-api-url["']\s+content=["']\s*["']/i.test(text)) {
    fail(`Boş playmatrix-api-url meta etiketi bulundu: ${rel}`);
  }
});

mustContain('utils/env.js', 'Üretimde PUBLIC_API_BASE zorunludur', 'PUBLIC_API_BASE production zorunluluğu');
mustContain('utils/publicRuntime.js', "apiBaseSource: 'PUBLIC_API_BASE'", 'public runtime API base kaynak etiketi');
mustContain('public/playmatrix-static-runtime.js', 'const PUBLIC_API_BASE =', 'static runtime PUBLIC_API_BASE bootstrap');
mustContain('public/playmatrix-static-runtime.js', 'static-public-api-base-bootstrap', 'static runtime kaynak etiketi');
mustContain('public/playmatrix-api.js', 'getRuntimeBase()', 'runtime base önceliği');
mustContain('public/playmatrix-api.js', 'getStaticRuntimeBase()', 'static runtime base önceliği');
mustContain('public/playmatrix-api.js', 'isProductionHost()', 'production host fallback guard');
mustNotContain('public/playmatrix-api.js', 'PRODUCTION_BACKEND_FALLBACK', 'ikinci hardcoded production backend fallback');
if (/pushUnique\(list,\s*window\.location\.origin\);/.test(read('public/firebase-runtime.js')) && !read('public/firebase-runtime.js').includes('if (!isProductionHost()) pushUnique(list, window.location.origin);')) {
  fail('firebase runtime unconditional current-origin fallback kaldırılmalı: public/firebase-runtime.js');
}
mustContain('public/firebase-runtime.js', 'if (!isProductionHost()) pushUnique(list, window.location.origin);', 'firebase runtime production current-origin guard');
mustContain('public/playmatrix-runtime.js', 'window.__PM_API__?.getApiBaseSync', 'playmatrix runtime merkezi API bridge kullanımı');

const pkg = JSON.parse(read('package.json'));
if (pkg.scripts?.['check:runtime-api-phase4'] !== 'node tools/check-runtime-api-contract.js') {
  fail('package.json check:runtime-api-phase4 scripti eksik.');
}

if (failures.length) {
  console.error('Faz 4 runtime/API base kontrolü başarısız:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('✅ Faz 4 runtime/API base kontrolü başarılı.');
