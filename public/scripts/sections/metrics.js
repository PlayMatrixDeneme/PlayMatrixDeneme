import { el, clear } from '../core/dom.js';
import { metrics } from '../data/home-data.js';

export function renderMetrics() {
  const root = document.querySelector('[data-metrics]');
  clear(root);
  metrics.forEach((metric) => {
    const card = el('article', 'pm-metric');
    card.append(el('span', '', metric.label), el('strong', '', metric.value), el('small', '', metric.detail));
    root.append(card);
  });
}
