import { exists, fail, pass, read } from './lib.js';

const html = await read('public/index.html');
const references = [];
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const value = match[1];
  if (value === '/' || value.startsWith('#')) continue;
  if (value.startsWith('/') && !value.startsWith('//')) references.push(value.slice(1));
}

const missing = [];
for (const ref of references) {
  if (!(await exists(`public/${ref}`))) missing.push(`public/${ref}`);
}

if (missing.length) fail('HTML referanslarında eksik dosya var.', missing);
pass('HTML CSS/JS/asset referansları geçerli.');
