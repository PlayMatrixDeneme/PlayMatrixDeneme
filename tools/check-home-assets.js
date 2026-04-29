import { exists, fail, pass, walk, rel } from './lib.js';

const files = (await walk()).map(rel);
const publicAssets = files.filter((file) => file.startsWith('public/assets/'));
const required = [
  'public/assets/brand/playmatrix-mark.svg',
  'public/assets/brand/favicon.svg',
  'public/assets/avatars/default-avatar.svg',
  'public/assets/ui/noise.svg'
];

const missing = [];
for (const file of required) {
  if (!(await exists(file))) missing.push(file);
}

const unsupported = publicAssets.filter((file) => !/\.(svg|png|jpg|jpeg|webp|ico)$/i.test(file));
if (missing.length || unsupported.length) {
  fail('Asset kontrolü başarısız.', [
    ...missing.map((file) => `Eksik: ${file}`),
    ...unsupported.map((file) => `Desteklenmeyen asset: ${file}`)
  ]);
}

pass(`Asset kontrolü başarılı. Toplam asset: ${publicAssets.length}`);
