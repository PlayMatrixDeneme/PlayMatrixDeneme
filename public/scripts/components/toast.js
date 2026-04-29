import { qs } from '../app/dom.js';

export function showToast(message) {
  const root = qs('#toastRoot');
  const toast = document.createElement('div');
  toast.className = 'pm-toast';
  toast.textContent = message;
  root.append(toast);
  setTimeout(() => toast.remove(), 3800);
}
