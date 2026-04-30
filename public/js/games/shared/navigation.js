/* PlayMatrix shared online game navigation and active-room persistence. */
const ACTIVE_KEYS = {
  chess: 'activeChessRoom',
  pisti: 'activePistiRoom',
  crash: 'activeCrashRound'
};

function safeStorage() {
  try { return window.localStorage || null; } catch (_) { return null; }
}

export function setActiveGameRoom(gameKey = '', roomId = '') {
  const key = ACTIVE_KEYS[String(gameKey || '').toLowerCase()];
  const storage = safeStorage();
  const value = String(roomId || '').trim();
  if (!key || !storage || !value) return false;
  try { storage.setItem(key, value); return true; } catch (_) { return false; }
}

export function clearActiveGameRoom(gameKey = '', roomId = '') {
  const key = ACTIVE_KEYS[String(gameKey || '').toLowerCase()];
  const storage = safeStorage();
  if (!key || !storage) return false;
  try {
    const current = String(storage.getItem(key) || '').trim();
    if (!roomId || !current || current === String(roomId || '').trim()) storage.removeItem(key);
    return true;
  } catch (_) { return false; }
}

export function navigateToGameRoom(gameKey = '', roomId = '') {
  const key = String(gameKey || '').toLowerCase();
  if (roomId) setActiveGameRoom(key, roomId);
  if (key === 'chess') window.location.href = '/online-games/chess.html';
  else if (key === 'pisti') window.location.href = '/online-games/pisti.html';
  else if (key === 'crash') window.location.href = '/online-games/crash.html';
}
