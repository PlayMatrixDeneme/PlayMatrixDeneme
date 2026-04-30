const stores = new Map();

function cloneValue(value) {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch (_) {}
  }
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
}

export function createHomeStore(name, initialState = {}) {
  const key = String(name || 'home').trim() || 'home';
  if (stores.has(key)) return stores.get(key);
  let state = cloneValue(initialState) || {};
  const listeners = new Set();

  const api = Object.freeze({
    name: key,
    getState() {
      return cloneValue(state);
    },
    setState(patch = {}) {
      const nextPatch = typeof patch === 'function' ? patch(cloneValue(state)) : patch;
      if (!nextPatch || typeof nextPatch !== 'object') return cloneValue(state);
      state = { ...state, ...cloneValue(nextPatch) };
      listeners.forEach((listener) => {
        try { listener(cloneValue(state)); } catch (_) {}
      });
      return cloneValue(state);
    },
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  });

  stores.set(key, api);
  return api;
}

export const homeState = createHomeStore('home', {
  account: null,
  leaderboard: { tab: 'level', items: [] },
  stats: {},
  matchmaking: { active: false, game: '' },
  social: { ready: false },
  market: { items: [], ownedFrames: [] },
  shell: { activeNav: 'home', authState: 'guest' }
});

export function installHomeStateBridge() {
  window.__PM_HOME_STATE__ = homeState;
  return true;
}
