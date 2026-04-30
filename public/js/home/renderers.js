import { createEl, replaceChildrenSafe, safeText, setSafeImage } from './dom-utils.js';

export function renderEmptyState(target, text, className = 'pm-empty-state') {
  return replaceChildrenSafe(target, [createEl('div', { className, text })]);
}

export function renderMetricValue(target, value, formatter = (v) => v) {
  if (!target) return null;
  target.textContent = safeText(formatter(value), '0');
  return target;
}

export function createAvatarNode({ src = '', alt = 'Oyuncu avatarı', className = 'pm-avatar-img' } = {}) {
  const img = document.createElement('img');
  img.className = className;
  img.alt = safeText(alt, 'Oyuncu avatarı');
  img.loading = 'lazy';
  img.decoding = 'async';
  setSafeImage(img, src);
  return img;
}


export function createAvatarFrameNode({
  avatarUrl = '',
  frameId = 0,
  size = 56,
  level = 1,
  locked = false,
  interactive = false,
  extraClass = '',
  alt = 'Oyuncu avatarı'
} = {}) {
  if (window.PMAvatar?.AvatarFrame) {
    return window.PMAvatar.AvatarFrame({ avatarUrl, frameId, size, level, locked, interactive, extraClass, alt });
  }
  const shell = document.createElement('span');
  shell.className = ['pm-avatar-frame-contract', extraClass, locked ? 'is-locked' : '', interactive ? 'is-interactive' : ''].filter(Boolean).join(' ');
  shell.dataset.pmAvatarFrameContract = 'v1';
  shell.dataset.frameId = String(frameId || 0);
  shell.dataset.frameLocked = locked ? 'true' : 'false';
  shell.dataset.interactive = interactive ? 'true' : 'false';
  shell.appendChild(createAvatarNode({ src: avatarUrl, alt, className: 'pm-avatar-img' }));
  return shell;
}


export function installSafeRenderGuards(root = document) {
  root.querySelectorAll?.('[data-stat-value]').forEach((node) => {
    node.textContent = safeText(node.textContent || node.dataset.statValue || '0', '0');
  });
  root.querySelectorAll?.('img[data-pm-avatar-src]').forEach((img) => {
    setSafeImage(img, img.dataset.pmAvatarSrc || img.getAttribute('src') || '');
  });
  window.__PM_SAFE_RENDER__ = Object.freeze({
    renderEmptyState,
    renderMetricValue,
    createAvatarNode,
    createAvatarFrameNode
  });
  return true;
}

const SHEET_META = Object.freeze({
  auth: { title: 'Hesabına giriş yap', subtitle: 'Oyunlara, çarka ve profil araçlarına güvenli oturumla eriş.' },
  forgot: { title: 'Şifre sıfırlama', subtitle: 'Kayıtlı e-posta adresine güvenli sıfırlama bağlantısı gönder.' },
  profile: { title: 'Hesap Merkezi', subtitle: 'Avatar, çerçeve, bakiye ve hesap ilerlemeni tek panelden yönet.' },
  wheel: { title: 'Günlük Çark', subtitle: 'E-posta doğrulaması sonrası günlük ödül durumunu kontrol et.' },
  promo: { title: 'Promosyon Kodu', subtitle: 'Geçerli kodları hesabına güvenli şekilde uygula.' },
  support: { title: 'Canlı Destek', subtitle: 'Sorununu kategori, öncelik ve detayla ilet.' },
  invite: { title: 'Davet Et ve Kazan', subtitle: 'Davet kodunu ve bağlantını tek panelden oluştur.' },
  social: { title: 'Sosyal Merkez', subtitle: 'Yerel sohbet, DM kutusu, arkadaşlık ve oyun davetlerini yönet.' }
});

function getNode(id) {
  return document.getElementById(id);
}

function setAuthMode(mode = 'login') {
  const nextMode = mode === 'register' ? 'register' : 'login';
  document.querySelectorAll('#authSegment [data-auth-mode]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.authMode === nextMode);
  });
  const fullName = getNode('authFullNameGroup');
  const username = getNode('authUsernameGroup');
  if (fullName) fullName.classList.toggle('hidden', nextMode !== 'register');
  if (username) username.classList.toggle('hidden', nextMode !== 'register');
  const title = getNode('authTitle');
  if (title) title.textContent = nextMode === 'register' ? 'Yeni hesap oluştur' : 'Hesabına giriş yap';
  const submit = getNode('authSubmitBtn');
  if (submit) submit.textContent = nextMode === 'register' ? 'Kayıt Ol' : 'Giriş Yap';
  document.body.dataset.authMode = nextMode;
  return nextMode;
}

function openSheet(name = 'auth', title = '', subtitle = '') {
  const sheetName = Object.prototype.hasOwnProperty.call(SHEET_META, name) ? name : 'auth';
  const meta = SHEET_META[sheetName];
  const shell = getNode('sheetShell');
  const sheetTitle = getNode('sheetTitle');
  const sheetSubtitle = getNode('sheetSubtitle');
  if (!shell) return false;

  if (sheetTitle) sheetTitle.textContent = title || meta.title;
  if (sheetSubtitle) sheetSubtitle.textContent = subtitle || meta.subtitle;
  document.querySelectorAll('.sheet-section').forEach((section) => {
    const isActive = section.dataset.sheet === sheetName;
    section.classList.toggle('is-active', isActive);
    section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  shell.classList.toggle('is-compact', ['auth', 'forgot', 'wheel', 'promo'].includes(sheetName));
  shell.classList.toggle('is-social', sheetName === 'social');
  shell.classList.add('is-open');
  shell.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sheet-open');
  document.body.dataset.currentSheet = sheetName;
  return true;
}

function closeSheet() {
  const shell = getNode('sheetShell');
  if (!shell) return false;
  shell.classList.remove('is-open', 'is-social', 'is-compact');
  shell.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sheet-open');
  delete document.body.dataset.currentSheet;
  return true;
}

function hasCurrentUser() {
  try { return Boolean(window.__PM_RUNTIME?.auth?.currentUser); } catch (_) { return false; }
}

function requireAuth(actionName) {
  if (hasCurrentUser()) return true;
  setAuthMode('login');
  openSheet('auth', 'Hesabına giriş yap', `${actionName} için önce hesabına giriş yapmalısın.`);
  return false;
}

function openProfileSheet() {
  if (!requireAuth('Hesap paneli')) return false;
  return openSheet('profile');
}

function openWheelSheet() {
  if (!requireAuth('Günlük çark')) return false;
  return openSheet('wheel');
}

function openPromoSheet() {
  if (!requireAuth('Promosyon kodu')) return false;
  return openSheet('promo');
}

function openInviteSheet() {
  if (!requireAuth('Davet sistemi')) return false;
  return openSheet('invite');
}

function openSocialSheet() {
  if (!requireAuth('Sosyal Merkez')) return false;
  return openSheet('social');
}

function openSupportSheet() {
  return openSheet('support');
}

function activateMobileTab(trigger) {
  document.querySelectorAll('.mobile-tab').forEach((button) => button.classList.toggle('is-active', button === trigger));
}

function scrollToSection(selector) {
  const target = selector ? document.querySelector(selector) : null;
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

function bindShellClickDelegation() {
  if (document.body?.dataset.homeShellDelegationBound === '1') return;
  if (document.body) document.body.dataset.homeShellDelegationBound = '1';

  document.addEventListener('click', (event) => {
    const target = event.target?.closest?.('#brandHome, #loginBtn, #registerBtn, #heroStartBtn, #profileTrigger, #navProfileItem, #navWheelItem, #navBonusItem, #navSupportItem, #navInviteItem, #navSocialItem, #navSocialTopBtn, #sheetBackdrop, #sheetClose, .mobile-tab, #authSegment [data-auth-mode], [data-home-sheet]');
    if (!target) return;

    if (target.matches('#brandHome')) {
      event.preventDefault();
      scrollToSection('#hero');
      return;
    }

    if (target.matches('#loginBtn')) {
      event.preventDefault();
      setAuthMode('login');
      openSheet('auth');
      return;
    }

    if (target.matches('#registerBtn')) {
      event.preventDefault();
      setAuthMode('register');
      openSheet('auth', 'Yeni hesap oluştur', 'Kullanıcı adı ve e-posta ile hızlı kayıt akışı.');
      return;
    }

    if (target.matches('#heroStartBtn')) {
      event.preventDefault();
      if (hasCurrentUser()) openProfileSheet();
      else {
        setAuthMode('register');
        openSheet('auth', 'Yeni hesap oluştur', 'Ücretsiz hesabını oluştur ve oyun vitrinine hemen başla.');
      }
      return;
    }

    if (target.matches('#profileTrigger')) {
      event.preventDefault();
      const dropdown = getNode('userDropdown');
      const isOpen = dropdown?.classList.toggle('active');
      target.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      return;
    }

    if (target.matches('#navProfileItem')) { event.preventDefault(); getNode('userDropdown')?.classList.remove('active'); openProfileSheet(); return; }
    if (target.matches('#navWheelItem')) { event.preventDefault(); getNode('userDropdown')?.classList.remove('active'); openWheelSheet(); return; }
    if (target.matches('#navBonusItem')) { event.preventDefault(); getNode('userDropdown')?.classList.remove('active'); openPromoSheet(); return; }
    if (target.matches('#navSupportItem')) { event.preventDefault(); getNode('userDropdown')?.classList.remove('active'); openSupportSheet(); return; }
    if (target.matches('#navInviteItem')) { event.preventDefault(); getNode('userDropdown')?.classList.remove('active'); openInviteSheet(); return; }
    if (target.matches('#navSocialItem, #navSocialTopBtn')) { event.preventDefault(); getNode('userDropdown')?.classList.remove('active'); openSocialSheet(); return; }

    if (target.matches('#sheetBackdrop, #sheetClose')) {
      event.preventDefault();
      closeSheet();
      return;
    }

    if (target.matches('#authSegment [data-auth-mode]')) {
      event.preventDefault();
      setAuthMode(target.dataset.authMode);
      return;
    }

    const sheetName = target.dataset.homeSheet;
    if (sheetName) {
      event.preventDefault();
      openSheet(sheetName);
      return;
    }

    if (target.matches('.mobile-tab')) {
      const link = target.dataset.mobileLink;
      const action = target.dataset.mobileAction;
      event.preventDefault();
      if (link && scrollToSection(link)) { activateMobileTab(target); return; }
      if (action === 'profile') { activateMobileTab(target); openProfileSheet(); return; }
      if (action === 'social') { activateMobileTab(target); openSocialSheet(); return; }
    }
  }, true);

  document.addEventListener('click', (event) => {
    const dropdown = getNode('userDropdown');
    const trigger = getNode('profileTrigger');
    if (!dropdown?.classList.contains('active')) return;
    if (event.target?.closest?.('#userDropdown, #profileTrigger')) return;
    dropdown.classList.remove('active');
    trigger?.setAttribute('aria-expanded', 'false');
  }, true);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSheet();
  }, { passive: true });
}

export function installHomeShellInteractions() {
  bindShellClickDelegation();
  window.setAuthMode = window.setAuthMode || setAuthMode;
  window.openSheet = window.openSheet || openSheet;
  window.closeSheet = window.closeSheet || closeSheet;
  window.openProfileSheet = window.openProfileSheet || openProfileSheet;
  window.openWheelSheet = window.openWheelSheet || openWheelSheet;
  window.openPromoSheet = window.openPromoSheet || openPromoSheet;
  window.openSupportSheet = window.openSupportSheet || openSupportSheet;
  window.openInviteSheet = window.openInviteSheet || openInviteSheet;
  window.openSocialSheet = window.openSocialSheet || openSocialSheet;
  setAuthMode(document.body?.dataset.authMode || 'login');
  return true;
}
