import { renderHero } from '../sections/hero.js';
import { renderMetrics } from '../sections/metrics.js';
import { renderAccount, renderProfilePanel, renderActivityPanel } from '../sections/profile.js';
import { renderGameFilters, renderGames } from '../sections/games.js';
import { renderLeaderboard } from '../sections/leaderboard.js';
import { renderRewards } from '../sections/rewards.js';
import { renderSupport } from '../sections/support.js';
import { renderSocial } from '../sections/social.js';

export function renderHome(user) {
  renderAccount(user);
  renderHero();
  renderMetrics();
  renderProfilePanel(user);
  renderActivityPanel();
  renderGameFilters();
  renderGames();
  renderLeaderboard();
  renderRewards();
  renderSupport();
  renderSocial();
  document.body.dataset.appState = 'ready';
}
