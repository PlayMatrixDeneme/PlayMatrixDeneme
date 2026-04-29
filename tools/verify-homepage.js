import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { exists, fail, pass, read, rel, rootDir, walk } from './lib.js';

const checks = [];
function ok(name) { checks.push(`[OK] ${name}`); }

const required = [
  'package.json', 'server.js', '.env.example', '.nojekyll', 'index.html', '404.html', 'style.css', 'script.js',
  'styles/00-tokens.css', 'styles/01-reset.css', 'styles/02-layout.css', 'styles/03-components.css', 'styles/04-home.css', 'styles/05-modals.css', 'styles/06-responsive.css',
  'scripts/app/boot-home.js', 'scripts/app/render-home.js', 'scripts/app/events.js', 'scripts/app/state.js', 'scripts/app/api-client.js', 'scripts/data/home-data.js',
  'scripts/components/modal.js', 'scripts/components/toast.js', 'scripts/core/dom.js', 'scripts/core/format.js', 'scripts/core/guards.js',
  'scripts/sections/hero.js', 'scripts/sections/metrics.js', 'scripts/sections/profile.js', 'scripts/sections/games.js', 'scripts/sections/leaderboard.js', 'scripts/sections/rewards.js', 'scripts/sections/support.js', 'scripts/sections/social.js',
  'assets/brand/playmatrix-mark.svg', 'assets/brand/favicon.svg', 'assets/avatars/default-avatar.svg', 'assets/ui/noise.svg'
];
const missing = [];
for (const file of required) if (!(await exists(file))) missing.push(file);
if (missing.length) fail('GitHub Pages AnaSayfa dosya yapısı eksik.', missing);
ok('GitHub Pages AnaSayfa dosya yapısı doğru.');

const htmlFiles = ['index.html', '404.html'];
const missingRefs = [];
const absoluteRefs = [];
for (const htmlFile of htmlFiles) {
  const html = await read(htmlFile);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (value.startsWith('#') || value.startsWith('http') || value.startsWith('mailto:') || value.startsWith('tel:')) continue;
    if (value.startsWith('/')) {
      absoluteRefs.push(`${htmlFile}: ${value}`);
      continue;
    }
    const clean = value.split('#')[0].split('?')[0];
    if (!clean || clean === '.') continue;
    const target = normalize(join(dirname(htmlFile), clean)).replaceAll('\\', '/');
    if (!(await exists(target))) missingRefs.push(`${htmlFile}: ${value} -> ${target}`);
  }
}
if (absoluteRefs.length) fail('GitHub Pages subpath uyumsuz absolute referans var.', absoluteRefs);
if (missingRefs.length) fail('HTML referanslarında eksik dosya var.', missingRefs);
ok('HTML CSS/JS/asset referansları GitHub Pages uyumlu.');

const files = (await walk()).map(rel).sort();
const assets = files.filter((file) => file.startsWith('assets/'));
const invalidAssets = assets.filter((file) => !/\.(svg|png|jpg|jpeg|webp|ico)$/i.test(file));
if (invalidAssets.length) fail('Desteklenmeyen asset bulundu.', invalidAssets);
ok(`Asset kontrolü başarılı. Toplam asset: ${assets.length}`);

const server = await read('server.js');
const html = await read('index.html');
const forbiddenRoute = ['Online Oyunlar', 'Klasik Oyunlar', '/admin', '/market', '/Crash.html', '/Satranc.html', '/Pisti.html', 'admin.routes', 'crash.routes', 'classic.routes'];
const routeFindings = [];
for (const item of forbiddenRoute) {
  if (server.includes(item)) routeFindings.push(`server.js içinde yasak kapsam: ${item}`);
  if (html.includes(item)) routeFindings.push(`index.html içinde yasak kapsam: ${item}`);
}
if (!server.includes('/healthz')) routeFindings.push('server.js healthz route içermiyor.');
if (routeFindings.length) fail('Homepage-only route kontrolü başarısız.', routeFindings);
ok('Homepage-only route standardı doğru.');

const forbiddenScope = [/^Online Oyunlar\//, /^Klasik Oyunlar\//, /^routes\//, /^sockets\//, /^engines\//, /^crons\//, /^middlewares\//, /^utils\//, /^config\//, /^public\//, /^docs\/.*\.md$/, /phase4/i, /legacy/i];
const scopeFindings = files.filter((file) => forbiddenScope.some((pattern) => pattern.test(file)));
if (scopeFindings.length) fail('AnaSayfa-only kapsam dışında dosya bulundu.', scopeFindings);
ok('AnaSayfa-only kapsam temiz.');

const secretPatterns = [/BEGIN PRIVATE KEY/, /firebase-adminsdk/i, /private_key"\s*:/i, /ADMIN_PANEL_SECOND_FACTOR_HASH_HEX=d5001fe108b606073a4ec8a717d467d0079c887fd74f616e76daa9434d662178/, /ADMIN_PANEL_SECOND_FACTOR_SALT_HEX=706c61796d61747269782d61646d696e2d676174652d7631/, /PRIMARY_ADMIN_UID=wsvzAqg0oePzCjo4cr5QHMJW0163/, /ADMIN_UIDS=wsvzAqg0oePzCjo4cr5QHMJW0163/];
const secretFindings = [];
for (const file of files) {
  if (file === '.env.example' || file === 'tools/check-secrets.js' || file === 'tools/verify-homepage.js' || !/\.(js|css|html|json|md|env|example|svg|txt)$/i.test(file)) continue;
  const text = await readFile(join(rootDir, file), 'utf8');
  for (const pattern of secretPatterns) if (pattern.test(text)) secretFindings.push(`${file}: ${pattern}`);
}
if (secretFindings.length) fail('Secret sızıntısı tespit edildi.', secretFindings);
ok('Secret kontrolü temiz.');

const moduleFindings = [];
for (const file of files.filter((item) => item.endsWith('.js'))) {
  const text = await readFile(join(rootDir, file), 'utf8');
  for (const match of text.matchAll(/import\s+(?:[^'\"]+\s+from\s+)?['\"](\.?\.?\/[^'\"]+)['\"]/g)) {
    const target = normalize(join(rootDir, dirname(file), match[1]));
    const withJs = target.endsWith('.js') ? target : `${target}.js`;
    try { await stat(withJs); } catch { moduleFindings.push(`${file}: import çözümlenemedi ${match[1]}`); }
  }
}
if (moduleFindings.length) fail('JS module kontrolü başarısız.', moduleFindings);
ok(`JS module kontrolü başarılı. Dosya: ${files.filter((file) => file.endsWith('.js')).length}`);

const qualityFindings = [];
for (const file of files.filter((item) => /^(scripts\/|styles\/|index\.html$|404\.html$|script\.js$|style\.css$|server\.js$)/.test(item) && /\.(js|css|html)$/i.test(item))) {
  const text = await readFile(join(rootDir, file), 'utf8');
  if (/TODO|FIXME|console\.log\(|debugger;/i.test(text) && file !== 'server.js') qualityFindings.push(`${file}: debug/todo kalıbı`);
  if (/onclick=|onchange=|oninput=/i.test(text)) qualityFindings.push(`${file}: inline event`);
  if (/style="/i.test(text)) qualityFindings.push(`${file}: inline style`);
}
if (qualityFindings.length) fail('Kod kalite kontrolü başarısız.', qualityFindings);
ok('Kod kalite kontrolü temiz.');

const report = {
  generatedAt: new Date().toISOString(),
  scope: 'homepage-only-github-pages',
  deployTarget: 'https://playmatrixdeneme.github.io/PlayMatrixDeneme/',
  totals: {
    files: files.filter((file) => !file.startsWith('docs/reports/')).length,
    html: files.filter((file) => extname(file) === '.html').length,
    css: files.filter((file) => extname(file) === '.css').length,
    js: files.filter((file) => extname(file) === '.js').length,
    assets: assets.length,
    tools: files.filter((file) => file.startsWith('tools/')).length,
    md: files.filter((file) => extname(file) === '.md').length
  },
  homepageAreas: ['topbar', 'account', 'leaderboard', 'stats', 'games-showcase-disabled', 'wheel', 'promo', 'support', 'invite', 'social-center'],
  removedScopes: ['online-games-runtime', 'classic-games-runtime', 'admin-panel', 'market', 'old-md-docs', 'legacy-phase-scripts'],
  githubPagesRules: ['root-index-html', 'relative-css-js-assets', 'no-public-folder-dependency', 'no-absolute-root-assets', 'nojekyll-enabled'],
  files: files.filter((file) => !file.startsWith('docs/reports/'))
};
await mkdir(`${rootDir}/docs/reports`, { recursive: true });
await writeFile(`${rootDir}/docs/reports/homepage-audit.json`, JSON.stringify(report, null, 2));
ok('Homepage audit raporu üretildi.');

for (const line of checks) console.log(line);
console.log("[OK] verify:homepage tamamlandı.");
setImmediate(() => process.exit(0));
