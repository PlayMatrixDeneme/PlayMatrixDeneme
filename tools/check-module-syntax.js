import { dirname, join, normalize } from 'node:path';
import { stat } from 'node:fs/promises';
import { fail, pass, read, rel, rootDir, walk } from './lib.js';

const files = (await walk()).map(rel).filter((file) => file.endsWith('.js'));
const findings = [];
for (const file of files) {
  const text = await read(file);
  for (const match of text.matchAll(/import\s+(?:[^'\"]+\s+from\s+)?['\"](\.\.?\/[^'\"]+)['\"]/g)) {
    const target = normalize(join(rootDir, dirname(file), match[1]));
    const withJs = target.endsWith('.js') ? target : `${target}.js`;
    try { await stat(withJs); } catch { findings.push(`${file}: import çözümlenemedi ${match[1]}`); }
  }
}
if (findings.length) fail('JS module kontrolü başarısız.', findings);
pass(`JS module kontrolü başarılı. Dosya: ${files.length}`);
