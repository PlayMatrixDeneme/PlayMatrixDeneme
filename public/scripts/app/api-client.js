import { appConfig } from './config.js';

export async function apiGet(path, fallback) {
  if (!appConfig.apiBase) return fallback;

  const url = `${appConfig.apiBase}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
