import { installHomeConfigBridge } from './home-config.js';
import { installHomeRouteResolver } from './home-router.js';

const STAGES = [];

function pushStage(stage, status = 'ok', detail = '') {
  const item = Object.freeze({ stage, status, detail, at: Date.now() });
  STAGES.push(item);
  window.__PM_HOME_BOOT_STAGES__ = Object.freeze([...STAGES]);
  return item;
}

export function installHomeRuntimeBridge() {
  if (window.__PM_HOME_RUNTIME__?.installed) return window.__PM_HOME_RUNTIME__;

  const config = installHomeConfigBridge();
  const router = installHomeRouteResolver(document);
  const runtime = Object.freeze({
    installed: true,
    phase: 'home-phase-1',
    config,
    router,
    setStage: pushStage,
    report(stage, error) {
      const message = error?.message || String(error || 'UNKNOWN_ERROR');
      pushStage(stage, 'error', message);
      if (typeof window.__PM_REPORT_CLIENT_ERROR__ === 'function') {
        window.__PM_REPORT_CLIENT_ERROR__(`home.${stage}`, error, { phase: 'home-phase-1' });
      }
    }
  });

  window.__PM_HOME_RUNTIME__ = runtime;
  pushStage('runtime');
  return runtime;
}

export function markHomeBootError(error) {
  const runtime = window.__PM_HOME_RUNTIME__ || installHomeRuntimeBridge();
  runtime.report('boot', error);
  document.documentElement.classList.remove('pm-home-booting');
  document.documentElement.classList.add('pm-home-boot-error');
  const target = document.getElementById('homeBootStatus') || document.querySelector('[data-home-boot-status]');
  if (target) {
    target.hidden = false;
    target.textContent = 'AnaSayfa başlatılırken hata oluştu. Lütfen sayfayı yenileyin.';
  }
}
