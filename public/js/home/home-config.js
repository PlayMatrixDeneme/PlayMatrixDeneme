const DEFAULT_API_TIMEOUT_MS = 3500;

export function normalizeBase(value = '') {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');
}

export function normalizeBasePath(value = '') {
  const raw = String(value || '').trim();
  if (!raw || raw === '/') return '';
  if (/^https?:\/\//i.test(raw)) return '';
  const clean = (raw.startsWith('/') ? raw : `/${raw}`)
    .split(/[?#]/)[0]
    .replace(/\/+/g, '/')
    .replace(/\/+$/g, '');
  return clean && clean !== '/' && !clean.includes('..') ? clean : '';
}

export function detectHomeBasePath() {
  const configured = normalizeBasePath(window.__PM_HOME_CONFIG__?.basePath || window.__PM_RUNTIME?.basePath || window.__PM_STATIC_RUNTIME_CONFIG__?.basePath || window.__PM_BASE_PATH__ || '');
  if (configured) return configured;
  const pathname = String(window.location?.pathname || '');
  if (/^\/PlayMatrixDeneme(?:\/|$)/i.test(pathname)) return '/PlayMatrixDeneme';
  return '';
}

export function resolveHomePath(value = '') {
  const raw = String(value || '').trim();
  if (!raw || /^(?:https?:)?\/\//i.test(raw) || /^(?:data|blob|mailto|tel):/i.test(raw) || raw.startsWith('#')) return raw;
  const basePath = detectHomeBasePath();
  if (!basePath || !raw.startsWith('/')) return raw;
  if (raw === basePath || raw.startsWith(`${basePath}/`)) return raw;
  if (/^\/(?:api|socket\.io)(?:\/|$)/i.test(raw)) return raw;
  return `${basePath}${raw}`;
}

export function getHomeApiBase() {
  const candidates = [
    window.__PM_API__?.getApiBaseSync?.(),
    window.__PM_RUNTIME?.apiBase,
    window.__PM_STATIC_RUNTIME_CONFIG__?.apiBase,
    window.__PLAYMATRIX_API_URL__,
    window.location?.origin
  ];
  for (const candidate of candidates) {
    const normalized = normalizeBase(candidate || '');
    if (normalized) return normalized;
  }
  return '';
}

export function buildHomeRuntimeConfig() {
  const staticRuntime = window.__PM_STATIC_RUNTIME_CONFIG__ || {};
  const runtime = window.__PM_RUNTIME || {};
  const basePath = detectHomeBasePath();
  const apiBase = getHomeApiBase();
  const firebase = runtime.firebase || staticRuntime.firebase || null;

  return Object.freeze({
    version: 1,
    phase: 'home-phase-1',
    environment: runtime.environment || staticRuntime.environment || 'production',
    publicBaseUrl: normalizeBase(runtime.publicBaseUrl || staticRuntime.publicBaseUrl || window.location?.origin || ''),
    basePath,
    apiBase,
    firebase,
    firebaseReady: !!(firebase && firebase.apiKey && firebase.authDomain && firebase.projectId && firebase.appId),
    apiTimeoutMs: DEFAULT_API_TIMEOUT_MS
  });
}

export function installHomeConfigBridge() {
  const config = buildHomeRuntimeConfig();
  window.__PM_HOME_CONFIG__ = config;
  window.__PM_BASE_PATH__ = config.basePath;
  window.__PM_RESOLVE_PATH__ = resolveHomePath;
  window.__PLAYMATRIX_API_URL__ = config.apiBase;
  window.__PM_RUNTIME = Object.assign({}, window.__PM_RUNTIME || {}, {
    basePath: config.basePath,
    apiBase: config.apiBase,
    firebase: window.__PM_RUNTIME?.firebase || config.firebase,
    firebaseReady: window.__PM_RUNTIME?.firebaseReady || config.firebaseReady
  });
  return config;
}
