import { dirname, join, normalize } from 'node:path';
import { exists, fail, pass, read } from './lib.js';

const htmlFiles = ['index.html', '404.html'];
const missing = [];
const absolute = [];

for (const htmlFile of htmlFiles) {
  const html = await read(htmlFile);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (value.startsWith('#') || value.startsWith('http') || value.startsWith('mailto:') || value.startsWith('tel:')) continue;
    if (value.startsWith('/')) {
      absolute.push(`${htmlFile}: absolute path kullanılmamalı -> ${value}`);
      continue;
    }
    const clean = value.split('#')[0].split('?')[0];
    if (!clean || clean === '.') continue;
    const target = normalize(join(dirname(htmlFile), clean)).replaceAll('\\', '/');
    if (!(await exists(target))) missing.push(`${htmlFile}: ${value} -> ${target}`);
  }
}

if (absolute.length) fail('GitHub Pages subpath uyumsuz absolute referans var.', absolute);
if (missing.length) fail('HTML referanslarında eksik dosya var.', missing);
pass('HTML CSS/JS/asset referansları GitHub Pages uyumlu.');
