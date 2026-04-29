import { el, qs } from './dom.js';
import { games, leaderboard, metrics, rewards, socialCards } from '../data/home-content.js';

export function renderMetrics() {
  const root = qs('#stats');
  root.replaceChildren(...metrics.map((item) => el('article', {
    className: 'pm-metric-card',
    children: [
      el('span', { text: item.label }),
      el('strong', { text: item.value }),
      el('span', { text: item.suffix })
    ]
  })));
}

export function renderGames() {
  const root = qs('#gameGrid');
  root.replaceChildren(...games.map((game) => {
    const card = el('article', { className: 'pm-game-card', attrs: { 'data-status': game.status } });
    card.style.setProperty('--game-glow', game.glow);
    card.append(
      el('div', { children: [
        el('h3', { text: game.title }),
        el('p', { text: game.description }),
        el('div', { className: 'pm-game-meta', children: game.tags.map((tag) => el('span', { className: 'pm-tag', text: tag })) })
      ]}),
      el('button', { className: 'pm-button pm-button-ghost pm-game-action', text: game.status === 'soon' ? 'Yakında' : 'Oyna', attrs: { type: 'button', 'data-modal-target': 'gamesRoadmap' } })
    );
    return card;
  }));
}

export function renderLeaderboard() {
  const root = qs('#leaderboardList');
  root.replaceChildren(...leaderboard.map((player, index) => el('article', {
    className: 'pm-list-row',
    children: [
      el('span', { className: 'pm-rank', text: String(index + 1) }),
      el('div', { children: [
        el('strong', { text: player.name }),
        el('small', { text: `Seviye ${player.level}` })
      ]}),
      el('strong', { text: player.score })
    ]
  })));
}

export function renderRewards() {
  const root = qs('#rewardRail');
  root.replaceChildren(...rewards.map((reward) => el('button', {
    className: 'pm-reward-card',
    attrs: { type: 'button', 'data-modal-target': 'quickMatch' },
    children: [
      el('span', { className: 'pm-reward-icon', text: reward.icon }),
      el('span', { children: [el('strong', { text: reward.title }), el('small', { text: reward.text })] }),
      el('span', { className: 'pm-status-dot' })
    ]
  })));
}

export function renderSocial() {
  const root = qs('#socialStack');
  root.replaceChildren(...socialCards.map((item) => el('article', {
    className: 'pm-social-card',
    attrs: { 'data-state': item.state },
    children: [
      el('span', { className: 'pm-social-icon', text: item.icon }),
      el('span', { children: [el('strong', { text: item.title }), el('small', { text: item.text })] }),
      el('span', { className: 'pm-status-dot' })
    ]
  })));
}

export function renderHome() {
  renderMetrics();
  renderGames();
  renderLeaderboard();
  renderRewards();
  renderSocial();
  qs('#app').removeAttribute('data-loading');
}
