import { fail, pass, read } from './lib.js';

const server = await read('server.js');
const html = await read('public/index.html');
const forbiddenRouteFragments = [
  'Online Oyunlar',
  'Klasik Oyunlar',
  '/admin',
  '/market',
  '/Crash.html',
  '/Satranc.html',
  '/Pişti.html'
];

const findings = [];
for (const fragment of forbiddenRouteFragments) {
  if (server.includes(fragment)) findings.push(`server.js içinde yasak route: ${fragment}`);
  if (html.includes(fragment)) findings.push(`index.html içinde yasak route: ${fragment}`);
}

if (!server.includes('/healthz')) findings.push('server.js healthz route içermiyor.');
if (findings.length) fail('Homepage-only route kontrolü başarısız.', findings);
pass('Homepage-only route standardı doğru.');
