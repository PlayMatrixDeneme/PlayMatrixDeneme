import { bootPlayMatrixHome } from './public/js/home/home-bootstrap.js?v=release-20260430';

bootPlayMatrixHome().catch((error) => {
  console.error('[PlayMatrix] Home boot failed', error);
  if (typeof window.__PM_REPORT_CLIENT_ERROR__ === 'function') {
    window.__PM_REPORT_CLIENT_ERROR__('home.boot', error, { source: 'script.js', phase: 'home-phase-1' });
  }
});
