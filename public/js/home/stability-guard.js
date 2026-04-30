import { installHomeGameShowcase } from './home-game-card.js';
import { installGameRouteNormalizer, normalizeHomeGameLinks } from './home-route-resolver.js';

export function installHomeStabilityGuard(root = document) {
  installGameRouteNormalizer(root);
  normalizeHomeGameLinks(root);
  installHomeGameShowcase(root);
  return true;
}

export const HOME_STABILITY_GUARD_STATUS = Object.freeze({
  active: false,
  replacement: 'home-bootstrap + home-route-resolver + home-game-card',
  legacyFallbackRemoved: true
});
