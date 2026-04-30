import { syncHomeModalScrollLock } from './mobile-scroll.js';

function getModal(id) {
  return typeof id === 'string' ? document.getElementById(id) : id;
}

export function openHomeModal(id) {
  const modal = getModal(id);
  if (!modal) return false;
  modal.hidden = false;
  modal.dataset.homeModalOpen = 'true';
  modal.classList.remove('is-closing');
  modal.classList.add('active', 'is-open', 'is-opening');
  modal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => modal.classList.remove('is-opening'), 160);
  syncHomeModalScrollLock();
  return true;
}

export function closeHomeModal(id) {
  const modal = getModal(id);
  if (!modal) return false;
  modal.classList.remove('active', 'is-open', 'is-opening');
  modal.classList.add('is-closing');
  modal.setAttribute('aria-hidden', 'true');
  modal.dataset.homeModalOpen = 'false';
  window.setTimeout(() => {
    if (modal.classList.contains('is-closing')) {
      modal.classList.remove('is-closing');
      modal.hidden = true;
    }
    syncHomeModalScrollLock();
  }, 120);
  return true;
}

export function installHomeModalManager(root = document) {
  root.querySelectorAll?.('.ps-modal:not(.active):not(.is-open)').forEach((modal) => {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  });

  document.addEventListener('click', (event) => {
    const close = event.target?.closest?.('[data-pm-action="closeMatrixModal"], [data-home-modal-close]');
    if (!close) return;
    const args = (() => {
      try { return JSON.parse(close.dataset.pmArgs || '[]'); } catch (_) { return []; }
    })();
    const id = close.dataset.homeModalClose || args[0] || close.closest?.('.ps-modal')?.id || '';
    if (!id) return;
    event.preventDefault();
    closeHomeModal(id);
  }, true);

  const observer = new MutationObserver(syncHomeModalScrollLock);
  observer.observe(document.body || document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class', 'aria-hidden', 'hidden', 'data-home-modal-open'] });
  window.__PM_HOME_MODAL_MANAGER__ = Object.freeze({ openHomeModal, closeHomeModal, syncHomeModalScrollLock });
  return true;
}
