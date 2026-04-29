import { loadBootstrap } from './api-client.js';
import { setUser } from './state.js';
import { renderHome } from './render-home.js';
import { installGlobalEvents } from './events.js';
import { installInteractionGuards, installOutsideClose } from '../core/guards.js';
import { installModalSystem } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { startHeroCarousel } from '../sections/hero.js';

export async function bootHome() {
  installInteractionGuards();
  installModalSystem();
  installGlobalEvents();
  installOutsideClose(() => document.querySelector('[data-account-menu]'));
  const user = await loadBootstrap();
  setUser(user);
  renderHome(user);
  startHeroCarousel();
  showToast('AnaSayfa yeni tasarım sistemi yüklendi.');
}
