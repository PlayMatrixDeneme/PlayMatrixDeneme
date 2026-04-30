import { createEl, replaceChildrenSafe, safeText, setSafeImage } from './dom-utils.js';

export function renderEmptyState(target, text, className = 'pm-empty-state') {
  return replaceChildrenSafe(target, [createEl('div', { className, text })]);
}

export function renderMetricValue(target, value, formatter = (v) => v) {
  if (!target) return null;
  target.textContent = safeText(formatter(value), '0');
  return target;
}

export function createAvatarNode({ src = '', alt = 'Oyuncu avatarı', className = 'pm-avatar-img' } = {}) {
  const img = document.createElement('img');
  img.className = className;
  img.alt = safeText(alt, 'Oyuncu avatarı');
  img.loading = 'lazy';
  img.decoding = 'async';
  setSafeImage(img, src);
  return img;
}


export function createAvatarFrameNode({
  avatarUrl = '',
  frameId = 0,
  size = 56,
  level = 1,
  locked = false,
  interactive = false,
  extraClass = '',
  alt = 'Oyuncu avatarı'
} = {}) {
  if (window.PMAvatar?.AvatarFrame) {
    return window.PMAvatar.AvatarFrame({ avatarUrl, frameId, size, level, locked, interactive, extraClass, alt });
  }
  const shell = document.createElement('span');
  shell.className = ['pm-avatar-frame-contract', extraClass, locked ? 'is-locked' : '', interactive ? 'is-interactive' : ''].filter(Boolean).join(' ');
  shell.dataset.pmAvatarFrameContract = 'v1';
  shell.dataset.frameId = String(frameId || 0);
  shell.dataset.frameLocked = locked ? 'true' : 'false';
  shell.dataset.interactive = interactive ? 'true' : 'false';
  shell.appendChild(createAvatarNode({ src: avatarUrl, alt, className: 'pm-avatar-img' }));
  return shell;
}


export function createHomeGameCard(game = {}) {
  const key = safeText(game.key || game.name || 'game', 'game').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const access = game.access === 'free' ? 'Ücretsiz' : 'Giriş Gerekir';
  const category = game.category === 'online' ? 'Online' : 'Klasik';

  const card = createEl('article', {
    className: `game-card game-card--${key}`,
    attrs: { 'data-game-card': key, 'data-phase': '5' }
  });

  const media = createEl('div', { className: 'game-media', attrs: { 'aria-hidden': 'true' } });
  const mediaIcon = createEl('span', { className: 'game-media-icon' });
  const icon = document.createElement('i');
  icon.className = `fa-solid ${safeText(game.icon || 'fa-gamepad', 'fa-gamepad')}`;
  mediaIcon.appendChild(icon);
  media.append(mediaIcon, createEl('span', { className: 'game-media-pulse' }));

  const top = createEl('div', { className: 'game-top' });
  const gameIcon = createEl('div', { className: 'game-icon' });
  const smallIcon = document.createElement('i');
  smallIcon.className = `fa-solid ${safeText(game.icon || 'fa-gamepad', 'fa-gamepad')}`;
  smallIcon.setAttribute('aria-hidden', 'true');
  gameIcon.appendChild(smallIcon);

  const tags = createEl('div', { className: 'tag-stack' });
  const categoryTag = createEl('span', { className: 'mini-tag', text: category });
  if (game.category === 'online') categoryTag.prepend(createEl('span', { className: 'live-dot' }));
  tags.append(categoryTag, createEl('span', { className: 'mini-tag', text: access }));
  top.append(gameIcon, tags);

  const body = createEl('div', { className: 'game-body' });
  body.append(createEl('h3', { className: 'game-title', text: game.name || 'Oyun' }));
  body.append(createEl('div', { className: 'game-desc', text: game.desc || 'PlayMatrix oyun vitrini.' }));

  const features = createEl('div', { className: 'feature-list' });
  (game.tags || []).slice(0, 3).forEach((tag) => features.append(createEl('span', { className: 'feature-pill', text: tag })));
  body.append(features);

  const footer = createEl('div', { className: 'game-footer' });
  footer.append(createEl('span', { className: 'game-status', text: game.access === 'free' ? 'Anında başla' : 'Önce oturum aç' }));
  footer.append(createEl('a', {
    className: `game-cta${game.access === 'free' ? ' is-primary' : ''}`,
    text: game.access === 'free' ? 'Ücretsiz Oyna' : 'Giriş Yap',
    attrs: { href: game.url || '#' }
  }));

  card.append(media, top, body, footer);
  return card;
}


export function installSafeRenderGuards(root = document) {
  root.querySelectorAll?.('[data-stat-value]').forEach((node) => {
    node.textContent = safeText(node.textContent || node.dataset.statValue || '0', '0');
  });
  root.querySelectorAll?.('img[data-pm-avatar-src]').forEach((img) => {
    setSafeImage(img, img.dataset.pmAvatarSrc || img.getAttribute('src') || '');
  });
  window.__PM_SAFE_RENDER__ = Object.freeze({
    renderEmptyState,
    renderMetricValue,
    createAvatarNode,
    createAvatarFrameNode,
    createHomeGameCard
  });
  return true;
}
