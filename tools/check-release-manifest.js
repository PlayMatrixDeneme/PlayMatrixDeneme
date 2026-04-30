'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];

function parse(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch (error) {
    failures.push(`${rel} okunamadı: ${error.message}`);
    return null;
  }
}

const release = parse('release/release-manifest.json');
const change = parse('release/change-manifest.json');
const perf = parse('release/final-performance-checklist.json');

if (release && release.phase !== 10) failures.push('release-manifest phase 10 değil.');
if (release && release.status !== 'clean') failures.push('release-manifest status clean değil.');
if (change && (!Array.isArray(change.added) || !Array.isArray(change.modified) || !Array.isArray(change.deleted))) {
  failures.push('change-manifest added/modified/deleted dizileri eksik.');
}
if (perf && !Array.isArray(perf.items)) failures.push('final-performance-checklist items dizisi eksik.');

if (failures.length) {
  console.error('Release manifest kontrolü başarısız:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('check:release-manifest OK');
