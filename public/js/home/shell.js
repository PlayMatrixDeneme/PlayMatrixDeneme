import { byId } from './dom-utils.js';
import { homeState } from './state.js';

const ACTION_TO_PROXY_ID = Object.freeze({
  wheel: 'navWheelItem',
  promo: 'navBonusItem',
  support: 'navSupportItem',
  social: 'navSocialItem',
  profile: 'navProfileItem'
});

function getTopbar() {
  return document.querySelector('.topbar[data-shell-phase="2"]');
}

function isAuthenticatedShell() {
  const topUser = byId('topUser');
  const runtimeUser = window.__PM_RUNTIME?.auth?.currentUser;
  return Boolean(runtimeUser || topUser?.classList.contains('is-visible'));
}

function syncAuthChrome() {
  const topbar = getTopbar();
  const authActions = byId('topbarAuthActions');
  const topUser = byId('topUser');
  const isUser = isAuthenticatedShell();

  if (topbar) topbar.dataset.authState = isUser ? 'user' : 'guest';
  if (authActions) {
    authActions.hidden = isUser;
    authActions.setAttribute('aria-hidden', isUser ? 'true' : 'false');
  }
  if (topUser) topUser.setAttribute('aria-hidden', isUser ? 'false' : 'true');

  homeState.setState({ shell: { ...(homeState.getState().shell || {}), authState: isUser ? 'user' : 'guest' } });
  return isUser;
}

function syncDropdownA11y() {
  const dropdown = byId('userDropdown');
  const trigger = byId('profileTrigger');
  if (!dropdown || !trigger) return;
  const open = dropdown.classList.contains('active');
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function syncDropdownIdentity() {
  const runtimeUser = window.__PM_RUNTIME?.auth?.currentUser || null;
  const userId = byId('ddUserId');
  if (userId) userId.textContent = runtimeUser?.uid ? `ID: ${String(runtimeUser.uid).slice(0, 8)}` : 'ID: —';

  const sourceAvatar = byId('topbarAvatarShell');
  const targetAvatar = byId('dropdownAvatarShell');
  if (sourceAvatar && targetAvatar && sourceAvatar.innerHTML && targetAvatar.innerHTML !== sourceAvatar.innerHTML) {
    targetAvatar.innerHTML = sourceAvatar.innerHTML;
  }
}

function setActiveNav(key) {
  const safeKey = String(key || 'home');
  document.querySelectorAll('#topCategoryNav .nav-link').forEach((item) => {
    const active = item.dataset.navKey === safeKey;
    item.classList.toggle('is-active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  homeState.setState({ shell: { ...(homeState.getState().shell || {}), activeNav: safeKey } });
}

function installSectionObserver() {
  const sections = [
    ['home', byId('hero')],
    ['games', byId('games')],
    ['leaderboard', byId('leaderboard')]
  ].filter(([, node]) => Boolean(node));

  if (!sections.length || typeof IntersectionObserver !== 'function') return;

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const match = sections.find(([, node]) => node === visible.target);
    if (match) setActiveNav(match[0]);
  }, { root: null, rootMargin: '-35% 0px -55% 0px', threshold: [0.15, 0.35, 0.6] });

  sections.forEach(([, node]) => observer.observe(node));
}

function proxyShellAction(action) {
  const proxyId = ACTION_TO_PROXY_ID[String(action || '')];
  const proxy = proxyId ? byId(proxyId) : null;
  if (proxy) {
    proxy.click();
    return true;
  }
  return false;
}

function installShellDelegation() {
  if (document.body?.dataset.phase2ShellBound === '1') return;
  if (document.body) document.body.dataset.phase2ShellBound = '1';

  document.addEventListener('click', (event) => {
    const actionTarget = event.target?.closest?.('[data-shell-action]');
    if (actionTarget) {
      const action = actionTarget.dataset.shellAction;
      if (action) {
        event.preventDefault();
        setActiveNav(action === 'support' ? 'support' : action === 'social' ? 'social' : homeState.getState().shell?.activeNav || 'home');
        proxyShellAction(action);
        return;
      }
    }

    const topNav = event.target?.closest?.('#topCategoryNav .nav-link[href^="#"]');
    if (topNav?.dataset.navKey) setActiveNav(topNav.dataset.navKey);
  }, true);
}

function installMutationSync() {
  if (typeof MutationObserver !== 'function') return;
  const topUser = byId('topUser');
  const dropdown = byId('userDropdown');
  const observer = new MutationObserver(() => {
    syncAuthChrome();
    syncDropdownA11y();
    syncDropdownIdentity();
  });

  if (topUser) observer.observe(topUser, { attributes: true, attributeFilter: ['class', 'style'] });
  if (dropdown) observer.observe(dropdown, { attributes: true, attributeFilter: ['class'] });

  [0, 40, 160, 420, 900].forEach((delay) => {
    window.setTimeout(() => {
      syncAuthChrome();
      syncDropdownA11y();
      syncDropdownIdentity();
    }, delay);
  });
}

export function installShellChromeGuards() {
  syncAuthChrome();
  syncDropdownA11y();
  syncDropdownIdentity();
  installShellDelegation();
  installSectionObserver();
  installMutationSync();
  window.__PM_HOME_SHELL__ = Object.freeze({ syncAuthChrome, setActiveNav, proxyShellAction });
  return true;
}
