import { el, clear } from '../core/dom.js';
import { leaderboard } from '../data/home-data.js';

export function renderLeaderboard() {
  const root = document.querySelector('[data-leaderboard]');
  clear(root);
  leaderboard.forEach((item, index) => {
    const row = el('article', 'pm-leader-row');
    row.append(el('span', 'pm-leader-rank', String(index + 1)));
    const name = el('div', 'pm-leader-name');
    name.append(el('strong', '', item.name), el('span', '', `Seviye ${item.level}`));
    const score = el('div', 'pm-leader-score');
    score.append(el('strong', '', item.score), el('span', '', 'puan'));
    row.append(name, score);
    root.append(row);
  });
}
