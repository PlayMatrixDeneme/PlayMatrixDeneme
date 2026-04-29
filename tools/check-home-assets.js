import { fail, pass, rel, walk } from './lib.js';

const files = (await walk()).map(rel);
const assets = files.filter((file) => file.startsWith('public/assets/'));
const invalid = assets.filter((file) => !/\.(svg|png|jpg|jpeg|webp|ico)$/i.test(file));
if (invalid.length) fail('Desteklenmeyen asset bulundu.', invalid);
pass(`Asset kontrolü başarılı. Toplam asset: ${assets.length}`);
