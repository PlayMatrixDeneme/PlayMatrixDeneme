import { spawnSync } from 'node:child_process';

const steps = [
  ['check:structure', ['tools/check-home-structure.js']],
  ['check:html', ['tools/check-html-references.js']],
  ['check:assets', ['tools/check-home-assets.js']],
  ['check:routes', ['tools/check-home-routes.js']],
  ['check:secrets', ['tools/check-secrets.js']],
  ['check:modules', ['tools/check-module-syntax.js']],
  ['audit:homepage', ['tools/audit-homepage.js']]
];

for (const [name, args] of steps) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', timeout: 10000 });
  if (result.error) {
    console.error(`[FAIL] ${name}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[FAIL] ${name}`);
    process.exit(result.status || 1);
  }
}

console.log('[OK] verify:homepage tamamlandı.');

process.exit(0);
