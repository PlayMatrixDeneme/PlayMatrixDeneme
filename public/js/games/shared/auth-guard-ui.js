/* PlayMatrix Phase 8 auth-required classic game guard UI. */
export function createAuthGuardUI({ title = 'Giriş gerekli', message = 'Oynamak ve seviyene puan eklemek için hesabınla giriş yap.', loginUrl = '/' } = {}) {
  let node = document.getElementById('pmClassicAuthGuard');
  if (!node) {
    node = document.createElement('div');
    node.id = 'pmClassicAuthGuard';
    node.className = 'pm-classic-auth-guard';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-live', 'polite');
    node.innerHTML = `
      <div class="pm-classic-auth-card">
        <div class="pm-classic-auth-title"></div>
        <div class="pm-classic-auth-message"></div>
        <button class="pm-classic-auth-button" type="button">GİRİŞ YAP</button>
      </div>`;
    document.body.appendChild(node);
  }
  const titleEl = node.querySelector('.pm-classic-auth-title');
  const messageEl = node.querySelector('.pm-classic-auth-message');
  const buttonEl = node.querySelector('.pm-classic-auth-button');
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (buttonEl && !buttonEl.dataset.pmAuthGuardBound) {
    buttonEl.dataset.pmAuthGuardBound = '1';
    buttonEl.addEventListener('click', () => {
      try { sessionStorage.setItem('pm_open_login_after_home', '1'); } catch (_) {}
      window.location.href = loginUrl || '/';
    });
  }
  return {
    node,
    show() {
      node.hidden = false;
      document.documentElement.classList.add('pm-classic-auth-required');
    },
    hide() {
      node.hidden = true;
      document.documentElement.classList.remove('pm-classic-auth-required');
    }
  };
}
