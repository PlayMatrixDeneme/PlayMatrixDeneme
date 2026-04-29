import { qs } from '../app/dom.js';

const modalCopy = new Map([
  ['account', {
    title: 'Hesabım',
    body: 'Bu alan sonraki account/seviye/avatar fazında gerçek profil API ile bağlanacak. Şu an tasarım ve modal davranışı test ediliyor.'
  }],
  ['quickMatch', {
    title: 'Hızlı Eşleş',
    body: 'Match queue ve socket bağlantısı oyun fazında eklenecek. Bu demo sadece AnaSayfa tasarım standardını gösterir.'
  }],
  ['gamesRoadmap', {
    title: 'Oyun Yol Haritası',
    body: 'Crash, Satranç, Pişti ve klasik oyunlar bu AnaSayfa tasarım dili üzerine sırayla taşınacak.'
  }]
]);

function lockBody(locked) {
  document.body.toggleAttribute('data-modal-open', locked);
}

export function closeModal() {
  const root = qs('#modalRoot');
  root.classList.remove('active');
  root.replaceChildren();
  lockBody(false);
}

export function openModal(type) {
  const root = qs('#modalRoot');
  const copy = modalCopy.get(type) || { title: 'Bilgi', body: 'Bu alan sonraki fazda bağlanacak.' };
  root.classList.add('active');
  root.replaceChildren();

  const backdrop = document.createElement('button');
  backdrop.className = 'pm-modal-backdrop';
  backdrop.type = 'button';
  backdrop.setAttribute('aria-label', 'Modalı kapat');
  backdrop.addEventListener('click', closeModal);

  const panel = document.createElement('section');
  panel.className = 'pm-modal-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.innerHTML = `
    <div class="pm-modal-header">
      <div>
        <p class="pm-eyebrow">PlayMatrix</p>
        <h2>${copy.title}</h2>
      </div>
      <button class="pm-icon-button" type="button" data-modal-close aria-label="Kapat">×</button>
    </div>
    <p class="pm-hero-text">${copy.body}</p>
  `;
  panel.querySelector('[data-modal-close]').addEventListener('click', closeModal);

  root.append(backdrop, panel);
  lockBody(true);
  panel.querySelector('[data-modal-close]').focus();
}

export function installModalTriggers() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-modal-target]');
    if (!trigger) return;
    event.preventDefault();
    openModal(trigger.getAttribute('data-modal-target'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}
