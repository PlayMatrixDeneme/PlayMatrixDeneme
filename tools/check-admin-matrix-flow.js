'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};
const ok = (message) => console.log(`✅ ${message}`);

const adminMatrix = read('utils/adminMatrix.js');
[
  'verifySecondFactor',
  'verifyThirdFactor',
  'issueStepTicket',
  'verifyStepTicket',
  'issueClientGateKey',
  'verifyClientGateKey'
].forEach((symbol) => {
  if (!new RegExp(`function\\s+${symbol}\\b`).test(adminMatrix)) {
    fail(`utils/adminMatrix.js içinde ${symbol} fonksiyonu bulunamadı.`);
  }
});

const adminMiddleware = read('middlewares/admin.middleware.js');
[
  'getConfiguredAdminEntries',
  'matchConfiguredEntry',
  'resolveAdminContext',
  'hasEveryPermission',
  'createAdminGuard'
].forEach((symbol) => {
  if (!new RegExp(`function\\s+${symbol}\\b`).test(adminMiddleware)) {
    fail(`middlewares/admin.middleware.js içinde ${symbol} fonksiyonu bulunamadı.`);
  }
});

if (!/if \(entry\.uid && identity\.uid !== entry\.uid\) return false;/.test(adminMiddleware)
  || !/if \(entry\.email && identity\.email !== entry\.email\) return false;/.test(adminMiddleware)) {
  fail('Admin UID/e-posta eşleşmesi index bazlı ve çift faktörlü yapılmıyor.');
}


if (!/verifyAdminClientGate/.test(adminMiddleware)
  || !/verifyClientGateKey/.test(adminMiddleware)
  || !/x-admin-client-key/.test(adminMiddleware)
  || !/ADMIN_CLIENT_KEY_SESSION_MISMATCH/.test(adminMiddleware)) {
  fail('Admin API guard ikinci/üçüncü doğrulama sonrası üretilen client gate key ve session eşleşmesini zorunlu tutmuyor.');
}

const routes = read('routes/auth.routes.js');
[
  '/auth/admin/bootstrap',
  '/auth/admin/status',
  '/auth/admin/matrix/step-email',
  '/auth/admin/matrix/step-password',
  '/auth/admin/matrix/step-name',
  '/auth/admin/matrix/status'
].forEach((route) => {
  if (!routes.includes(route)) fail(`routes/auth.routes.js içinde ${route} akışı bulunamadı.`);
});

if (!/resolveAdminContext/.test(routes) || !/verifySecondFactor/.test(routes) || !/verifyThirdFactor/.test(routes) || !/issueClientGateKey/.test(routes)) {
  fail('Admin route zinciri context + second factor + third factor + client gate kontrollerini içermiyor.');
}

if (!/ADMIN_CLIENT_KEY_REQUIRED/.test(routes)
  || !/clientKeyMatches/.test(routes)
  || !/clientKeyState\.payload\.sessionId === currentSessionId/.test(routes)
  || /clientKeyState\.ok\s*\?\s*''\s*:\s*issueClientGateKey/.test(routes)) {
  fail('Admin matrix/status eksik client key için yeni anahtar üretmemeli; ikinci/üçüncü faktör bypass riski var.');
}

ok('Admin login / second factor / third factor / UID-email guard akışı doğrulandı.');
