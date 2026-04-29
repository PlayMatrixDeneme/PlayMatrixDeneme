const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (msg) => { console.error('[home-redesign-phase2]', msg); process.exitCode = 1; };
const html = read('index.html');
const legacy = read('public/js/home/legacy-home.runtime.js');
const components = read('public/css/components.css');
const responsive = read('public/css/responsive.css');
[
  'data-pm-redesign="premium-mobile-phase2"',
  'id="drawerOpenBtn"',
  'id="pmDrawerShell"',
  'data-drawer-action="market"',
  'data-drawer-action="wheel"',
  'data-drawer-action="promo"',
  'data-drawer-action="social"',
  'data-drawer-action="support"',
  'data-drawer-action="invite"',
  'data-drawer-action="profile"',
  'id="marketQuickBtn"',
  'id="notificationBadge"',
  'pm-premium-bottom-nav'
].forEach((needle) => { if (!html.includes(needle)) fail('index.html eksik: ' + needle); });
['AnaSayfa','Oyunlar','Market','Liderlik','Sosyal','Ödüller'].forEach((label) => { if (!html.includes(label)) fail('kategori eksik: ' + label); });
if (/Casino|Slotlar|Canlı Casino|Para Yatır|Para Çek/i.test(html)) fail('İlgisiz casino/bahis alanı bulundu.');
['function openDrawer()', 'function closeDrawer()', 'function handlePremiumNavigationAction(action)', 'openMarketPanel()', 'ddBalanceMirror'].forEach((needle) => { if (!legacy.includes(needle)) fail('legacy runtime eksik: ' + needle); });
['.pm-drawer-shell', '.pm-drawer-nav', '.pm-account-quickgrid', '.pm-notification-badge'].forEach((needle) => { if (!components.includes(needle)) fail('components.css eksik: ' + needle); });
if (!responsive.includes('Phase 2 nav responsive contract')) fail('responsive contract eksik.');
if (process.exitCode) process.exit(process.exitCode);
console.log('[home-redesign-phase2] PASS');
