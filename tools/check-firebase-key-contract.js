'use strict';

const { parseFirebaseKey, normalizePrivateKey, isFirebaseWebConfig } = require('../utils/firebaseCredential');

function fail(message) {
  console.error(`[check:firebase-key-contract] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const header = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
const footer = ['-----END', 'PRIVATE KEY-----'].join(' ');
const body = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'.repeat(4);
const privateKey = `${header}\n${body}\n${footer}\n`;

const serviceAccount = {
  type: 'service_account',
  project_id: 'playmatrix-b7df9',
  private_key_id: 'dummy',
  private_key: privateKey,
  client_email: 'firebase-adminsdk-test@playmatrix-b7df9.iam.gserviceaccount.com',
  client_id: '1234567890',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-test%40playmatrix-b7df9.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com'
};

const rawJson = JSON.stringify(serviceAccount);
const parsedRaw = parseFirebaseKey(rawJson, {});
assert(parsedRaw.project_id === 'playmatrix-b7df9', 'raw JSON parse başarısız.');
assert(parsedRaw.private_key.includes('\n'), 'private key newline normalize edilmedi.');

const doubleEncoded = JSON.stringify(rawJson);
const parsedDouble = parseFirebaseKey(doubleEncoded, {});
assert(parsedDouble.client_email === serviceAccount.client_email, 'double encoded JSON parse başarısız.');

const compactPemAccount = { ...serviceAccount, private_key: `${header} ${body} ${footer}` };
const parsedCompact = parseFirebaseKey(JSON.stringify(compactPemAccount), {});
assert(parsedCompact.private_key.startsWith(`${header}\n`), 'tek satır PEM normalize edilmedi.');
assert(parsedCompact.private_key.endsWith(`${footer}\n`), 'PEM footer normalize edilmedi.');

const transported = Buffer.from(rawJson, 'utf8').toString('base64');
const parsedTransported = parseFirebaseKey(transported, {});
assert(parsedTransported.private_key_id === 'dummy', 'encoded transport parse başarısız.');

assert(isFirebaseWebConfig({ apiKey: 'x', authDomain: 'x.firebaseapp.com', projectId: 'playmatrix-b7df9', appId: 'x' }), 'web config ayırıcı çalışmıyor.');
try {
  parseFirebaseKey(JSON.stringify({ apiKey: 'x', authDomain: 'x.firebaseapp.com', projectId: 'playmatrix-b7df9', appId: 'x' }), {});
  fail('Firebase Web Config yanlışlıkla kabul edildi.');
} catch (error) {
  assert(/Web Config/.test(error.message), 'Web Config hatası net değil.');
}

const normalized = normalizePrivateKey(`${header} ${body} ${footer}`);
assert(normalized.includes('\n') && normalized.includes(footer), 'normalizePrivateKey beklenen PEM formatını üretmedi.');

console.log('[check:firebase-key-contract] OK - FIREBASE_KEY parser raw JSON, wrapped JSON, encoded transport, PEM normalization ve Web Config reddini doğruladı.');
process.exit(0);
