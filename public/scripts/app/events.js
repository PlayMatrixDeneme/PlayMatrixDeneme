import { qs } from '../core/dom.js';
import { homeState } from './state.js';
import { showToast } from '../components/toast.js';

export function installGlobalEvents() {
  const menu = qs('[data-account-menu]');
  const trigger = qs('[data-action="toggle-account-menu"]');
  trigger?.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    trigger.setAttribute('aria-expanded', String(open));
  });

  qs('[data-action="toggle-sound"]')?.addEventListener('click', () => {
    homeState.sound = !homeState.sound;
    const icon = qs('[data-sound-icon]');
    if (icon) icon.textContent = homeState.sound ? '●' : '○';
    showToast(homeState.sound ? 'Arayüz sesi açık.' : 'Arayüz sesi kapalı.');
  });

  qs('[data-action="logout-demo"]')?.addEventListener('click', () => {
    showToast('Demo çıkış işlemi alındı. Auth sonraki fazda bağlanacak.');
  });
}
