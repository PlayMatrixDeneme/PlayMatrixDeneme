import { el, clear } from '../core/dom.js';
import { supportCards } from '../data/home-data.js';

export function renderSupport() {
  const root = document.querySelector('[data-support-preview]');
  clear(root);
  supportCards.forEach((item) => {
    const card = el('button', 'pm-support-card');
    card.type = 'button';
    card.dataset.modal = item.modal;
    card.append(el('h3', '', item.title), el('p', '', item.text));
    root.append(card);
  });
}
