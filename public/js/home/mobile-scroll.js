const LOCK_STATE = { locked: false, y: 0 };

function getScrollableTarget(node) {
  return node?.closest?.('.ps-modal-body, .modal-body, .modal-content, .sheet-content, .drawer-scroll, .avatar-picker-scroll, .frame-picker-scroll, .ps-chat-stream, [data-scroll-container="true"]') || null;
}

function canScroll(node, deltaY) {
  if (!node) return false;
  const max = Math.max(0, Number(node.scrollHeight || 0) - Number(node.clientHeight || 0));
  if (max <= 1) return false;
  const top = Number(node.scrollTop || 0);
  if (deltaY < 0) return top > 0;
  if (deltaY > 0) return top < max - 1;
  return true;
}

export function lockHomeScroll() {
  if (LOCK_STATE.locked) return;
  LOCK_STATE.locked = true;
  LOCK_STATE.y = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.classList.add('pm-modal-scroll-locked');
  document.body.classList.add('pm-modal-scroll-locked', 'modal-open');
  document.documentElement.style.setProperty('--pm-scroll-lock-y', String(LOCK_STATE.y));
  document.body.style.top = `-${LOCK_STATE.y}px`;
}

export function unlockHomeScroll() {
  if (!LOCK_STATE.locked) return;
  const y = LOCK_STATE.y || 0;
  LOCK_STATE.locked = false;
  LOCK_STATE.y = 0;
  document.documentElement.classList.remove('pm-modal-scroll-locked');
  document.body.classList.remove('pm-modal-scroll-locked', 'modal-open');
  document.body.style.removeProperty('top');
  document.documentElement.style.removeProperty('--pm-scroll-lock-y');
  window.requestAnimationFrame(() => window.scrollTo(0, y));
}

export function syncHomeModalScrollLock() {
  const active = !!document.querySelector('.ps-modal.active, .ps-modal.is-open, .sheet-shell.is-open, .drawer-shell.is-open, [data-home-modal-open="true"]') || document.body.classList.contains('pm-sheet-open') || document.body.classList.contains('pm-drawer-open');
  if (active) lockHomeScroll();
  else unlockHomeScroll();
}

export function installMobileGesturePolicy() {
  document.documentElement.style.removeProperty('touch-action');
  document.body.style.removeProperty('touch-action');
  document.documentElement.classList.add('pm-mobile-scroll-policy');
  document.body.classList.add('pm-mobile-scroll-policy');

  let lastY = 0;
  document.addEventListener('touchstart', (event) => {
    lastY = Number(event.touches?.[0]?.clientY || 0);
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', (event) => {
    const activeModal = document.querySelector('.ps-modal.active, .ps-modal.is-open, .sheet-shell.is-open, .drawer-shell.is-open, [data-home-modal-open="true"]');
    if (!activeModal) return;
    const currentY = Number(event.touches?.[0]?.clientY || lastY || 0);
    const deltaY = lastY - currentY;
    lastY = currentY;
    const scroller = getScrollableTarget(event.target);
    if (!scroller || !activeModal.contains(scroller) || !canScroll(scroller, deltaY)) event.preventDefault();
  }, { passive: false, capture: true });

  window.__PM_HOME_SCROLL_LOCK__ = Object.freeze({ lockHomeScroll, unlockHomeScroll, syncHomeModalScrollLock });
  syncHomeModalScrollLock();
  return true;
}
