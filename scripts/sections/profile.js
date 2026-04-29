import { el, clear } from '../core/dom.js';
import { formatNumber, clampPercent } from '../core/format.js';
import { profileActions, activityCards } from '../data/home-data.js';

export function renderAccount(user) {
  document.querySelectorAll('[data-username]').forEach((node) => { node.textContent = user.username || user.name; });
  document.querySelectorAll('[data-userlevel]').forEach((node) => { node.textContent = `Seviye ${user.level}`; });
  document.querySelectorAll('[data-balance]').forEach((node) => { node.textContent = formatNumber(user.balance); });
  document.querySelectorAll('[data-menu-username]').forEach((node) => { node.textContent = user.name; });
  document.querySelectorAll('[data-menu-level]').forEach((node) => { node.textContent = `Hesap Seviyesi ${user.level} · ${user.nextTarget}`; });
  document.querySelectorAll('[data-menu-progress]').forEach((node) => { node.style.width = `${clampPercent(user.progress)}%`; });
}

export function renderProfilePanel(user) {
  const root = document.querySelector('[data-profile-panel]');
  clear(root);
  const card = el('div', 'pm-profile-card');
  const avatar = el('span', 'pm-avatar-frame');
  avatar.dataset.avatarFrame = String(user.frame || 1);
  avatar.innerHTML = '<img src="./assets/avatars/default-avatar.svg" alt="Oyuncu avatarı" />';
  const copy = el('div');
  copy.append(el('p', 'pm-eyebrow', 'Hesap Alanı'), el('h2', '', user.name), el('p', '', `${user.status} · Seviye ${user.level} · ${clampPercent(user.progress)}% ilerleme`));
  card.append(avatar, copy);
  const actions = el('div', 'pm-profile-actions');
  profileActions.forEach((item) => {
    const button = el('button', 'pm-action-card');
    button.type = 'button';
    button.dataset.modal = item.modal;
    button.append(el('strong', '', item.title), el('span', '', item.text));
    actions.append(button);
  });
  root.append(card, actions);
}

export function renderActivityPanel() {
  const root = document.querySelector('[data-activity-panel]');
  clear(root);
  root.append(el('p', 'pm-eyebrow', 'Ana Kontrol'), el('h2', '', 'Ödül ve durum özeti'));
  const grid = el('div', 'pm-activity-grid');
  activityCards.forEach((item) => {
    const card = el('article', 'pm-activity-card');
    card.append(el('strong', '', item.title), el('span', '', item.value), el('span', '', item.text));
    grid.append(card);
  });
  root.append(grid);
}
