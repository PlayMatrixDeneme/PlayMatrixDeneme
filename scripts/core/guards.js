let lastTouchEnd = 0;

export function installInteractionGuards() {
  document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 320) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('contextmenu', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
  });
}

export function installOutsideClose(getMenu) {
  document.addEventListener('pointerdown', (event) => {
    const menu = getMenu();
    if (!menu || !menu.classList.contains('is-open')) return;
    if (!menu.contains(event.target) && !event.target.closest('[data-action="toggle-account-menu"]')) {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
    }
  });
}
