#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: !!ok, detail }); }
function has(file, needle) { return read(file).includes(needle); }

const index = read('index.html');
const authSection = index.slice(index.indexOf('data-auth-flow="phase4"'), index.indexOf('data-auth-flow="phase4-forgot"'));
const forgotSection = index.slice(index.indexOf('data-auth-flow="phase4-forgot"'), index.indexOf('data-sheet="profile"'));

add('auth phase4 section exists', index.includes('data-auth-flow="phase4"'));
add('forgot phase4 section exists', index.includes('data-auth-flow="phase4-forgot"'));
add('login identifier view exists', index.includes('data-auth-view="login-identifier"'));
add('login password view exists', index.includes('data-auth-view="login-password"'));
add('register identity view exists', index.includes('data-auth-view="register-identity"'));
add('register security view exists', index.includes('data-auth-view="register-security"'));
add('register confirm view exists', index.includes('data-auth-view="register-confirm"'));
add('remember checkbox exists', index.includes('id="authRemember"'));
add('password toggle exists', index.includes('id="authPasswordToggle"'));
add('register password toggle exists', index.includes('id="authRegisterPasswordToggle"'));
add('forgot uses email reset label', index.includes('Şifre Sıfırlama Gönder'));
add('forgot section has no GSM term', !/GSM/i.test(forgotSection));
add('auth section keeps legacy submit id', index.includes('id="authSubmitBtn"'));
add('auth section keeps legacy hidden bridge', index.includes('id="authSegment"'));

const profileCss = read('public/css/profile.css');
add('profile css has auth flow styles', profileCss.includes('FAZ 4 — Auth flow redesign'));
add('profile css has field shell', profileCss.includes('.field-shell'));
add('profile css has auth account card', profileCss.includes('.auth-account-card'));
add('profile css has reduced mobile auth rule', profileCss.includes('@media (max-width: 520px)'));

const componentsCss = read('public/css/components.css');
add('components css has disabled state', componentsCss.includes('FAZ 4 — shared form/button interaction states'));
add('components css has busy state', componentsCss.includes('[data-busy="1"]'));

const authJs = read('public/js/home/auth-modal.js');
add('auth js exports installer', authJs.includes('export function installAuthModalGuards'));
add('auth js resolves identifier', authJs.includes('async function resolveIdentifier'));
add('auth js uses resolve-login', authJs.includes('/api/auth/resolve-login'));
add('auth js manages login password step', authJs.includes("state.loginStep = 'password'"));
add('auth js manages register confirm step', authJs.includes("state.registerStep = 'confirm'"));
add('auth js intercepts submit capture', authJs.includes('handleSubmitCapture'));
add('auth js password toggle accessible', authJs.includes('aria-pressed'));
add('auth js remember state stored', authJs.includes('pm_auth_remember'));

const apiJs = read('public/js/home/api.js');
add('homeFetch stringifies object body', apiJs.includes('JSON.stringify(normalizedOptions.body)'));

const authRoutes = read('routes/auth.routes.js');
add('auth route has maskPublicEmail', authRoutes.includes('function maskPublicEmail'));
add('resolve-login returns maskedEmail', authRoutes.includes('maskedEmail: maskPublicEmail'));
add('resolve-login returns method username', authRoutes.includes("method: 'username'"));

add('auth phase doc exists', fs.existsSync(path.join(root, 'docs/auth-phase4.md')));
add('phase acceptance updated', has('docs/phase-acceptance.md', 'FAZ 4 — Auth Akışı Kabul Kriterleri'));
add('css ownership updated', has('docs/css-ownership-map.md', 'FAZ 4 Auth Ownership'));
add('js ownership updated', has('docs/js-module-map.md', 'FAZ 4 Auth Ownership'));

const pkg = JSON.parse(read('package.json'));
add('package has phase4 check', pkg.scripts && pkg.scripts['check:ui-redesign-phase4']);
add('package has phase4 redesign chain', pkg.scripts && pkg.scripts['check:phase4-redesign']);

let failed = 0;
for (const check of checks) {
  if (check.ok) console.log(`✅ ${check.name}`);
  else { failed += 1; console.error(`❌ ${check.name}${check.detail ? ` — ${check.detail}` : ''}`); }
}
console.log(`\nFAZ 4 quality gate: ${checks.length - failed}/${checks.length} başarılı`);
if (failed) process.exit(1);
