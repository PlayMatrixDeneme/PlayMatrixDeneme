import { homeState } from './state.js';

export function installMatchmakingStateModule(root = document) {
  root.querySelectorAll?.('[data-matchmaking-game], [data-quick-match-game]').forEach((node) => {
    if (node.dataset.pmMatchmakingBound === '1') return;
    node.dataset.pmMatchmakingBound = '1';
    node.addEventListener('click', () => {
      homeState.setState({
        matchmaking: {
          active: true,
          game: node.dataset.matchmakingGame || node.dataset.quickMatchGame || node.dataset.game || ''
        }
      });
    }, { passive: true });
  });
  return true;
}
