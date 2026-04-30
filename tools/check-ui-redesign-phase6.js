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
const profile = read('public/css/profile.css');
const app = read('public/js/home/app.js');
const mobileScroll = read('public/js/home/mobile-scroll.js');
const drawer = exists('public/js/home/drawer-engine.js') ? read('public/js/home/drawer-engine.js') : '';
const phaseDoc = exists('docs/drawer-profile-phase6.md') ? read('docs/drawer-profile-phase6.md') : '';

assert(index.includes('id="menuDrawerTrigger"') && index.includes('data-drawer-open="menu"'), 'menuDrawerTrigger erişilebilir drawer açıcı olarak mevcut');
assert(index.includes('id="drawerShell"') && index.includes('data-phase="6"'), 'drawerShell Faz 6 işaretine sahip');
assert(index.includes('id="drawerBackdrop"') && index.includes('data-drawer-close="true"'), 'drawer backdrop close kontratı mevcut');
assert(index.includes('id="menuDrawer"') && index.includes('data-drawer="menu"'), 'sol menuDrawer mevcut');
assert(index.includes('id="profileDrawer"') && index.includes('data-drawer="profile"'), 'sağ profileDrawer mevcut');
assert(index.includes('role="dialog"') && index.includes('aria-modal="true"'), 'drawer dialog erişilebilirlik kontratı mevcut');

['Oyunlar','Liderlik','Ödüller','Sosyal'].forEach((label) => assert(index.includes(label), `sol drawer hızlı kartı ${label} mevcut`));
['Günlük Çark','Destek'].forEach((label) => assert(index.includes(label), `drawer büyük aksiyonu ${label} mevcut`));
['Ödül Merkezi','Hesap'].forEach((label) => assert(index.includes(label), `drawer akordeonu ${label} mevcut`));
['Profilim','Promosyon Kodu','Arkadaşlar','Sosyal Merkez','Bildirimler','Oturum Geçmişi','Oyuncu Koruma / Güvenlik','Çıkış Yap'].forEach((label) => assert(index.includes(label), `profil drawer itemı ${label} mevcut`));
['drawerProfileAvatarShell','drawerProfileBalance','drawerProfileId','profileDrawerTitle'].forEach((id) => assert(index.includes(`id="${id}"`), `${id} hedefi mevcut`));

['Para Yatır','Para Çek','Bahis Geçmişi','Casino','Slotlar','Canlı Casino'].forEach((bad) => assert(!index.includes(bad), `index konsept dışı ${bad} içermiyor`));

['.drawer-shell','.side-drawer-menu','.side-drawer-profile','.drawer-scroll','.drawer-quick-grid'].forEach((needle) => assert(layout.includes(needle), `layout.css ${needle} içeriyor`));
['.drawer-quick-card','.drawer-feature-btn','.drawer-accordion','.profile-drawer-menu','body.pm-drawer-open'].forEach((needle) => assert(components.includes(needle), `components.css ${needle} içeriyor`));
['.profile-drawer-head','.profile-drawer-avatar','.profile-drawer-balance','.drawer-reward-claim'].forEach((needle) => assert(profile.includes(needle), `profile.css ${needle} içeriyor`));

assert(exists('public/js/home/drawer-engine.js'), 'drawer-engine.js eklendi');
['installPhase6DrawerEngine','openPhase6Drawer','closePhase6Drawer','Escape','focus','touchstart','data-drawer-action','window.openDrawer','window.closeDrawer','MutationObserver'].forEach((needle) => assert(drawer.includes(needle), `drawer-engine.js ${needle} içeriyor`));
assert(app.includes('installPhase6DrawerEngine') && app.includes('phase6-drawer-engine'), 'app.js Faz 6 drawer engine modülünü yüklüyor');
assert(mobileScroll.includes('.drawer-shell.is-open') && mobileScroll.includes('.drawer-scroll') && mobileScroll.includes('pm-drawer-open'), 'mobile-scroll drawer scroll lock ile uyumlu');
assert(exists('docs/drawer-profile-phase6.md') && phaseDoc.includes('Faz 6'), 'Faz 6 dokümanı mevcut');
assert(read('docs/phase-acceptance.md').includes('Faz 6 — Dropdown, Yan Menü ve Profil Açılır Paneli Kabul Kriterleri'), 'phase acceptance Faz 6 kaydı içeriyor');

const cssNoHexFiles = ['public/css/layout.css','public/css/components.css','public/css/profile.css'];
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
for (const file of cssNoHexFiles) {
  const matches = Array.from(new Set(read(file).match(hexPattern) || []));
  assert(matches.length === 0, `${file} sabit HEX içermiyor${matches.length ? `: ${matches.join(', ')}` : ''}`);
}

if (failures.length) {
  console.error('\n❌ UI Redesign Faz 6 kalite kapısı başarısız:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error(`\nBaşarılı kontrol: ${pass.length}`);
  process.exit(1);
}
console.log(`✅ UI Redesign Faz 6 kalite kapısı başarılı (${pass.length} kontrol).`);
