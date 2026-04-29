'use strict';

(async () => {
  const fail = (message, error) => {
    console.error(`❌ ${message}`);
    if (error) console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  };
  const ok = (message) => console.log(`✅ ${message}`);

  try {
    if (!process.env.FIREBASE_KEY) {
      fail('FIREBASE_KEY tanımlı değil. Bu canlı kontrol Render ortamında gerçek service-account JSON ile çalıştırılmalı.');
    }

    const { auth, db, getFirebaseStatus } = require('../config/firebase');
    const status = getFirebaseStatus({ exposeError: true });
    if (!status.ready || status.degraded || status.mode !== 'admin-sdk' || status.source !== 'FIREBASE_KEY') {
      fail(`Firebase status kontratı geçersiz: ${JSON.stringify(status)}`);
    }

    await auth.listUsers(1);
    await db.collection('users').limit(1).get();

    ok('Firebase Admin SDK boot doğrulandı.');
    ok('Firebase Auth listUsers doğrulandı.');
    ok('Firestore users read doğrulandı.');
    ok('Health kontratı doğrulandı: ready=true, degraded=false, mode=admin-sdk, source=FIREBASE_KEY.');
  } catch (error) {
    fail('Firebase Admin canlı uçtan uca doğrulama başarısız.', error);
  }
})();
