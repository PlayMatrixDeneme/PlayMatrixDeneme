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

export function installAccountStateModule() {
  const runtimeUser = window.__PM_RUNTIME?.auth?.currentUser || null;
  homeState.setState({ account: runtimeUser ? { uid: runtimeUser.uid || '', email: runtimeUser.email || '' } : null });
  const currentProgress = byId('profileProgressFill')?.dataset.progress || byId('topProgressFill')?.dataset.progress || 0;
  updateAccountProgress(currentProgress);
  window.__PM_HOME_ACCOUNT__ = Object.freeze({ updateAccountProgress });
  return true;
}
