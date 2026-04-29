'use strict';

function clean(value = '') {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function stripWrappingQuotes(value = '') {
  let out = clean(value);
  for (let i = 0; i < 4; i += 1) {
    if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
      out = clean(out.slice(1, -1));
      continue;
    }
    break;
  }
  return out;
}

function looksLikePlaceholder(value = '') {
  const raw = clean(value);
  if (!raw) return true;
  const lowered = raw.toLowerCase();
  return /^(change_me|changeme|todo|placeholder|example|your_service_account_json|service_account_json)$/i.test(raw)
    || /^<.+>$/.test(raw)
    || /^\*+$/.test(raw)
    || raw.includes('********')
    || /buraya|benim|gizli|gizl[iı]|tek_sat[iı]r|yazs[iı]n|eklemedim|secret|redacted/.test(lowered);
}

function tryParseJson(value = '') {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch (error) {
    return { ok: false, error };
  }
}

function repairPrivateKeyNewlines(value = '') {
  const raw = stripWrappingQuotes(value);
  return raw.replace(/("private_key"\s*:\s*")([\s\S]*?)("\s*,\s*"client_email")/m, (_all, prefix, keyValue, suffix) => {
    const repairedKey = keyValue
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n/g, '\\n');
    return `${prefix}${repairedKey}${suffix}`;
  });
}

function parseAnyJsonObject(raw = '') {
  let candidate = clean(raw);
  const attempted = [];

  for (let depth = 0; depth < 4; depth += 1) {
    if (!candidate) break;
    const parsed = tryParseJson(candidate);
    attempted.push(parsed);
    if (parsed.ok) {
      if (parsed.value && typeof parsed.value === 'object' && !Array.isArray(parsed.value)) return parsed.value;
      if (typeof parsed.value === 'string') {
        candidate = stripWrappingQuotes(parsed.value);
        continue;
      }
      throw new Error('FIREBASE_KEY service-account JSON object olmalı.');
    }

    const repaired = repairPrivateKeyNewlines(candidate);
    if (repaired !== candidate) {
      const repairedParsed = tryParseJson(repaired);
      attempted.push(repairedParsed);
      if (repairedParsed.ok && repairedParsed.value && typeof repairedParsed.value === 'object' && !Array.isArray(repairedParsed.value)) {
        return repairedParsed.value;
      }
    }

    const stripped = stripWrappingQuotes(candidate);
    if (stripped && stripped !== candidate) {
      candidate = stripped;
      continue;
    }

    const compact = candidate.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 120) {
      try {
        const decoded = Buffer.from(compact, 'base64').toString('utf8').trim();
        if (decoded && decoded !== candidate && /^[\s\S]*\{[\s\S]*\}[\s\S]*$/.test(decoded)) {
          candidate = stripWrappingQuotes(decoded);
          continue;
        }
      } catch (_) {}
    }
    break;
  }

  const lastError = attempted.reverse().find((item) => !item.ok)?.error?.message || 'JSON parse edilemedi';
  throw new Error(`FIREBASE_KEY JSON parse edilemedi: ${lastError}`);
}

function normalizePrivateKey(value = '') {
  let key = stripWrappingQuotes(value)
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const match = key.match(/-----BEGIN ([A-Z0-9 ]*PRIVATE KEY)-----\s*([\s\S]*?)\s*-----END \1-----/i);
  if (!match) return key;

  const label = match[1].toUpperCase().replace(/\s+/g, ' ').trim();
  const body = match[2].replace(/[^A-Za-z0-9+/=]/g, '');
  if (!body) return key;

  const lines = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

function isFirebaseWebConfig(value = {}) {
  return value && typeof value === 'object'
    && !value.private_key
    && !value.privateKey
    && (value.apiKey || value.authDomain || value.messagingSenderId || value.appId)
    && (value.projectId || value.project_id);
}

function normalizeServiceAccount(rawAccount = {}, env = process.env) {
  if (!rawAccount || typeof rawAccount !== 'object' || Array.isArray(rawAccount)) {
    throw new Error('FIREBASE_KEY service-account JSON object olmalı.');
  }

  if (isFirebaseWebConfig(rawAccount)) {
    throw new Error('FIREBASE_KEY içine Firebase Web Config girilmiş. Bu alan Firebase Admin service-account JSON ister. Firebase Console > Project settings > Service accounts > Generate new private key JSON içeriğini kullan.');
  }

  const serviceAccount = { ...rawAccount };
  serviceAccount.type = clean(serviceAccount.type || 'service_account');
  serviceAccount.project_id = clean(serviceAccount.project_id || serviceAccount.projectId || env.FIREBASE_PROJECT_ID || '');
  serviceAccount.private_key_id = clean(serviceAccount.private_key_id || serviceAccount.privateKeyId || '');
  serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key || serviceAccount.privateKey || '');
  serviceAccount.client_email = clean(serviceAccount.client_email || serviceAccount.clientEmail || '');
  serviceAccount.client_id = clean(serviceAccount.client_id || serviceAccount.clientId || '');
  serviceAccount.auth_uri = clean(serviceAccount.auth_uri || 'https://accounts.google.com/o/oauth2/auth');
  serviceAccount.token_uri = clean(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token');
  serviceAccount.auth_provider_x509_cert_url = clean(serviceAccount.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs');
  serviceAccount.client_x509_cert_url = clean(serviceAccount.client_x509_cert_url || (serviceAccount.client_email ? `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(serviceAccount.client_email)}` : ''));
  serviceAccount.universe_domain = clean(serviceAccount.universe_domain || 'googleapis.com');

  const missing = [];
  if (serviceAccount.type !== 'service_account') missing.push('type=service_account');
  if (!serviceAccount.project_id) missing.push('project_id');
  if (!serviceAccount.client_email || !/@.+\.iam\.gserviceaccount\.com$/i.test(serviceAccount.client_email)) missing.push('client_email');
  if (!serviceAccount.private_key || !/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----\n[\s\S]+\n-----END [A-Z0-9 ]*PRIVATE KEY-----\n?$/i.test(serviceAccount.private_key)) missing.push('private_key');

  if (missing.length) {
    throw new Error(`FIREBASE_KEY service-account JSON eksik/geçersiz alanlar: ${missing.join(', ')}`);
  }

  return serviceAccount;
}

function parseFirebaseKey(raw = '', env = process.env) {
  const value = clean(raw);
  if (!value || looksLikePlaceholder(value)) {
    throw new Error('FIREBASE_KEY tanımlı değil veya placeholder değer içeriyor. Render Environment içine Firebase Admin service-account JSON değerini FIREBASE_KEY olarak ekle.');
  }
  return normalizeServiceAccount(parseAnyJsonObject(value), env);
}

module.exports = {
  clean,
  parseFirebaseKey,
  normalizePrivateKey,
  normalizeServiceAccount,
  isFirebaseWebConfig
};
