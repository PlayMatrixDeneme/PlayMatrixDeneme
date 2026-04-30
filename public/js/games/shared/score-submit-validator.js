/* PlayMatrix Phase 8 classic game score submission guard. */
const CLASSIC_SCORE_RULES = Object.freeze({
  patternmaster: Object.freeze({ label: 'Pattern Master', maxScore: 500, minDurationMs: 2000, minMsPerScore: 650 }),
  snakepro: Object.freeze({ label: 'Snake Pro', maxScore: 5000, minDurationMs: 2000, minMsPerScore: 60 }),
  spacepro: Object.freeze({ label: 'Space Pro', maxScore: 20000, minDurationMs: 2500, minMsPerScore: 100 })
});

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function normalizeClassicGameType(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
}

export function getClassicScoreRule(gameType = '') {
  return CLASSIC_SCORE_RULES[normalizeClassicGameType(gameType)] || null;
}

export function createClassicRunId(prefix = 'classic') {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
  } catch (_) {}
  const safePrefix = String(prefix || 'classic').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'classic';
  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function normalizeClassicScore(value = 0, rules = {}) {
  const raw = toFiniteNumber(value, NaN);
  if (!Number.isFinite(raw)) return { ok: false, score: 0, error: 'Skor sayısal olmalıdır.' };
  const score = Math.max(0, Math.floor(raw));
  const maxScore = Math.max(0, Math.floor(toFiniteNumber(rules.maxScore, 0)));
  if (maxScore > 0 && score > maxScore) {
    return { ok: false, score, error: `${rules.label || 'Oyun'} skoru istemci limitini aştı.` };
  }
  return { ok: true, score };
}

export function computeClientMinDurationMs(gameType = '', score = 0) {
  const rules = getClassicScoreRule(gameType);
  if (!rules) return 0;
  const safeScore = Math.max(0, Math.floor(toFiniteNumber(score, 0)));
  if (safeScore <= 0) return 0;
  return Math.max(
    Math.max(0, Math.floor(toFiniteNumber(rules.minDurationMs, 0))),
    Math.floor(safeScore * Math.max(0, toFiniteNumber(rules.minMsPerScore, 0)))
  );
}

export function buildClassicScoreSubmission({ gameType = '', runId = '', score = 0, startedAt = 0, endedAt = Date.now() } = {}) {
  const normalizedGameType = normalizeClassicGameType(gameType);
  const rules = getClassicScoreRule(normalizedGameType);
  if (!rules) return { ok: false, error: 'Geçersiz klasik oyun türü.' };
  const scoreResult = normalizeClassicScore(score, rules);
  if (!scoreResult.ok) return scoreResult;

  const safeStartedAt = Math.max(0, Math.floor(toFiniteNumber(startedAt, 0)));
  const safeEndedAt = Math.max(safeStartedAt, Math.floor(toFiniteNumber(endedAt, Date.now())));
  const safeRunId = String(runId || '').trim().slice(0, 120);
  if (!safeRunId || safeRunId.length < 8) return { ok: false, error: 'Oyun oturumu doğrulanamadı.' };

  return {
    ok: true,
    payload: {
      gameType: normalizedGameType,
      runId: safeRunId,
      score: scoreResult.score,
      startedAt: safeStartedAt,
      endedAt: safeEndedAt,
      minExpectedDurationMs: computeClientMinDurationMs(normalizedGameType, scoreResult.score)
    }
  };
}
