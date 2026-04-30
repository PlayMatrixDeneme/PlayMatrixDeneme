/* PlayMatrix shared reward/account mutation bridge for online games. */
export function applyGameAccountSnapshot(payload = {}) {
  try {
    window.__PM_GAME_ACCOUNT_SYNC__?.apply?.(payload);
  } catch (_) {}
}

export function notifyGameAccountMutation(payload = {}) {
  try {
    window.__PM_GAME_ACCOUNT_SYNC__?.notifyMutation?.(payload);
  } catch (_) {}
}

export function hasRewardMutation(payload = {}) {
  return !!(payload && (payload.accountSync || payload.balance !== undefined || payload.user || payload.rewardGrant || payload.ledgerId));
}
