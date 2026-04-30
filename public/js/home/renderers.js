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
    createAvatarFrameNode
  });
  return true;
}
