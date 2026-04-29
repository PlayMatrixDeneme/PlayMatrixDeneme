import { el, clear } from '../core/dom.js';
import { socials } from '../data/home-data.js';

export function renderSocial() {
  const root = document.querySelector('[data-social]');
  clear(root);
  socials.forEach((item) => {
    const card = el('button', 'pm-social-card');
    card.type = 'button';
    card.dataset.modal = item.modal;
    card.append(el('span', 'pm-card-icon', item.icon), el('h3', '', item.title), el('p', '', item.text));
    root.append(card);
  });
}
