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

const index = read('index.html');
const layout = read('public/css/layout.css');
const components = read('public/css/components.css');
const responsive = read('public/css/responsive.css');
const app = read('public/js/home/app.js');
const state = read('public/js/home/state.js');
const account = read('public/js/home/account.js');
const shell = exists('public/js/home/shell.js') ? read('public/js/home/shell.js') : '';
const legacy = read('public/js/home/legacy-home.runtime.js');

const headerStart = index.indexOf('<header class="topbar"');
const headerEnd = index.indexOf('<main class="container">');
const header = headerStart >= 0 && headerEnd > headerStart ? index.slice(headerStart, headerEnd) : '';

assert(header.includes('data-shell-phase="2"'), 'header Faz 2 shell phase işaretine sahip');
assert(header.includes('data-auth-state="guest"'), 'header guest/user auth state kontratına sahip');
assert(header.includes('class="topbar-primary"'), 'topbar primary satırı mevcut');
assert(header.includes('id="topbarAuthActions"'), 'guest auth action wrapper mevcut');
assert(header.includes('Giriş Yap'), 'guest state Giriş Yap butonu mevcut');
assert(header.includes('Kayıt Ol'), 'guest state Kayıt Ol primary butonu mevcut');
assert(header.includes('id="topUser"'), 'user state topUser mevcut');
assert(header.includes('id="headerBalance"'), 'MC bakiye hedefi mevcut');
assert(header.includes('id="topbarWheelShortcut"'), 'günlük çark topbar kısayolu mevcut');
assert(header.includes('id="profileTrigger"'), 'avatar profil trigger mevcut');
assert(header.includes('aria-expanded="false"'), 'profile trigger aria-expanded başlangıcı mevcut');
assert(header.includes('id="topCategoryNav"'), 'üst kategori nav mevcut');
['Ana Sayfa', 'Oyunlar', 'Liderlik', 'Sosyal', 'Destek'].forEach((label) => assert(header.includes(label), `üst kategori nav ${label} öğesini içeriyor`));
['data-shell-action="wheel"', 'data-shell-action="social"', 'data-shell-action="support"'].forEach((needle) => assert(header.includes(needle), `${needle} action kontratı mevcut`));
assert(!header.includes('Para Yatır'), 'header Para Yatır terimi içermiyor');
assert(!header.includes('Para Çek'), 'header Para Çek terimi içermiyor');
assert(!header.includes('Bahis Geçmişi'), 'header Bahis Geçmişi terimi içermiyor');
assert(!header.includes('Casino'), 'header Casino terimi içermiyor');
assert(!legacy.includes('Bahisli masaya hızlı gir'), 'home runtime bahis dili kullanmıyor');

['.topbar[data-shell-phase="2"]', '.topbar-primary', '.category-nav', '.category-nav .nav-link'].forEach((needle) => assert(layout.includes(needle), `layout.css ${needle} stilini içeriyor`));
['.topbar-auth-actions', '.reward-shortcut', '.chip-currency', '.dd-avatar-line', '.topbar[data-shell-phase="2"] .drop-item'].forEach((needle) => assert(components.includes(needle), `components.css ${needle} stilini içeriyor`));
assert(responsive.includes('FAZ 2 — Mobil topbar'), 'responsive.css Faz 2 mobil topbar kontratını içeriyor');
assert(responsive.includes('--topbar-h: 116px') || responsive.includes('--topbar-h: 112px'), 'mobil topbar yüksekliği iki satırlı shell için güncellendi');

assert(exists('public/js/home/shell.js'), 'shell.js eklendi');
['installShellChromeGuards', 'syncAuthChrome', 'setActiveNav', 'proxyShellAction', 'IntersectionObserver'].forEach((needle) => assert(shell.includes(needle), `shell.js ${needle} içeriyor`));
assert(app.includes('installShellChromeGuards'), 'app.js shell chrome modülünü yüklüyor');
assert(state.includes("shell: { activeNav: 'home', authState: 'guest' }"), 'state.js shell state kontratını içeriyor');
assert(account.includes('syncHeaderAccountChrome'), 'account.js header auth state senkronizasyonu içeriyor');
assert(account.includes('installHeaderAccountObserver'), 'account.js topbar mutation observer içeriyor');

assert(exists('docs/shell-phase2.md'), 'Faz 2 shell dokümanı mevcut');
assert(read('docs/phase-acceptance.md').includes('Faz 2 — Ana Shell, Header ve Üst Navigasyon Kabul Kriterleri'), 'Faz 2 kabul kriterleri dokümante edildi');

const cssNoHexFiles = ['public/css/layout.css','public/css/components.css','public/css/responsive.css'];
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
for (const file of cssNoHexFiles) {
  const matches = Array.from(new Set(read(file).match(hexPattern) || []));
  assert(matches.length === 0, `${file} sabit HEX içermiyor${matches.length ? `: ${matches.join(', ')}` : ''}`);
}

if (failures.length) {
  console.error('\n❌ UI Redesign Faz 2 kalite kapısı başarısız:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error(`\nBaşarılı kontrol: ${pass.length}`);
  process.exit(1);
}
console.log(`✅ UI Redesign Faz 2 kalite kapısı başarılı (${pass.length} kontrol).`);
