import { el, clear } from '../core/dom.js';
import { rewards } from '../data/home-data.js';

export function renderRewards() {
  const root = document.querySelector('[data-rewards]');
  clear(root);
  rewards.forEach((item) => {
    const card = el('button', 'pm-reward-card');
    card.type = 'button';
    card.dataset.modal = item.modal;
    card.append(el('span', 'pm-card-icon', item.icon), el('h3', '', item.title), el('p', '', item.text));
    root.append(card);
  });
}
