import { byId } from './dom-utils.js';
import { syncHomeModalScrollLock } from './mobile-scroll.js';

const DRAWERS = new Set(['menu', 'profile']);
const ACTION_TO_PROXY_ID = Object.freeze({
  profile: 'navProfileItem',
  wheel: 'navWheelItem',
  promo: 'navBonusItem',
  support: 'navSupportItem',
  invite: 'navInviteItem',
  social: 'navSocialItem',
  logout: 'logoutDropdownBtn'
});
const SECONDARY_ACTIONS = Object.freeze({
  notifications: 'social',
  sessions: 'profile',
  safety: 'support'
});
let installed = false;
let lastFocus = null;
let touchStartX = 0;
let touchStartY = 0;

const shell = () => byId('drawerShell');
const activeDrawer = () => shell()?.dataset.activeDrawer || '';
const isMobileViewport = () => window.matchMedia?.('(max-width: 860px)')?.matches ?? window.innerWidth <= 860;

function drawer(name) {
  if (!DRAWERS.has(name)) return null;
  return byId(name === 'profile' ? 'profileDrawer' : 'menuDrawer');
}

function focusables(root) {
  return Array.from(root?.querySelectorAll?.('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || [])
    .filter((el) => !el.hidden && el.offsetParent !== null);
}

function setTriggers(name = '', open = false) {
  document.querySelectorAll('[data-drawer-open]').forEach((trigger) => {
    const same = trigger.dataset.drawerOpen === name;
    trigger.setAttribute('aria-expanded', open && same ? 'true' : 'false');
  });
  const profileTrigger = byId('profileTrigger');
  if (profileTrigger && name === 'profile') profileTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function syncProfileDrawerIdentity() {
  const sourceAvatar = byId('topbarAvatarShell') || byId('dropdownAvatarShell');
  const drawerAvatar = byId('drawerProfileAvatarShell');
  if (sourceAvatar && drawerAvatar && sourceAvatar.innerHTML && drawerAvatar.innerHTML !== sourceAvatar.innerHTML) {
    drawerAvatar.innerHTML = sourceAvatar.innerHTML;
  }

  const headerName = byId('headerUsername')?.textContent?.trim() || byId('ddUsername')?.textContent?.trim() || 'Oyuncu';
  const headerId = byId('ddUserId')?.textContent?.trim() || 'ID: —';
  const headerBalance = byId('headerBalance')?.textContent?.trim() || '0';

  const title = byId('profileDrawerTitle');
  const id = byId('drawerProfileId');
  const balance = byId('drawerProfileBalance');
  if (title) title.textContent = headerName || 'Oyuncu';
  if (id) id.textContent = headerId;
  if (balance) balance.textContent = headerBalance;
}

export function openPhase6Drawer(name = 'menu', options = {}) {
  const safeName = DRAWERS.has(name) ? name : 'menu';
  const sh = shell();
  const panel = drawer(safeName);
  if (!sh || !panel) return false;
  lastFocus = options.restoreFocus === false ? null : document.activeElement;
  syncProfileDrawerIdentity();
  sh.dataset.activeDrawer = safeName;
  sh.classList.add('is-open');
  sh.setAttribute('aria-hidden', 'false');
  document.body.classList.add('pm-drawer-open');
  document.documentElement.classList.add('pm-drawer-open');
  setTriggers(safeName, true);
  window.setTimeout(syncHomeModalScrollLock, 0);
  window.requestAnimationFrame(() => (focusables(panel)[0] || panel).focus?.({ preventScroll: true }));
  window.dispatchEvent(new CustomEvent('pm:drawer:open', { detail: { drawer: safeName } }));
  return true;
}

export function closePhase6Drawer(options = {}) {
  const sh = shell();
  if (!sh || !sh.classList.contains('is-open')) return false;
  const name = activeDrawer();
  sh.classList.remove('is-open');
  sh.setAttribute('aria-hidden', 'true');
  sh.removeAttribute('data-active-drawer');
  document.body.classList.remove('pm-drawer-open');
  document.documentElement.classList.remove('pm-drawer-open');
  setTriggers(name, false);
  window.setTimeout(syncHomeModalScrollLock, 0);
  if (options.restoreFocus !== false && lastFocus?.focus) window.requestAnimationFrame(() => lastFocus.focus({ preventScroll: true }));
  lastFocus = null;
  window.dispatchEvent(new CustomEvent('pm:drawer:close', { detail: { drawer: name } }));
  return true;
}

function runProxy(action) {
  const normalized = SECONDARY_ACTIONS[action] || action;
  const proxy = byId(ACTION_TO_PROXY_ID[normalized] || '');
  if (proxy) {
    proxy.click();
    return true;
  }
  if (window.openSheet && ['profile', 'wheel', 'promo', 'support', 'invite', 'social'].includes(normalized)) {
    return window.openSheet(normalized);
  }
  return false;
}

function handleDrawerClick(event) {
  const openTrigger = event.target?.closest?.('[data-drawer-open]');
  if (openTrigger) {
    event.preventDefault();
    event.stopPropagation();
    openPhase6Drawer(openTrigger.dataset.drawerOpen || 'menu');
    return;
  }

  const closeTrigger = event.target?.closest?.('[data-drawer-close="true"],#drawerBackdrop');
  if (closeTrigger) {
    event.preventDefault();
    event.stopPropagation();
    closePhase6Drawer();
    return;
  }

  const actionTarget = event.target?.closest?.('[data-drawer-action]');
  if (actionTarget) {
    event.preventDefault();
    const action = actionTarget.dataset.drawerAction;
    closePhase6Drawer({ restoreFocus: false });
    window.setTimeout(() => runProxy(action), 80);
    return;
  }

  const linkTarget = event.target?.closest?.('[data-drawer-link]');
  if (linkTarget) {
    event.preventDefault();
    const target = document.querySelector(linkTarget.dataset.drawerLink || '');
    closePhase6Drawer({ restoreFocus: false });
    if (target) window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }
}

function handleProfileTrigger(event) {
  const trigger = event.target?.closest?.('#profileTrigger');
  if (!trigger || !isMobileViewport()) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  openPhase6Drawer('profile');
}

function handleDrawerKeys(event) {
  const sh = shell();
  if (!sh?.classList.contains('is-open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closePhase6Drawer();
    return;
  }
  if (event.key !== 'Tab') return;
  const panel = drawer(activeDrawer());
  const items = focusables(panel);
  if (!items.length) {
    event.preventDefault();
    panel?.focus?.({ preventScroll: true });
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}

function installSwipeClose() {
  const sh = shell();
  if (!sh || sh.dataset.phase6SwipeBound === '1') return;
  sh.dataset.phase6SwipeBound = '1';
  sh.addEventListener('touchstart', (event) => {
    touchStartX = Number(event.touches?.[0]?.clientX || 0);
    touchStartY = Number(event.touches?.[0]?.clientY || 0);
  }, { passive: true });
  sh.addEventListener('touchend', (event) => {
    if (!sh.classList.contains('is-open')) return;
    const x = Number(event.changedTouches?.[0]?.clientX || 0);
    const y = Number(event.changedTouches?.[0]?.clientY || 0);
    const dx = x - touchStartX;
    const dy = Math.abs(y - touchStartY);
    if (dy > 80) return;
    const name = activeDrawer();
    if ((name === 'menu' && dx < -86) || (name === 'profile' && dx > 86)) closePhase6Drawer();
  }, { passive: true });
}

function installMutationSync() {
  if (typeof MutationObserver !== 'function') return;
  const targets = ['topbarAvatarShell', 'dropdownAvatarShell', 'headerUsername', 'ddUserId', 'headerBalance'].map(byId).filter(Boolean);
  if (!targets.length) return;
  const observer = new MutationObserver(syncProfileDrawerIdentity);
  targets.forEach((target) => observer.observe(target, { childList: true, subtree: true, attributes: true, characterData: true }));
}

export function installPhase6DrawerEngine(root = document) {
  if (installed || root?.body?.dataset.phase6DrawerEngine === '1') return true;
  installed = true;
  if (root.body) root.body.dataset.phase6DrawerEngine = '1';
  document.addEventListener('click', handleProfileTrigger, true);
  document.addEventListener('click', handleDrawerClick, true);
  document.addEventListener('keydown', handleDrawerKeys, true);
  installSwipeClose();
  installMutationSync();
  syncProfileDrawerIdentity();
  window.openDrawer = openPhase6Drawer;
  window.closeDrawer = closePhase6Drawer;
  window.__PM_DRAWER_ENGINE_PHASE6__ = Object.freeze({ open: openPhase6Drawer, close: closePhase6Drawer, syncProfile: syncProfileDrawerIdentity });
  return true;
}
