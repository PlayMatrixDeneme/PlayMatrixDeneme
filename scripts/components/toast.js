import { el } from '../core/dom.js';

export function showToast(message) {
  const root = document.querySelector('[data-toast-root]');
  if (!root) return;
  const toast = el('div', 'pm-toast', message);
  root.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}
