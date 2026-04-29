'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};
const ok = (message) => console.log(`✅ ${message}`);

const firebase = read('config/firebase.js');
if (!/parseFirebaseKey\(process\.env\.FIREBASE_KEY\s*\|\|\s*''/.test(firebase)) {
  fail('config/firebase.js FIREBASE_KEY ana credential akışını kullanmıyor.');
}
if (/createMemoryFirestore|memoryFirestore|rest-auth-memory-store/.test(firebase)) {
  fail('config/firebase.js içinde memory/degraded fallback akışı bulundu.');
}
if (!/degraded:\s*false/.test(firebase) || !/mode:\s*'admin-sdk'/.test(firebase)) {
  fail('Firebase health status admin-sdk + degraded:false kontratını sağlamıyor.');
}

const server = read('server.js');
const adminGuardIndex = server.indexOf("app.get(['/admin/admin.html', '/public/admin/admin.html']");
const publicStaticIndex = server.indexOf('app.use(express.static(publicStaticDir');
if (adminGuardIndex < 0) fail('Korumalı admin dashboard route register bloğu bulunamadı.');
if (publicStaticIndex < 0) fail('Root public static mount bloğu bulunamadı.');
if (publicStaticIndex < adminGuardIndex) {
  fail('Root public static mount admin guard route’larından önce geliyor; admin HTML bypass riski var.');
}
if (!/const \{ auth, getFirebaseStatus \} = require\('\.\/config\/firebase'\)/.test(server)) {
  fail('Firebase Admin boot server route register akışından önce yapılmıyor.');
}
if (/require\('\.\/routes\/(?:blackjack|mines|party)\.routes'\)/i.test(server)) {
  fail('Server içinde geri alınmayacak casino/party route register referansı bulundu.');
}

ok('PLAYMATRIX referans uyumluluğu doğrulandı.');
process.exit(0);
