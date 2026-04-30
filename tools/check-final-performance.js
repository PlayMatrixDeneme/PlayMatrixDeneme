'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function size(rel) { return fs.statSync(path.join(root, rel)).size; }

if (!read('server.js').includes('compression(')) failures.push('server compression middleware yok.');
if (!read('server.js').includes("Cache-Control")) failures.push('server cache header standardı yok.');
if (size('script.js') > 120000) failures.push('script.js kritik başlangıç için fazla büyük.');
if (size('public/css/static-inline.css') > 50000) failures.push('static-inline.css beklenenden büyük.');
if (size('public/js/static-actions.js') > 50000) failures.push('static-actions.js beklenenden büyük.');
if (!read('index.html').includes('modulepreload')) failures.push('index.html modulepreload sinyali yok.');

if (failures.length) {
  console.error('Final performance kontrolü başarısız:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('check:final-performance OK');
