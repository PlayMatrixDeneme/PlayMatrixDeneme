import { mkdir, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { rel, rootDir, walk } from './lib.js';

const files = (await walk()).map(rel).filter((file) => !file.startsWith('docs/reports/')).sort();
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'homepage-only-github-pages',
  deployTarget: 'https://playmatrixdeneme.github.io/PlayMatrixDeneme/',
  totals: {
    files: files.length,
    html: files.filter((file) => extname(file) === '.html').length,
    css: files.filter((file) => extname(file) === '.css').length,
    js: files.filter((file) => extname(file) === '.js').length,
    assets: files.filter((file) => file.startsWith('assets/')).length,
    tools: files.filter((file) => file.startsWith('tools/')).length,
    md: files.filter((file) => extname(file) === '.md').length
  },
  homepageAreas: ['topbar', 'account', 'leaderboard', 'stats', 'games-showcase-disabled', 'wheel', 'promo', 'support', 'invite', 'social-center'],
  removedScopes: ['online-games-runtime', 'classic-games-runtime', 'admin-panel', 'market', 'old-md-docs', 'legacy-phase-scripts'],
  githubPagesRules: ['root-index-html', 'relative-css-js-assets', 'no-public-folder-dependency', 'no-absolute-root-assets', 'nojekyll-enabled'],
  files
};
await mkdir(`${rootDir}/docs/reports`, { recursive: true });
await writeFile(`${rootDir}/docs/reports/homepage-audit.json`, JSON.stringify(report, null, 2));
console.log('[OK] Homepage audit raporu üretildi.');
process.exit(0);
