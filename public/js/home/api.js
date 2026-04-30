import { homeState } from './state.js';

function normalizeBase(value = '') {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');
}

export function getHomeApiBase() {
  try {
    if (window.__PM_API__?.getApiBaseSync) return normalizeBase(window.__PM_API__.getApiBaseSync());
  } catch (_) {}
  return normalizeBase(window.__PM_RUNTIME?.apiBase || window.__PLAYMATRIX_API_URL__ || window.location.origin);
}

export async function homeFetch(path, options = {}) {
  const cleanPath = String(path || '').startsWith('/') ? String(path || '') : `/${path || ''}`;
  const base = getHomeApiBase();
  const url = `${base && base !== window.location.origin ? base : ''}${cleanPath}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, {
    credentials: 'include',
    cache: options.cache || 'no-store',
    ...options,
    headers
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.error || `HTTP_${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function installHomeApiBridge() {
  window.__PM_HOME_API__ = Object.freeze({ getHomeApiBase, homeFetch });
  homeState.setState({ apiReady: true });
  return true;
}
