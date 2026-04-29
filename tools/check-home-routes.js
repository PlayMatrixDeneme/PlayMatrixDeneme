import { fail, pass, read } from './lib.js';

const server = await read('server.js');
const html = await read('index.html');
const forbidden = ['Online Oyunlar', 'Klasik Oyunlar', '/admin', '/market', '/Crash.html', '/Satranc.html', '/Pisti.html', 'admin.routes', 'crash.routes', 'classic.routes'];
const findings = [];
for (const item of forbidden) {
  if (server.includes(item)) findings.push(`server.js içinde yasak kapsam: ${item}`);
  if (html.includes(item)) findings.push(`index.html içinde yasak kapsam: ${item}`);
}
if (!server.includes('/healthz')) findings.push('server.js healthz route içermiyor.');
if (findings.length) fail('Homepage-only route kontrolü başarısız.', findings);
pass('Homepage-only route standardı doğru.');
