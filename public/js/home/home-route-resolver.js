import { resolveHomePath, detectHomeBasePath } from './home-config.js';
import { HOME_GAME_CATALOG, HOME_GAME_ROUTE_ALIASES } from './home-games.data.js';

const PROTECTED_ROUTE_SET = new Set(HOME_GAME_CATALOG.filter((game) => game.requiresAuth).map((game) => game.route));
const CANONICAL_ROUTE_SET = new Set(HOME_GAME_CATALOG.map((game) => game.route));

function safeDecode(value = '') {
  try { return decodeURIComponent(value); } catch (_) { return value; }
}

function stripOrigin(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    return `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
  } catch (_) {
    return raw;
  }
}

export function normalizeRouteKey(value = '') {
  const withoutOrigin = stripOrigin(value);
  const withoutHash = withoutOrigin.split('#')[0].split('?')[0];
  const decoded = safeDecode(withoutHash)
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/+$/g, '') || '/';
  const basePath = detectHomeBasePath();
  const withoutBase = basePath && decoded.toLowerCase().startsWith(basePath.toLowerCase() + '/')
    ? decoded.slice(basePath.length)
    : decoded;
  return withoutBase.toLowerCase();
}

export function canonicalizeHomeGameRoute(value = '') {
  const key = normalizeRouteKey(value);
  if (!key || key === '/') return '';
  if (CANONICAL_ROUTE_SET.has(key)) return key;
  return HOME_GAME_ROUTE_ALIASES[key] || HOME_GAME_ROUTE_ALIASES[key.replace(/\.html$/i, '')] || '';
}

export function resolveHomeRoutePath(value = '') {
  const canonical = canonicalizeHomeGameRoute(value) || String(value || '').trim();
  return resolveHomePath(canonical);
}

export function getHomeGameByRoute(value = '') {
  const canonical = canonicalizeHomeGameRoute(value);
  if (!canonical) return null;
  return HOME_GAME_CATALOG.find((game) => game.route === canonical) || null;
}

export function getResolvedHomeGames() {
  return HOME_GAME_CATALOG.map((game) => ({
    ...game,
    tags: [...game.tags],
    url: resolveHomeRoutePath(game.route),
    canonicalRoute: game.route
  }));
}

export function isProtectedHomeGameRoute(value = '') {
  const canonical = canonicalizeHomeGameRoute(value);
  return Boolean(canonical && PROTECTED_ROUTE_SET.has(canonical));
}

function hasCurrentUser() {
  try { return Boolean(window.__PM_RUNTIME?.auth?.currentUser); } catch (_) { return false; }
}

function openAuthSheet(gameName = 'Oyun') {
  try { if (typeof window.setAuthMode === 'function') window.setAuthMode('login'); } catch (_) {}
  try {
    if (typeof window.openSheet === 'function') {
      window.openSheet('auth', 'Hesabına giriş yap', `${gameName} için önce hesabına giriş yapmalısın.`);
      return true;
    }
  } catch (_) {}
  const loginButton = document.getElementById('loginBtn');
  if (loginButton && typeof loginButton.click === 'function') {
    loginButton.click();
    return true;
  }
  return false;
}

function normalizeAnchor(anchor) {
  if (!anchor || anchor.dataset.pmGameRouteNormalized === '1') return false;
  const href = anchor.getAttribute('href') || '';
  if (!href) return false;
  const canonical = canonicalizeHomeGameRoute(href);
  if (!canonical) return false;
  anchor.dataset.pmCanonicalRoute = canonical;
  anchor.setAttribute('href', resolveHomeRoutePath(canonical));
  anchor.dataset.pmGameRouteNormalized = '1';
  return true;
}

function normalizeRouteDataset(node) {
  if (!node?.dataset) return false;
  const rawRoute = node.dataset.gameRoute || node.dataset.gameUrl || node.dataset.href || '';
  const canonical = canonicalizeHomeGameRoute(rawRoute);
  if (!canonical) return false;
  node.dataset.pmCanonicalRoute = canonical;
  node.dataset.gameRoute = canonical;
  node.dataset.gameUrl = resolveHomeRoutePath(canonical);
  if (node.dataset.href) node.dataset.href = resolveHomeRoutePath(canonical);
  return true;
}

export function normalizeHomeGameLinks(root = document) {
  let changed = 0;
  root.querySelectorAll?.('a[href], [data-game-route], [data-game-url], [data-href]').forEach((node) => {
    if (node.matches?.('a[href]') && normalizeAnchor(node)) changed += 1;
    if (normalizeRouteDataset(node)) changed += 1;
  });
  return changed;
}

export function installGameRouteNormalizer(root = document) {
  if (window.__PM_HOME_GAME_ROUTE_RESOLVER__?.installed) return window.__PM_HOME_GAME_ROUTE_RESOLVER__;
  const api = Object.freeze({
    installed: true,
    resolve: resolveHomeRoutePath,
    canonicalize: canonicalizeHomeGameRoute,
    normalize: normalizeHomeGameLinks,
    getGameByRoute: getHomeGameByRoute,
    getGames: getResolvedHomeGames,
    isProtected: isProtectedHomeGameRoute
  });
  window.__PM_HOME_GAME_ROUTE_RESOLVER__ = api;

  const run = () => normalizeHomeGameLinks(root);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  document.addEventListener('click', (event) => {
    const trigger = event.target?.closest?.('a[href], [data-game-route], [data-game-url], [data-requires-auth="true"]');
    if (!trigger) return;

    if (trigger.matches?.('a[href]')) normalizeAnchor(trigger);
    else normalizeRouteDataset(trigger);

    const href = trigger.getAttribute?.('href') || trigger.dataset?.gameRoute || trigger.dataset?.gameUrl || trigger.dataset?.href || '';
    const game = getHomeGameByRoute(href || trigger.dataset?.pmCanonicalRoute || '');
    const requiresAuth = trigger.dataset?.requiresAuth === 'true' || isProtectedHomeGameRoute(href);
    if (!requiresAuth || hasCurrentUser()) return;

    event.preventDefault();
    event.stopPropagation();
    openAuthSheet(trigger.dataset?.gameName || game?.name || 'Oyun');
  }, true);

  return api;
}
