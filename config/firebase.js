'use strict';

const path = require('path');
const admin = require('firebase-admin');
const { loadEnvFiles, isProductionEnv } = require('../utils/env');
const { parseFirebaseKey, clean } = require('../utils/firebaseCredential');
const { writeLine } = require('../utils/logger');

loadEnvFiles({ cwd: path.join(__dirname, '..') });

let firebaseReady = false;
let firebaseInitError = null;
let firebaseCredentialSource = null;

function buildFirebaseAdminOptions(serviceAccount) {
  const options = { credential: admin.credential.cert(serviceAccount) };
  const projectId = clean(process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || '');
  const databaseURL = clean(process.env.FIREBASE_DATABASE_URL || '');
  const storageBucket = clean(process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.storage_bucket || '');
  if (projectId) options.projectId = projectId;
  if (databaseURL) options.databaseURL = databaseURL;
  if (storageBucket) options.storageBucket = storageBucket;
  return options;
}

function startupFailure(error) {
  const err = error instanceof Error ? error : new Error(String(error || 'Firebase Admin başlatılamadı.'));
  firebaseReady = false;
  firebaseInitError = err;
  firebaseCredentialSource = 'FIREBASE_KEY';
  writeLine('fatal', 'firebase_admin_startup_failed', {
    source: firebaseCredentialSource,
    mode: 'admin-sdk-required',
    degraded: false,
    production: isProductionEnv(process.env),
    message: err.message
  });
  throw err;
}

(function initFirebase() {
  try {
    if (admin.apps.length) {
      firebaseReady = true;
      firebaseInitError = null;
      firebaseCredentialSource = 'existing-app';
      return;
    }

    const serviceAccount = parseFirebaseKey(process.env.FIREBASE_KEY || '', process.env);
    admin.initializeApp(buildFirebaseAdminOptions(serviceAccount));
    firebaseReady = true;
    firebaseInitError = null;
    firebaseCredentialSource = 'FIREBASE_KEY';
    writeLine('info', 'firebase_admin_ready', {
      source: firebaseCredentialSource,
      mode: 'admin-sdk',
      degraded: false,
      projectId: serviceAccount.project_id
    });
  } catch (error) {
    startupFailure(new Error(`Firebase Admin başlatılamadı: ${error.message}`));
  }
})();

const db = admin.firestore();
const auth = admin.auth();

function isFirebaseReady() {
  return firebaseReady;
}

function getFirebaseStatus(options = {}) {
  const exposeError = options.exposeError === true;
  return {
    ready: firebaseReady,
    degraded: false,
    mode: 'admin-sdk',
    source: firebaseCredentialSource || 'FIREBASE_KEY',
    error: exposeError && firebaseInitError ? firebaseInitError.message : null
  };
}

function assertFirebaseReady() {
  if (!firebaseReady) {
    const err = new Error(firebaseInitError?.message || 'Firebase Admin hazır değil. Render üzerinde geçerli FIREBASE_KEY tanımla.');
    err.code = 'FIREBASE_ADMIN_UNAVAILABLE';
    err.statusCode = 503;
    throw err;
  }
  return true;
}

module.exports = {
  admin,
  db,
  auth,
  isFirebaseReady,
  getFirebaseStatus,
  assertFirebaseReady
};
