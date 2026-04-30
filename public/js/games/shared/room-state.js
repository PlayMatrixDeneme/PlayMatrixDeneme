/* PlayMatrix shared online game room/session state helpers. */
export function getSafeWebStorage(name = 'localStorage') {
  try {
    const storage = window[name];
    if (!storage) return null;
    const probeKey = `__pm_storage_probe_${name}`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch (_) {
    return null;
  }
}

export function getSafeStorageList() {
  return [getSafeWebStorage('sessionStorage'), getSafeWebStorage('localStorage')].filter(Boolean);
}

export function getPendingAutoJoinRoom(gameKey = '') {
  const key = String(gameKey || '').trim().toLowerCase();
  const legacyRoomKey = key === 'chess' ? 'activeChessRoom' : key === 'pisti' ? 'activePistiRoom' : '';
  const keys = [
    `pm_pending_auto_join_${key}`,
    `pm_pending_autojoin_${key}`,
    `pendingAutoJoin_${key}`,
    legacyRoomKey
  ].filter(Boolean);
  for (const storage of getSafeStorageList()) {
    for (const itemKey of keys) {
      try {
        const value = String(storage.getItem(itemKey) || '').trim();
        if (value) return value;
      } catch (_) {}
    }
  }
  return '';
}

export function clearPendingAutoJoin(gameKey = '', roomId = '') {
  const key = String(gameKey || '').trim().toLowerCase();
  const room = String(roomId || '').trim();
  const keys = [`pm_pending_auto_join_${key}`, `pm_pending_autojoin_${key}`, `pendingAutoJoin_${key}`];
  if (key === 'chess') keys.push('activeChessRoom');
  if (key === 'pisti') keys.push('activePistiRoom');
  for (const storage of getSafeStorageList()) {
    for (const itemKey of keys) {
      try {
        const current = String(storage.getItem(itemKey) || '').trim();
        if (!room || !current || current === room) storage.removeItem(itemKey);
      } catch (_) {}
    }
  }
}

export function scheduleGameBoot(callback, delayMs = 120) {
  if (typeof callback !== 'function') return () => {};
  let scheduled = false;
  const run = () => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => callback(), Math.max(0, Number(delayMs) || 0));
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
    window.addEventListener('load', run, { once: true });
  } else {
    run();
  }
  return run;
}

export function buildRoomSortKey(room = {}) {
  return Math.max(Number(room.updatedAt || 0) || 0, Number(room.createdAt || 0) || 0);
}

export function isRoomJoinable(room = {}) {
  const status = String(room.status || '').toLowerCase();
  const maxPlayers = Number(room.maxPlayers || 0) || 0;
  const currentPlayers = Number(room.currentPlayers || (Array.isArray(room.players) ? room.players.length : 0)) || 0;
  return status === 'waiting' && (!maxPlayers || currentPlayers < maxPlayers);
}
