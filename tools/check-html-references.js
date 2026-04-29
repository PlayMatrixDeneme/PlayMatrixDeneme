import { exists, fail, pass, read } from './lib.js';

const html = await read('public/index.html');
const refs = [];
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const value = match[1];
  if (value === '/' || value.startsWith('#') || value.startsWith('http')) continue;
  if (value.startsWith('/')) refs.push(`public/${value.slice(1)}`);
}
const missing = [];
for (const ref of refs) {
  if (!(await exists(ref))) missing.push(ref);
}
if (missing.length) fail('HTML referanslarında eksik dosya var.', missing);
pass('HTML CSS/JS/asset referansları geçerli.');
