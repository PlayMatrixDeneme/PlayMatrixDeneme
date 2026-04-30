#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  parseEnvLine,
  parseCsv,
  normalizeUrlOrigin,
  normalizeUrlBase,
  normalizePublicBasePath,
  validateRuntimeEnv
} = require('../utils/env');

const ROOT = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const MODE_RUNTIME = args.has('--runtime');
const MODE_EXAMPLE = !MODE_RUNTIME;
const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example');

const EXPECTED_VALUES = Object.freeze({
  NODE_ENV: 'production',
  LOG_LEVEL: 'info',
  PUBLIC_BASE_URL: 'https://playmatrix.com.tr',
  CANONICAL_ORIGIN: 'https://playmatrix.com.tr',
  PUBLIC_BACKEND_ORIGIN: 'https://emirhan-siye.onrender.com',
  PUBLIC_API_BASE: 'https://emirhan-siye.onrender.com',
  FIREBASE_PROJECT_ID: 'playmatrix-b7df9',
  FIREBASE_DATABASE_URL: 'https://playmatrix-b7df9-default-rtdb.europe-west1.firebasedatabase.app',
  FIREBASE_STORAGE_BUCKET: 'playmatrix-b7df9.firebasestorage.app',
  PUBLIC_FIREBASE_AUTH_DOMAIN: 'playmatrix-b7df9.firebaseapp.com',
  PUBLIC_FIREBASE_DATABASE_URL: 'https://playmatrix-b7df9-default-rtdb.europe-west1.firebasedatabase.app',
  PUBLIC_FIREBASE_PROJECT_ID: 'playmatrix-b7df9',
  PUBLIC_FIREBASE_STORAGE_BUCKET: 'playmatrix-b7df9.firebasestorage.app',
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '689686425310',
  PUBLIC_FIREBASE_APP_ID: '1:689686425310:web:01c9f797b437a770e19c4f',
  PUBLIC_FIREBASE_MEASUREMENT_ID: 'G-BL9ZP43VVW',
  FIREBASE_AUTH_DOMAIN: 'playmatrix-b7df9.firebaseapp.com',
  FIREBASE_APP_ID: '1:689686425310:web:01c9f797b437a770e19c4f',
  FIREBASE_MESSAGING_SENDER_ID: '689686425310',
  FIREBASE_MEASUREMENT_ID: 'G-BL9ZP43VVW',
  ADMIN_EMAILS: 'o6emirv2@gmail.com',
  ADMIN_UIDS: 'wsvzAqg0oePzCjo4cr5QHMJW0163',
  PRIMARY_ADMIN_EMAIL: 'o6emirv2@gmail.com',
  PRIMARY_ADMIN_UID: 'wsvzAqg0oePzCjo4cr5QHMJW0163',
  ADMIN_HEALTH_SURFACE_ENABLED: '0',
  SECURITY_CSP_STRICT: '0',
  SECURITY_CSP_REPORT_ONLY: '1',
  LOBBY_CHAT_RETENTION_DAYS: '7',
  DIRECT_CHAT_RETENTION_DAYS: '14',
  DIRECT_MESSAGE_EDIT_WINDOW_HOURS: '24',
  SOCKET_PING_INTERVAL_MS: '25000',
  SOCKET_STALE_TIMEOUT_MS: '70000',
  SOCKET_MEMORY_SWEEP_INTERVAL_MS: '60000',
  SOCKET_CONNECTION_TTL_MS: '180000',
  MATCH_QUEUE_TTL_MS: '120000',
  GAME_INVITE_TTL_MS: '90000',
  PARTY_INVITE_TTL_MS: '300000',
  PARTY_MEMBER_LIMIT: '4',
  PARTY_REMATCH_GRACE_MS: '900000',
  IDLE_TIMEOUT_MS: '3600000',
  SESSION_TTL_MS: '2592000000',
  ACTIVITY_TOUCH_THROTTLE_MS: '60000',
  SESSION_TOUCH_THROTTLE_MS: '60000',
  LEGACY_SESSION_HEADER_ENABLED: '0',
  INACTIVE_WARN_AFTER_MS: '1987200000',
  INACTIVE_HARD_DELETE_AFTER_MS: '2592000000',
  ACTIVITY_RESET_WINDOW_HOURS: '6',
  MONTHLY_REWARD_WINDOW_HOURS: '6',
  CHESS_DISCONNECT_GRACE_MS: '90000',
  CHESS_RESULT_RETENTION_MS: '120000'
});

const REQUIRED_KEYS = Object.freeze([
  ...Object.keys(EXPECTED_VALUES),
  'ALLOWED_ORIGINS',
  'FIREBASE_KEY',
  'PUBLIC_FIREBASE_API_KEY',
  'FIREBASE_WEB_API_KEY',
  'ADMIN_PANEL_SECOND_FACTOR_HASH_HEX',
  'ADMIN_PANEL_SECOND_FACTOR_SALT_HEX',
  'ADMIN_PANEL_THIRD_FACTOR_NAME'
]);

const REQUIRED_ALLOWED_ORIGINS = Object.freeze([
  'https://playmatrix.com.tr',
  'https://www.playmatrix.com.tr',
]);

const INTEGER_RULES = Object.freeze({
  LOBBY_CHAT_RETENTION_DAYS: [1, 365],
  DIRECT_CHAT_RETENTION_DAYS: [1, 365],
  DIRECT_MESSAGE_EDIT_WINDOW_HOURS: [1, 168],
  SOCKET_PING_INTERVAL_MS: [15000, 120000],
  SOCKET_STALE_TIMEOUT_MS: [30000, 300000],
  SOCKET_MEMORY_SWEEP_INTERVAL_MS: [30000, 300000],
  SOCKET_CONNECTION_TTL_MS: [60000, 900000],
  MATCH_QUEUE_TTL_MS: [30000, 600000],
  GAME_INVITE_TTL_MS: [30000, 600000],
  PARTY_INVITE_TTL_MS: [60000, 900000],
  PARTY_MEMBER_LIMIT: [2, 16],
  PARTY_REMATCH_GRACE_MS: [60000, 1800000],
  IDLE_TIMEOUT_MS: [300000, 86400000],
  SESSION_TTL_MS: [3600000, 7776000000],
  ACTIVITY_TOUCH_THROTTLE_MS: [5000, 300000],
  SESSION_TOUCH_THROTTLE_MS: [5000, 300000],
  INACTIVE_WARN_AFTER_MS: [86400000, 7776000000],
  INACTIVE_HARD_DELETE_AFTER_MS: [86400000, 15552000000],
  ACTIVITY_RESET_WINDOW_HOURS: [1, 24],
  MONTHLY_REWARD_WINDOW_HOURS: [1, 24],
  CHESS_DISCONNECT_GRACE_MS: [30000, 300000],
  CHESS_RESULT_RETENTION_MS: [60000, 600000]
});

function isPlaceholderValue(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return true;
  const lowered = raw.toLowerCase();
  return /^(changeme|change_me|todo|placeholder|example|your_|your-.+|service_account_json|your_service_account_json)$/i.test(raw)
    || /^<.+>$/.test(raw)
    || /^\*+$/.test(raw)
    || raw.includes('********')
    || /service_account_json/i.test(raw)
    || /buraya|benim|gizli|gizl[iı]|tek_sat[iı]r|yazs[iı]n|eklemedim|secret|redacted/.test(lowered);
}

function parseExampleEnv() {
  if (!fs.existsSync(ENV_EXAMPLE_PATH)) throw new Error('.env.example bulunamadı.');
  const env = {};
  const lines = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const parsed = parseEnvLine(line);
    if (parsed) env[parsed.key] = parsed.value;
  });
  return env;
}

function normalizeEnvValue(key, value) {
  const raw = String(value || '').trim();
  if (/ORIGIN|URL|BASE/.test(key) && /^https?:\/\//i.test(raw)) return normalizeUrlBase(raw);
  return raw;
}

function pushMissingRenderEnv(failures, missingItems) {
  if (!missingItems.length) return;
  failures.push(`Eksik Render ENV: ${missingItems.join(', ')}`);
}

function validateAllowedOrigins(env, failures) {
  const rawOrigins = parseCsv(env.ALLOWED_ORIGINS || '');
  const normalized = rawOrigins.map((origin) => normalizeUrlOrigin(origin)).filter(Boolean);
  const missingOrigins = REQUIRED_ALLOWED_ORIGINS.filter((origin) => !normalized.includes(origin));
  pushMissingRenderEnv(failures, missingOrigins.map((origin) => `ALLOWED_ORIGINS:${origin}`));

  rawOrigins.forEach((origin) => {
    const raw = String(origin || '').trim();
    let parsed;
    try {
      parsed = new URL(raw);
    } catch (_) {
      failures.push(`ALLOWED_ORIGINS geçersiz origin içeriyor: ${raw}`);
      return;
    }
    if (parsed.origin !== raw.replace(/\/+$/, '')) {
      failures.push(`ALLOWED_ORIGINS path/query/hash içeremez: ${raw}`);
    }
    if (parsed.protocol !== 'https:') {
      failures.push(`Production ALLOWED_ORIGINS HTTPS olmalı: ${raw}`);
    }
  });
}

function validatePublicBasePath(env, failures) {
  if (env.PUBLIC_BASE_PATH === undefined || env.PUBLIC_BASE_PATH === '') return;
  const raw = String(env.PUBLIC_BASE_PATH || '').trim();
  const normalized = normalizePublicBasePath(raw);
  if (/^https?:\/\//i.test(raw) || raw.includes('?') || raw.includes('#') || raw.includes('..')) {
    failures.push('PUBLIC_BASE_PATH yalnız path olmalı. Doğru örnek: /PlayMatrixDeneme');
    return;
  }
  if (raw && raw !== '/' && !normalized) failures.push('PUBLIC_BASE_PATH geçersiz. Doğru örnek: /PlayMatrixDeneme');
}

function validateIntegerRules(env, failures) {
  Object.entries(INTEGER_RULES).forEach(([key, [min, max]]) => {
    if (env[key] === undefined || env[key] === '') return;
    const numeric = Number(env[key]);
    if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
      failures.push(`${key} integer olmalı ve ${min}-${max} aralığında kalmalı.`);
    }
  });
}

function validateStaticExample(env, failures, warnings) {
  const missingKeys = REQUIRED_KEYS.filter((key) => env[key] === undefined || env[key] === '');
  pushMissingRenderEnv(failures, missingKeys);

  Object.entries(EXPECTED_VALUES).forEach(([key, expected]) => {
    if (env[key] === undefined || env[key] === '') return;
    const actual = normalizeEnvValue(key, env[key]);
    const normalizedExpected = normalizeEnvValue(key, expected);
    if (actual !== normalizedExpected) failures.push(`${key} beklenen değerle uyumsuz. Beklenen: ${normalizedExpected}`);
  });

  validateAllowedOrigins(env, failures);
  validatePublicBasePath(env, failures);
  validateIntegerRules(env, failures);

  if (!isPlaceholderValue(env.FIREBASE_KEY || '')) {
    failures.push('.env.example içinde gerçek FIREBASE_KEY tutulamaz; placeholder kullanılmalı.');
  }
  if (/"private_key"\s*:/i.test(String(env.FIREBASE_KEY || '')) || /-----BEGIN [^-]+ PRIVATE KEY-----/i.test(String(env.FIREBASE_KEY || ''))) {
    failures.push('.env.example içinde raw service account/private key bulunamaz.');
  }
  if (env.ADMIN_PANEL_SECOND_FACTOR && !isPlaceholderValue(env.ADMIN_PANEL_SECOND_FACTOR)) {
    failures.push('.env.example içinde raw ADMIN_PANEL_SECOND_FACTOR tutulamaz; hash+salt kullanılmalı.');
  }
  if (env.PUBLIC_API_BASE && normalizeUrlOrigin(env.PUBLIC_API_BASE) !== normalizeUrlOrigin(env.PUBLIC_BACKEND_ORIGIN || '')) {
    failures.push('PUBLIC_API_BASE ve PUBLIC_BACKEND_ORIGIN aynı origin olmalı.');
  }
  if (String(env.SECURITY_CSP_STRICT || '') === '0') {
    warnings.push('SECURITY_CSP_STRICT=0 Faz 2 CSP sertleştirme için takip edilecek.');
  }
}

function validateRuntime(env, failures, warnings) {
  const runtime = validateRuntimeEnv({ ...env });
  runtime.errors.forEach((item) => failures.push(item));
  runtime.warnings.forEach((item) => warnings.push(item));
  validateAllowedOrigins(env, failures);
  validatePublicBasePath(env, failures);
  validateIntegerRules(env, failures);
}

const failures = [];
const warnings = [];
let env;
try {
  env = MODE_RUNTIME ? { ...process.env } : parseExampleEnv();
  if (MODE_EXAMPLE) validateStaticExample(env, failures, warnings);
  else validateRuntime(env, failures, warnings);
} catch (error) {
  failures.push(error.message || String(error));
}

if (warnings.length) {
  console.warn('ENV kontrat uyarıları:');
  warnings.forEach((item) => console.warn(`- ${item}`));
}
if (failures.length) {
  console.error('ENV kontrat kontrolü başarısız:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`check:env-contract OK (${MODE_RUNTIME ? 'runtime' : '.env.example'}). Render/Firebase ENV kontratı doğrulandı.`);
process.exit(0);
