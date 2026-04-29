import { mkdir, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { rel, rootDir, walk } from './lib.js';

const files = (await walk()).map(rel).filter((file) => !file.startsWith('docs/reports/')).sort();
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'homepage-only-design-skeleton',
  totals: {
    files: files.length,
    html: files.filter((file) => extname(file) === '.html').length,
    css: files.filter((file) => extname(file) === '.css').length,
    js: files.filter((file) => extname(file) === '.js').length,
    assets: files.filter((file) => file.startsWith('public/assets/')).length,
    docs: files.filter((file) => file.startsWith('docs/')).length,
    tools: files.filter((file) => file.startsWith('tools/')).length
  },
  files
};

await mkdir(`${rootDir}/docs/reports`, { recursive: true });
await writeFile(`${rootDir}/docs/reports/homepage-audit.json`, JSON.stringify(report, null, 2));
await writeFile(`${rootDir}/docs/reports/HOMEPAGE_AUDIT.md`, `# Homepage Audit\n\nGenerated: ${report.generatedAt}\n\n| Metric | Count |\n|---|---:|\n${Object.entries(report.totals).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}\n`);
console.log('[OK] Homepage audit raporu üretildi.');

process.exit(0);
