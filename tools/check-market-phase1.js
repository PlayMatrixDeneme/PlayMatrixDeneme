'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel}: dosya yok`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}
function mustFile(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`${rel}: dosya yok`);
}
function mustIncludes(rel, needle, label = needle) {
  const content = read(rel);
  if (!content.includes(needle)) failures.push(`${rel}: ${label} yok`);
}

const frameDir = path.join(root, 'Cerceve', 'Market');
if (!fs.existsSync(frameDir)) failures.push('Cerceve/Market: klasör yok');
else {
  const frames = fs.readdirSync(frameDir).filter((name) => /^market-\d+\.png$/i.test(name));
  if (frames.length !== 32) failures.push(`Cerceve/Market: 32 market frame bekleniyor, bulunan ${frames.length}`);
}

[
  'config/marketCatalog.js',
  'services/market.service.js',
  'routes/market.routes.js',
  'public/js/market/market-ui.js',
  'public/css/market.css'
].forEach(mustFile);

mustIncludes('config/marketCatalog.js', '/Cerceve/Market/market-${index}.png', 'Cerceve/Market asset yolu');
mustIncludes('services/market.service.js', 'colMarketLedger', 'market ledger collection');
mustIncludes('services/market.service.js', 'balance: admin.firestore.FieldValue.increment(-price)', 'purchase balance debit transaction');
mustIncludes('services/market.service.js', 'ledgerSnap.exists', 'idempotent purchase ledger guard');
mustIncludes('services/market.service.js', 'ownedMarketItems', 'inventory ownership marker');
mustIncludes('services/market.service.js', 'equippedCosmetics', 'equipped cosmetics contract');
mustIncludes('services/market.service.js', 'refundOrRevokeMarketItem', 'refund/revoke service');
mustIncludes('routes/market.routes.js', "router.post('/market/purchase'", 'purchase endpoint');
mustIncludes('routes/market.routes.js', "router.post('/market/equip'", 'equip endpoint');
mustIncludes('routes/market.routes.js', "router.patch('/admin/market/items/:itemId'", 'admin price endpoint');
mustIncludes('routes/market.routes.js', "router.post('/admin/market/refund'", 'admin refund endpoint');
mustIncludes('routes/market.routes.js', "router.post('/admin/market/revoke'", 'admin revoke endpoint');
mustIncludes('server.js', "const marketRoutes = require('./routes/market.routes');", 'server market import');
mustIncludes('server.js', "app.use('/api', marketRoutes);", 'server market mount');
mustIncludes('public/js/home/app.js', '../market/market-ui.js', 'home market module import');
mustIncludes('public/js/home/app.js', '["market", installMarketUi]', 'home market module boot');
mustIncludes('style.css', 'public/css/market.css', 'market css import');
mustIncludes('public/admin/matrix-dashboard.js', 'MARKET FİYAT YÖNETİMİ', 'admin market panel');
mustIncludes('public/admin/matrix-dashboard.js', '/api/admin/market/items', 'admin market api');

if (failures.length) {
  console.error('Market Phase 1 check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Market Phase 1 check passed.');
