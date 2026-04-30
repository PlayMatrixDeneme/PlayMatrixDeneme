import { installHomeRuntimeBridge, markHomeBootError } from './home-runtime.js';
import { installHomeConfigBridge } from './home-config.js';
import { installHomeRouteResolver } from './home-router.js';

const BOOT_VERSION = 'release-20260430';

const SIDE_EFFECT_MODULES = Object.freeze([
  ['static-runtime', '../../playmatrix-static-runtime.js'],
  ['api-bridge', '../../playmatrix-api.js'],
  ['firebase-runtime', '../../firebase-runtime.js'],
  ['avatar-registry', '../../avatar-registry.js'],
  ['avatar-frame', '../../avatar-frame.js'],
  ['shell-enhancements', '../../shell-enhancements.js'],
  ['client-runtime', '../../playmatrix-runtime.js'],
  ['static-actions', '../static-actions.js']
]);

function markEarlyDocumentState() {
  document.documentElement.classList.add('pm-js', 'pm-home-booting');
  document.documentElement.classList.remove('pm-early-boot');
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!window.location.hash) window.scrollTo(0, 0);
  } catch (_) {}
}

async function loadSideEffectModule(name, path) {
  const runtime = window.__PM_HOME_RUNTIME__ || installHomeRuntimeBridge();
  try {
    await import(`${path}?v=${BOOT_VERSION}`);
    runtime.setStage(name);
    return true;
  } catch (error) {
    runtime.report(name, error);
    throw error;
  }
}

async function waitForDomReady() {
  if (document.readyState !== 'loading') return;
  await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
}

export async function bootPlayMatrixHome() {
  if (window.__PM_HOME_BOOT_PROMISE__) return window.__PM_HOME_BOOT_PROMISE__;

  window.__PM_HOME_BOOT_PROMISE__ = (async () => {
    markEarlyDocumentState();

    for (const [name, path] of SIDE_EFFECT_MODULES) {
      await loadSideEffectModule(name, path);
      if (name === 'api-bridge') installHomeConfigBridge();
    }

    const runtime = installHomeRuntimeBridge();
    installHomeRouteResolver(document);
    runtime.setStage('config');

    await waitForDomReady();
    runtime.setStage('dom-ready');

    const app = await import(`./app.js?v=${BOOT_VERSION}`);
    if (!app || typeof app.bootHomeApplication !== 'function') {
      throw new Error('HOME_APPLICATION_EXPORT_MISSING');
    }

    const ok = await app.bootHomeApplication();
    if (!ok) throw new Error('HOME_APPLICATION_PARTIAL_BOOT');

    document.documentElement.classList.remove('pm-home-booting');
    document.documentElement.classList.add('pm-home-ready');
    runtime.setStage('home-mounted');
    return true;
  })().catch((error) => {
    markHomeBootError(error);
    throw error;
  });

  return window.__PM_HOME_BOOT_PROMISE__;
}
