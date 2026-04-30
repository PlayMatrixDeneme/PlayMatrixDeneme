/* PlayMatrix FAZ 6: modular home orchestrator. Legacy runtime is compatibility-only; new state, render, modal and mobile-scroll modules own the active safety contracts. */
import { reportHomeError } from "./dom-utils.js";
import { installHomeStateBridge } from "./state.js";
import { installHomeApiBridge } from "./api.js";
import { installSafeRenderGuards } from "./renderers.js";
import { installHomeModalManager } from "./modals.js";
import { installMobileGesturePolicy } from "./mobile-scroll.js";
import { installAccountStateModule } from "./account.js";
import { installMatchmakingStateModule } from "./matchmaking.js";
import { installMarketStateModule } from "./market.js";
import { installGameRouteNormalizer } from "./game-catalog.js";
import { installAuthModalGuards } from "./auth-modal.js";
import { installProfilePanelGuards } from "./profile-panel.js";
import { installLeaderboardGuards } from "./leaderboard.js";
import { installStatsGuards } from "./stats.js";
import { installSocialEntryGuards } from "./social-entry.js";
import { installHeroSliderGuards } from "./hero-slider.js";
import { installModalSafety } from "./modal.js";
import { installRewardUiGuards } from "./reward-ui.js";
import { installInviteUiGuards } from "./invite-ui.js";
import "./legacy-home.runtime.js?v=release-20260430";

let booted = false;

const MODULES = Object.freeze([
  ["state", installHomeStateBridge],
  ["api", installHomeApiBridge],
  ["renderers", installSafeRenderGuards],
  ["mobile-scroll", installMobileGesturePolicy],
  ["modal-manager", installHomeModalManager],
  ["account-state", installAccountStateModule],
  ["matchmaking", installMatchmakingStateModule],
  ["market", installMarketStateModule],
  ["routes", installGameRouteNormalizer],
  ["modal", installModalSafety],
  ["auth", installAuthModalGuards],
  ["profile", installProfilePanelGuards],
  ["leaderboard", installLeaderboardGuards],
  ["stats", installStatsGuards],
  ["social", installSocialEntryGuards],
  ["hero", installHeroSliderGuards],
  ["reward", installRewardUiGuards],
  ["invite", installInviteUiGuards]
]);

function runModule(name, installer) {
  try {
    installer(document);
    return true;
  } catch (error) {
    console.error(`[PlayMatrix] home module failed: ${name}`, error);
    reportHomeError(`home.${name}`, error);
    return false;
  }
}

export async function bootHomeApplication() {
  if (booted) return true;
  booted = true;
  const results = MODULES.map(([name, installer]) => [name, runModule(name, installer)]);
  window.__PM_HOME_MODULES__ = Object.freeze(Object.fromEntries(results));
  return results.every(([, ok]) => ok);
}

export const homeModuleInfo = Object.freeze({ phase: 6, strategy: "modular-state-render-modal-mobile-plus-compat-runtime", cspSafe: true, fastBoot: true, modules: MODULES.map(([name]) => name) });
