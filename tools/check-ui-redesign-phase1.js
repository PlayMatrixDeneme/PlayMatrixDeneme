#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const pass = [];
function assert(condition, message) {
  if (condition) pass.push(message);
  else failures.push(message);
}
const tokens = read('public/css/tokens.css');
const base = read('public/css/base.css');
const index = read('index.html');
const requiredTokens = {
  '--bg-void': '#0B1020', '--bg-surface': '#121A2B', '--bg-elevated': '#182238', '--bg-soft': '#EEF6FF',
  '--border-subtle': '#26334D', '--border-strong': '#3B4B6D', '--accent-primary': '#5BA7FF',
  '--accent-secondary': '#8B5CF6', '--accent-cyan': '#22D3EE', '--accent-success': '#2DD4BF',
  '--accent-warning': '#F8B84E', '--accent-danger': '#F43F5E', '--text-primary': '#F4F8FF',
  '--text-secondary': '#AAB8D4', '--text-muted': '#667795', '--text-inverse': '#07111F'
};
for (const [token, value] of Object.entries(requiredTokens)) {
  const pattern = new RegExp(`${token}\\s*:\\s*${value.replace('#', '\\#')}`, 'i');
  assert(pattern.test(tokens), `${token} token değeri mevcut`);
}
['--duration-fast: 140ms', '--duration-normal: 240ms', '--duration-slow: 380ms', '--ease-out:', '--ease-spring:'].forEach((needle) => assert(tokens.includes(needle), `${needle} motion tokenı mevcut`));
['--font-display', '--font-body', '--font-mono'].forEach((needle) => assert(tokens.includes(needle), `${needle} font tokenı mevcut`));
['--bg:', '--text:', '--primary:', '--line:', '--muted:'].forEach((needle) => assert(tokens.includes(needle), `${needle} legacy bridge mevcut`));
assert(index.includes('family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap'), 'index.html yeni font importunu kullanıyor');
assert(!index.includes('family=Inter:wght'), 'index.html eski Inter importunu kullanmıyor');
assert(!index.includes('family=Montserrat'), 'index.html eski Montserrat importunu kullanmıyor');
assert(!index.includes('family=Orbitron'), 'index.html eski Orbitron importunu kullanmıyor');
assert(!index.includes('family=Space+Grotesk'), 'index.html eski Space Grotesk importunu kullanmıyor');
assert(index.includes('<meta name="theme-color" content="#0B1020" />'), 'theme-color Faz 1 bg tokenı ile uyumlu');
['::selection', ':focus-visible', 'prefers-reduced-motion', '@keyframes fadeUp', '@keyframes fadeIn', '@keyframes shimmer', '@keyframes pulse-glow', '@keyframes shake', '@keyframes scalePress'].forEach((needle) => assert(base.includes(needle), `base.css ${needle} içeriyor`));
const cssNoHexFiles = ['public/css/base.css','public/css/layout.css','public/css/components.css','public/css/home.css','public/css/profile.css','public/css/social.css','public/css/games.css','public/shell-enhancements.css','public/css/components/avatar-picker.css'];
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
for (const file of cssNoHexFiles) {
  const css = read(file);
  const matches = Array.from(new Set(css.match(hexPattern) || []));
  assert(matches.length === 0, `${file} sabit HEX içermiyor${matches.length ? `: ${matches.join(', ')}` : ''}`);
  const brokenVars = Array.from(new Set(css.match(/var\(--[a-z0-9-]+\)[a-zA-Z0-9_-]+/g) || []));
  assert(brokenVars.length === 0, `${file} kırık var() birleştirmesi içermiyor${brokenVars.length ? `: ${brokenVars.join(', ')}` : ''}`);
}
const orderedImports = ['./public/css/tokens.css','./public/css/base.css','./public/css/layout.css','./public/css/components.css'];
let lastIndex = -1;
for (const href of orderedImports) {
  const idx = index.indexOf(href);
  assert(idx > lastIndex, `${href} doğru import sırasında`);
  lastIndex = idx;
}
assert(exists('docs/design-system-phase1.md'), 'Faz 1 tasarım sistemi dokümanı mevcut');
assert(read('docs/phase-acceptance.md').includes('Faz 1 — Ferah Tasarım Sistemi Kabul Kriterleri'), 'Faz 1 kabul kriterleri dokümante edildi');
if (failures.length) {
  console.error('\n❌ UI Redesign Faz 1 kalite kapısı başarısız:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`\nBaşarılı kontrol: ${pass.length}`);
  process.exit(1);
}
console.log(`✅ UI Redesign Faz 1 kalite kapısı başarılı (${pass.length} kontrol).`);
