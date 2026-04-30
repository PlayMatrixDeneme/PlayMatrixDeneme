import { homeState } from './state.js';
import { getHomeApiBase as getConfiguredHomeApiBase, normalizeBase } from './home-config.js';

export function getHomeApiBase() {
  try {
    return normalizeBase(getConfiguredHomeApiBase());
  } catch (_) {
    return normalizeBase(window.__PM_RUNTIME?.apiBase || window.__PLAYMATRIX_API_URL__ || window.location.origin);
  }
}

export function buildHomeApiUrl(path = '') {
  const cleanPath = String(path || '').startsWith('/') ? String(path || '') : `/${path || ''}`;
  const base = getHomeApiBase();
  if (!base || base === window.location.origin) return cleanPath;
  return `${base}${cleanPath}`;
}

export async function homeFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildHomeApiUrl(path), {
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
  const api = Object.freeze({ getHomeApiBase, buildHomeApiUrl, homeFetch });
  window.__PM_HOME_API__ = api;
  homeState.setState({ apiReady: true, apiBase: getHomeApiBase() });
  return true;
}
