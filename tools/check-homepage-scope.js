import { fail, pass, rel, walk } from './lib.js';

const files = (await walk()).map(rel);
const forbidden = [
  /^Online Oyunlar\//,
  /^Klasik Oyunlar\//,
  /^routes\//,
  /^sockets\//,
  /^engines\//,
  /^crons\//,
  /^middlewares\//,
  /^utils\//,
  /^config\//,
  /^public\//,
  /^admin\//,
  /^market\//,
  /^docs\/.*\.md$/,
  /phase4/i,
  /legacy/i
];
const findings = files.filter((file) => forbidden.some((pattern) => pattern.test(file)));
if (findings.length) fail('AnaSayfa-only kapsam dışında dosya bulundu.', findings);
pass('AnaSayfa-only kapsam temiz.');
