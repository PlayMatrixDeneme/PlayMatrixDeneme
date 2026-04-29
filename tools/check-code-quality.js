import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fail, pass, rel, rootDir, walk } from './lib.js';

const files = (await walk())
  .map(rel)
  .filter((file) => /^(scripts\/|styles\/|index\.html$|404\.html$|script\.js$|style\.css$|server\.js$)/.test(file) && /\.(js|css|html)$/i.test(file));
const findings = [];
for (const file of files) {
  const text = await readFile(join(rootDir, file), 'utf8');
  if (/TODO|FIXME|console\.log\(|debugger;/i.test(text) && file !== 'server.js') findings.push(`${file}: debug/todo kalıbı`);
  if (/onclick=|onchange=|oninput=/i.test(text)) findings.push(`${file}: inline event`);
  if (/style="/i.test(text)) findings.push(`${file}: inline style`);
}
if (findings.length) fail('Kod kalite kontrolü başarısız.', findings);
pass('Kod kalite kontrolü temiz.');
