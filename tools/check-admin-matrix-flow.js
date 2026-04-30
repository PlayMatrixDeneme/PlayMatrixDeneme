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
  'verifyStepTicket'
].forEach((symbol) => {
  if (!new RegExp(`function\\s+${symbol}\\b`).test(adminMatrix)) {
    fail(`utils/adminMatrix.js içinde ${symbol} fonksiyonu bulunamadı.`);
  }
});

if (/issueClientGateKey|verifyClientGateKey|CLIENT_KEY_TTL_MS/.test(adminMatrix)) {
  fail('utils/adminMatrix.js içinde legacy client gate key üretimi/doğrulaması kalmamalı. Admin gate server-side session source ile yapılmalı.');
}

const adminMiddleware = read('middlewares/admin.middleware.js');
[
  'getConfiguredAdminEntries',
  'matchConfiguredEntry',
  'resolveAdminContext',
  'hasEveryPermission',
  'verifyAdminMatrixSessionGate',
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

if (!/sessionSource !== 'admin_matrix'/.test(adminMiddleware)
  || !/ADMIN_MATRIX_SESSION_REQUIRED/.test(adminMiddleware)
  || !/req\.adminMatrixSession = gate\.payload/.test(adminMiddleware)) {
  fail('Admin API guard ikinci/üçüncü doğrulama sonrası server-side admin_matrix session zorunluluğunu doğrulamıyor.');
}

if (/x-admin-client-key|verifyClientGateKey|verifyAdminClientGate|ADMIN_CLIENT_KEY/.test(adminMiddleware)) {
  fail('middlewares/admin.middleware.js içinde legacy x-admin-client-key/client gate key kalmamalı.');
}

const routes = read('routes/auth.routes.js');
[
  '/auth/admin/bootstrap',
  '/auth/admin/status',
  '/auth/admin/matrix/step-email',
  '/auth/admin/matrix/step-password',
  '/auth/admin/matrix/step-name',
  '/auth/admin/matrix/session-handoff',
  '/auth/admin/matrix/status'
].forEach((route) => {
  if (!routes.includes(route)) fail(`routes/auth.routes.js içinde ${route} akışı bulunamadı.`);
});

if (!/resolveAdminContext/.test(routes) || !/verifySecondFactor/.test(routes) || !/verifyThirdFactor/.test(routes) || !/source: 'admin_matrix'/.test(routes) || !/createAdminSessionHandoff/.test(routes)) {
  fail('Admin route zinciri context + second factor + third factor + admin_matrix session kontrollerini içermiyor.');
}

if (!/top_level_redirect/.test(routes) || !/session-handoff\?token=/.test(routes) || !/buildAdminBackendUrl/.test(routes)) {
  fail('Admin panel cross-origin/third-party cookie problemine karşı top-level handoff yönlendirmesi bulunmalı.');
}

if (!/currentSessionSource !== 'admin_matrix'/.test(routes)
  || !/ADMIN_MATRIX_SESSION_REQUIRED/.test(routes)
  || /x-admin-client-key|clientKeyMatches|issueClientGateKey|verifyClientGateKey|ADMIN_CLIENT_KEY/.test(routes)) {
  fail('Admin matrix/status legacy client key yerine server-side admin_matrix session kontrolü kullanmalı.');
}

const matrixCore = read('public/admin/matrix-core.js');
if (/sessionStorage|localStorage|x-admin-client-key|pm_admin_matrix_key/.test(matrixCore)) {
  fail('public/admin/matrix-core.js admin gate anahtarını client storage/header ile taşımamalı.');
}

const matrixAuth = read('public/admin/matrix-auth.js');
if (!/resolveAdminBackendUrl/.test(matrixAuth) || !/out\?\.redirectTo/.test(matrixAuth)) {
  fail('public/admin/matrix-auth.js üçüncü faktör sonrası backend handoff redirectTo değerini kullanmalı.');
}

ok('Admin login / second factor / third factor / server-side admin_matrix session guard akışı doğrulandı.');
