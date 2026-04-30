import { installHomeGameShowcase, renderHomeGameShowcase } from './home-game-card.js';

export function installFastHomePaint(root = document) {
  return installHomeGameShowcase(root);
}

export function refreshFastHomePaint(root = document) {
  return renderHomeGameShowcase(root);
}
