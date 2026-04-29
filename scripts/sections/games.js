import { el, clear, safeText } from '../core/dom.js';
import { filters, games } from '../data/home-data.js';
import { homeState, setFilter, setQuery } from '../app/state.js';
import { showToast } from '../components/toast.js';

export function renderGameFilters() {
  const root = document.querySelector('[data-game-filters]');
  clear(root);
  filters.forEach((filter) => {
    const button = el('button', filter.id === homeState.filter ? 'is-active' : '', filter.label);
    button.type = 'button';
    button.addEventListener('click', () => { setFilter(filter.id); renderGameFilters(); renderGames(); });
    root.append(button);
  });
  const search = document.querySelector('[data-game-search]');
  if (search && !search.dataset.bound) {
    search.dataset.bound = '1';
    search.addEventListener('input', () => { setQuery(search.value); renderGames(); });
  }
}

export function renderGames() {
  const root = document.querySelector('[data-games]');
  clear(root);
  const query = safeText(homeState.query).toLowerCase();
  const list = games.filter((game) => {
    const categoryMatch = homeState.filter === 'all' || game.category === homeState.filter;
    const queryMatch = !query || `${game.title} ${game.text} ${game.tags.join(' ')}`.toLowerCase().includes(query);
    return categoryMatch && queryMatch;
  });
  list.forEach((game) => {
    const card = el('article', 'pm-game-card');
    card.style.setProperty('--card-glow', game.glow);
    const header = el('header');
    header.append(el('span', 'pm-card-icon', game.icon));
    const copy = el('div');
    copy.append(el('h3', '', game.title), el('p', '', game.text));
    const tags = el('div', 'pm-tag-row');
    game.tags.forEach((tag) => tags.append(el('span', 'pm-tag', tag)));
    copy.append(tags);
    const footer = el('footer');
    footer.append(el('span', 'pm-status', 'Sonraki faz'), disabledButton());
    card.append(header, copy, footer);
    root.append(card);
  });
}

function disabledButton() {
  const button = el('button', 'pm-card-button', 'Pasif');
  button.type = 'button';
  button.addEventListener('click', () => showToast('Oyun sayfaları bu AnaSayfa paketine eklenmedi.'));
  return button;
}
