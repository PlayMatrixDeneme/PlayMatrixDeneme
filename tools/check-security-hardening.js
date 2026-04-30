#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const mustContain = (rel, needle, label) => {
  const source = read(rel);
  if (!source.includes(needle)) failures.push(`${label} bulunamadı: ${rel}`);
};
const mustNotContain = (rel, needle, label) => {
  const source = read(rel);
  if (source.includes(needle)) failures.push(`${label} kaldırılmalı: ${rel}`);
};

[
  'public/admin/matrix-core.js',
  'public/js/home/legacy-home.runtime.js'
].forEach((rel) => {
  mustNotContain(rel, 'pm_session_token', 'JS storage session token anahtarı');
  mustNotContain(rel, 'PM_SESSION_TOKEN_KEY', 'JS session token sabiti');
  mustNotContain(rel, "headers['x-session-token']", 'Client x-session-token header kullanımı');
  mustNotContain(rel, 'localStorage.setItem(PM_SESSION_TOKEN_KEY', 'localStorage session token yazımı');
  mustNotContain(rel, 'sessionStorage.setItem(PM_SESSION_TOKEN_KEY', 'sessionStorage session token yazımı');
  mustNotContain(rel, 'sessionToken || payload?.session?.token', 'Payload içinden raw session token persist');
});

const authRoutes = read('routes/auth.routes.js');
if (/sessionToken\s*:\s*session\.token/.test(authRoutes) || /token\s*:\s*session\.token/.test(authRoutes)) {
  failures.push('routes/auth.routes.js raw session token response içinde dönmemeli.');
}
mustContain('routes/auth.routes.js', 'buildCookieOnlySessionPayload', 'Cookie-only session response contract');
mustContain('utils/session.js', 'exposesRawTokenToClient: false', 'Cookie-only session contract');
mustContain('utils/activity.js', 'SESSION_TOUCH_THROTTLE_MS', 'Throttled server session touch');
mustContain('middlewares/auth.middleware.js', 'touchSession: true', 'Auth middleware session touch');
mustContain('middlewares/auth.middleware.js', 'LEGACY_SESSION_HEADER_ENABLED', 'Legacy x-session-token kapısı');
mustNotContain('utils/corsPolicy.js', 'X-Admin-Client-Key', 'Legacy admin client key CORS header');
mustNotContain('utils/corsPolicy.js', 'x-admin-client-key', 'Legacy admin client key CORS header');
mustNotContain('utils/corsPolicy.js', 'X-Session-Token', 'CORS x-session-token header');
mustNotContain('utils/corsPolicy.js', 'x-session-token', 'CORS x-session-token header');
mustContain('middlewares/admin.middleware.js', 'auditAdminGuard', 'Admin guard audit');
mustContain('middlewares/admin.middleware.js', 'verifyAdminMatrixSessionGate', 'Server-side admin matrix session gate');
mustContain('middlewares/admin.middleware.js', "sessionSource !== 'admin_matrix'", 'Admin matrix session source gate');
mustNotContain('public/admin/matrix-core.js', 'sessionStorage', 'Admin gate client storage');
mustNotContain('public/admin/matrix-core.js', 'localStorage', 'Admin gate client storage');
mustNotContain('public/admin/matrix-core.js', 'x-admin-client-key', 'Admin gate client header');
mustNotContain('routes/auth.routes.js', 'clientKey', 'Admin route client gate key');
mustNotContain('routes/auth.routes.js', 'x-admin-client-key', 'Admin route client gate key header');
mustContain('routes/auth.routes.js', 'auditAdminGate', 'Admin matrix gate audit');
mustContain('server.js', "'report-uri': ['/api/security/csp-report']", 'CSP report-uri endpoint');
mustContain('server.js', "app.post('/api/security/csp-report'", 'CSP report endpoint');
mustContain('.env.example', 'SECURITY_CSP_REPORT_ONLY=1', 'CSP report-only phase env');
mustContain('.env.example', 'LEGACY_SESSION_HEADER_ENABLED=0', 'Legacy session header disabled env');

const maintenanceHtml = read('maintenance/index.html');
const blankLinks = maintenanceHtml.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];
blankLinks.forEach((tag) => {
  if (!/rel="noopener noreferrer"/.test(tag)) failures.push(`target=_blank rel eksik: ${tag}`);
});

if (failures.length) {
  console.error('Security Phase 2 kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('check:security-phase2 OK. Cookie-only session, admin gate audit, CSP report-only ve external link hardening doğrulandı.');
process.exit(0);
