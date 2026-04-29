import { readFile } from 'node:fs/promises';
import { fail, pass, rel, walk } from './lib.js';

const ignored = new Set(['.env.example', 'tools/check-secrets.js', 'tools/verify-homepage.js']);
const patterns = [
  /BEGIN PRIVATE KEY/,
  /firebase-adminsdk/i,
  /private_key"\s*:/i,
  /ADMIN_PANEL_SECOND_FACTOR_HASH_HEX=d5001fe108b606073a4ec8a717d467d0079c887fd74f616e76daa9434d662178/,
  /ADMIN_PANEL_SECOND_FACTOR_SALT_HEX=706c61796d61747269782d61646d696e2d676174652d7631/,
  /PRIMARY_ADMIN_UID=wsvzAqg0oePzCjo4cr5QHMJW0163/,
  /ADMIN_UIDS=wsvzAqg0oePzCjo4cr5QHMJW0163/
];
const findings = [];
for (const file of await walk()) {
  const path = rel(file);
  if (ignored.has(path)) continue;
  if (!/\.(js|css|html|json|md|env|example|svg|txt)$/i.test(path)) continue;
  const text = await readFile(file, 'utf8');
  for (const pattern of patterns) {
    if (pattern.test(text)) findings.push(`${path}: ${pattern}`);
  }
}
if (findings.length) fail('Secret sızıntısı tespit edildi.', findings);
pass('Secret kontrolü temiz.');
