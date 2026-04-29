import { spawnSync } from 'node:child_process';
import { walk, rel, fail, pass } from './lib.js';

const files = (await walk()).map(rel).filter((file) => file.endsWith('.js'));
const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file}\n${result.stderr || result.stdout}`);
}

if (failures.length) fail('JS syntax kontrolü başarısız.', failures);
pass(`JS syntax kontrolü başarılı. Dosya: ${files.length}`);
