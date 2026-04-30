// phase: 6 compatibility marker retained for existing home integrity tooling.
import { reportHomeError } from './dom-utils.js';
import { installHomeRuntimeBridge } from './home-runtime.js';
import { installHomeConfigBridge } from './home-config.js';
import { installHomeRouteResolver } from './home-router.js';
import { installHomeStateBridge, homeState } from './state.js';
import { installHomeApiBridge } from './api.js';
import { installSafeRenderGuards } from './renderers.js';
import { installHomeModalManager } from './modals.js';
import { installMobileGesturePolicy } from './mobile-scroll.js';
import { installAccountStateModule } from './account.js';
import { installMatchmakingStateModule } from './matchmaking.js';
import { installMarketStateModule } from './market.js';
import { installGameRouteNormalizer } from './game-catalog.js';
import { installAuthModalGuards } from './auth-modal.js';
import { installProfilePanelGuards } from './profile-panel.js';
import { installLeaderboardGuards } from './leaderboard.js';
import { installStatsGuards } from './stats.js';
import { installSocialEntryGuards } from './social-entry.js';
import { installHeroSliderGuards } from './hero-slider.js';
import { installRewardUiGuards } from './reward-ui.js';
import { installInviteUiGuards } from './invite-ui.js';

let booted = false;

const MODULES = Object.freeze([
  ['runtime', installHomeRuntimeBridge],
  ['config', installHomeConfigBridge],
  ['state', installHomeStateBridge],
  ['api', installHomeApiBridge],
  ['routes', installHomeRouteResolver],
  ['renderers', installSafeRenderGuards],
  ['mobile-scroll', installMobileGesturePolicy],
  ['modal-manager', installHomeModalManager],
  ['account-state', installAccountStateModule],
  ['matchmaking', installMatchmakingStateModule],
  ['market', installMarketStateModule],
  ['game-routes', installGameRouteNormalizer],
  ['auth', installAuthModalGuards],
  ['profile', installProfilePanelGuards],
  ['leaderboard', installLeaderboardGuards],
  ['stats', installStatsGuards],
  ['social', installSocialEntryGuards],
  ['hero', installHeroSliderGuards],
  ['reward', installRewardUiGuards],
  ['invite', installInviteUiGuards]
]);

function reportModuleFailure(name, error) {
  reportHomeError(`home.${name}`, error);
  if (window.__PM_HOME_RUNTIME__?.report) {
    window.__PM_HOME_RUNTIME__.report(name, error);
  }
}

function runModule(name, installer) {
  try {
    const result = installer(document);
    return result !== false;
  } catch (error) {
    reportModuleFailure(name, error);
    return false;
  }
}

export async function bootHomeApplication() {
  if (booted) return true;
  booted = true;

  const results = MODULES.map(([name, installer]) => [name, runModule(name, installer)]);
  const moduleStatus = Object.freeze(Object.fromEntries(results));
  const ok = results.every(([, passed]) => passed);

  window.__PM_HOME_MODULES__ = moduleStatus;
  homeState.setState({
    boot: {
      phase: ok ? 'ready' : 'partial',
      ready: ok,
      modules: moduleStatus
    }
  });

  if (!ok) {
    const failed = results.filter(([, passed]) => !passed).map(([name]) => name).join(', ');
    throw new Error(`HOME_MODULE_BOOT_FAILED:${failed}`);
  }

  return true;
}

export const homeModuleInfo = Object.freeze({
  phase: 1,
  compatibilityPhase: 6,
  strategy: 'single-entry-script-home-bootstrap',
  legacyRuntimeActive: false,
  cspSafe: true,
  fastBoot: true,
  modules: MODULES.map(([name]) => name)
});
