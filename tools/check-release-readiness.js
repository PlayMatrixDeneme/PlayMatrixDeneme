#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const mode = args.has('--phase=0') || args.has('--phase0') ? 0
  : args.has('--phase=1') || args.has('--phase1') ? 1
    : args.has('--phase=2') || args.has('--phase2') ? 2
      : args.has('--phase=3') || args.has('--phase3') ? 3
        : args.has('--phase=4') || args.has('--phase4') ? 4
          : args.has('--phase=5') || args.has('--phase5') ? 5
            : args.has('--phase=6') || args.has('--phase6') ? 6
              : 99;

const failures = [];
let passed = 0;
let total = 0;

function relPath(rel) { return path.join(ROOT, rel); }
function read(rel) { return fs.readFileSync(relPath(rel), 'utf8'); }
function exists(rel) { return fs.existsSync(relPath(rel)); }
function check(label, fn) {
  total += 1;
  try {
    const result = fn();
    if (result === false) throw new Error('false');
    console.log(`[OK] ${label}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${label}`);
    console.error(`  ${error.message || error}`);
    failures.push(label);
  }
}
function mustExist(rel) { if (!exists(rel)) throw new Error(`${rel} bulunamadı.`); }
function mustContain(rel, needle) { if (!read(rel).includes(needle)) throw new Error(`${rel} içinde beklenen içerik yok: ${needle}`); }
function mustNotContain(rel, needle) { if (read(rel).includes(needle)) throw new Error(`${rel} içinde kaldırılması gereken içerik var: ${needle}`); }
function mustMatch(rel, regex, label = String(regex)) { if (!regex.test(read(rel))) throw new Error(`${rel} içinde beklenen pattern yok: ${label}`); }
function mustNotMatch(rel, regex, label = String(regex)) { if (regex.test(read(rel))) throw new Error(`${rel} içinde yasak pattern var: ${label}`); }
function syntaxCommonJs(rel) {
  const source = read(rel).replace(/^#!.*\n/, '\n');
  new vm.Script(source, { filename: rel });
}

console.log(`PlayMatrix release readiness (${mode === 0 ? 'phase0' : mode === 1 ? 'phase1' : mode === 2 ? 'phase2' : mode === 3 ? 'phase3' : mode === 4 ? 'phase4' : mode === 5 ? 'phase5' : mode === 6 ? 'phase6' : 'strict'})`);

console.log('\n## Faz 0 / Kilitleme ve kalite kapısı');
check('server syntax', () => syntaxCommonJs('server.js'));
check('env-contract tool', () => { mustExist('tools/check-env-contract.js'); mustContain('package.json', 'check:env-contract'); });
check('release-readiness tool', () => { mustExist('tools/check-release-readiness.js'); mustContain('package.json', 'check:phase0'); });
check('release manifest', () => { mustExist('release/release-manifest.json'); mustExist('release/change-manifest.json'); });
check('maintenance check tool', () => mustExist('tools/check-maintenance-route.js'));
check('security phase0 tool', () => mustExist('tools/check-security-baseline.js'));
check('firebase key contract tool', () => mustExist('tools/check-firebase-key-contract.js'));
check('env values', () => {
  mustContain('.env.example', 'NODE_ENV=production');
  mustContain('.env.example', 'PUBLIC_BASE_URL=https://playmatrix.com.tr');
  mustContain('.env.example', 'FIREBASE_PROJECT_ID=playmatrix-b7df9');
});
check('ui redesign phase0 contract', () => {
  mustExist('docs/ui-redesign-contract.md');
  mustExist('docs/css-ownership-map.md');
  mustExist('docs/js-module-map.md');
  mustExist('docs/regression-checklist.md');
  mustExist('docs/phase-acceptance.md');
  mustExist('tools/check-ui-redesign-phase0.js');
  mustContain('package.json', 'check:ui-redesign-phase0');
});


if (mode >= 1) {
  console.log('\n## Faz 1 / Deploy, ENV, domain, route ve maintenance');
  check('maintenance/index.html', () => { mustExist('maintenance/index.html'); if (exists('Bakim') || exists('Bakım')) throw new Error('Legacy bakım klasörü var.'); });
  check('maintenance canonical route', () => { mustContain('server.js', "MAINTENANCE_CANONICAL_PATH = '/maintenance'"); mustContain('server.js', 'MAINTENANCE_PUBLIC_PATH'); });
  check('health/readiness endpoints', () => { mustContain('server.js', "app.get('/healthz'"); mustContain('server.js', "app.get('/readyz'"); mustContain('server.js', "app.get('/api/readyz'"); });
  check('render host bind', () => { mustContain('config/constants.js', "const HOST = process.env.HOST || '0.0.0.0'"); mustContain('server.js', 'httpServer.listen(PORT, HOST'); });
  check('production allowed origins', () => { mustContain('.env.example', 'ALLOWED_ORIGINS=https://playmatrix.com.tr,https://www.playmatrix.com.tr'); mustNotContain('.env.example', 'playmatrixdeneme.github.io'); });
  check('base path runtime', () => { mustContain('.env.example', 'PUBLIC_BASE_PATH='); mustContain('utils/publicRuntime.js', 'basePath'); mustContain('public/playmatrix-static-runtime.js', 'window.__PM_RESOLVE_PATH__'); });
}

if (mode >= 2) {
  console.log('\n## Faz 2 / Güvenlik sertleştirme, auth, session, CSP ve admin gate');
  check('cookie-only session contract', () => { mustContain('utils/session.js', 'exposesRawTokenToClient: false'); mustContain('routes/auth.routes.js', 'buildCookieOnlySessionPayload'); mustNotMatch('routes/auth.routes.js', /sessionToken\s*:\s*session\.token|token\s*:\s*session\.token/); });
  check('legacy session header disabled', () => { mustContain('.env.example', 'LEGACY_SESSION_HEADER_ENABLED=0'); mustContain('middlewares/auth.middleware.js', 'LEGACY_SESSION_HEADER_ENABLED'); mustNotContain('utils/corsPolicy.js', 'x-session-token'); });
  check('throttled session touch', () => { mustContain('utils/activity.js', 'SESSION_TOUCH_THROTTLE_MS'); mustContain('middlewares/auth.middleware.js', 'touchSession: true'); });
  check('csp report-only', () => { mustContain('.env.example', 'SECURITY_CSP_REPORT_ONLY=1'); mustContain('server.js', "app.post('/api/security/csp-report'"); });
  check('admin matrix server-side gate', () => { mustContain('middlewares/admin.middleware.js', 'verifyAdminMatrixSessionGate'); mustContain('middlewares/admin.middleware.js', "sessionSource !== 'admin_matrix'"); mustContain('routes/auth.routes.js', "source: 'admin_matrix'"); mustContain('routes/auth.routes.js', '/auth/admin/matrix/session-handoff'); mustContain('routes/auth.routes.js', 'createAdminSessionHandoff'); mustContain('public/admin/matrix-auth.js', 'resolveAdminBackendUrl(out?.redirectTo'); });
  check('no admin client storage/header gate', () => {
    mustNotMatch('public/admin/matrix-core.js', /sessionStorage|localStorage|x-admin-client-key|pm_admin_matrix_key/);
    mustNotMatch('routes/auth.routes.js', /x-admin-client-key|issueClientGateKey|verifyClientGateKey|clientKeyMatches|ADMIN_CLIENT_KEY/);
    mustNotMatch('middlewares/admin.middleware.js', /x-admin-client-key|verifyClientGateKey|verifyAdminClientGate|ADMIN_CLIENT_KEY/);
    mustNotMatch('utils/adminMatrix.js', /issueClientGateKey|verifyClientGateKey|CLIENT_KEY_TTL_MS/);
    mustNotContain('utils/corsPolicy.js', 'X-Admin-Client-Key');
  });
  check('admin audit', () => { mustContain('middlewares/admin.middleware.js', 'auditAdminGuard'); mustContain('routes/auth.routes.js', 'auditAdminGate'); });
  check('external blank link rel', () => {
    const html = read('maintenance/index.html');
    const tags = html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];
    tags.forEach((tag) => { if (!/rel="noopener noreferrer"/.test(tag)) throw new Error(`rel eksik: ${tag}`); });
  });
}


if (mode >= 3) {
  console.log('\n## Faz 3 / Ekonomi, seviye, ödül, promosyon ve ledger bütünlüğü');
  check('phase3 economy tool', () => { mustExist('tools/check-economy-integrity.js'); mustContain('package.json', 'check:economy-phase3'); });
  check('promo duplicate guard', () => { mustContain('routes/profile.routes.js', 'promo_code:${code}:${req.user.uid}'); mustContain('routes/profile.routes.js', 'promoGuardRefs'); mustNotContain('routes/profile.routes.js', 'colPromoClaims().doc(`_`)'); });
  check('monthly reward state machine', () => { mustContain('crons/tasks.js', 'MONTHLY_REWARD_STATE'); mustContain('crons/tasks.js', "WINDOW_CLOSED: 'WINDOW_CLOSED'"); mustContain('crons/tasks.js', "WINDOW_OPEN: 'WINDOW_OPEN'"); mustContain('crons/tasks.js', "REWARD_GRANTED: 'REWARD_GRANTED'"); mustContain('crons/tasks.js', "RESET_DONE: 'RESET_DONE'"); });
  check('bigint exact progression contract', () => { mustContain('utils/progression.js', 'ACCOUNT_LEVEL_STEPS_EXACT'); mustContain('utils/progression.js', 'ACCOUNT_LEVEL_THRESHOLDS_EXACT'); mustContain('public/data/progression-policy.js', 'ACCOUNT_LEVEL_STEPS_EXACT'); });
  check('pisti XP transaction standard', () => { mustContain('routes/pisti.routes.js', "progressReward = applySpendProgression(tx, uRef, uSnap.data() || {}, bet, 'PISTI_ONLINE_BET')"); });
  check('economy phase3 smoke', () => syntaxCommonJs('tools/check-economy-integrity.js'));
}

if (mode >= 4) {
  console.log('\n## Faz 4 / Chat, DM, Sosyal Merkez, Arkadaşlık, Davet ve Socket Bütünlüğü');
  check('phase4 social integrity tool', () => { mustExist('tools/check-social-integrity.js'); mustContain('package.json', 'check:phase4-social'); syntaxCommonJs('tools/check-social-integrity.js'); });
  check('DM search revalidation layer', () => { mustContain('routes/chat.routes.js', 'const revalidatedItems = (await Promise.all'); mustContain('routes/chat.routes.js', "if (lifecycle.deleted || status === 'deleted' || !text) return;"); mustContain('routes/chat.routes.js', 'deleteDirectMessageSearchIndex({ chatId, messageId'); mustContain('routes/chat.routes.js', 'revalidated: true'); });
  check('chat retention cleanup report', () => { mustContain('crons/tasks.js', "collectionGroup('messages')"); mustContain('crons/tasks.js', 'deleteDirectMessageSearchIndex'); mustContain('crons/tasks.js', "colJobs().doc('chat_retention_cleanup')"); mustContain('crons/tasks.js', 'cron_chat_retention_cleanup_completed'); });
  check('invite idempotency and TTL', () => { mustContain('sockets/index.js', 'findPendingInviteBetweenUsers'); mustContain('sockets/index.js', "inviteConflict.kind === 'reuse'"); mustContain('sockets/index.js', "inviteConflict.kind === 'block'"); mustContain('sockets/index.js', 'safeNum(invite.expiresAt, 0) <= nowMs()'); });
  check('presence lifecycle heartbeat', () => { mustContain('sockets/index.js', "emitSocialEvent(io, [], SOCIAL_EVENT_TYPES.PRESENCE_UPDATED"); mustContain('sockets/index.js', 'userPresence[uid]?.disconnectTimer'); mustContain('sockets/index.js', 'reconnect: true'); mustContain('sockets/index.js', "socket.on('pm:pong'"); mustContain('sockets/index.js', "touchUserActivity(uid, { scope: 'socket_pong'"); });
  check('friend request duplicate guard', () => { mustContain('routes/social.routes.js', "if (existing.status === 'accepted')"); mustContain('routes/social.routes.js', "if (existing.requesterUid === uid && existing.status === 'pending')"); mustContain('routes/social.routes.js', 'SOCIAL_EVENT_TYPES.FRIEND_REQUEST_CREATED'); });
  check('central social state client modules', () => { mustExist('public/js/social/social-state.js'); mustExist('public/js/social/friends.js'); mustExist('public/js/social/invites.js'); mustExist('public/js/social/presence.js'); });
}

if (mode >= 5) {
  console.log('\n## Faz 5 / Ana Sayfa, Liderlik, İstatistikler, Hesabım, Modal ve Android Scroll');
  check('phase5 home integrity tool', () => { mustExist('tools/check-home-structure.js'); mustContain('package.json', 'check:phase5-home'); syntaxCommonJs('tools/check-home-structure.js'); });
  check('home modular architecture', () => {
    ['state.js', 'api.js', 'renderers.js', 'modals.js', 'mobile-scroll.js', 'account.js', 'matchmaking.js'].forEach((file) => mustExist(`public/js/home/${file}`));
    mustContain('public/js/home/app.js', 'installHomeStateBridge');
    mustContain('public/js/home/app.js', 'installSafeRenderGuards');
    mustContain('public/js/home/app.js', 'installHomeModalManager');
    mustContain('public/js/home/app.js', 'installMobileGesturePolicy');
    if (!read('public/js/home/app.js').includes('phase: 5') && !read('public/js/home/app.js').includes('phase: 6')) throw new Error('public/js/home/app.js phase marker 5/6 eksik');
  });
  check('safe DOM rendering', () => {
    mustNotMatch('public/js/home/stability-guard.js', /\.innerHTML\s*=/);
    mustNotMatch('public/js/home/stability-guard.js', /onerror\s*=/);
    mustNotMatch('public/js/home/dom-utils.js', /\.innerHTML\s*=/);
    mustNotContain('public/js/home/dom-utils.js', 'opts.html');
    mustContain('public/js/home/renderers.js', 'setSafeImage');
  });
  check('android modal scroll policy', () => {
    mustNotContain('public/js/home/legacy-home.runtime.js', 'style.touchAction = "manipulation"');
    mustContain('public/js/home/mobile-scroll.js', 'touchmove');
    mustContain('public/js/home/mobile-scroll.js', 'pm-modal-scroll-locked');
    mustContain('public/css/responsive.css', 'Faz 5 mobile gesture and modal scroll policy');
    mustContain('public/css/responsive.css', 'touch-action: pan-y');
  });
  check('account and matchmaking state', () => {
    mustContain('public/js/home/account.js', 'updateAccountProgress');
    mustContain('public/js/home/matchmaking.js', 'installMatchmakingStateModule');
    mustContain('public/js/home/state.js', 'homeState');
  });

  check('phase5 recheck hotfix tool', () => {
    mustExist('tools/check-home-recheck.js');
    mustContain('package.json', 'check:phase5-recheck');
    syntaxCommonJs('tools/check-home-recheck.js');
  });
  check('quick match and classic auth hotfix', () => {
    mustContain('utils/realtimeState.js', 'Firestore transaction contract: all reads must be completed before any write');
    mustContain('sockets/index.js', "if (safeGameType === 'pisti')");
    mustContain('sockets/index.js', 'startPistiMatchmakingRoom');
    mustContain('sockets/index.js', 'pisti_matchmaking_stake');
    mustContain('public/js/home/fast-home-paint.js', 'game-quick-match-btn');
    mustContain('public/js/home/game-catalog.js', 'PatternMaster|SpacePro|SnakePro');
    mustContain('server.js', 'sendGuardedGamePage');
  });
  check('social mobile full-height hotfix', () => {
    mustContain('public/css/social.css', 'Release recheck: mobile social center full-height fix');
    mustContain('public/css/social.css', 'height: 100dvh');
    mustContain('public/css/static-inline.css', 'Release recheck: stable quick-match button group');
  });
}

if (mode >= 6) {
  console.log('\n## Faz 6 / Avatar, frames, Market ve Görsel Kimlik Sistemi');
  check('phase6 avatar market tool', () => {
    mustExist('tools/check-avatar-market.js');
    mustContain('package.json', 'check:phase6-avatar-market');
    syntaxCommonJs('tools/check-avatar-market.js');
  });
  check('AvatarFrame shared contract', () => {
    mustContain('public/avatar-frame.js', 'function AvatarFrame(input = {})');
    mustContain('public/avatar-frame.js', 'normalizeAvatarFrameContract');
    mustContain('public/avatar-frame.js', 'mountAvatarFrame');
    mustContain('public/avatar-frame.css', 'FAZ 6 — AvatarFrame ortak görsel kontratı');
    mustContain('public/js/home/renderers.js', 'createAvatarFrameNode');
  });
  check('server-side avatar and frame validators', () => {
    mustContain('utils/avatarManifest.js', 'function validateAvatarUrl');
    mustContain('utils/accountState.js', 'assertSelectedFrameSelectable');
    mustContain('routes/profile.routes.js', 'validateAvatarUrl(avatar, { storage: true })');
    mustContain('routes/profile.routes.js', 'assertSelectedFrameSelectable(safeSelectedFrame, u)');
    mustContain('routes/admin.routes.js', 'validateAvatarUrl(patch.avatar, { storage: true })');
    mustContain('routes/admin.routes.js', 'assertSelectedFrameSelectable(safeSelectedFrame, mergedForFrame)');
  });
  check('market purchase transaction guard', () => {
    mustExist('routes/market.routes.js');
    mustContain('server.js', "const marketRoutes = require('./routes/market.routes')");
    mustContain('server.js', "app.use('/api', marketRoutes)");
    mustContain('routes/market.routes.js', "router.get('/market/items'");
    mustContain('routes/market.routes.js', "router.post('/market/purchase'");
    mustContain('routes/market.routes.js', 'Firestore transaction contract: all reads first');
    mustContain('routes/market.routes.js', 'tx.get(userRef)');
    mustContain('routes/market.routes.js', 'tx.get(purchaseRef)');
    mustContain('routes/market.routes.js', 'tx.set(purchaseRef');
    mustContain('routes/market.routes.js', 'tx.set(ledgerRef');
    mustContain('routes/market.routes.js', 'idempotencyKey');
  });
  check('market frontend and locked/passive UI', () => {
    mustExist('public/js/home/market.js');
    mustContain('public/js/home/app.js', 'installMarketStateModule');
    mustContain('public/js/home/market.js', 'data-market-purchase');
    mustContain('public/js/profile/frame-picker.js', 'card.disabled = isLocked');
    mustContain('public/avatar-frame.css', 'data-frame-locked="true"');
  });
}

console.log(`\nÖzet: ${passed}/${total} kontrol geçti.`);
if (failures.length) {
  console.error('Zorunlu kalite kapısı başarısız.');
  process.exit(1);
}
console.log('check:release-readiness OK');
process.exit(0);
