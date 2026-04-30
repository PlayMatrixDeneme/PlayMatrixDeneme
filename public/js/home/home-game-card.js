import { getResolvedHomeGames } from './home-route-resolver.js';

function hasCurrentUser() {
  try { return Boolean(window.__PM_RUNTIME?.auth?.currentUser); } catch (_) { return false; }
}

function text(tagName, className, value) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = String(value ?? '');
  return node;
}

function icon(className) {
  const node = document.createElement('i');
  node.className = `fa-solid ${className}`;
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function openAuthSheet(gameName = 'Oyun') {
  try { if (typeof window.setAuthMode === 'function') window.setAuthMode('login'); } catch (_) {}
  try {
    if (typeof window.openSheet === 'function') {
      window.openSheet('auth', 'Hesabına giriş yap', `${gameName} için önce hesabına giriş yapmalısın.`);
      return true;
    }
  } catch (_) {}
  document.getElementById('loginBtn')?.click?.();
  return true;
}

function startQuickMatch(game) {
  const quickMatch = game?.quickMatch;
  if (!quickMatch) return false;
  if (!hasCurrentUser()) {
    openAuthSheet(game.name);
    return false;
  }
  const starter = window.startMatchmaking;
  if (typeof starter !== 'function') return false;
  starter(quickMatch.gameType, quickMatch.payload || {});
  return true;
}

export function createHomeGameCard(game) {
  const userReady = hasCurrentUser();
  const card = document.createElement('article');
  card.className = ['game-card', 'fade-up', 'is-visible', game.accentClass || 'game-card--default'].filter(Boolean).join(' ');
  card.dataset.gameKey = game.key;
  card.dataset.gameCategory = game.category;
  card.dataset.gameAccess = game.access;
  card.dataset.gameRoute = game.canonicalRoute;
  card.dataset.gameName = game.name;
  card.dataset.requiresAuth = game.requiresAuth ? 'true' : 'false';
  card.dataset.freeGame = 'true';

  const top = document.createElement('div');
  top.className = 'game-top';

  const gameIcon = document.createElement('div');
  gameIcon.className = 'game-icon';
  gameIcon.appendChild(icon(game.icon));

  const tagStack = document.createElement('div');
  tagStack.className = 'tag-stack';
  const category = text('span', 'mini-tag', game.categoryLabel);
  if (game.category === 'online') category.prepend(text('span', 'live-dot', ''));
  tagStack.append(category, text('span', 'mini-tag', game.pricingLabel), text('span', 'mini-tag', game.accessLabel));
  top.append(gameIcon, tagStack);

  const body = document.createElement('div');
  body.className = 'game-body';
  body.append(text('h3', 'game-title', game.name), text('div', 'game-desc', game.description));
  const features = document.createElement('div');
  features.className = 'feature-list';
  game.tags.forEach((tag) => features.appendChild(text('span', 'feature-pill', tag)));
  body.appendChild(features);

  const footer = document.createElement('div');
  footer.className = 'game-footer';
  footer.appendChild(text('span', 'game-status', userReady ? game.statusUser : game.statusGuest));

  const cta = document.createElement('a');
  cta.className = ['game-cta', userReady ? 'is-primary' : ''].filter(Boolean).join(' ');
  cta.href = game.url;
  cta.dataset.gameRoute = game.canonicalRoute;
  cta.dataset.gameName = game.name;
  cta.dataset.requiresAuth = game.requiresAuth ? 'true' : 'false';
  cta.append(text('span', '', userReady ? game.ctaUser : game.ctaGuest));

  if (game.quickMatch) {
    const actionGroup = document.createElement('div');
    actionGroup.className = 'game-action-group';
    const quickButton = document.createElement('button');
    quickButton.className = 'game-cta game-quick-match-btn';
    quickButton.type = 'button';
    quickButton.dataset.quickMatchGame = game.quickMatch.gameType;
    quickButton.dataset.requiresAuth = 'true';
    quickButton.dataset.gameName = game.name;
    quickButton.textContent = game.quickMatch.label;
    quickButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      startQuickMatch(game);
    }, true);
    actionGroup.append(quickButton, cta);
    footer.appendChild(actionGroup);
  } else {
    footer.appendChild(cta);
  }

  card.append(top, body, footer);
  return card;
}

function getActiveFilter(root = document) {
  return root.querySelector?.('.filter-chip.is-active')?.dataset?.filter || 'all';
}

function getSearchTerm(root = document) {
  return String(root.getElementById?.('gameSearch')?.value || '').trim().toLowerCase();
}

function matchesGame(game, filter, term) {
  const filterOk = filter === 'all'
    || (filter === 'free' && game.pricingLabel === 'Ücretsiz')
    || (filter === 'auth' && game.requiresAuth)
    || game.category === filter;
  if (!filterOk) return false;
  if (!term) return true;
  const haystack = [game.name, game.categoryLabel, game.accessLabel, game.description, ...(game.tags || [])].join(' ').toLowerCase();
  return haystack.includes(term);
}

export function renderHomeGameShowcase(root = document) {
  const grid = root.getElementById?.('gamesGrid');
  if (!grid) return false;

  const games = getResolvedHomeGames();
  const filter = getActiveFilter(root);
  const term = getSearchTerm(root);
  const visibleGames = games.filter((game) => matchesGame(game, filter, term));
  const fragment = document.createDocumentFragment();
  visibleGames.forEach((game) => fragment.appendChild(createHomeGameCard(game)));

  grid.replaceChildren(fragment);
  grid.dataset.homeGamesRendered = '1';
  grid.classList.toggle('is-empty', visibleGames.length === 0);
  grid.setAttribute('aria-busy', 'false');

  const empty = root.getElementById?.('gamesEmpty');
  if (empty) empty.hidden = visibleGames.length > 0;
  const metric = root.getElementById?.('metricGamesCount');
  if (metric) metric.textContent = String(games.length);
  return true;
}

export function installHomeGameShowcase(root = document) {
  if (document.body?.dataset.homeGameShowcaseBound === '1') return true;
  if (document.body) document.body.dataset.homeGameShowcaseBound = '1';

  const render = () => renderHomeGameShowcase(root);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();

  root.getElementById?.('gameSearch')?.addEventListener('input', render, { passive: true });
  root.getElementById?.('filterRow')?.addEventListener('click', (event) => {
    const button = event.target?.closest?.('.filter-chip');
    if (!button) return;
    event.preventDefault();
    root.querySelectorAll?.('.filter-chip').forEach((chip) => chip.classList.toggle('is-active', chip === button));
    render();
  });

  window.__PM_HOME_GAME_SHOWCASE__ = Object.freeze({ render, createCard: createHomeGameCard });
  return true;
}
