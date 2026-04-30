import { homeFetch } from './api.js';
import { bindIfPresent, byId, setText } from './dom-utils.js';

const AUTH_HELP_ID = 'authHelp';
const AUTH_SUBMIT_ID = 'authSubmitBtn';
const REGISTER_STEPS = ['identity', 'security', 'confirm'];
const LOGIN_STEPS = ['identifier', 'password'];

const state = {
  mode: 'login',
  loginStep: 'identifier',
  registerStep: 'identity',
  resolvedEmail: '',
  resolvedDisplay: ''
};

const qsa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const val = (id) => String(byId(id)?.value || '').trim();
const setVal = (id, value) => { const el = byId(id); if (el) el.value = value || ''; };
const emailLike = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

function activeAuthSheet() {
  return document.querySelector('.sheet-section[data-sheet="auth"].is-active');
}

function activeForgotSheet() {
  return document.querySelector('.sheet-section[data-sheet="forgot"].is-active');
}

function maskEmail(email = '') {
  const safe = String(email || '').trim().toLowerCase();
  const [name = '', domain = ''] = safe.split('@');
  if (!name || !domain) return safe || '—';
  const head = name.slice(0, Math.min(2, name.length));
  const tail = name.length > 4 ? name.slice(-1) : '';
  return `${head}${'•'.repeat(Math.max(3, Math.min(7, name.length - head.length - tail.length)))}${tail}@${domain}`;
}

function safeIdentifier(value = '') {
  return String(value || '').trim().replace(/\s+/g, '');
}

function validateUsername(value = '') {
  return /^[a-zA-Z0-9_]{3,20}$/.test(String(value || '').trim());
}

function clearFieldErrors() {
  qsa('.auth-field-group.is-error').forEach((node) => node.classList.remove('is-error'));
  qsa('.field-shell.is-error').forEach((node) => node.classList.remove('is-error'));
}

function markError(...ids) {
  ids.filter(Boolean).forEach((id) => {
    const group = byId(id);
    const shell = group?.querySelector?.('.field-shell') || group?.closest?.('.field-shell');
    group?.classList?.add?.('is-error');
    shell?.classList?.add?.('is-error');
  });
}

export function setAuthBusy(isBusy, label = 'İşleniyor…') {
  const button = byId(AUTH_SUBMIT_ID);
  if (!button) return;
  button.disabled = !!isBusy;
  button.dataset.busy = isBusy ? '1' : '0';
  if (isBusy) button.dataset.idleLabel = button.textContent || 'Devam Et';
  button.textContent = isBusy ? label : (button.dataset.idleLabel || button.textContent || 'Devam Et');
}

function setForgotBusy(isBusy, label = 'Gönderiliyor…') {
  const button = byId('forgotSubmitBtn');
  if (!button) return;
  button.disabled = !!isBusy;
  button.dataset.busy = isBusy ? '1' : '0';
  if (isBusy) button.dataset.idleLabel = button.textContent || 'Şifre Sıfırlama Gönder';
  button.textContent = isBusy ? label : (button.dataset.idleLabel || 'Şifre Sıfırlama Gönder');
}

export function setAuthHelp(message = '', tone = '') {
  const help = setText(AUTH_HELP_ID, message);
  if (!help) return;
  help.className = `field-help auth-flow-help${tone ? ` is-${tone}` : ''}`;
}

function setForgotHelp(message = '', tone = '') {
  const help = setText('forgotHelp', message);
  if (!help) return;
  help.className = `field-help${tone ? ` is-${tone}` : ''}`;
}

function setHeader(title = '', subtitle = '') {
  const titleEl = byId('sheetTitle');
  const subtitleEl = byId('sheetSubtitle');
  if (titleEl && title) titleEl.textContent = title;
  if (subtitleEl && subtitle) subtitleEl.textContent = subtitle;
}

function syncBridgeButtons() {
  qsa('#authSegment [data-auth-mode]').forEach((button) => {
    const active = button.dataset.authMode === state.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function setView(viewName) {
  qsa('[data-auth-view]').forEach((view) => {
    const active = view.dataset.authView === viewName;
    view.hidden = !active;
    view.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
}

function syncRegisterProgress() {
  const progress = byId('registerProgress');
  const visible = state.mode === 'register';
  if (progress) progress.hidden = !visible;
  qsa('[data-register-dot]').forEach((dot) => {
    dot.classList.toggle('is-active', dot.dataset.registerDot === state.registerStep);
  });
}

function copyRegisterFieldsForLegacy() {
  const registerEmail = val('authRegisterEmail');
  const registerPassword = byId('authRegisterPassword')?.value || '';
  if (registerEmail) setVal('authEmail', registerEmail);
  if (registerPassword) setVal('authPassword', registerPassword);
}

function syncConfirm() {
  const username = val('authUsername') || val('authFullName') || 'Yeni Oyuncu';
  const email = val('authRegisterEmail') || '—';
  setText('authConfirmUsername', username);
  setText('authConfirmEmail', email);
}

function syncControls() {
  const auth = byId('authFlow');
  const section = document.querySelector('.sheet-section[data-sheet="auth"]');
  if (auth) {
    auth.dataset.authMode = state.mode;
    auth.dataset.loginStep = state.loginStep;
    auth.dataset.registerStep = state.registerStep;
  }
  if (section) {
    section.dataset.authMode = state.mode;
    section.dataset.loginStep = state.loginStep;
    section.dataset.registerStep = state.registerStep;
  }
  syncBridgeButtons();
  syncRegisterProgress();
  clearFieldErrors();
  qsa('#authFullNameGroup,#authUsernameGroup').forEach((node) => {
    node.classList.toggle('hidden', state.mode !== 'register' || state.registerStep !== 'identity');
  });
  setAuthBusy(false);

  const back = byId('authBackBtn');
  const forgot = byId('forgotPasswordBtn');
  const switchMode = byId('authSwitchModeBtn');
  const submit = byId(AUTH_SUBMIT_ID);

  if (state.mode === 'register') {
    const view = `register-${state.registerStep}`;
    setView(view);
    setHeader('Kayıt Ol', 'Hesabını üç kısa adımda oluştur.');
    if (back) back.hidden = state.registerStep === 'identity';
    if (forgot) forgot.hidden = true;
    if (switchMode) { switchMode.hidden = false; switchMode.textContent = 'Zaten hesabın var mı? Giriş yap'; }
    if (submit) submit.textContent = state.registerStep === 'confirm' ? 'Hesap Oluştur' : 'Devam Et';
    syncConfirm();
    return;
  }

  if (state.loginStep === 'password') {
    setView('login-password');
    setHeader('Şifrenizi Giriniz', 'Hesabını doğrula ve güvenli giriş yap.');
    if (back) back.hidden = false;
    if (forgot) forgot.hidden = true;
    if (switchMode) switchMode.hidden = true;
    if (submit) submit.textContent = 'Giriş Yap';
    setText('authResolvedIdentity', state.resolvedDisplay || maskEmail(val('authEmail')) || 'Hesap bilgisi');
  } else {
    setView('login-identifier');
    setHeader('Giriş Yapın', 'Kullanıcı adı veya e-posta ile devam et.');
    if (back) back.hidden = true;
    if (forgot) forgot.hidden = false;
    if (switchMode) { switchMode.hidden = false; switchMode.textContent = 'Hesabın yok mu? Kayıt ol'; }
    if (submit) submit.textContent = 'Devam Et';
  }
}

function setMode(mode = 'login', reset = true) {
  state.mode = mode === 'register' ? 'register' : 'login';
  if (reset) {
    state.loginStep = 'identifier';
    state.registerStep = 'identity';
    state.resolvedEmail = '';
    state.resolvedDisplay = '';
  }
  if (state.mode === 'register') copyRegisterFieldsForLegacy();
  setAuthHelp('');
  syncControls();
}

function goBack() {
  if (state.mode === 'register') {
    const index = REGISTER_STEPS.indexOf(state.registerStep);
    if (index > 0) state.registerStep = REGISTER_STEPS[index - 1];
  } else if (state.loginStep === 'password') {
    state.loginStep = 'identifier';
  }
  setAuthHelp('');
  syncControls();
}

async function resolveIdentifier() {
  const identifier = safeIdentifier(val('authEmail'));
  if (!identifier) {
    markError('authEmailGroup');
    setAuthHelp('Kullanıcı adı veya e-posta zorunlu.', 'error');
    return false;
  }
  setAuthBusy(true, 'Kontrol ediliyor…');
  try {
    let email = identifier;
    let display = identifier;
    if (!identifier.includes('@')) {
      const payload = await homeFetch('/api/auth/resolve-login', { method: 'POST', body: { identifier } });
      if (!payload?.ok || !payload.email) throw new Error(payload?.error || 'Kullanıcı bulunamadı.');
      email = payload.email;
      display = payload.maskedEmail || payload.displayIdentifier || maskEmail(email);
    } else if (!emailLike(identifier)) {
      throw new Error('Geçerli bir e-posta veya kullanıcı adı gir.');
    } else {
      display = maskEmail(identifier);
    }
    state.resolvedEmail = email.toLowerCase();
    state.resolvedDisplay = display;
    setVal('authEmail', state.resolvedEmail);
    state.loginStep = 'password';
    setAuthHelp('');
    syncControls();
    window.requestAnimationFrame(() => byId('authPassword')?.focus?.({ preventScroll: true }));
    return true;
  } catch (error) {
    markError('authEmailGroup');
    setAuthHelp(error?.message || 'Giriş bilgisi doğrulanamadı.', 'error');
    return false;
  } finally {
    setAuthBusy(false);
  }
}

function validateLoginPassword() {
  const password = byId('authPassword')?.value || '';
  if (!password) {
    markError('authPasswordGroup');
    setAuthHelp('Şifre zorunlu.', 'error');
    return false;
  }
  try {
    const remember = !!byId('authRemember')?.checked;
    localStorage.setItem('pm_auth_remember', remember ? '1' : '0');
  } catch (_) {}
  setAuthHelp('');
  return true;
}

function validateRegisterIdentity() {
  const fullName = val('authFullName');
  const username = val('authUsername');
  const email = val('authRegisterEmail');
  if (!fullName || fullName.length < 2) {
    markError('authFullNameGroup');
    setAuthHelp('İsim soyisim zorunlu.', 'error');
    return false;
  }
  if (!validateUsername(username)) {
    markError('authUsernameGroup');
    setAuthHelp('Kullanıcı adı 3-20 karakter olmalı; harf, rakam ve alt çizgi kullanılabilir.', 'error');
    return false;
  }
  if (!emailLike(email)) {
    markError('authRegisterEmailGroup');
    setAuthHelp('Geçerli bir e-posta adresi gir.', 'error');
    return false;
  }
  setAuthHelp('');
  return true;
}

function validateRegisterPassword() {
  const password = byId('authRegisterPassword')?.value || '';
  if (password.length < 6) {
    markError('authRegisterPasswordGroup');
    setAuthHelp('Şifre en az 6 karakter olmalı.', 'error');
    return false;
  }
  copyRegisterFieldsForLegacy();
  setAuthHelp('');
  return true;
}

function prepareRegisterSubmit() {
  copyRegisterFieldsForLegacy();
  if (!validateRegisterIdentity() || !validateRegisterPassword()) return false;
  return true;
}

function handleSubmitCapture(event) {
  if (!event.target?.closest?.(`#${AUTH_SUBMIT_ID}`) || !activeAuthSheet()) return;
  clearFieldErrors();

  if (state.mode === 'login') {
    if (state.loginStep === 'identifier') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      resolveIdentifier();
      return;
    }
    if (!validateLoginPassword()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }
    setAuthBusy(true, 'Giriş yapılıyor…');
    window.setTimeout(() => setAuthBusy(false), 7000);
    return;
  }

  if (state.registerStep === 'identity') {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (validateRegisterIdentity()) {
      state.registerStep = 'security';
      syncControls();
      window.requestAnimationFrame(() => byId('authRegisterPassword')?.focus?.({ preventScroll: true }));
    }
    return;
  }

  if (state.registerStep === 'security') {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (validateRegisterPassword()) {
      state.registerStep = 'confirm';
      syncControls();
    }
    return;
  }

  if (!prepareRegisterSubmit()) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return;
  }
  setAuthBusy(true, 'Hesap oluşturuluyor…');
  window.setTimeout(() => setAuthBusy(false), 7000);
}

function installPasswordToggle(buttonId, inputId) {
  bindIfPresent(buttonId, 'click', () => {
    const input = byId(inputId);
    const button = byId(buttonId);
    if (!input || !button) return;
    const next = input.type === 'password' ? 'text' : 'password';
    input.type = next;
    const visible = next === 'text';
    button.setAttribute('aria-pressed', visible ? 'true' : 'false');
    button.setAttribute('aria-label', visible ? 'Şifreyi gizle' : 'Şifreyi göster');
    const icon = button.querySelector('i');
    if (icon) icon.className = `fa-regular ${visible ? 'fa-eye-slash' : 'fa-eye'}`;
  });
}

function handleModeBridge(event) {
  const button = event.target?.closest?.('#authSegment [data-auth-mode]');
  if (!button) return;
  window.setTimeout(() => setMode(button.dataset.authMode || 'login'), 0);
}

function handleTopAuth(event) {
  const login = event.target?.closest?.('#loginBtn');
  const register = event.target?.closest?.('#registerBtn,#heroStartBtn');
  if (!login && !register) return;
  window.setTimeout(() => setMode(register ? 'register' : 'login'), 0);
}

function handleSwitchMode(event) {
  if (!event.target?.closest?.('#authSwitchModeBtn')) return;
  event.preventDefault();
  event.stopPropagation();
  const next = state.mode === 'login' ? 'register' : 'login';
  setMode(next);
}

function handleBack(event) {
  if (!event.target?.closest?.('#authBackBtn')) return;
  event.preventDefault();
  event.stopPropagation();
  goBack();
}

function handleForgotOpen() {
  const email = state.resolvedEmail || (emailLike(val('authEmail')) ? val('authEmail') : '') || val('authRegisterEmail');
  setVal('forgotEmail', email);
  setVal('forgotIdentifier', !emailLike(val('authEmail')) ? val('authEmail') : val('authUsername'));
  setForgotHelp('');
}

function handleForgotBack(event) {
  if (!event.target?.closest?.('#forgotBackBtn')) return;
  event.preventDefault();
  event.stopPropagation();
  window.openSheet?.('auth', 'Giriş Yapın', 'Kullanıcı adı veya e-posta ile devam et.');
  window.setTimeout(() => setMode('login', false), 0);
}

function validateForgotCapture(event) {
  if (!event.target?.closest?.('#forgotSubmitBtn') || !activeForgotSheet()) return;
  const email = val('forgotEmail');
  if (!emailLike(email)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    byId('forgotEmailGroup')?.classList.add('is-error');
    setForgotHelp('Geçerli bir e-posta adresi zorunlu.', 'error');
    return;
  }
  setForgotBusy(true);
  window.setTimeout(() => setForgotBusy(false), 7000);
}

function clearOnInput(event) {
  if (!event.target?.matches?.('input')) return;
  clearFieldErrors();
  if (activeAuthSheet()) setAuthHelp('');
  if (activeForgotSheet()) setForgotHelp('');
}

function syncRegisterEmailMirror() {
  const email = byId('authRegisterEmail');
  if (!email || email.dataset.phase4MirrorBound === '1') return;
  email.dataset.phase4MirrorBound = '1';
  email.addEventListener('input', () => {
    if (state.mode === 'register') setVal('authEmail', email.value);
  });
}

function syncRegisterPasswordMirror() {
  const password = byId('authRegisterPassword');
  if (!password || password.dataset.phase4MirrorBound === '1') return;
  password.dataset.phase4MirrorBound = '1';
  password.addEventListener('input', () => {
    if (state.mode === 'register') setVal('authPassword', password.value);
  });
}

function syncFromSheetOpen(event) {
  const sheet = event?.detail?.sheet || '';
  if (sheet === 'auth') {
    window.setTimeout(() => syncControls(), 0);
  }
  if (sheet === 'forgot') {
    window.setTimeout(handleForgotOpen, 0);
  }
}

export function installAuthModalGuards() {
  if (document.body?.dataset.phase4AuthFlowBound === '1') return true;
  if (document.body) document.body.dataset.phase4AuthFlowBound = '1';

  bindIfPresent('authEmail', 'input', () => setAuthHelp(''));
  bindIfPresent('authPassword', 'input', () => setAuthHelp(''));
  bindIfPresent('authFullName', 'input', () => setAuthHelp(''));
  bindIfPresent('authUsername', 'input', () => setAuthHelp(''));
  bindIfPresent('authRegisterEmail', 'input', () => setAuthHelp(''));
  bindIfPresent('authRegisterPassword', 'input', () => setAuthHelp(''));
  bindIfPresent('forgotEmail', 'input', () => setForgotHelp(''));
  bindIfPresent('forgotIdentifier', 'input', () => setForgotHelp(''));

  installPasswordToggle('authPasswordToggle', 'authPassword');
  installPasswordToggle('authRegisterPasswordToggle', 'authRegisterPassword');
  syncRegisterEmailMirror();
  syncRegisterPasswordMirror();

  document.addEventListener('click', handleSubmitCapture, true);
  document.addEventListener('click', validateForgotCapture, true);
  document.addEventListener('click', handleTopAuth, false);
  document.addEventListener('click', handleModeBridge, false);
  document.addEventListener('click', handleSwitchMode, true);
  document.addEventListener('click', handleBack, true);
  document.addEventListener('click', handleForgotBack, true);
  document.addEventListener('click', (event) => {
    if (!event.target?.closest?.('#forgotPasswordBtn')) return;
    window.setTimeout(handleForgotOpen, 0);
  }, false);
  document.addEventListener('input', clearOnInput, true);
  window.addEventListener('pm:sheet:open', syncFromSheetOpen);
  window.addEventListener('pm:sheet:close', () => { setAuthBusy(false); setForgotBusy(false); });

  try {
    byId('authRemember') && (byId('authRemember').checked = localStorage.getItem('pm_auth_remember') === '1');
  } catch (_) {}

  setMode('login');
  window.__PM_AUTH_FLOW_PHASE4__ = Object.freeze({ setMode, setAuthHelp, setAuthBusy, maskEmail });
  return true;
}
