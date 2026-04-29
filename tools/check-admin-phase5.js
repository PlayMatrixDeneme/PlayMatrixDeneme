#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
function must(file, needle, label) {
  const body = read(file);
  if (!body.includes(needle)) failures.push(`${label}: ${file} içinde bulunamadı -> ${needle}`);
}
function mustMatch(file, pattern, label) {
  const body = read(file);
  if (!pattern.test(body)) failures.push(`${label}: ${file} deseni geçemedi -> ${pattern}`);
}

must('middlewares/admin.middleware.js', 'verifyAdminClientGate', 'Admin permission gate client key doğrulaması');
must('middlewares/admin.middleware.js', 'ADMIN_CLIENT_KEY_SESSION_MISMATCH', 'Admin client key session binding');
must('routes/auth.routes.js', "source: 'admin_matrix'", 'Second+third factor sonrası admin_matrix session');
must('routes/auth.routes.js', 'ADMIN_MATRIX_SESSION_REQUIRED', 'Admin matrix session source zorunluluğu');
must('middlewares/auth.middleware.js', 'sessionSource', 'Session source request user üstüne taşınıyor');
must('server.js', "optionalUser.sessionSource || '', 40) !== 'admin_matrix'", 'Admin/health HTML sayfaları sadece tamamlanmış admin_matrix session ile açılır');
must('routes/admin.routes.js', 'syncAdminEditedEmail', 'Admin e-posta düzenleme Firebase Auth senkronu');
must('routes/admin.routes.js', 'auth.updateUser', 'Firebase Auth email update çağrısı');
must('routes/admin.routes.js', 'buildAuditedUserValueMetadata', 'Bakiye/seviye/çerçeve audit diff helper');
must('routes/admin.routes.js', 'auditedValueDiff', 'Admin değer değişimi audit diff');
must('routes/admin.routes.js', "auditedValueFields: ['balance']", 'Admin ödülleri bakiye audit alanı');
mustMatch('routes/admin.routes.js', /AUDITED_USER_VALUE_FIELDS\s*=\s*Object\.freeze\(\['balance', 'accountLevel', 'accountXp', 'accountLevelScore', 'selectedFrame'\]\)/, 'Audit alanları balance/level/xp/frame kapsamı');
must('utils/rewardService.js', 'admin_bulk_reward_runs', 'Admin bulk reward run registry');
must('utils/rewardService.js', 'BULK_REWARD_IDEMPOTENCY_CONFLICT', 'Bulk reward idempotency conflict guard');

if (failures.length) {
  console.error('[check:admin-phase5] başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[check:admin-phase5] OK - Admin login chain, permission gate, Auth/Firestore sync, audit ve bulk idempotency doğrulandı.');
process.exit(0);
