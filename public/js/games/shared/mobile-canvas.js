/* PlayMatrix Phase 8 mobile canvas viewport fitter. */
function getViewportSize() {
  const vv = window.visualViewport;
  return {
    width: Math.max(1, Math.floor(vv?.width || window.innerWidth || document.documentElement.clientWidth || 1)),
    height: Math.max(1, Math.floor(vv?.height || window.innerHeight || document.documentElement.clientHeight || 1))
  };
}

export function fitCanvasToViewport({ canvas, wrapper = null, logicalWidth = 0, logicalHeight = 0, maxWidth = 420, reservedHeight = 180, minScale = 0.58, allowUpscale = false } = {}) {
  const node = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
  if (!node) return null;

  const baseW = Math.max(1, Number(logicalWidth || node.width || node.getAttribute('width') || 300));
  const baseH = Math.max(1, Number(logicalHeight || node.height || node.getAttribute('height') || 300));
  const viewport = getViewportSize();
  const usableW = Math.max(180, viewport.width - 24);
  const usableH = Math.max(180, viewport.height - Math.max(80, Number(reservedHeight) || 180));
  const widthLimit = Math.min(Math.max(180, Number(maxWidth) || baseW), usableW);
  const heightLimit = usableH;
  let scale = Math.min(widthLimit / baseW, heightLimit / baseH);
  if (!allowUpscale) scale = Math.min(1, scale);
  scale = Math.max(0.2, scale);
  if (Number.isFinite(Number(minScale)) && scale < Number(minScale)) {
    node.dataset.pmCanvasBelowPreferredScale = 'true';
  }

  const cssWidth = Math.max(1, Math.floor(baseW * scale));
  const cssHeight = Math.max(1, Math.floor(baseH * scale));
  node.style.width = `${cssWidth}px`;
  node.style.height = `${cssHeight}px`;
  node.dataset.pmMobileCanvasReady = 'true';
  node.dataset.pmCanvasScale = String(Math.round(scale * 1000) / 1000);

  const host = typeof wrapper === 'string' ? document.querySelector(wrapper) : wrapper;
  if (host) {
    host.style.maxWidth = `${Math.min(widthLimit, maxWidth || widthLimit)}px`;
    host.dataset.pmMobileCanvasReady = 'true';
  }

  return { width: cssWidth, height: cssHeight, scale, viewport };
}

export function installMobileCanvasResize(options = {}) {
  let frame = 0;
  const run = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fitCanvasToViewport(options));
  };
  run();
  window.addEventListener('resize', run, { passive: true });
  window.addEventListener('orientationchange', run, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', run, { passive: true });
  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('resize', run);
    window.removeEventListener('orientationchange', run);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', run);
  };
}
