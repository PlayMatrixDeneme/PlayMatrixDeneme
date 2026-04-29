import { renderHome } from './render.js';
import { installModalTriggers } from '../components/modal.js';
import { showToast } from '../components/toast.js';

function boot() {
  renderHome();
  installModalTriggers();
  showToast('Yeni AnaSayfa tasarım sistemi yüklendi.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
