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
const modal = read('public/js/home/modal.js');
const modals = read('public/js/home/modals.js');
const coreModal = read('public/js/core/modal.js');
const mobileScroll = read('public/js/home/mobile-scroll.js');
const app = read('public/js/home/app.js');
const sheetEngine = exists('public/js/home/sheet-engine.js') ? read('public/js/home/sheet-engine.js') : '';

const navMatch = index.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/);
const nav = navMatch ? navMatch[0] : '';
assert(Boolean(nav), 'mobile-nav mevcut');
assert(nav.includes('data-phase="3"'), 'mobile-nav Faz 3 işaretine sahip');
const mobileTabCount = (nav.match(/class="mobile-tab/g) || []).length;
assert(mobileTabCount === 5, `mobile-nav tam 5 buton içeriyor (${mobileTabCount})`);
['Ana Sayfa','Oyunlar','Promosyonlar','Çark','Destek'].forEach((label) => assert(nav.includes(label), `mobile-nav ${label} öğesini içeriyor`));
['data-mobile-key="home"','data-mobile-key="games"','data-mobile-key="promo"','data-mobile-key="wheel"','data-mobile-key="support"'].forEach((needle) => assert(nav.includes(needle), `${needle} mevcut`));
['Para Yatır','Para Çek','Bahis Geçmişi','Casino','Slotlar','Canlı Casino'].forEach((bad) => assert(!nav.includes(bad), `mobile-nav konsept dışı ${bad} içermiyor`));

assert(index.includes('id="sheetShell"') && index.includes('data-phase="3"'), 'sheet shell Faz 3 işaretine sahip');
assert(index.includes('data-sheet-close="true"'), 'sheet close/backdrop data-sheet-close kontratı mevcut');
assert(index.includes('role="dialog"') && index.includes('aria-modal="true"'), 'sheet panel dialog erişilebilirlik kontratına sahip');
assert(index.includes('id="sheetHandle"') && index.includes('role="button"'), 'sheet drag handle erişilebilir');
['auth','forgot','profile','wheel','promo','support','invite','social'].forEach((sheet) => assert(index.includes(`data-sheet="${sheet}"`), `${sheet} sheet section mevcut`));

['--mobile-nav-height','grid-template-columns: repeat(5','mobile-tab-support','--sheet-mobile-max-height','.sheet-shell.is-dragging','.sheet-section.is-active'].forEach((needle) => assert(layout.includes(needle), `layout.css ${needle} içeriyor`));
['mobile-tab:focus-visible','body.pm-sheet-open .mobile-nav','prefers-reduced-motion'].forEach((needle) => assert(components.includes(needle), `components.css ${needle} içeriyor`));
['FAZ 3','safe-area-inset-bottom','translateY(var(--sheet-drag-y, 0))','max-width: 420px'].forEach((needle) => assert(responsive.includes(needle), `responsive.css ${needle} içeriyor`));

assert(exists('public/js/home/sheet-engine.js'), 'sheet-engine.js eklendi');
['installPhase3SheetEngine','openPhase3Sheet','closePhase3Sheet','setPhase3MobileTab','MutationObserver','Escape','focus','pointerdown','touchstart','window.openSheet','window.closeSheet'].forEach((needle) => assert(sheetEngine.includes(needle), `sheet-engine.js ${needle} içeriyor`));
assert(app.includes('installPhase3SheetEngine'), 'app.js Faz 3 sheet engine modülünü yüklüyor');
assert(mobileScroll.includes("document.body.classList.contains('pm-sheet-open')"), 'mobile-scroll pm-sheet-open scroll lock ile uyumlu');
assert(modal.includes('installHomeModalManager'), 'home modal manager korunuyor');
assert(modals.includes('syncHomeModalScrollLock'), 'modals scroll lock entegrasyonu korunuyor');
assert(coreModal.includes('openModal') && coreModal.includes('closeModal'), 'core modal API korunuyor');
assert(exists('docs/mobile-nav-sheet-phase3.md'), 'Faz 3 dokümanı mevcut');
assert(read('docs/phase-acceptance.md').includes('Faz 3'), 'phase acceptance Faz 3 kaydı içeriyor');

const cssNoHexFiles = ['public/css/layout.css','public/css/components.css','public/css/responsive.css'];
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
for (const file of cssNoHexFiles) {
  const matches = Array.from(new Set(read(file).match(hexPattern) || []));
  assert(matches.length === 0, `${file} sabit HEX içermiyor${matches.length ? `: ${matches.join(', ')}` : ''}`);
}

if (failures.length) {
  console.error('\n❌ UI Redesign Faz 3 kalite kapısı başarısız:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error(`\nBaşarılı kontrol: ${pass.length}`);
  process.exit(1);
}
console.log(`✅ UI Redesign Faz 3 kalite kapısı başarılı (${pass.length} kontrol).`);
