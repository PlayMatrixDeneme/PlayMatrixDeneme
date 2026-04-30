import { hydrateGameTopbar } from './topbar.js';
import { buildClassicScoreSubmission, createClassicRunId, getClassicScoreRule } from './score-submit-validator.js';
import { applyRewardAccountSync, normalizeRewardResponse } from './reward-normalizer.js';
import { createAuthGuardUI } from './auth-guard-ui.js';

function normalizeBase(value = '') {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');
}

function getGameHooks(gameType = '') {
  const key = String(gameType || '').toLowerCase();
  if (key === 'patternmaster') return window.__PM_PATTERN_MASTER_GAME__ || null;
  if (key === 'snakepro') return window.__PM_SNAKE_PRO_GAME__ || null;
  if (key === 'spacepro') return window.__PM_SPACE_PRO_GAME__ || null;
  return null;
}

export function createClassicGameRuntime({ auth, getIdToken, apiBase = '', gameType = '', loginUrl = '/', title = 'Klasik Oyun', statusElement = null, onAuthChange = null } = {}) {
  const API_URL = normalizeBase(apiBase || window.__PM_API__?.getApiBaseSync?.() || window.__PM_RUNTIME?.apiBase || window.__PLAYMATRIX_API_URL__ || window.location.origin);
  const rules = getClassicScoreRule(gameType);
  const guard = createAuthGuardUI({
    title: 'Giriş gerekli',
    message: `${rules?.label || title} oynamak ve XP kazanmak için hesabınla giriş yap.`,
    loginUrl
  });
  const state = {
    runId: '',
    startedAt: 0,
    submitted: false,
    currentUser: null,
    lastAccountPayload: null
  };

  function canPlay() {
    return !!auth?.currentUser;
  }

  function redirectToLogin() {
    try { sessionStorage.setItem('pm_open_login_after_home', '1'); } catch (_) {}
    window.location.href = loginUrl || '/';
  }

  async function fetchAPI(endpoint, method = 'GET', body = null) {
    if (!auth?.currentUser) throw new Error('NO_USER');
    const token = await getIdToken(auth.currentUser);
    const headers = { Accept: 'application/json', 'Cache-Control': 'no-store' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== null && body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: body !== null && body !== undefined ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      const err = new Error(payload?.error || `HTTP_${response.status}`);
      err.status = response.status;
      err.payload = payload;
      throw err;
    }
    return payload;
  }

  async function refreshAccount(options = {}) {
    if (!canPlay()) return null;
    const payload = await fetchAPI(`/api/me?t=${Date.now()}`, 'GET').catch(() => null);
    if (!payload) return null;
    state.lastAccountPayload = payload;
    hydrateGameTopbar(payload, { avatarHostId: 'uiAccountAvatarHost' });
    try { window.__PM_GAME_ACCOUNT_SYNC__?.apply?.(payload, options); } catch (_) {}
    return payload;
  }

  function beginRun() {
    state.runId = createClassicRunId(gameType || 'classic');
    state.startedAt = Date.now();
    state.submitted = false;
    return state.runId;
  }

  async function finishRun(scoreValue = 0) {
    if (!canPlay()) {
      redirectToLogin();
      return null;
    }
    if (state.submitted) return null;
    const submission = buildClassicScoreSubmission({
      gameType,
      runId: state.runId || createClassicRunId(gameType || 'classic'),
      score: scoreValue,
      startedAt: state.startedAt || Date.now(),
      endedAt: Date.now()
    });
    if (!submission.ok) throw new Error(submission.error || 'Skor gönderimi doğrulanamadı.');
    state.submitted = true;
    try {
      const payload = await fetchAPI('/api/classic/submit', 'POST', submission.payload);
      const normalized = applyRewardAccountSync(normalizeRewardResponse(payload));
      hydrateGameTopbar(normalized.accountSync || normalized, { avatarHostId: 'uiAccountAvatarHost' });
      await refreshAccount({ forcePulse: true }).catch(() => null);
      return normalized;
    } catch (error) {
      state.submitted = false;
      if (statusElement) statusElement.textContent = error?.payload?.error || error?.message || 'Skor kaydedilemedi.';
      throw error;
    }
  }

  function applyAuthState(user) {
    state.currentUser = user || null;
    const hooks = getGameHooks(gameType);
    const guestHeader = document.getElementById('guestHeader');
    const levelHeader = document.getElementById('levelHeader');
    if (user) {
      guard.hide();
      if (guestHeader) guestHeader.style.display = 'none';
      if (levelHeader) levelHeader.style.display = 'flex';
      hooks?.unlockForAuth?.();
      refreshAccount({ forcePulse: true }).catch(() => null);
    } else {
      guard.show();
      if (guestHeader) guestHeader.style.display = 'grid';
      if (levelHeader) levelHeader.style.display = 'none';
      hooks?.stopForAuth?.();
    }
    if (typeof onAuthChange === 'function') onAuthChange({ user: user || null, authenticated: !!user, runtime, hooks });
  }

  const runtime = {
    apiBase: API_URL,
    canPlay,
    redirectToLogin,
    beginRun,
    finishRun,
    refreshAccount,
    applyAuthState,
    fetchAPI,
    get state() { return { ...state }; }
  };

  window.__PM_CLASSIC__ = runtime;
  window.__PM_RUNTIME = window.__PM_RUNTIME || {};
  window.__PM_RUNTIME.apiBase = API_URL;
  window.__PLAYMATRIX_API_URL__ = API_URL;
  return runtime;
}
