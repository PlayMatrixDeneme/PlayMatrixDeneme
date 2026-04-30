import { byId } from './dom-utils.js';
import { homeState } from './state.js';

function normalizePercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function updateAccountProgress(percent) {
  const value = normalizePercent(percent);
  ['profileProgressFill', 'topProgressFill', 'userProgressFill'].forEach((id) => {
    const node = byId(id);
    if (!node) return;
    node.style.setProperty('--pm-progress', `${value}%`);
    node.dataset.progress = String(Math.round(value));
  });
  homeState.setState({ accountProgress: value });
  return value;
}

export function syncHeaderAccountChrome(user = window.__PM_RUNTIME?.auth?.currentUser || null) {
  const topbar = document.querySelector('.topbar[data-shell-phase="2"]');
  const topUser = byId('topUser');
  const authActions = byId('topbarAuthActions');
  const isUser = Boolean(user || topUser?.classList.contains('is-visible'));

  if (topbar) topbar.dataset.authState = isUser ? 'user' : 'guest';
  if (authActions) {
    authActions.hidden = isUser;
    authActions.setAttribute('aria-hidden', isUser ? 'true' : 'false');
  }
  if (topUser) topUser.setAttribute('aria-hidden', isUser ? 'false' : 'true');

  homeState.setState({ shell: { ...(homeState.getState().shell || {}), authState: isUser ? 'user' : 'guest' } });
  return isUser;
}

function installHeaderAccountObserver() {
  if (typeof MutationObserver !== 'function') {
    syncHeaderAccountChrome();
    return;
  }
  const topUser = byId('topUser');
  const login = byId('loginBtn');
  const register = byId('registerBtn');
  if (document.body?.dataset.headerAccountObserverBound === '1') return;
  if (document.body) document.body.dataset.headerAccountObserverBound = '1';

  const observer = new MutationObserver(() => syncHeaderAccountChrome());
  [topUser, login, register].filter(Boolean).forEach((node) => observer.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] }));
  [0, 60, 240, 720].forEach((delay) => window.setTimeout(() => syncHeaderAccountChrome(), delay));
}

export function installAccountStateModule() {
  const runtimeUser = window.__PM_RUNTIME?.auth?.currentUser || null;
  homeState.setState({ account: runtimeUser ? { uid: runtimeUser.uid || '', email: runtimeUser.email || '' } : null });
  syncHeaderAccountChrome(runtimeUser);
  installHeaderAccountObserver();
  const currentProgress = byId('profileProgressFill')?.dataset.progress || byId('topProgressFill')?.dataset.progress || 0;
  updateAccountProgress(currentProgress);
  window.__PM_HOME_ACCOUNT__ = Object.freeze({ updateAccountProgress });
  return true;
}
