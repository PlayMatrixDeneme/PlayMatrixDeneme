import { byId } from './dom-utils.js';
import { syncHomeModalScrollLock } from './mobile-scroll.js';

const COMPACT = new Set(['auth','forgot','wheel','promo','support','invite']);
const PROXY = Object.freeze({ wheel:'navWheelItem', promo:'navBonusItem', support:'navSupportItem', profile:'navProfileItem', social:'navSocialItem', invite:'navInviteItem' });
const META = Object.freeze({
  auth:['Hesabına giriş yap','Oyunlara, çarka ve profil araçlarına güvenli eriş.'],
  forgot:['Şifremi Unuttum','Sıfırlama bağlantısı e-posta adresine gönderilir.'],
  profile:['Hesabım','Avatar, kullanıcı adı ve hesap araçlarını yönet.'],
  wheel:['Günlük Çark','Her gün ücretsiz MC ödülü kazanmak için çarkı çevir.'],
  promo:['Promosyonlar','Kodunu gir, PlayMatrix ödülünü güvenli şekilde aktif et.'],
  support:['Destek','Sorununu ilet, destek kaydını tek panelden takip et.'],
  invite:['Davet Et','Davet kodunu ve bağlantını tek dokunuşla paylaş.'],
  social:['Sosyal Merkez','Arkadaşlarını, sohbetleri ve bildirimleri tek merkezden yönet.']
});
const SHEET_TO_TAB = Object.freeze({ promo:'promo', wheel:'wheel', support:'support' });
let installed = false;
let lastFocus = null;
let drag = null;

const shell = () => byId('sheetShell');
const panel = () => byId('sheetPanel');
const titleEl = () => byId('sheetTitle');
const subtitleEl = () => byId('sheetSubtitle');
const activeSheet = () => document.querySelector('.sheet-section.is-active')?.dataset?.sheet || '';

function focusables(root) {
  return Array.from(root?.querySelectorAll?.('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || [])
    .filter((el) => !el.hidden && el.offsetParent !== null);
}

export function setPhase3MobileTab(key = '') {
  document.querySelectorAll('.mobile-nav .mobile-tab').forEach((tab) => {
    const active = Boolean(key && tab.dataset.mobileKey === key);
    tab.classList.toggle('is-active', active);
    if (active) tab.setAttribute('aria-current','page'); else tab.removeAttribute('aria-current');
  });
}

function syncTabFromScroll() {
  if (shell()?.classList.contains('is-open')) return;
  let key = 'home';
  [['home', byId('hero')], ['games', byId('games')]].forEach(([name, node]) => {
    if (node && node.getBoundingClientRect().top <= window.innerHeight * .38) key = name;
  });
  setPhase3MobileTab(key);
}

function activateSection(name) {
  let ok = false;
  document.querySelectorAll('.sheet-section').forEach((section) => {
    const active = section.dataset.sheet === name;
    section.classList.toggle('is-active', active);
    section.toggleAttribute('hidden', !active);
    section.setAttribute('aria-hidden', active ? 'false' : 'true');
    if (active) ok = true;
  });
  return ok;
}

function chrome(name, title = '', subtitle = '') {
  const sh = shell();
  const pn = panel();
  if (!sh || !pn) return false;
  const meta = META[name] || ['Panel','İçerik hazırlanıyor.'];
  if (titleEl()) titleEl().textContent = title || meta[0];
  if (subtitleEl()) subtitleEl().textContent = subtitle || meta[1];
  sh.dataset.activeSheet = name;
  pn.dataset.activeSheet = name;
  sh.classList.toggle('is-compact', COMPACT.has(name));
  sh.classList.toggle('is-social', name === 'social');
  sh.classList.remove('is-dragging');
  pn.style.removeProperty('--sheet-drag-y');
  pn.style.removeProperty('transform');
  return true;
}

export function openPhase3Sheet(name, title = '', subtitle = '', options = {}) {
  const sheetName = String(name || '').trim();
  const sh = shell();
  const pn = panel();
  if (!sheetName || !sh || !pn || !activateSection(sheetName)) return false;
  if (options.restoreFocus !== false) lastFocus = document.activeElement;
  chrome(sheetName, title, subtitle);
  sh.classList.add('is-open');
  sh.setAttribute('aria-hidden','false');
  pn.setAttribute('aria-modal','true');
  pn.setAttribute('tabindex','-1');
  document.body.classList.add('sheet-open','pm-sheet-open');
  document.documentElement.classList.add('pm-sheet-open');
  if (SHEET_TO_TAB[sheetName]) setPhase3MobileTab(SHEET_TO_TAB[sheetName]);
  window.setTimeout(syncHomeModalScrollLock, 0);
  window.requestAnimationFrame(() => (byId('sheetClose') || focusables(pn)[0] || pn)?.focus?.({ preventScroll:true }));
  window.dispatchEvent(new CustomEvent('pm:sheet:open', { detail:{ sheet:sheetName } }));
  return true;
}

export function closePhase3Sheet(options = {}) {
  const sh = shell();
  const pn = panel();
  if (!sh || !pn || !sh.classList.contains('is-open')) return false;
  const name = activeSheet();
  sh.classList.remove('is-open','is-compact','is-social','is-dragging');
  sh.setAttribute('aria-hidden','true');
  sh.removeAttribute('data-active-sheet');
  pn.removeAttribute('data-active-sheet');
  pn.style.removeProperty('--sheet-drag-y');
  pn.style.removeProperty('transform');
  document.body.classList.remove('sheet-open','pm-sheet-open');
  document.documentElement.classList.remove('pm-sheet-open');
  window.setTimeout(syncHomeModalScrollLock, 0);
  if (options.restoreFocus !== false && lastFocus?.focus) window.requestAnimationFrame(() => lastFocus.focus({ preventScroll:true }));
  lastFocus = null;
  syncTabFromScroll();
  window.dispatchEvent(new CustomEvent('pm:sheet:close', { detail:{ sheet:name } }));
  return true;
}

function proxyAction(action) {
  const proxy = byId(PROXY[action] || '');
  if (!proxy) return false;
  proxy.click();
  return true;
}

function handleMobileTab(event) {
  const tab = event.target?.closest?.('.mobile-nav .mobile-tab');
  if (!tab) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  const key = tab.dataset.mobileKey || tab.dataset.mobileAction || 'home';
  const link = tab.dataset.mobileLink;
  const action = tab.dataset.mobileAction;
  if (link) {
    closePhase3Sheet({ restoreFocus:false });
    document.querySelector(link)?.scrollIntoView({ behavior:'smooth', block:'start' });
    setPhase3MobileTab(key);
    window.setTimeout(syncTabFromScroll, 380);
    return;
  }
  if (action) {
    setPhase3MobileTab(key);
    if (!proxyAction(action)) openPhase3Sheet(action, ...(META[action] || []));
  }
}

function handleClose(event) {
  if (!event.target?.closest?.('[data-sheet-close="true"],#sheetBackdrop,#sheetClose')) return;
  event.preventDefault();
  event.stopPropagation();
  closePhase3Sheet();
}

function handleKeys(event) {
  if (!shell()?.classList.contains('is-open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closePhase3Sheet();
    return;
  }
  if (event.key !== 'Tab') return;
  const items = focusables(panel());
  if (!items.length) {
    event.preventDefault();
    panel()?.focus?.({ preventScroll:true });
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus({ preventScroll:true });
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll:true });
  }
}

function installDrag() {
  const handle = byId('sheetHandle');
  const pn = panel();
  const sh = shell();
  if (!handle || !pn || !sh || handle.dataset.phase3DragBound === '1') return;
  handle.dataset.phase3DragBound = '1';
  const start = (y, pointerId = null) => {
    if (!sh.classList.contains('is-open') || window.innerWidth > 860) return;
    drag = { startY:y, deltaY:0 };
    sh.classList.add('is-dragging');
    try { if (pointerId !== null) handle.setPointerCapture(pointerId); } catch (_) {}
  };
  const move = (y) => {
    if (!drag) return;
    drag.deltaY = Math.max(0, y - drag.startY);
    pn.style.setProperty('--sheet-drag-y', `${drag.deltaY}px`);
  };
  const end = () => {
    if (!drag) return;
    const shouldClose = drag.deltaY > 112;
    drag = null;
    sh.classList.remove('is-dragging');
    pn.style.removeProperty('--sheet-drag-y');
    if (shouldClose) closePhase3Sheet();
  };
  handle.addEventListener('pointerdown', (event) => start(event.clientY, event.pointerId));
  window.addEventListener('pointermove', (event) => move(event.clientY), { passive:true });
  window.addEventListener('pointerup', end, { passive:true });
  handle.addEventListener('touchstart', (event) => start(Number(event.touches?.[0]?.clientY || 0)), { passive:true });
  handle.addEventListener('touchmove', (event) => move(Number(event.touches?.[0]?.clientY || 0)), { passive:true });
  handle.addEventListener('touchend', end, { passive:true });
  handle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closePhase3Sheet();
    }
  });
}

function syncLegacySheetState() {
  const sh = shell();
  if (!sh) return;
  if (!sh.classList.contains('is-open')) {
    document.body.classList.remove('pm-sheet-open');
    document.documentElement.classList.remove('pm-sheet-open');
    syncTabFromScroll();
    return;
  }
  document.body.classList.add('sheet-open','pm-sheet-open');
  document.documentElement.classList.add('pm-sheet-open');
  const name = activeSheet();
  if (name) { activateSection(name); chrome(name, titleEl()?.textContent || '', subtitleEl()?.textContent || ''); }
  if (SHEET_TO_TAB[name]) setPhase3MobileTab(SHEET_TO_TAB[name]);
  syncHomeModalScrollLock();
}

export function installPhase3SheetEngine(root = document) {
  if (installed || root?.body?.dataset.phase3SheetEngine === '1') return true;
  installed = true;
  if (root.body) root.body.dataset.phase3SheetEngine = '1';
  document.querySelectorAll('.sheet-section:not(.is-active)').forEach((section) => {
    section.setAttribute('aria-hidden','true');
    section.hidden = true;
  });
  document.addEventListener('click', handleMobileTab, true);
  document.addEventListener('click', handleClose, true);
  document.addEventListener('keydown', handleKeys, true);
  window.addEventListener('scroll', syncTabFromScroll, { passive:true });
  window.addEventListener('resize', syncTabFromScroll, { passive:true });
  installDrag();
  if (shell() && typeof MutationObserver === 'function') {
    new MutationObserver(syncLegacySheetState).observe(shell(), { attributes:true, attributeFilter:['class','aria-hidden'] });
  }
  window.openSheet = openPhase3Sheet;
  window.closeSheet = closePhase3Sheet;
  window.__PM_SHEET_ENGINE_PHASE3__ = Object.freeze({ open:openPhase3Sheet, close:closePhase3Sheet, setActiveMobileNav:setPhase3MobileTab, syncMobileNavFromScroll:syncTabFromScroll });
  syncTabFromScroll();
  syncLegacySheetState();
  return true;
}
