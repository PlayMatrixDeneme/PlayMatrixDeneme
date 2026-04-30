import { resolveHomePath } from './home-config.js';
import { normalizeHomeGameLinks, resolveHomeRoutePath } from './home-route-resolver.js';

const ROUTE_SELECTOR = [
  'a[href^="/online-games/"]',
  'a[href^="/classic-games/"]',
  'a[href^="/frames/"]',
  'a[href^="/assets/"]',
  '[data-game-url]',
  '[data-game-route]',
  '[data-href]'
].join(',');

function resolveRoute(value = '') {
  return resolveHomeRoutePath(value) || resolveHomePath(value);
}

function normalizeAnchor(anchor) {
  if (!anchor || anchor.dataset.pmRouteNormalized === '1') return false;
  const href = anchor.getAttribute('href');
  if (!href) return false;
  const resolved = resolveRoute(href);
  if (resolved && resolved !== href) anchor.setAttribute('href', resolved);
  anchor.dataset.pmRouteNormalized = '1';
  return true;
}

function normalizeDataRoute(node, key) {
  const value = node?.dataset?.[key];
  if (!value) return false;
  const resolved = resolveRoute(value);
  if (resolved && resolved !== value) node.dataset[key] = resolved;
  return true;
}

export function normalizeHomeRoutes(root = document) {
  let changed = normalizeHomeGameLinks(root);
  root.querySelectorAll?.(ROUTE_SELECTOR).forEach((node) => {
    if (node.matches?.('a[href]') && normalizeAnchor(node)) changed += 1;
    if (normalizeDataRoute(node, 'gameUrl')) changed += 1;
    if (normalizeDataRoute(node, 'gameRoute')) changed += 1;
    if (normalizeDataRoute(node, 'href')) changed += 1;
  });
  return changed;
}

export function installHomeRouteResolver(root = document) {
  if (window.__PM_HOME_ROUTE_RESOLVER__?.installed) return window.__PM_HOME_ROUTE_RESOLVER__;
  const api = Object.freeze({
    installed: true,
    resolvePath: resolveHomePath,
    resolveRoute,
    normalize: normalizeHomeRoutes
  });
  window.__PM_HOME_ROUTE_RESOLVER__ = api;

  const run = () => normalizeHomeRoutes(root);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  document.addEventListener('click', (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (anchor) normalizeAnchor(anchor);
  }, true);

  return api;
}
