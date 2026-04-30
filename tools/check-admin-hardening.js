#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function must(rel, needle, label) { if (!read(rel).includes(needle)) failures.push(`${label} eksik: ${rel}`); }
function mustNot(rel, pattern, label) { if (pattern.test(read(rel))) failures.push(`${label} kaldırılmalı: ${rel}`); }

must('middlewares/admin.middleware.js', 'verifyAdminMatrixSessionGate', 'Admin permission gate server-side session doğrulaması');
must('middlewares/admin.middleware.js', "sessionSource !== 'admin_matrix'", 'Admin matrix session source kontrolü');
must('middlewares/admin.middleware.js', 'auditAdminGuard', 'Admin guard audit');
must('routes/auth.routes.js', "source: 'admin_matrix'", 'Admin matrix session üretimi');
must('routes/auth.routes.js', '/auth/admin/matrix/session-handoff', 'Admin matrix top-level session handoff route');
must('routes/auth.routes.js', 'createAdminSessionHandoff', 'Admin matrix tek kullanımlık handoff üretimi');
must('public/admin/matrix-auth.js', 'resolveAdminBackendUrl(out?.redirectTo', 'Admin panel backend handoff yönlendirmesi');
must('public/admin/matrix-core.js', 'lastSuccessfulAdminBase', 'Admin backend origin hafızası');
must('routes/auth.routes.js', 'auditAdminGate', 'Admin gate audit');
mustNot('middlewares/admin.middleware.js', /x-admin-client-key|verifyClientGateKey|verifyAdminClientGate|ADMIN_CLIENT_KEY/, 'Legacy admin client key guard');
mustNot('routes/auth.routes.js', /x-admin-client-key|issueClientGateKey|verifyClientGateKey|clientKeyMatches|ADMIN_CLIENT_KEY/, 'Legacy admin client key route akışı');
mustNot('public/admin/matrix-core.js', /sessionStorage|localStorage|x-admin-client-key|pm_admin_matrix_key/, 'Admin client storage/header gate');

if (failures.length) {
  console.error('Admin Phase 5 kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('check:admin-phase5 OK. Admin guard server-side admin_matrix session ve audit standardı doğrulandı.');
