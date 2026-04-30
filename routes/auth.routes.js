'use strict';

const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const { db, admin } = require('../config/firebase');
const { verifyAuth, extractSessionToken, resolveOptionalAuthUser } = require('../middlewares/auth.middleware');
const { profileLimiter } = require('../middlewares/rateLimiters');
const { cleanStr, safeNum, nowMs, sha256Hex } = require('../utils/helpers');
const { bootstrapAccountByAuth } = require('../utils/accountBootstrap');
const { logCaughtError, recordAuditLog } = require('../utils/logger');
const { resolveAdminContext } = require('../middlewares/admin.middleware');
const { normalizeEmail, getPrimaryAdminIdentity, issueStepTicket, verifyStepTicket, verifySecondFactor, verifyThirdFactor } = require('../utils/adminMatrix');
const {
  ADMIN_DASHBOARD_CANONICAL_PATH,
  ADMIN_LOGIN_CANONICAL_PATH,
  normalizeAdminPanelPath,
  buildPublicAdminPanelUrl
} = require('../utils/adminOpsSecurity');
const {
  buildSessionCookie,
  buildExpiredSessionCookie,
  createServerSession,
  revokeServerSessionByToken,
  resolveServerSession,
  touchUserActivity,
  verifyFirebaseBearerToken,
  IDLE_TIMEOUT_MS,
  SESSION_TTL_MS
} = require('../utils/activity');
const { buildCookieOnlySessionPayload } = require('../utils/session');

const colUsers = () => db.collection('users');
const colAdminSessionHandoffs = () => db.collection('admin_session_handoffs');

const ADMIN_SESSION_HANDOFF_TTL_MS = 75 * 1000;

function buildRequestOrigin(req) {
  const proto = cleanStr(req.headers['x-forwarded-proto'] || req.protocol || 'https', 16).split(',')[0] || 'https';
  const host = cleanStr(req.headers['x-forwarded-host'] || req.headers.host || '', 220).split(',')[0];
  if (!host) return '';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

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

function getAdminBackendOrigin(req) {
  const configured = [
    process.env.PUBLIC_BACKEND_ORIGIN,
    process.env.PUBLIC_API_BASE,
    process.env.CANONICAL_ORIGIN,
    process.env.PUBLIC_BASE_URL,
    buildRequestOrigin(req)
  ];
  return configured.map(normalizeOrigin).find(Boolean) || '';
}

function normalizeAdminRedirectPath(value = '') {
  return normalizeAdminPanelPath(value || ADMIN_DASHBOARD_CANONICAL_PATH);
}

function normalizeAdminBackendTargetPath(value = '') {
  const raw = cleanStr(value || ADMIN_DASHBOARD_CANONICAL_PATH, 520).trim() || ADMIN_DASHBOARD_CANONICAL_PATH;
  try {
    const parsed = new URL(raw, 'https://playmatrix.local');
    const path = parsed.pathname || ADMIN_DASHBOARD_CANONICAL_PATH;
    if (/^\/api\/auth\/admin\/matrix\/session-handoff$/i.test(path)) return `${path}${parsed.search || ''}`;
    return normalizeAdminPanelPath(`${path}${parsed.search || ''}`);
  } catch (_) {
    return ADMIN_DASHBOARD_CANONICAL_PATH;
  }
}

function buildAdminBackendUrl(req, targetPath = ADMIN_DASHBOARD_CANONICAL_PATH) {
  const origin = getAdminBackendOrigin(req);
  const path = normalizeAdminBackendTargetPath(targetPath);
  if (!origin) return path;
  try {
    return new URL(path, origin).toString();
  } catch (_) {
    return path;
  }
}

function buildAdminSessionHandoffId(token = '') {
  return sha256Hex(`admin_session_handoff:${token}`).slice(0, 48);
}

async function createAdminSessionHandoff(req, { uid = '', email = '', role = '', contextSource = '' } = {}) {
  const safeUid = cleanStr(uid || '', 160);
  const safeEmail = normalizeEmail(email || '');
  if (!safeUid || !safeEmail) throw new Error('ADMIN_HANDOFF_IDENTITY_REQUIRED');

  const token = crypto.randomBytes(48).toString('base64url');
  const now = nowMs();
  const ref = colAdminSessionHandoffs().doc(buildAdminSessionHandoffId(token));
  await ref.set({
    uid: safeUid,
    email: safeEmail,
    tokenHash: sha256Hex(token),
    role: cleanStr(role || 'admin', 32),
    contextSource: cleanStr(contextSource || '', 80),
    createdAt: now,
    expiresAt: now + ADMIN_SESSION_HANDOFF_TTL_MS,
    consumedAt: 0,
    ip: cleanStr(req.ip || req.headers['x-forwarded-for'] || '', 120),
    userAgent: cleanStr(req.headers['user-agent'] || '', 240),
    requestId: cleanStr(req.requestId || '', 120),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return token;
}


function maskPublicEmail(email = '') {
  const safeEmail = normalizeEmail(email || '');
  const [name = '', domain = ''] = safeEmail.split('@');
  if (!name || !domain) return '';
  const head = name.slice(0, Math.min(2, name.length));
  const tail = name.length > 4 ? name.slice(-1) : '';
  const hiddenLength = Math.max(3, Math.min(7, name.length - head.length - tail.length));
  return `${head}${'•'.repeat(hiddenLength)}${tail}@${domain}`;
}

async function findUserUidByEmail(email = '') {
  const safeEmail = normalizeEmail(email);
  if (!safeEmail) return '';
  try {
    const snap = await colUsers().where('email', '==', safeEmail).limit(1).get();
    if (!snap.empty) return cleanStr(snap.docs[0]?.id || '', 160);
  } catch (error) {
    logCaughtError('auth.find_user_by_email', error, { email: safeEmail });
  }
  return '';
}

async function findAdminMemberUidByEmail(email = '') {
  const safeEmail = normalizeEmail(email);
  if (!safeEmail) return '';
  try {
    const snap = await db.collection('admin_members').where('email', '==', safeEmail).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      return cleanStr(doc.data()?.uid || doc.id || '', 160);
    }
  } catch (error) {
    logCaughtError('auth.find_admin_member_by_email', error, { email: safeEmail });
  }
  return '';
}

function serializeAdminContext(context = {}) {
  return {
    role: cleanStr(context.role || 'admin', 32),
    roles: Array.isArray(context.roles) ? context.roles : [],
    permissions: Array.isArray(context.permissions) ? context.permissions : [],
    source: cleanStr(context.source || 'resolved', 64),
    resolutionChain: Array.isArray(context?.metadata?.resolutionChain) ? context.metadata.resolutionChain : []
  };
}

function auditAdminGate(req, { action = '', status = 'success', uid = '', email = '', metadata = {} } = {}) {
  recordAuditLog({
    actorUid: cleanStr(uid || req.user?.uid || '', 160),
    actorEmail: normalizeEmail(email || req.user?.email || ''),
    action: cleanStr(action || 'admin.gate', 120),
    targetType: 'admin_gate',
    targetId: cleanStr(email || uid || 'matrix', 220),
    status: cleanStr(status || 'success', 24),
    metadata: {
      requestId: cleanStr(req.requestId || '', 120),
      ip: cleanStr(req.ip || req.headers['x-forwarded-for'] || '', 120),
      route: cleanStr(req.originalUrl || req.url || '', 240),
      userAgent: cleanStr(req.headers['user-agent'] || '', 240),
      ...((metadata && typeof metadata === 'object') ? metadata : {})
    }
  }).catch(() => null);
}


function parseAdminCsv(value = '', maxLen = 200) {
  return String(value || '')
    .split(',')
    .map((item) => cleanStr(item || '', maxLen))
    .filter(Boolean);
}

function getConfiguredAdminEntriesForAuth() {
  const emails = parseAdminCsv(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || process.env.PRIMARY_ADMIN_EMAIL || '', 200)
    .map((email) => normalizeEmail(email));
  const uids = parseAdminCsv(process.env.ADMIN_UIDS || process.env.ADMIN_UID || process.env.PRIMARY_ADMIN_UID || '', 160);
  const size = Math.max(emails.length, uids.length);
  return Array.from({ length: size }, (_, index) => ({
    index,
    email: emails[index] || '',
    uid: cleanStr(uids[index] || '', 160)
  })).filter((entry) => entry.email || entry.uid);
}

async function resolveConfiguredAdminCandidateByEmail(email = '') {
  const safeEmail = normalizeEmail(email || '');
  if (!safeEmail) return null;
  const entry = getConfiguredAdminEntriesForAuth().find((item) => item.email === safeEmail);
  if (!entry) return null;
  const uid = cleanStr(entry.uid || await findAdminMemberUidByEmail(safeEmail) || await findUserUidByEmail(safeEmail) || '', 160);
  if (!uid) return null;
  const context = await resolveAdminContext({ uid, email: safeEmail, claims: {} });
  if (!context?.isAdmin) return null;
  return { uid, email: safeEmail, context, entryIndex: entry.index };
}

function buildAdminStepTicketPayload(context = {}, identity = {}, stage = 2, prev = 'session_bound_identity') {
  const email = normalizeEmail(context.email || identity.email || '');
  const uid = cleanStr(context.uid || identity.uid || '', 160);
  return {
    uid,
    email,
    role: context.role,
    roles: context.roles,
    permissions: context.permissions,
    source: context.source,
    resolutionChain: Array.isArray(context?.metadata?.resolutionChain) ? context.metadata.resolutionChain : [],
    stage,
    prev
  };
}

async function resolveAdminIdentityFromRequest(req) {
  const authHeader = String(req.headers.authorization || '').trim();
  let user = null;

  if (authHeader.startsWith('Bearer ')) {
    try {
      const decoded = await verifyFirebaseBearerToken(authHeader.slice(7).trim());
      user = {
        uid: cleanStr(decoded?.uid || '', 160),
        email: normalizeEmail(decoded?.email || ''),
        claims: decoded || {},
        sessionId: ''
      };
    } catch (error) {
      logCaughtError('auth.resolve_admin_identity.bearer', error, { requestId: req.requestId || null });
    }
  }

  if (!user?.uid) {
    try {
      const optionalUser = await resolveOptionalAuthUser(req);
      if (optionalUser?.uid) {
        user = {
          uid: cleanStr(optionalUser.uid || '', 160),
          email: normalizeEmail(optionalUser.email || ''),
          claims: optionalUser?.claims || {},
          sessionId: cleanStr(optionalUser.sessionId || '', 160)
        };
      }
    } catch (error) {
      logCaughtError('auth.resolve_admin_identity.optional', error, { requestId: req.requestId || null });
    }
  }

  if (!user?.uid) {
    return { ok: false, authenticated: false, admin: false, user: null, adminContext: null };
  }

  const adminContext = await resolveAdminContext(user);
  return {
    ok: true,
    authenticated: true,
    admin: !!adminContext?.isAdmin,
    user: {
      uid: cleanStr(user.uid || '', 160),
      email: normalizeEmail(user.email || '')
    },
    adminContext: adminContext?.isAdmin ? serializeAdminContext(adminContext) : null,
    claims: user.claims || {},
    sessionId: cleanStr(user.sessionId || '', 160)
  };
}

router.post('/auth/resolve-login', profileLimiter, async (req, res) => {
  try {
    const identifier = cleanStr(req.body?.identifier || req.body?.email || '', 160).trim().toLowerCase();
    if (!identifier) return res.status(400).json({ ok: false, error: 'Geçersiz giriş.' });

    if (identifier.includes('@')) {
      return res.json({
        ok: true,
        email: identifier,
        maskedEmail: maskPublicEmail(identifier),
        displayIdentifier: maskPublicEmail(identifier),
        method: 'email'
      });
    }

    const unameSnap = await db.collection('usernames').doc(identifier).get();
    if (!unameSnap.exists) return res.status(400).json({ ok: false, error: 'Geçersiz giriş.' });
    const uid = cleanStr(unameSnap.data()?.uid || '', 160);
    if (!uid) return res.status(400).json({ ok: false, error: 'Geçersiz giriş.' });

    const userSnap = await colUsers().doc(uid).get();
    const email = cleanStr(userSnap.data()?.email || '', 200).toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'Geçersiz giriş.' });

    return res.json({
      ok: true,
      email,
      maskedEmail: maskPublicEmail(email),
      displayIdentifier: cleanStr(identifier || '', 160),
      method: 'username'
    });
  } catch (error) {
    logCaughtError('auth.resolve_login', error, { requestId: req.requestId || null, route: req.originalUrl || req.url || '' }, 'error');
    return res.status(500).json({ ok: false, error: 'Giriş çözümleme hatası.', requestId: req.requestId || null });
  }
});

router.post('/auth/session/create', async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader.startsWith('Bearer ')) {
      res.locals.errorLogged = true;
      return res.status(401).json({ ok: false, code: 'AUTH_REQUIRED', error: 'Kimlik doğrulama gerekli.' });
    }
    const decoded = await verifyFirebaseBearerToken(authHeader.slice(7).trim());
    const bootstrap = await bootstrapAccountByAuth({
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: !!decoded.email_verified,
      referenceId: 'auth_session_create'
    });
    const session = await createServerSession({
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: !!decoded.email_verified,
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      source: 'firebase_id_token'
    });
    await touchUserActivity(decoded.uid, { scope: 'session_create', login: true, sessionId: session.sessionId, status: 'ACTIVE', activity: 'login' });
    res.setHeader('Set-Cookie', buildSessionCookie(session.token, { secure: req.secure || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https' }));

    return res.json({
      ok: true,
      ...buildCookieOnlySessionPayload(session),
      rewardBootstrap: {
        signupGranted: !!bootstrap.grantedSignupReward,
        emailGranted: !!bootstrap.grantedEmailReward,
        emailRewardBlocked: !!bootstrap.emailRewardBlocked
      }
    });
  } catch (error) {
    const code = String(error?.code || '');
    const isTemporaryAuthBackendError = error?.statusCode === 503
      || code === 'FIREBASE_ADMIN_UNAVAILABLE'
      || code === 'PUBLIC_FIREBASE_API_KEY_MISSING'
      || code === 'FIREBASE_REST_AUTH_NETWORK';
    if (isTemporaryAuthBackendError) {
      return res.status(503).json({
        ok: false,
        code: code || 'AUTH_BACKEND_TEMPORARILY_UNAVAILABLE',
        error: 'Sunucu kimlik doğrulama altyapısı geçici olarak kullanılamıyor.'
      });
    }
    res.locals.errorLogged = true;
    return res.status(401).json({ ok: false, code: 'SESSION_CREATE_FAILED', error: 'Oturum oluşturulamadı.' });
  }
});

router.post('/auth/session/logout', async (req, res) => {
  try {
    const sessionToken = extractSessionToken(req);
    if (sessionToken) await revokeServerSessionByToken(sessionToken).catch(() => null);
    res.setHeader('Set-Cookie', buildExpiredSessionCookie());
    return res.json({ ok: true });
  } catch (_error) {
    res.setHeader('Set-Cookie', buildExpiredSessionCookie());
    return res.json({ ok: true });
  }
});

router.get('/auth/session/status', async (req, res) => {
  try {
    const sessionToken = extractSessionToken(req);
    if (!sessionToken) return res.json({ ok: true, active: false, session: null });
    const session = await resolveServerSession(sessionToken);
    if (!session?.valid) {
      res.setHeader('Set-Cookie', buildExpiredSessionCookie());
      return res.json({ ok: true, active: false, session: null, code: session?.reason || 'INVALID_SESSION' });
    }
    return res.json({
      ok: true,
      active: true,
      session: {
        id: session.id,
        uid: session.data.uid,
        email: session.data.email,
        createdAt: safeNum(session.data.createdAt, 0),
        lastSeenAt: safeNum(session.data.lastSeenAt, 0),
        expiresAt: safeNum(session.data.expiresAt, 0),
        idleTimeoutMs: Math.max(IDLE_TIMEOUT_MS, safeNum(session.data.idleTimeoutMs, IDLE_TIMEOUT_MS))
      }
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, error: 'Oturum durumu alınamadı.' });
  }
});




router.post('/auth/admin/matrix/step-email', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || '');
    if (!email || !email.includes('@')) {
      auditAdminGate(req, { action: 'admin.gate.step_email', status: 'blocked', metadata: { code: 'INVALID_EMAIL' } });
      return res.status(400).json({ ok: false, error: 'Geçerli yönetici e-postası gerekli.' });
    }

    const identity = await resolveAdminIdentityFromRequest(req);

    if (identity.ok && identity.authenticated && identity.user?.uid) {
      const authenticatedEmail = normalizeEmail(identity.user?.email || '');
      if (!authenticatedEmail || authenticatedEmail !== email) {
        auditAdminGate(req, { action: 'admin.gate.step_email', status: 'blocked', uid: identity.user?.uid, email, metadata: { code: 'SESSION_EMAIL_MISMATCH' } });
        return res.status(403).json({ ok: false, error: 'Algılanan e-posta aktif oturumla eşleşmiyor.' });
      }

      if (!identity.admin) {
        auditAdminGate(req, { action: 'admin.gate.step_email', status: 'blocked', uid: identity.user?.uid, email, metadata: { code: 'NOT_ADMIN' } });
        return res.status(403).json({ ok: false, error: 'Bu aktif oturum için yönetici yetkisi doğrulanamadı.' });
      }

      const context = await resolveAdminContext({
        uid: cleanStr(identity.user.uid || '', 160),
        email: authenticatedEmail,
        claims: identity.claims || {}
      });

      if (!context?.isAdmin) {
        auditAdminGate(req, { action: 'admin.gate.step_email', status: 'blocked', uid: identity.user?.uid, email, metadata: { code: 'ADMIN_CONTEXT_MISSING' } });
        return res.status(403).json({ ok: false, error: 'Bu hesap için aktif yönetici bağlamı çözümlenemedi.' });
      }

      auditAdminGate(req, { action: 'admin.gate.step_email', status: 'success', uid: context.uid, email: context.email, metadata: { boundToSession: true } });
      return res.json({
        ok: true,
        boundToSession: true,
        manualFallback: false,
        ticket: issueStepTicket(buildAdminStepTicketPayload(context, identity.user, 2, 'session_bound_identity')),
        admin: serializeAdminContext(context)
      });
    }

    const configured = await resolveConfiguredAdminCandidateByEmail(email);
    if (!configured?.context?.isAdmin) {
      auditAdminGate(req, { action: 'admin.gate.step_email', status: 'blocked', email, metadata: { code: 'CONFIGURED_ADMIN_NOT_FOUND' } });
      return res.status(401).json({ ok: false, error: 'Aktif yönetici oturumu bulunamadı veya e-posta yetkili yönetici listesinde değil.' });
    }

    auditAdminGate(req, { action: 'admin.gate.step_email', status: 'success', uid: configured.uid, email: configured.email, metadata: { boundToSession: false } });
    return res.json({
      ok: true,
      boundToSession: false,
      manualFallback: true,
      ticket: issueStepTicket(buildAdminStepTicketPayload(configured.context, configured, 2, 'configured_admin_email_fallback')),
      admin: serializeAdminContext(configured.context)
    });
  } catch (_error) {
    return res.status(400).json({ ok: false, error: 'Yönetici hesabı doğrulanamadı.' });
  }
});

router.post('/auth/admin/matrix/step-password', async (req, res) => {
  try {
    const verified = verifyStepTicket(req.body?.ticket || '', 2);
    if (!verified.ok) {
      auditAdminGate(req, { action: 'admin.gate.step_password', status: 'blocked', metadata: { code: verified.code || 'INVALID_STEP_TOKEN' } });
      return res.status(401).json({ ok: false, error: 'Güvenlik oturumu geçersiz.' });
    }
    const password = String(req.body?.password || '');
    if (!verifySecondFactor(password)) {
      auditAdminGate(req, { action: 'admin.gate.step_password', status: 'blocked', uid: verified.payload?.uid, email: verified.payload?.email, metadata: { code: 'SECOND_FACTOR_INVALID' } });
      return res.status(403).json({ ok: false, error: 'Güvenlik şifresi doğrulanamadı.' });
    }
    auditAdminGate(req, { action: 'admin.gate.step_password', status: 'success', uid: verified.payload?.uid, email: verified.payload?.email });
    return res.json({ ok: true, ticket: issueStepTicket({ ...verified.payload, stage: 3, prev: 'identity+password' }) });
  } catch (_error) {
    return res.status(400).json({ ok: false, error: 'Şifre doğrulanamadı.' });
  }
});

router.post('/auth/admin/matrix/step-name', async (req, res) => {
  try {
    const verified = verifyStepTicket(req.body?.ticket || '', 3);
    if (!verified.ok) {
      auditAdminGate(req, { action: 'admin.gate.step_name', status: 'blocked', metadata: { code: verified.code || 'INVALID_STEP_TOKEN' } });
      return res.status(401).json({ ok: false, error: 'Güvenlik oturumu geçersiz.' });
    }
    const adminName = String(req.body?.adminName || req.body?.name || '');
    if (!verifyThirdFactor(adminName)) {
      auditAdminGate(req, { action: 'admin.gate.step_name', status: 'blocked', uid: verified.payload?.uid, email: verified.payload?.email, metadata: { code: 'THIRD_FACTOR_INVALID' } });
      return res.status(403).json({ ok: false, error: 'Son güvenlik doğrulaması başarısız oldu.' });
    }

    const uid = cleanStr(verified.payload?.uid || '', 160);
    const email = normalizeEmail(verified.payload?.email || '');
    if (!uid || !email) {
      return res.status(400).json({ ok: false, error: 'Yönetici kimliği eksik. Lütfen işlemi yeniden başlatın.' });
    }

    const context = await resolveAdminContext({ uid, email, claims: {} });
    if (!context?.isAdmin) {
      return res.status(403).json({ ok: false, error: 'Bu hesap için aktif yönetici yetkisi bulunamadı.' });
    }

    const handoffToken = await createAdminSessionHandoff(req, {
      uid,
      email,
      role: context.role || 'admin',
      contextSource: context.source || 'resolved'
    });
    const nextPath = normalizeAdminRedirectPath(req.body?.next || ADMIN_DASHBOARD_CANONICAL_PATH);
    const handoffPath = `/api/auth/admin/matrix/session-handoff?token=${encodeURIComponent(handoffToken)}&next=${encodeURIComponent(nextPath)}`;
    const redirectTo = buildAdminBackendUrl(req, handoffPath);

    auditAdminGate(req, { action: 'admin.gate.complete', status: 'success', uid, email, metadata: { handoff: true, expiresInMs: ADMIN_SESSION_HANDOFF_TTL_MS } });
    return res.json({
      ok: true,
      redirectTo,
      handoff: {
        transport: 'top_level_redirect',
        ttlMs: ADMIN_SESSION_HANDOFF_TTL_MS,
        sameSiteSafe: true
      },
      admin: serializeAdminContext(context)
    });
  } catch (_error) {
    return res.status(400).json({ ok: false, error: 'Yönetici girişi tamamlanamadı.' });
  }
});

router.get('/auth/admin/matrix/session-handoff', async (req, res) => {
  const fallbackRedirect = buildPublicAdminPanelUrl(req, ADMIN_LOGIN_CANONICAL_PATH);
  try {
    const token = String(req.query?.token || '').trim();
    const nextPath = normalizeAdminRedirectPath(req.query?.next || ADMIN_DASHBOARD_CANONICAL_PATH);
    if (!token || token.length < 32) {
      auditAdminGate(req, { action: 'admin.gate.handoff', status: 'blocked', metadata: { code: 'HANDOFF_TOKEN_MISSING' } });
      return res.redirect(303, fallbackRedirect);
    }

    const handoffRef = colAdminSessionHandoffs().doc(buildAdminSessionHandoffId(token));
    const now = nowMs();
    const handoff = await db.runTransaction(async (tx) => {
      const snap = await tx.get(handoffRef);
      if (!snap.exists) {
        const error = new Error('HANDOFF_NOT_FOUND');
        error.code = 'HANDOFF_NOT_FOUND';
        throw error;
      }
      const data = snap.data() || {};
      if (cleanStr(data.tokenHash || '', 96) !== sha256Hex(token)) {
        const error = new Error('HANDOFF_HASH_MISMATCH');
        error.code = 'HANDOFF_HASH_MISMATCH';
        throw error;
      }
      if (safeNum(data.consumedAt, 0) > 0) {
        const error = new Error('HANDOFF_ALREADY_CONSUMED');
        error.code = 'HANDOFF_ALREADY_CONSUMED';
        throw error;
      }
      if (safeNum(data.expiresAt, 0) <= now) {
        const error = new Error('HANDOFF_EXPIRED');
        error.code = 'HANDOFF_EXPIRED';
        throw error;
      }
      const uid = cleanStr(data.uid || '', 160);
      const email = normalizeEmail(data.email || '');
      if (!uid || !email) {
        const error = new Error('HANDOFF_IDENTITY_MISSING');
        error.code = 'HANDOFF_IDENTITY_MISSING';
        throw error;
      }
      tx.set(handoffRef, {
        consumedAt: now,
        consumedIp: cleanStr(req.ip || req.headers['x-forwarded-for'] || '', 120),
        consumedUserAgent: cleanStr(req.headers['user-agent'] || '', 240),
        consumedRequestId: cleanStr(req.requestId || '', 120)
      }, { merge: true });
      return { uid, email, role: cleanStr(data.role || 'admin', 32), contextSource: cleanStr(data.contextSource || '', 80) };
    });

    const context = await resolveAdminContext({ uid: handoff.uid, email: handoff.email, claims: {} });
    if (!context?.isAdmin) {
      auditAdminGate(req, { action: 'admin.gate.handoff', status: 'blocked', uid: handoff.uid, email: handoff.email, metadata: { code: 'ADMIN_CONTEXT_MISSING_AFTER_HANDOFF' } });
      return res.redirect(303, fallbackRedirect);
    }

    const session = await createServerSession({
      uid: handoff.uid,
      email: handoff.email,
      emailVerified: true,
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      source: 'admin_matrix'
    });

    await touchUserActivity(handoff.uid, {
      scope: 'admin_matrix',
      login: true,
      sessionId: session.sessionId,
      status: 'ACTIVE',
      activity: 'admin'
    }).catch(() => null);

    res.setHeader('Set-Cookie', buildSessionCookie(session.token, {
      secure: req.secure || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https'
    }));

    const publicNextUrl = buildPublicAdminPanelUrl(req, nextPath);
    auditAdminGate(req, { action: 'admin.gate.handoff', status: 'success', uid: handoff.uid, email: handoff.email, metadata: { sessionId: session.sessionId, nextPath, publicNextUrl } });
    return res.redirect(303, publicNextUrl);
  } catch (error) {
    auditAdminGate(req, { action: 'admin.gate.handoff', status: 'blocked', metadata: { code: cleanStr(error?.code || error?.message || 'HANDOFF_FAILED', 80) } });
    return res.redirect(303, fallbackRedirect);
  }
});


router.get('/auth/admin/matrix/identity', async (req, res) => {
  try {
    const identity = await resolveAdminIdentityFromRequest(req);
    if (!identity.ok || !identity.authenticated) {
      return res.status(401).json({ ok: false, authenticated: false, admin: false, user: null, error: 'Aktif oturum bulunamadı.' });
    }
    if (!identity.admin) {
      return res.status(403).json({
        ok: false,
        authenticated: true,
        admin: false,
        user: identity.user,
        adminContext: null,
        error: 'Bu hesap için yönetici yetkisi bulunamadı.'
      });
    }
    return res.json({
      ok: true,
      authenticated: true,
      admin: true,
      user: identity.user,
      adminContext: identity.adminContext
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, authenticated: false, admin: false, error: 'Yönetici kimliği çözümlenemedi.' });
  }
});

router.get('/auth/admin/matrix/status', async (req, res) => {
  try {
    const optionalUser = await resolveOptionalAuthUser(req);
    if (!optionalUser?.uid) {
      return res.status(401).json({ ok: false, authenticated: false, redirectTo: ADMIN_LOGIN_CANONICAL_PATH, error: 'Yönetici oturumu bulunamadı.' });
    }

    const context = await resolveAdminContext({
      uid: cleanStr(optionalUser.uid || '', 160),
      email: normalizeEmail(optionalUser.email || ''),
      claims: optionalUser?.claims || {}
    });

    if (!context?.isAdmin) {
      return res.status(403).json({ ok: false, authenticated: false, redirectTo: ADMIN_LOGIN_CANONICAL_PATH, error: 'Yönetici yetkisi doğrulanamadı.' });
    }

    const currentSessionId = cleanStr(optionalUser.sessionId || '', 160);
    const currentSessionSource = cleanStr(optionalUser.sessionSource || '', 40);
    if (currentSessionSource !== 'admin_matrix') {
      return res.status(403).json({
        ok: false,
        authenticated: true,
        redirectTo: ADMIN_LOGIN_CANONICAL_PATH,
        code: 'ADMIN_MATRIX_SESSION_REQUIRED',
        error: 'Yönetici paneli için ikinci ve üçüncü güvenlik doğrulaması tamamlanmalıdır.'
      });
    }

    if (!currentSessionId || currentSessionSource !== 'admin_matrix') {
      return res.status(403).json({
        ok: false,
        authenticated: true,
        redirectTo: ADMIN_LOGIN_CANONICAL_PATH,
        code: 'ADMIN_MATRIX_SESSION_REQUIRED',
        error: 'Yönetici paneli için ikinci ve üçüncü güvenlik doğrulaması tamamlanmalıdır.'
      });
    }

    return res.json({
      ok: true,
      authenticated: true,
      user: { uid: context.uid, email: context.email },
      admin: serializeAdminContext(context)
    });
  } catch (_error) {
    return res.status(401).json({ ok: false, authenticated: false, redirectTo: ADMIN_LOGIN_CANONICAL_PATH, error: 'Yönetici doğrulaması tamamlanamadı.' });
  }
});

router.post('/auth/admin/matrix/logout', async (req, res) => {
  try {
    const sessionToken = extractSessionToken(req);
    if (sessionToken) await revokeServerSessionByToken(sessionToken).catch(() => null);
    res.setHeader('Set-Cookie', buildExpiredSessionCookie());
    return res.json({ ok: true });
  } catch (_error) {
    res.setHeader('Set-Cookie', buildExpiredSessionCookie());
    return res.json({ ok: true });
  }
});

router.post('/auth/admin/bootstrap', async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Kimlik doğrulama gerekli.' });
    }

    const decoded = await verifyFirebaseBearerToken(authHeader.slice(7).trim());
    const user = {
      uid: cleanStr(decoded?.uid || '', 160),
      email: cleanStr(decoded?.email || '', 200).toLowerCase()
    };

    const adminContext = await resolveAdminContext({ ...user, claims: decoded || {} });
    if (!adminContext?.isAdmin) {
      return res.status(403).json({ ok: false, error: 'Bu hesap için aktif yönetici yetkisi bulunamadı.' });
    }

    const session = await createServerSession({
      uid: user.uid,
      email: user.email,
      emailVerified: !!decoded.email_verified,
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      source: 'admin_bootstrap'
    });

    await touchUserActivity(user.uid, {
      scope: 'admin_bootstrap',
      login: true,
      sessionId: session.sessionId,
      status: 'ACTIVE',
      activity: 'admin'
    });

    res.setHeader('Set-Cookie', buildSessionCookie(session.token, {
      secure: req.secure || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https'
    }));

    auditAdminGate(req, { action: 'admin.session.bootstrap', status: 'success', uid: user.uid, email: user.email, metadata: { sessionId: session.sessionId } });
    return res.json({
      ok: true,
      admin: {
        uid: user.uid,
        email: user.email,
        ...serializeAdminContext(adminContext)
      },
      ...buildCookieOnlySessionPayload(session)
    });
  } catch (_error) {
    return res.status(401).json({ ok: false, error: 'Admin oturumu oluşturulamadı.' });
  }
});

router.get('/auth/admin/status', verifyAuth, async (req, res) => {
  try {
    const user = {
      uid: cleanStr(req.user?.uid || '', 160),
      email: cleanStr(req.user?.email || '', 200).toLowerCase()
    };

    const adminContext = await resolveAdminContext({ ...user, claims: req.user?.claims || {} });
    let securityComplete = false;
    if (adminContext?.isAdmin) {
      securityComplete = !!(req.user?.sessionSource === 'admin_matrix'
        && cleanStr(req.user?.sessionId || '', 160));
    }

    return res.json({
      ok: true,
      authenticated: !!user.uid,
      admin: !!adminContext?.isAdmin,
      securityComplete,
      user: {
        uid: user.uid,
        email: user.email
      },
      adminContext: adminContext?.isAdmin && securityComplete ? serializeAdminContext(adminContext) : null
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, error: 'Admin durum bilgisi alınamadı.' });
  }
});

module.exports = router;
