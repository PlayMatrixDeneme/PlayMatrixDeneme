#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
let passed = 0;
let total = 0;

function relPath(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(relPath(rel));
}

function read(rel) {
  return fs.readFileSync(relPath(rel), 'utf8');
}

function check(label, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
    console.log(`[OK] ${label}`);
  } catch (error) {
    failures.push(`${label}: ${error.message || error}`);
    console.error(`[FAIL] ${label}`);
    console.error(`  ${error.message || error}`);
  }
}

function mustExist(rel) {
  if (!exists(rel)) throw new Error(`${rel} bulunamadı.`);
}

function mustContain(rel, needle) {
  const content = read(rel);
  if (!content.includes(needle)) throw new Error(`${rel} içinde beklenen içerik yok: ${needle}`);
}

function mustMatch(rel, pattern, label = String(pattern)) {
  const content = read(rel);
  if (!pattern.test(content)) throw new Error(`${rel} içinde beklenen pattern yok: ${label}`);
}

function mustNotMatch(rel, pattern, label = String(pattern)) {
  const content = read(rel);
  if (pattern.test(content)) throw new Error(`${rel} içinde yasak pattern var: ${label}`);
}

function syntaxCommonJs(rel) {
  const source = read(rel).replace(/^#!.*\n/, '\n');
  new vm.Script(source, { filename: rel });
}

function stylesheetOrder() {
  const html = read('index.html');
  const order = [
    './public/css/tokens.css',
    './public/css/base.css',
    './public/css/layout.css',
    './public/css/components.css',
    './public/css/home.css',
    './public/css/social.css',
    './public/css/profile.css',
    './public/css/games.css',
    './public/css/admin.css',
    './public/css/responsive.css',
    './public/avatar-frame.css',
    './public/css/components/avatar-picker.css',
    './public/shell-enhancements.css',
    'public/css/static-inline.css'
  ];
  let cursor = -1;
  for (const href of order) {
    const index = html.indexOf(href);
    if (index === -1) throw new Error(`Stylesheet eksik: ${href}`);
    if (index < cursor) throw new Error(`Stylesheet sırası bozuk: ${href}`);
    cursor = index;
  }
}

function packageScript(name, commandPart) {
  const pkg = JSON.parse(read('package.json'));
  if (!pkg.scripts || !pkg.scripts[name]) throw new Error(`package.json scripts.${name} eksik.`);
  if (!pkg.scripts[name].includes(commandPart)) throw new Error(`scripts.${name} beklenen komutu içermiyor: ${commandPart}`);
}

console.log('PlayMatrix UI Redesign Faz 0 kalite kapısı');

check('Faz 0 dokümanları mevcut', () => {
  [
    'docs/ui-redesign-contract.md',
    'docs/css-ownership-map.md',
    'docs/js-module-map.md',
    'docs/regression-checklist.md',
    'docs/phase-acceptance.md'
  ].forEach(mustExist);
});

check('UI sözleşmesi konsept dışı alanları engelliyor', () => {
  mustContain('docs/ui-redesign-contract.md', 'Eski tasarımla alakalı hiçbir görsel karar final UI içinde kalmayacak');
  mustContain('docs/ui-redesign-contract.md', 'Gerçek para, para yatırma, para çekme, bahis geçmişi');
  mustContain('docs/ui-redesign-contract.md', 'PlayMatrix karşılığı olan alanlar yeni iskelete uyarlanacak');
});

check('CSS sahiplik haritası kritik dosyaları kapsıyor', () => {
  [
    'public/css/tokens.css',
    'public/css/base.css',
    'public/css/layout.css',
    'public/css/components.css',
    'public/css/home.css',
    'public/css/social.css',
    'public/css/profile.css',
    'public/css/responsive.css',
    'public/css/static-inline.css',
    'public/shell-enhancements.css'
  ].forEach((item) => mustContain('docs/css-ownership-map.md', item));
});

check('JS modül haritası home/profile/social bağımlılıklarını kapsıyor', () => {
  [
    'public/js/home/app.js',
    'public/js/home/legacy-home.runtime.js',
    'public/js/profile/avatar-picker.js',
    'public/js/profile/frame-picker.js',
    'public/js/social/chat-dm.js',
    'routes/auth.routes.js',
    'routes/profile.routes.js',
    'routes/market.routes.js',
    'routes/social.routes.js',
    'sockets/index.js'
  ].forEach((item) => mustContain('docs/js-module-map.md', item));
});

check('Regresyon kontrol listesi mobil/auth/sheet/route alanlarını kapsıyor', () => {
  [
    '375px',
    'Auth',
    'Sheet',
    'Crash route',
    'Avatar picker',
    'Günlük çark',
    'Sosyal merkez',
    'aria-label'
  ].forEach((item) => mustContain('docs/regression-checklist.md', item));
});

check('Faz kabul kriterleri yazılı', () => {
  mustContain('docs/phase-acceptance.md', 'Faz 0 Kabul Kriterleri');
  mustContain('docs/phase-acceptance.md', 'Tüm Fazlar İçin Ortak Kabul Kriterleri');
  mustContain('docs/phase-acceptance.md', 'Faz 11');
});

check('.env.example gerçek secret içermeyen kalite kontratı olarak mevcut', () => {
  mustExist('.env.example');
  mustContain('.env.example', 'NODE_ENV=production');
  mustContain('.env.example', 'PUBLIC_BASE_URL=https://playmatrix.com.tr');
  mustContain('.env.example', 'FIREBASE_PROJECT_ID=playmatrix-b7df9');
  mustContain('.env.example', 'FIREBASE_KEY=REDACTED_SERVICE_ACCOUNT_JSON');
  mustNotMatch('.env.example', /-----BEGIN [^-]+ PRIVATE KEY-----/i, 'raw private key');
  mustNotMatch('.env.example', /"private_key"\s*:/i, 'raw service account json');
});

check('index.html mobil viewport erişilebilir ölçek kontratına uygun', () => {
  mustMatch('index.html', /name="viewport"\s+content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/, 'initial-scale=1.0 viewport');
  mustNotMatch('index.html', /initial-scale=0\.90|maximum-scale=0\.90|user-scalable=no/, 'zoom engelleyen viewport');
});

check('index.html stylesheet sırası sahiplik haritasına uygun', stylesheetOrder);

check('index.html zorunlu sheet sectionlarını taşıyor', () => {
  ['auth', 'forgot', 'profile', 'wheel', 'promo', 'support', 'invite', 'social'].forEach((sheet) => {
    mustContain('index.html', `data-sheet="${sheet}"`);
  });
});

check('home boot zinciri modüler entry üzerinden çalışıyor', () => {
  mustContain('script.js', 'bootHomeApplication');
  mustContain('public/js/home/app.js', 'installHomeStateBridge');
  mustContain('public/js/home/app.js', 'installHomeModalManager');
  mustContain('public/js/home/app.js', 'installMobileGesturePolicy');
  mustContain('public/js/home/app.js', 'installSocialEntryGuards');
});

check('backend endpoint dosyaları redesign sözleşmesinde kullanılan alanlar için mevcut', () => {
  [
    'routes/auth.routes.js',
    'routes/profile.routes.js',
    'routes/market.routes.js',
    'routes/social.routes.js',
    'routes/socialcenter.routes.js',
    'routes/chat.routes.js',
    'routes/support.routes.js',
    'routes/notifications.routes.js'
  ].forEach(mustExist);
});

check('checker CommonJS syntax geçerli', () => syntaxCommonJs('tools/check-ui-redesign-phase0.js'));

check('package scriptleri Faz 0 redesign kalite kapısına bağlı', () => {
  packageScript('check:ui-redesign-phase0', 'tools/check-ui-redesign-phase0.js');
  packageScript('check:phase0-redesign', 'check:ui-redesign-phase0');
});

console.log(`\nÖzet: ${passed}/${total} kontrol geçti.`);
if (failures.length) {
  console.error('\nUI Redesign Faz 0 kalite kapısı başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('check:ui-redesign-phase0 OK');
