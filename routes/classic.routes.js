'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { db } = require('../config/firebase');
const { verifyAuth } = require('../middlewares/auth.middleware');
const { classicScoreLimiter } = require('../middlewares/rateLimiters');
const { safeNum, cleanStr, nowMs } = require('../utils/helpers');
const { applyProgressionPatchInTransaction, buildAccountSyncPayload } = require('../utils/economyCore');
const { recordRewardLedger } = require('../utils/rewardLedger');

const colUsers = () => db.collection('users');
const colClassicRuns = () => db.collection('classic_runs');
const colClassicScoreSignatures = () => db.collection('classic_score_signatures');
const colClassicAwardWindows = () => db.collection('classic_award_windows');

const CLASSIC_GAME_RULES = Object.freeze({
  patternmaster: Object.freeze({
    label: 'Pattern Master',
    metric: 'completed_levels',
    maxScore: 500,
    minDurationMs: 2000,
    minMsPerScore: 650,
    duplicateWindowMs: 120000,
    levelPointMultiplier: 10,
    maxDailyLevelPoints: 5000
  }),
  snakepro: Object.freeze({
    label: 'Snake Pro',
    metric: 'score',
    maxScore: 5000,
    minDurationMs: 2000,
    minMsPerScore: 60,
    duplicateWindowMs: 120000,
    levelPointMultiplier: 1,
    maxDailyLevelPoints: 10000
  }),
  spacepro: Object.freeze({
    label: 'Space Pro',
    metric: 'score',
    maxScore: 20000,
    minDurationMs: 2500,
    minMsPerScore: 100,
    duplicateWindowMs: 120000,
    levelPointMultiplier: 1,
    maxDailyLevelPoints: 15000
  })
});

const MAX_CLASSIC_ACTIVITY_PER_DAY = 30;
const MAX_CLIENT_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_RUN_AGE_MS = 12 * 60 * 60 * 1000;

function normalizeGameType(value = '') {
  return cleanStr(value || '', 32).toLowerCase();
}

function normalizeSubmittedScore(value = 0, rules = {}) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return { ok: false, score: 0, error: 'Skor sayısal olmalıdır.' };
  const score = Math.floor(raw);
  if (score < 0) return { ok: false, score: 0, error: 'Skor negatif olamaz.' };
  const maxScore = Math.max(0, Math.floor(safeNum(rules.maxScore, 0)));
  if (maxScore > 0 && score > maxScore) {
    return { ok: false, score, error: `${rules.label || 'Oyun'} skoru sunucu limitini aştı.` };
  }
  return { ok: true, score };
}

function computeClassicLevelPoints(gameType = '', score = 0) {
  const rules = CLASSIC_GAME_RULES[gameType];
  if (!rules) return 0;
  const safeScore = Math.max(0, Math.floor(safeNum(score, 0)));
  const multiplier = Math.max(1, Math.floor(safeNum(rules.levelPointMultiplier, 1)));
  return safeScore * multiplier;
}

function computeMinExpectedDurationMs(gameType = '', score = 0) {
  const rules = CLASSIC_GAME_RULES[gameType];
  if (!rules) return 0;
  const safeScore = Math.max(0, Math.floor(safeNum(score, 0)));
  if (safeScore <= 0) return 0;
  return Math.max(
    Math.max(0, Math.floor(safeNum(rules.minDurationMs, 0))),
    Math.floor(safeScore * Math.max(0, safeNum(rules.minMsPerScore, 0)))
  );
}

function makeRunFingerprint(uid = '', gameType = '', runId = '') {
  return crypto.createHash('sha1').update(`${uid}::${gameType}::${runId}`).digest('hex');
}

function makeScoreSignature(uid = '', gameType = '', score = 0) {
  return crypto.createHash('sha1').update(`${uid}::${gameType}::${Math.max(0, Math.floor(safeNum(score, 0)))}`).digest('hex');
}

function makeAwardWindowId(uid = '', dateKey = '') {
  return crypto.createHash('sha1').update(`${uid}::classic::${dateKey}`).digest('hex');
}

function dayKeyFromMs(ms = nowMs()) {
  return new Date(Math.max(0, Math.floor(safeNum(ms, nowMs())))).toISOString().slice(0, 10);
}

function readNestedNumber(source = {}, path = [], fallback = 0) {
  let node = source;
  for (const key of path) {
    if (!node || typeof node !== 'object') return fallback;
    node = node[key];
  }
  return Math.max(0, Math.floor(safeNum(node, fallback)));
}

function buildValidationReport({ gameType, score, startedAt, endedAt, submittedAt, durationMs }) {
  const minExpectedDurationMs = computeMinExpectedDurationMs(gameType, score);
  return {
    gameType,
    score,
    startedAt,
    endedAt,
    submittedAt,
    durationMs,
    minExpectedDurationMs,
    accepted: true,
    validatedAt: submittedAt
  };
}

function validateRunTiming({ gameType, score, startedAt, endedAt, submittedAt }) {
  if (score <= 0) return { ok: true, durationMs: Math.max(0, endedAt - startedAt), minExpectedDurationMs: 0 };
  if (startedAt <= 0 || endedAt <= 0 || endedAt < startedAt) {
    return { ok: false, error: 'Oyun süresi doğrulanamadı.', durationMs: 0, minExpectedDurationMs: computeMinExpectedDurationMs(gameType, score) };
  }
  if (startedAt > submittedAt + MAX_CLIENT_CLOCK_SKEW_MS || endedAt > submittedAt + MAX_CLIENT_CLOCK_SKEW_MS) {
    return { ok: false, error: 'Oyun zamanı sunucu saatiyle uyumsuz.', durationMs: Math.max(0, endedAt - startedAt), minExpectedDurationMs: computeMinExpectedDurationMs(gameType, score) };
  }
  if ((submittedAt - startedAt) > MAX_RUN_AGE_MS) {
    return { ok: false, error: 'Oyun oturumu zaman aşımına uğradı.', durationMs: Math.max(0, endedAt - startedAt), minExpectedDurationMs: computeMinExpectedDurationMs(gameType, score) };
  }
  const durationMs = Math.max(0, endedAt - startedAt);
  const minExpectedDurationMs = computeMinExpectedDurationMs(gameType, score);
  if (durationMs < minExpectedDurationMs) {
    return { ok: false, error: 'Skor hızı sunucu doğrulamasını geçemedi.', durationMs, minExpectedDurationMs };
  }
  return { ok: true, durationMs, minExpectedDurationMs };
}

router.post('/classic/submit', verifyAuth, classicScoreLimiter, async (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  try {
    const uid = cleanStr(req.user?.uid || '', 160);
    if (!uid) return res.status(401).json({ ok: false, error: 'Oturum doğrulanamadı.' });

    const gameType = normalizeGameType(req.body?.gameType);
    const rules = CLASSIC_GAME_RULES[gameType];
    if (!rules) return res.status(400).json({ ok: false, error: 'Geçersiz klasik oyun türü.' });

    const normalizedScore = normalizeSubmittedScore(req.body?.score, rules);
    if (!normalizedScore.ok) return res.status(400).json({ ok: false, error: normalizedScore.error });
    const score = normalizedScore.score;

    const runId = cleanStr(req.body?.runId || '', 120);
    if (!runId || runId.length < 8) return res.status(400).json({ ok: false, error: 'Oyun oturumu doğrulanamadı.' });

    const startedAt = Math.max(0, Math.floor(safeNum(req.body?.startedAt, 0)));
    const endedAtRaw = Math.max(0, Math.floor(safeNum(req.body?.endedAt, 0)));
    const submittedAt = nowMs();
    const endedAt = endedAtRaw > 0 ? Math.min(endedAtRaw, submittedAt + MAX_CLIENT_CLOCK_SKEW_MS) : submittedAt;

    const timing = validateRunTiming({ gameType, score, startedAt, endedAt, submittedAt });
    if (!timing.ok) {
      return res.status(400).json({
        ok: false,
        error: timing.error,
        durationMs: timing.durationMs,
        minExpectedDurationMs: timing.minExpectedDurationMs
      });
    }

    const fingerprint = makeRunFingerprint(uid, gameType, runId);
    const dateKey = dayKeyFromMs(submittedAt);
    const runRef = colClassicRuns().doc(fingerprint);
    const signatureRef = colClassicScoreSignatures().doc(makeScoreSignature(uid, gameType, score));
    const awardWindowRef = colClassicAwardWindows().doc(makeAwardWindowId(uid, dateKey));
    const userRef = colUsers().doc(uid);

    const levelPoints = computeClassicLevelPoints(gameType, score);

    const result = await db.runTransaction(async (tx) => {
      const [runSnap, sigSnap, awardWindowSnap, userSnap] = await Promise.all([
        tx.get(runRef),
        tx.get(signatureRef),
        tx.get(awardWindowRef),
        tx.get(userRef)
      ]);

      if (runSnap.exists) {
        return { ok: false, code: 'DUPLICATE_RUN', status: 409, error: 'Bu skor oturumu daha önce işlendi.' };
      }

      if (sigSnap.exists) {
        const sigData = sigSnap.data() || {};
        const lastSubmittedAt = Math.max(0, Math.floor(safeNum(sigData.lastSubmittedAt, 0)));
        if ((submittedAt - lastSubmittedAt) <= rules.duplicateWindowMs) {
          return { ok: false, code: 'DUPLICATE_SCORE_WINDOW', status: 429, error: 'Aynı skor kısa sürede tekrar gönderilemez.' };
        }
      }

      const awardWindowData = awardWindowSnap.exists ? (awardWindowSnap.data() || {}) : {};
      const currentDailyLevelPoints = readNestedNumber(awardWindowData, ['totals', 'levelPoints'], 0);
      const currentDailyActivity = readNestedNumber(awardWindowData, ['totals', 'activity'], 0);
      if (levelPoints > 0 && currentDailyLevelPoints + levelPoints > rules.maxDailyLevelPoints) {
        return {
          ok: false,
          code: 'CLASSIC_XP_DAILY_LIMIT',
          status: 429,
          error: 'Günlük klasik oyun seviye puanı güvenlik limiti doldu.'
        };
      }

      const activityEarned = (score > 0 && currentDailyActivity < MAX_CLASSIC_ACTIVITY_PER_DAY) ? 1 : 0;
      const userData = userSnap.exists ? (userSnap.data() || {}) : {};
      const previousStats = (userData.classicStats && typeof userData.classicStats === 'object') ? userData.classicStats : {};
      const gameStats = previousStats[gameType] && typeof previousStats[gameType] === 'object' ? previousStats[gameType] : {};
      const nextClassicStats = {
        ...previousStats,
        [gameType]: {
          bestScore: Math.max(score, Math.max(0, Math.floor(safeNum(gameStats.bestScore, 0)))),
          lastScore: score,
          lastDurationMs: timing.durationMs,
          lastRunId: runId,
          lastSubmittedAt: submittedAt,
          totalRuns: Math.max(0, Math.floor(safeNum(gameStats.totalRuns, 0)) + 1),
          totalScore: Math.max(0, Math.floor(safeNum(gameStats.totalScore, 0)) + score),
          totalLevelPoints: Math.max(0, Math.floor(safeNum(gameStats.totalLevelPoints, 0)) + levelPoints),
          metric: rules.metric
        }
      };

      const progress = applyProgressionPatchInTransaction(tx, userRef, userData, {
        xpEarned: levelPoints,
        activityEarned,
        roundsEarned: score > 0 ? 1 : 0,
        source: `CLASSIC_${gameType.toUpperCase()}`,
        referenceId: fingerprint,
        updatedAt: submittedAt
      });

      tx.set(userRef, {
        classicStats: nextClassicStats,
        lastClassicGameType: gameType,
        lastClassicScore: score,
        lastClassicMetric: rules.metric,
        lastClassicRunId: runId,
        lastClassicLevelPoints: levelPoints,
        lastClassicSubmittedAt: submittedAt
      }, { merge: true });

      const canonical = progress.canonical;
      const validation = buildValidationReport({ gameType, score, startedAt, endedAt, submittedAt, durationMs: timing.durationMs });

      tx.create(runRef, {
        uid,
        gameType,
        gameLabel: rules.label,
        metric: rules.metric,
        runId,
        score,
        levelPoints,
        activityEarned,
        startedAt,
        endedAt,
        durationMs: timing.durationMs,
        validation,
        createdAt: submittedAt
      });

      tx.set(signatureRef, {
        uid,
        gameType,
        score,
        lastRunId: runId,
        lastSubmittedAt: submittedAt
      }, { merge: true });

      const perGame = (awardWindowData.perGame && typeof awardWindowData.perGame === 'object') ? awardWindowData.perGame : {};
      const gameWindow = perGame[gameType] && typeof perGame[gameType] === 'object' ? perGame[gameType] : {};
      tx.set(awardWindowRef, {
        uid,
        dateKey,
        updatedAt: submittedAt,
        totals: {
          levelPoints: currentDailyLevelPoints + levelPoints,
          activity: currentDailyActivity + activityEarned,
          runs: readNestedNumber(awardWindowData, ['totals', 'runs'], 0) + 1,
          score: readNestedNumber(awardWindowData, ['totals', 'score'], 0) + score
        },
        perGame: {
          ...perGame,
          [gameType]: {
            levelPoints: Math.max(0, Math.floor(safeNum(gameWindow.levelPoints, 0)) + levelPoints),
            activity: Math.max(0, Math.floor(safeNum(gameWindow.activity, 0)) + activityEarned),
            runs: Math.max(0, Math.floor(safeNum(gameWindow.runs, 0)) + 1),
            score: Math.max(0, Math.floor(safeNum(gameWindow.score, 0)) + score),
            lastRunId: runId,
            lastSubmittedAt: submittedAt
          }
        }
      }, { merge: true });

      const accountSync = buildAccountSyncPayload(progress.nextUser || userData, {
        balance: safeNum(userData.balance, 0),
        monthlyActiveScore: progress.patch?.monthlyActiveScore ?? canonical.monthlyActiveScore
      });

      return {
        ok: true,
        gameType,
        gameLabel: rules.label,
        metric: rules.metric,
        score,
        levelPoints,
        activityEarned,
        rewardGrant: {
          amount: levelPoints,
          currency: 'XP',
          source: 'classic_score_progress',
          label: 'Klasik Oyun XP',
          referenceId: fingerprint
        },
        accountSync,
        ...accountSync,
        validation,
        duplicate: false
      };
    });

    if (!result.ok) {
      return res.status(result.status || 400).json(result);
    }

    if (result.levelPoints > 0) {
      recordRewardLedger({
        uid,
        amount: result.levelPoints,
        currency: 'XP',
        source: 'classic_score_progress',
        referenceId: fingerprint,
        idempotencyKey: `classic_score_progress:${fingerprint}`,
        meta: {
          gameType,
          metric: rules.metric,
          score,
          runId,
          durationMs: timing.durationMs,
          validation: result.validation
        }
      }).catch(() => null);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Klasik skor kaydı oluşturulamadı.' });
  }
});

module.exports = router;
