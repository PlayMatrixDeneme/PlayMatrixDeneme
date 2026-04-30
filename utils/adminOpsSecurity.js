'use strict';

const { cleanStr, safeNum, nowMs, sha256Hex } = require('./helpers');
const { recordAuditLog } = require('./logger');

const ADMIN_DASHBOARD_CANONICAL_PATH = '/public/admin/admin.html';
const ADMIN_LOGIN_CANONICAL_PATH = '/public/admin/index.html';
const ADMIN_HEALTH_CANONICAL_PATH = '/public/admin/health.html';
const ADMIN_ALLOWED_PANEL_PATHS = Object.freeze([
  ADMIN_DASHBOARD_CANONICAL_PATH,
  ADMIN_LOGIN_CANONICAL_PATH,
  ADMIN_HEALTH_CANONICAL_PATH,
  '/admin/admin.html',
  '/admin/index.html',
  '/admin/health.html'
]);

const DANGEROUS_CONFIRMATION_TEXT = 'ONAYLIYORUM';
const BULK_RESET_CONFIRMATION_TEXT = 'TUM KULLANICILARI SIFIRLA';
const ACTIVITY_RESET_CONFIRMATION_TEXT = 'AKTIFLIK SIFIRLA';
const ADMIN_EDIT_CONFIRMATION_TEXT = 'ADMIN DUZENLEME ONAY';

function normalizeOrigin(value = '') {
  const raw = cleanStr(value || '', 300).replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.origin;
  } catch (_) {
    return '';
  }
}

function buildRequestOrigin(req = {}) {
  const proto = cleanStr(req.headers?.['x-forwarded-proto'] || req.protocol || 'https', 16).split(',')[0] || 'https';
  const host = cleanStr(req.headers?.['x-forwarded-host'] || req.headers?.host || '', 220).split(',')[0];
  if (!host) return '';
  return normalizeOrigin(`${proto}://${host}`);
}

function getPublicAdminOrigin(req = {}) {
  const candidates = [
    process.env.PUBLIC_ADMIN_ORIGIN,
    process.env.CANONICAL_ORIGIN,
    process.env.PUBLIC_BASE_URL,
    process.env.PUBLIC_FRONTEND_ORIGIN,
    process.env.FRONTEND_ORIGIN,
    'https://playmatrix.com.tr',
    buildRequestOrigin(req)
  ];
  return candidates.map(normalizeOrigin).find(Boolean) || '';
}

function mapAdminPanelPath(path = '') {
  const safePath = cleanStr(path || '', 260).trim() || ADMIN_DASHBOARD_CANONICAL_PATH;
  if (/^\/admin\/admin\.html$/i.test(safePath)) return ADMIN_DASHBOARD_CANONICAL_PATH;
  if (/^\/admin\/index\.html$/i.test(safePath)) return ADMIN_LOGIN_CANONICAL_PATH;
  if (/^\/admin\/health\.html$/i.test(safePath)) return ADMIN_HEALTH_CANONICAL_PATH;
  return safePath;
}

function normalizeAdminPanelPath(value = '') {
  const raw = cleanStr(value || ADMIN_DASHBOARD_CANONICAL_PATH, 520).trim() || ADMIN_DASHBOARD_CANONICAL_PATH;
  try {
    const parsed = new URL(raw, 'https://playmatrix.local');
    const mappedPath = mapAdminPanelPath(parsed.pathname || ADMIN_DASHBOARD_CANONICAL_PATH);
    if (!ADMIN_ALLOWED_PANEL_PATHS.includes(mappedPath)) return ADMIN_DASHBOARD_CANONICAL_PATH;
    if (/\/\.\.(?:\/|$)/.test(mappedPath)) return ADMIN_DASHBOARD_CANONICAL_PATH;
    return `${mappedPath}${parsed.search || ''}`;
  } catch (_) {
    return ADMIN_DASHBOARD_CANONICAL_PATH;
  }
}

function buildPublicAdminPanelUrl(req = {}, targetPath = ADMIN_DASHBOARD_CANONICAL_PATH) {
  const origin = getPublicAdminOrigin(req);
  const path = normalizeAdminPanelPath(targetPath);
  if (!origin) return path;
  try {
    return new URL(path, origin).toString();
  } catch (_) {
    return path;
  }
}

function getConfirmationText(req = {}) {
  return cleanStr(req.body?.confirmText || req.body?.confirmation || req.headers?.['x-admin-confirm'] || '', 160).toUpperCase();
}

function requireDangerousActionConfirmation(req = {}, expectedText = DANGEROUS_CONFIRMATION_TEXT, options = {}) {
  const expected = cleanStr(expectedText || DANGEROUS_CONFIRMATION_TEXT, 160).toUpperCase();
  const actual = getConfirmationText(req);
  if (actual !== expected) {
    const error = new Error(options.message || `Bu kritik işlem için yazılı onay gerekli: ${expected}`);
    error.statusCode = 428;
    error.code = 'ADMIN_DANGEROUS_CONFIRMATION_REQUIRED';
    error.expectedConfirmation = expected;
    throw error;
  }
  return true;
}

function getChangedPatchFields(before = {}, patch = {}) {
  const changes = [];
  for (const key of Object.keys(patch || {})) {
    if (key === 'updatedAt' || key.startsWith('lastAdmin')) continue;
    if (JSON.stringify(before?.[key]) !== JSON.stringify(patch?.[key])) changes.push(key);
  }
  return changes.sort();
}

function detectDangerousPatchFields(before = {}, patch = {}) {
  const criticalFields = new Set([
    'email', 'emailVerified', 'balance', 'accountLevel', 'accountXp', 'accountLevelScore', 'selectedFrame',
    'isMuted', 'isBanned', 'isFlagged', 'moderationReason', 'badge', 'monthlyActiveScore', 'activityScore'
  ]);
  return getChangedPatchFields(before, patch).filter((field) => criticalFields.has(field));
}

function assertCriticalPatchConfirmed(req = {}, before = {}, patch = {}) {
  const dangerousFields = detectDangerousPatchFields(before, patch);
  if (!dangerousFields.length) return dangerousFields;
  try {
    requireDangerousActionConfirmation(req, ADMIN_EDIT_CONFIRMATION_TEXT, {
      message: `Kritik kullanıcı alanları için yazılı onay gerekli: ${ADMIN_EDIT_CONFIRMATION_TEXT}`
    });
  } catch (error) {
    error.dangerousFields = dangerousFields;
    throw error;
  }
  return dangerousFields;
}

async function validateAuthFirestoreEmailSync({ auth, uid = '', firestoreUser = {} } = {}) {
  const safeUid = cleanStr(uid || '', 160);
  if (!safeUid) {
    const error = new Error('E-posta senkron doğrulaması için UID gerekli.');
    error.statusCode = 400;
    throw error;
  }
  if (!auth?.getUser) {
    const error = new Error('Firebase Auth erişimi yok; e-posta senkronu doğrulanamadı.');
    error.statusCode = 503;
    throw error;
  }

  const authRecord = await auth.getUser(safeUid);
  const authEmail = cleanStr(authRecord.email || '', 200).toLowerCase();
  const firestoreEmail = cleanStr(firestoreUser.email || '', 200).toLowerCase();
  const authEmailVerified = !!authRecord.emailVerified;
  const firestoreEmailVerified = !!firestoreUser.emailVerified;
  const ok = !firestoreEmail || authEmail === firestoreEmail;

  return {
    ok,
    uid: safeUid,
    authEmail,
    firestoreEmail,
    authEmailVerified,
    firestoreEmailVerified,
    checkedAt: nowMs()
  };
}

function buildAdminOperationId(req = {}, scope = 'admin') {
  const explicit = cleanStr(req.body?.idempotencyKey || req.body?.operationId || req.headers?.['idempotency-key'] || '', 220);
  if (explicit) return explicit;
  const actorUid = cleanStr(req.user?.uid || '', 160);
  const route = cleanStr(req.originalUrl || req.url || '', 240);
  const bodySeed = JSON.stringify(req.body || {}).slice(0, 5000);
  return `${cleanStr(scope, 80)}:${sha256Hex(`${actorUid}:${route}:${bodySeed}`).slice(0, 40)}`;
}

async function recordAdminOperationAudit(req = {}, payload = {}) {
  return recordAuditLog({
    actorUid: cleanStr(req.user?.uid || payload.actorUid || '', 160),
    actorEmail: cleanStr(req.user?.email || payload.actorEmail || '', 200),
    action: cleanStr(payload.action || 'admin.operation', 120),
    targetType: cleanStr(payload.targetType || 'admin_operation', 80),
    targetId: cleanStr(payload.targetId || '', 220),
    status: cleanStr(payload.status || 'success', 24),
    metadata: {
      operationId: buildAdminOperationId(req, payload.action || 'admin'),
      requestId: cleanStr(req.requestId || '', 120),
      method: cleanStr(req.method || '', 16),
      route: cleanStr(req.originalUrl || req.url || '', 240),
      ip: cleanStr(req.ip || req.headers?.['x-forwarded-for'] || '', 120),
      userAgent: cleanStr(req.headers?.['user-agent'] || '', 240),
      ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {})
    }
  });
}

function normalizeLimit(value = 0, fallback = 50, max = 100) {
  return Math.max(1, Math.min(max, Math.floor(safeNum(value, fallback))));
}

module.exports = {
  ADMIN_DASHBOARD_CANONICAL_PATH,
  ADMIN_LOGIN_CANONICAL_PATH,
  ADMIN_HEALTH_CANONICAL_PATH,
  DANGEROUS_CONFIRMATION_TEXT,
  BULK_RESET_CONFIRMATION_TEXT,
  ACTIVITY_RESET_CONFIRMATION_TEXT,
  ADMIN_EDIT_CONFIRMATION_TEXT,
  normalizeOrigin,
  buildRequestOrigin,
  getPublicAdminOrigin,
  normalizeAdminPanelPath,
  buildPublicAdminPanelUrl,
  getConfirmationText,
  requireDangerousActionConfirmation,
  getChangedPatchFields,
  detectDangerousPatchFields,
  assertCriticalPatchConfirmed,
  validateAuthFirestoreEmailSync,
  buildAdminOperationId,
  recordAdminOperationAudit,
  normalizeLimit
};
