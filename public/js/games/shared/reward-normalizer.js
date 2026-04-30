/* PlayMatrix Phase 8 reward response normalizer. */
function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function pickAccountSync(payload = {}) {
  if (payload.accountSync && typeof payload.accountSync === 'object') return payload.accountSync;
  return payload && typeof payload === 'object' ? payload : {};
}

export function normalizeRewardResponse(payload = {}) {
  const raw = payload && typeof payload === 'object' ? payload : {};
  const accountSync = pickAccountSync(raw);
  const rewardGrant = raw.rewardGrant && typeof raw.rewardGrant === 'object'
    ? raw.rewardGrant
    : {
        amount: asNumber(raw.levelPoints ?? raw.amount, 0),
        currency: raw.currency || 'XP',
        source: raw.source || 'classic_score_progress',
        label: raw.rewardLabel || raw.gameLabel || 'Klasik Oyun XP'
      };

  return {
    ...raw,
    ok: raw.ok !== false,
    score: Math.max(0, Math.floor(asNumber(raw.score, 0))),
    levelPoints: Math.max(0, Math.floor(asNumber(raw.levelPoints ?? rewardGrant.amount, 0))),
    activityEarned: Math.max(0, Math.floor(asNumber(raw.activityEarned, 0))),
    rewardGrant: {
      ...rewardGrant,
      amount: Math.max(0, Math.floor(asNumber(rewardGrant.amount, raw.levelPoints || 0))),
      currency: String(rewardGrant.currency || 'XP').toUpperCase()
    },
    accountSync,
    validation: raw.validation && typeof raw.validation === 'object' ? raw.validation : null
  };
}

export function applyRewardAccountSync(payload = {}) {
  const normalized = normalizeRewardResponse(payload);
  try { window.__PM_GAME_ACCOUNT_SYNC__?.notifyMutation?.(normalized.accountSync || normalized); } catch (_) {}
  try { window.dispatchEvent(new CustomEvent('pm:game-account-mutated', { detail: normalized.accountSync || normalized })); } catch (_) {}
  return normalized;
}
