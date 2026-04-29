import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { exists, fail, pass, read, rel, rootDir, walk } from './lib.js';

const checks = [];
function ok(name) { checks.push(`[OK] ${name}`); }

const required = [
  'package.json', 'server.js', '.env.example', 'public/index.html', 'public/style.css', 'public/script.js',
  'public/styles/00-tokens.css', 'public/styles/01-reset.css', 'public/styles/02-layout.css', 'public/styles/03-components.css', 'public/styles/04-home.css', 'public/styles/05-modals.css', 'public/styles/06-responsive.css',
  'public/scripts/app/boot-home.js', 'public/scripts/app/render-home.js', 'public/scripts/app/events.js', 'public/scripts/app/state.js', 'public/scripts/app/api-client.js', 'public/scripts/data/home-data.js',
  'public/scripts/components/modal.js', 'public/scripts/components/toast.js', 'public/scripts/core/dom.js', 'public/scripts/core/format.js', 'public/scripts/core/guards.js',
  'public/scripts/sections/hero.js', 'public/scripts/sections/metrics.js', 'public/scripts/sections/profile.js', 'public/scripts/sections/games.js', 'public/scripts/sections/leaderboard.js', 'public/scripts/sections/rewards.js', 'public/scripts/sections/support.js', 'public/scripts/sections/social.js',
  'public/assets/brand/playmatrix-mark.svg', 'public/assets/brand/favicon.svg', 'public/assets/avatars/default-avatar.svg', 'public/assets/ui/noise.svg'
];
const missing = [];
for (const file of required) if (!(await exists(file))) missing.push(file);
if (missing.length) fail('AnaSayfa dosya yapısı eksik.', missing);
ok('AnaSayfa dosya yapısı doğru.');

const html = await read('public/index.html');
const missingRefs = [];
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const value = match[1];
  if (value === '/' || value.startsWith('#') || value.startsWith('http')) continue;
  if (value.startsWith('/') && !(await exists(`public/${value.slice(1)}`))) missingRefs.push(`public/${value.slice(1)}`);
}
if (missingRefs.length) fail('HTML referanslarında eksik dosya var.', missingRefs);
ok('HTML CSS/JS/asset referansları geçerli.');

const files = (await walk()).map(rel).sort();
const assets = files.filter((file) => file.startsWith('public/assets/'));
const invalidAssets = assets.filter((file) => !/\.(svg|png|jpg|jpeg|webp|ico)$/i.test(file));
if (invalidAssets.length) fail('Desteklenmeyen asset bulundu.', invalidAssets);
ok(`Asset kontrolü başarılı. Toplam asset: ${assets.length}`);

const server = await read('server.js');
const forbiddenRoute = ['Online Oyunlar', 'Klasik Oyunlar', '/admin', '/market', '/Crash.html', '/Satranc.html', '/Pisti.html', 'admin.routes', 'crash.routes', 'classic.routes'];
const routeFindings = [];
for (const item of forbiddenRoute) {
  if (server.includes(item)) routeFindings.push(`server.js içinde yasak kapsam: ${item}`);
  if (html.includes(item)) routeFindings.push(`index.html içinde yasak kapsam: ${item}`);
}
if (!server.includes('/healthz')) routeFindings.push('server.js healthz route içermiyor.');
if (routeFindings.length) fail('Homepage-only route kontrolü başarısız.', routeFindings);
ok('Homepage-only route standardı doğru.');

const forbiddenScope = [/^Online Oyunlar\//, /^Klasik Oyunlar\//, /^routes\//, /^sockets\//, /^engines\//, /^crons\//, /^middlewares\//, /^utils\//, /^config\//, /^public\/admin\//, /^public\/js\/games\//, /^public\/css\/games\//, /^docs\/.*\.md$/, /phase4/i, /legacy/i];
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
  for (const match of text.matchAll(/import\s+(?:[^'\"]+\s+from\s+)?['\"](\.\.?\/[^'\"]+)['\"]/g)) {
    const target = normalize(join(rootDir, dirname(file), match[1]));
    const withJs = target.endsWith('.js') ? target : `${target}.js`;
    try { await stat(withJs); } catch { moduleFindings.push(`${file}: import çözümlenemedi ${match[1]}`); }
  }
}
if (moduleFindings.length) fail('JS module kontrolü başarısız.', moduleFindings);
ok(`JS module kontrolü başarılı. Dosya: ${files.filter((file) => file.endsWith('.js')).length}`);

const qualityFindings = [];
for (const file of files.filter((item) => /^(public\/|server\.js$)/.test(item) && /\.(js|css|html)$/i.test(item))) {
  const text = await readFile(join(rootDir, file), 'utf8');
  if (/TODO|FIXME|console\.log\(|debugger;/i.test(text) && file !== 'server.js') qualityFindings.push(`${file}: debug/todo kalıbı`);
  if (/onclick=|onchange=|oninput=/i.test(text)) qualityFindings.push(`${file}: inline event`);
  if (/style="/i.test(text)) qualityFindings.push(`${file}: inline style`);
}
if (qualityFindings.length) fail('Kod kalite kontrolü başarısız.', qualityFindings);
ok('Kod kalite kontrolü temiz.');

const report = {
  generatedAt: new Date().toISOString(),
  scope: 'homepage-only-rebuild',
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
  files: files.filter((file) => !file.startsWith('docs/reports/'))
};
await mkdir(`${rootDir}/docs/reports`, { recursive: true });
await writeFile(`${rootDir}/docs/reports/homepage-audit.json`, JSON.stringify(report, null, 2));
ok('Homepage audit raporu üretildi.');

for (const line of checks) console.log(line);
pass('verify:homepage tamamlandı.');
