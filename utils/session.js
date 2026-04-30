'use strict';

const { cleanStr, safeNum } = require('./helpers');
const { IDLE_TIMEOUT_MS, SESSION_TTL_MS } = require('./activity');

const COOKIE_ONLY_SESSION_CONTRACT = Object.freeze({
  transport: 'httpOnlyCookie',
  cookieName: 'pm_session',
  exposesRawTokenToClient: false,
  acceptsClientStorageToken: false
});

function buildPublicSessionView(session = {}) {
  const data = session && typeof session === 'object' ? session : {};
  return {
    id: cleanStr(data.sessionId || data.id || '', 160),
    createdAt: safeNum(data.createdAt, 0),
    lastSeenAt: safeNum(data.lastSeenAt, 0),
    expiresAt: safeNum(data.expiresAt, 0),
    idleTimeoutMs: Math.max(IDLE_TIMEOUT_MS, safeNum(data.idleTimeoutMs, IDLE_TIMEOUT_MS)),
    ttlMs: SESSION_TTL_MS,
    cookieOnly: true
  };
}

function buildCookieOnlySessionPayload(session = {}) {
  return {
    session: buildPublicSessionView(session),
    sessionContract: COOKIE_ONLY_SESSION_CONTRACT
  };
}

function stripSessionSecrets(payload = {}) {
  const source = payload && typeof payload === 'object' ? { ...payload } : {};
  delete source.sessionToken;
  if (source.session && typeof source.session === 'object') {
    source.session = { ...source.session };
    delete source.session.token;
    source.session.cookieOnly = true;
  }
  return source;
}

module.exports = {
  COOKIE_ONLY_SESSION_CONTRACT,
  buildPublicSessionView,
  buildCookieOnlySessionPayload,
  stripSessionSecrets
};
