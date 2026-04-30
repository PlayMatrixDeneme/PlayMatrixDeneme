#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const failures = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`Eksik dosya: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function must(rel, pattern, message) {
  const source = read(rel);
  const ok = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
  if (!ok) failures.push(`${rel}: ${message}`);
}

function mustNot(rel, pattern, message) {
  const source = read(rel);
  const ok = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
  if (ok) failures.push(`${rel}: ${message}`);
}

[
  'utils/adminOpsSecurity.js',
  'utils/supportSecurity.js',
  'routes/admin.routes.js',
  'routes/auth.routes.js',
  'routes/support.routes.js',
  'middlewares/admin.middleware.js',
  'public/admin/matrix-auth.js',
  'public/admin/matrix-dashboard.js',
  'server.js'
].forEach((rel) => read(rel));

must('utils/adminOpsSecurity.js', 'buildPublicAdminPanelUrl', 'public admin yönlendirme helper eksik.');
must('utils/adminOpsSecurity.js', 'validateAuthFirestoreEmailSync', 'Firebase Auth + Firestore e-posta senkron doğrulayıcı eksik.');
must('utils/adminOpsSecurity.js', 'requireDangerousActionConfirmation', 'kritik işlem yazılı onay helper eksik.');
must('utils/supportSecurity.js', 'assertTicketAccess', 'ticket ownership validator eksik.');
must('utils/supportSecurity.js', 'sanitizeSupportText', 'destek mesaj sanitizer eksik.');

must('routes/auth.routes.js', "ADMIN_DASHBOARD_CANONICAL_PATH", 'admin panel canonical path kullanılmıyor.');
must('routes/auth.routes.js', "buildPublicAdminPanelUrl(req, nextPath)", 'session handoff sonrası public admin URL yönlendirmesi yok.');
must('utils/adminOpsSecurity.js', "/public/admin/admin.html", 'admin doğrulama sonrası dashboard public path kontratı yok.');
mustNot('routes/auth.routes.js', 'return res.redirect(303, nextPath);', 'handoff sonrası backend-relative admin redirect kalmış.');
mustNot('routes/auth.routes.js', '/admin/admin.html', 'auth route içinde legacy /admin/admin.html dashboard fallback kalmış.');

must('public/admin/matrix-auth.js', "next: '/public/admin/admin.html'", 'admin matrix final step public admin path göndermiyor.');
must('public/admin/matrix-auth.js', 'const redirectTarget = out?.redirectTo;', 'matrix auth redirect hedefi açık şekilde ayrıştırılmıyor.');
must('public/admin/matrix-auth.js', 'redirectTarget ? resolveAdminBackendUrl(out?.redirectTo) : DASHBOARD_URL', 'matrix auth dashboard fallback yanlış backend base ile çözülebilir.');
must('server.js', "'/public/admin/admin.html'", 'server guarded public admin dashboard alias eksik.');
mustNot('server.js', "return res.redirect(302, '/admin/admin.html');", 'server health fallback legacy backend admin path kullanıyor.');

must('middlewares/admin.middleware.js', "'tickets.read'", 'admin/support rolleri ticket okuma yetkisini taşımıyor.');
must('middlewares/admin.middleware.js', "'tickets.write'", 'admin/support rolleri ticket yazma yetkisini taşımıyor.');

must('routes/support.routes.js', 'assertTicketAccess', 'kullanıcı destek endpointlerinde ownership doğrulaması yok.');
must('routes/support.routes.js', 'sanitizeSupportText', 'kullanıcı destek mesaj sanitizer route seviyesinde kullanılmıyor.');
must('routes/support.routes.js', 'recordSupportEvent', 'destek işlem audit/support log kaydı yok.');

must('routes/admin.routes.js', "requireAdminPermission('tickets.read')", 'admin ticket liste endpoint yetki kontratı eksik.');
must('routes/admin.routes.js', "requireAdminPermission('tickets.write')", 'admin ticket yazma endpoint yetki kontratı eksik.');
must('routes/admin.routes.js', 'formatTicketSnapshot', 'admin ticket response sanitizer/formatter kullanmıyor.');
must('routes/admin.routes.js', 'buildSupportMessage', 'admin destek notu sanitizer üzerinden yazılmıyor.');
must('routes/admin.routes.js', 'assertCriticalPatchConfirmed', 'kritik kullanıcı patch onay doğrulaması eksik.');
must('routes/admin.routes.js', 'validateAuthFirestoreEmailSync', 'admin e-posta güncelleme sync validator eksik.');
must('routes/admin.routes.js', 'recordAdminOperationAudit', 'admin operasyon audit standardı eksik.');
must('routes/admin.routes.js', 'requireDangerousActionConfirmation', 'kritik admin işlemleri yazılı onay standardına bağlı değil.');

for (const rel of ['routes/auth.routes.js', 'routes/admin.routes.js', 'routes/support.routes.js', 'utils/adminOpsSecurity.js', 'utils/supportSecurity.js']) {
  mustNot(rel, /emirhan-siye\.onrender\.com\/admin\/admin\.html/i, 'backend admin dashboard hard redirect kalmış.');
}

if (failures.length) {
  console.error('FAZ 9 admin/op kontrolü başarısız:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('FAZ 9 admin/op kontrolü başarılı.');
