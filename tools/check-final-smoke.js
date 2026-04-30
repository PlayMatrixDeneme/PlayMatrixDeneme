'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const required = [
  'server.js',
  'config/asciiRoutes.js',
  'index.html',
  'index-boot.js',
  'online-games/Crash.html',
  'online-games/Pisti.html',
  'online-games/pisti.css',
  'online-games/pisti.js',
  'online-games/Satranc.html',
  'online-games/chess.css',
  'online-games/chess.js',
  'classic-games/PatternMaster.html',
  'classic-games/pattern-master.css',
  'classic-games/pattern-master.js',
  'classic-games/SnakePro.html',
  'classic-games/snake-pro.css',
  'classic-games/snake-pro.js',
  'classic-games/SpacePro.html',
  'classic-games/space-pro.css',
  'classic-games/space-pro.js',
  'maintenance/index.html',
  'maintenance/maintenance.css',
  'maintenance/maintenance.js',
  'public/css/static-inline.css',
  'public/js/static-actions.js',
  'release/release-manifest.json'
];

const failures = required.filter((rel) => !fs.existsSync(path.join(root, rel))).map((rel) => `${rel} yok.`);
if (!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('/online-games/crash')) {
  failures.push('index.html ASCII oyun rotalarını kullanmıyor.');
}
if (!fs.readFileSync(path.join(root, 'server.js'), 'utf8').includes('/public/admin/admin.html')) {
  failures.push('admin public dashboard rotası korunmuyor.');
}
if (failures.length) {
  console.error('Final smoke kontrolü başarısız:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('check:final-smoke OK');
