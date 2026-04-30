'use strict';

const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { verifyAuth } = require('../middlewares/auth.middleware');
const { safeNum, safeFloat, nowMs, clamp, cleanStr } = require('../utils/helpers');
const { engineState } = require('../engines/crashEngine');
const { CRASH_MIN_BET, CRASH_MIN_AUTO, CRASH_MAX_MULTIPLIER, GAME_RESULT_CODES, GAME_SETTLEMENT_STATUS } = require('../config/constants');
const { getCanonicalSelectedFrame, buildCanonicalUserState } = require('../utils/accountState');
const { assertGamesAllowed } = require('../utils/userRestrictions');
const { assertNoOtherActiveGame } = require('../utils/gameSession');
const { recordGameAudit } = require('../utils/gameAudit');
const { applyProgressionPatchInTransaction, calculateSpendProgressReward, buildAccountSyncPayload } = require('../utils/economyCore');
const { saveMatchHistory } = require('../utils/matchHistory');
const { recordRewardLedger } = require('../utils/rewardLedger');
const { recordGameLedgerInTransaction } = require('../utils/gameLedger');
const { sanitizePublicAvatarForOutput } = require('../utils/avatarManifest');

const colUsers = () => db.collection('users');
const colCrashBets = () => db.collection('crash_bets');
const colMatchHistory = () => db.collection('match_history');
const colGameAudit = () => db.collection('game_audit_logs');

function pickUserSelectedFrame(user = {}) {
  return getCanonicalSelectedFrame(user, { defaultFrame: 0 });
}



function applySpendProgression(tx, userRef, userData = {}, spendMc = 0, source = '') {
  const reward = calculateSpendProgressReward(spendMc, source);
  const progressionOut = applyProgressionPatchInTransaction(tx, userRef, userData, {
    xpEarned: reward.xpEarned,
    activityEarned: reward.activityEarned,
    roundsEarned: reward.roundsEarned,
    spentMc: reward.spentMc,
    source: reward.source,
    updatedAt: nowMs()
  });
  return { ...reward, progressionOut };
}

function describeCrashOutcomeLabel(resultCode = '') {
  if (resultCode === GAME_RESULT_CODES.CRASH_CASHOUT_AUTO) return 'auto_cashout';
  if (resultCode === GAME_RESULT_CODES.CRASH_CASHOUT_MANUAL) return 'cashout';
  if (resultCode === GAME_RESULT_CODES.CRASH_CRASHED_LOSS) return 'crashed_loss';
  return 'unknown';
}

function buildCrashHistoryEntry({ betId = '', uid = '', roomId = '', roundId = '', amount = 0, payout = 0, resultCode = '', crashPoint = 0, cashoutMult = 0, createdAt = 0 } = {}) {
  const safeBetId = cleanStr(betId || '', 180);
  if (!safeBetId || !uid) return null;
  const rewardMc = Math.floor(safeNum(payout, 0));
  const stakeMc = Math.floor(safeNum(amount, 0));
  const netMc = rewardMc - stakeMc;
  return {
    id: `crash_${safeBetId}`,
    gameType: 'crash',
    roomId: cleanStr(roomId || roundId || safeBetId, 160),
    status: 'finished',
    result: describeCrashOutcomeLabel(resultCode),
    winnerUid: netMc > 0 ? cleanStr(uid || '', 160) : '',
    loserUid: netMc < 0 ? cleanStr(uid || '', 160) : '',
    participants: [cleanStr(uid || '', 160)].filter(Boolean),
    rewards: { mc: rewardMc, stakeMc, netMc },
    meta: {
      resultCode: cleanStr(resultCode || '', 64),
      roundId: cleanStr(roundId || '', 160),
      crashPoint: safeFloat(crashPoint),
      cashoutMult: safeFloat(cashoutMult)
    },
    createdAt: safeNum(createdAt, nowMs())
  };
}

async function persistCrashAudit({ uid = '', betId = '', roundId = '', eventType = '', resultCode = '', amount = 0, payout = 0, meta = {}, idempotencyKey = '' } = {}) {
  if (!uid || !betId || !eventType) return null;
  return recordGameAudit({
    gameType: 'crash',
    entityType: 'bet',
    entityId: betId,
    roomId: roundId,
    roundId,
    betId,
    eventType,
    resultCode,
    reason: cleanStr(meta?.reason || '', 48),
    status: resultCode === GAME_RESULT_CODES.CRASH_BET_PLACED ? GAME_SETTLEMENT_STATUS.ACTIVE : GAME_SETTLEMENT_STATUS.SETTLED,
    actorUid: uid,
    subjectUid: uid,
    amount,
    payout,
    meta,
    idempotencyKey
  }).catch(() => null);
}

function buildCrashPublicBet(entry = {}) {
  const bet = entry.bet || entry;
  const box = safeNum(entry.box || bet.box || (entry.boxKey === 'box2' ? 2 : 1), 0);
  return {
    box,
    betId: cleanStr(bet.betId || bet.id || '', 180),
    roundId: cleanStr(bet.roundId || '', 160),
    amount: safeFloat(bet.bet ?? bet.amount),
    autoCashout: safeFloat(bet.autoCashout || 0),
    autoCashoutEnabled: !!bet.autoCashoutEnabled,
    cashed: !!bet.cashed,
    win: safeFloat(bet.win || 0),
    cashoutMult: safeFloat(bet.cashoutMult || 0),
    settlementStatus: cleanStr(bet.settlementStatus || GAME_SETTLEMENT_STATUS.ACTIVE, 24),
    settlementPending: !!bet.settlementPending,
    resultCode: cleanStr(bet.resultCode || 'pending', 64)
  };
}

async function readCrashActiveBoxesForUid(uid = '') {
  const safeUid = cleanStr(uid || '', 160);
  const currentRoundId = cleanStr(String(engineState.crashState.roundId || ''), 160);
  const phase = cleanStr(engineState.crashState.phase || '', 24);
  const activeBoxes = [];
  const playerState = engineState.crashState.players[safeUid] || {};

  ['box1', 'box2'].forEach((boxKey) => {
    const bet = playerState[boxKey];
    if (!bet || bet.cashed || phase === 'CRASHED') return;
    activeBoxes.push(buildCrashPublicBet({ boxKey, bet }));
  });

  if (phase === 'CRASHED' || !currentRoundId) return activeBoxes;

  const knownBoxes = new Set(activeBoxes.map((item) => safeNum(item.box, 0)));
  const missingBoxes = [1, 2].filter((box) => !knownBoxes.has(box));
  if (!missingBoxes.length) return activeBoxes;

  const docs = await Promise.all(missingBoxes.map((box) => colCrashBets().doc(`${currentRoundId}_${safeUid}_${box}`).get().catch(() => null)));
  docs.forEach((snap, index) => {
    if (!snap?.exists) return;
    const box = missingBoxes[index];
    const data = snap.data() || {};
    const isActive = cleanStr(data.uid || '', 160) === safeUid
      && cleanStr(data.roundId || '', 160) === currentRoundId
      && cleanStr(data.settlementStatus || '', 24) === GAME_SETTLEMENT_STATUS.ACTIVE
      && data.cashed !== true
      && cleanStr(data.status || '', 24) === 'active';
    if (!isActive) return;
    if (!engineState.crashState.players[safeUid]) engineState.crashState.players[safeUid] = {};
    const boxKey = `box${box}`;
    engineState.crashState.players[safeUid][boxKey] = {
      uid: safeUid,
      username: cleanStr(data.username || 'Oyuncu', 80) || 'Oyuncu',
      avatar: sanitizePublicAvatarForOutput(data.avatar),
      selectedFrame: safeNum(data.selectedFrame, 0),
      betId: snap.id,
      bet: safeFloat(data.amount || 0),
      autoCashout: safeFloat(data.autoCashout || 0),
      autoCashoutEnabled: !!data.autoCashoutEnabled,
      cashed: false,
      cashingOut: false,
      win: safeFloat(data.win || 0),
      cashoutMult: safeFloat(data.cashoutMult || 0),
      box,
      roundId: currentRoundId
    };
    activeBoxes.push(buildCrashPublicBet({ boxKey, bet: engineState.crashState.players[safeUid][boxKey] }));
  });

  if (activeBoxes.length) engineState.triggerUpdate();
  activeBoxes.sort((a, b) => safeNum(a.box, 0) - safeNum(b.box, 0));
  return activeBoxes;
}

router.get('/active-bets', verifyAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const activeBoxes = await readCrashActiveBoxesForUid(req.user.uid);
    res.json({
      ok: true,
      hasActiveBet: activeBoxes.length > 0,
      hasRiskyBet: activeBoxes.some((entry) => safeFloat(entry.autoCashout) <= 1),
      phase: engineState.crashState.phase,
      roundId: cleanStr(String(engineState.crashState.roundId || ''), 160),
      serverNow: nowMs(),
      bets: activeBoxes
    });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/resume', verifyAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const bets = await readCrashActiveBoxesForUid(req.user.uid);
    res.json({
      ok: true,
      canResume: bets.length > 0 && ['COUNTDOWN', 'FLYING'].includes(cleanStr(engineState.crashState.phase || '', 24)),
      gameType: 'crash',
      phase: engineState.crashState.phase,
      roundId: cleanStr(String(engineState.crashState.roundId || ''), 160),
      currentMult: safeFloat(engineState.crashState.currentMult),
      startTime: safeNum(engineState.crashState.startTime, 0),
      serverNow: nowMs(),
      bets
    });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/history', verifyAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Math.floor(safeNum(req.query?.limit, 20))));
    const snap = await colMatchHistory().where('participants', 'array-contains', req.user.uid).limit(Math.max(limit, 30)).get().catch(() => ({ docs: [] }));
    const items = (snap.docs || [])
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter((item) => cleanStr(item.gameType || '', 32) === 'crash')
      .sort((a, b) => safeNum(b.createdAt, 0) - safeNum(a.createdAt, 0))
      .slice(0, limit);
    res.json({ ok: true, items });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/audit', verifyAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Math.floor(safeNum(req.query?.limit, 20))));
    const snap = await colGameAudit().where('subjectUid', '==', req.user.uid).limit(Math.max(limit, 30)).get().catch(() => ({ docs: [] }));
    const items = (snap.docs || [])
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter((item) => cleanStr(item.gameType || '', 32) === 'crash')
      .sort((a, b) => safeNum(b.createdAt, 0) - safeNum(a.createdAt, 0))
      .slice(0, limit);
    res.json({ ok: true, items });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/bet', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    await assertNoOtherActiveGame(uid, { allowGameType: 'crash' });
    const box = safeNum(req.body.box, 0);
    const amount = safeFloat(req.body.amount);
    const autoCashout = engineState.normalizeAutoCashout(req.body.autoCashout);
    const autoCashoutEnabled = autoCashout > 0 && autoCashout >= CRASH_MIN_AUTO;

    if (box !== 1 && box !== 2) throw new Error('Geçersiz kutu.');
    if (isNaN(amount) || amount < CRASH_MIN_BET || amount > 10000000) throw new Error(`Katılım tutarı ${CRASH_MIN_BET} ile 10.000.000 MC arasında olmalıdır.`);

    const currentRoundId = cleanStr(String(engineState.crashState.roundId || ''), 160);
    if (!currentRoundId) throw new Error('Aktif Crash turu bulunamadı.');
    const betId = `${currentRoundId}_${uid}_${box}`;
    let uData;
    let progressReward = null;
    let accountSync = null;

    await db.runTransaction(async (tx) => {
      if (engineState.crashState.phase !== 'COUNTDOWN') throw new Error('Katılım penceresi kapandı, bir sonraki turu bekleyin.');

      const betRef = colCrashBets().doc(betId);
      const betSnap = await tx.get(betRef);
      if (betSnap.exists) throw new Error('Bu kutu için tur kaydı zaten alındı.');

      const userRef = colUsers().doc(uid);
      const uSnap = await tx.get(userRef);
      if (!uSnap.exists) throw new Error('Kullanıcı bulunamadı.');

      uData = uSnap.data() || {};
      if (safeFloat(uData.balance) < amount) throw new Error('Bakiye yetersiz.');

      tx.update(userRef, { balance: admin.firestore.FieldValue.increment(-amount) });
      progressReward = applySpendProgression(tx, userRef, uData, amount, 'CRASH_BET');
      accountSync = buildAccountSyncPayload(progressReward?.progressionOut?.nextUser || uData, {
        balance: safeFloat(uData.balance) - amount
      });
      recordGameLedgerInTransaction(tx, {
        uid,
        gameType: 'crash',
        source: 'crash_bet_stake',
        referenceId: betId,
        roomId: currentRoundId,
        roundId: currentRoundId,
        betId,
        amount: -Math.floor(amount),
        stake: amount,
        payout: 0,
        resultCode: GAME_RESULT_CODES.CRASH_BET_PLACED,
        settlementStatus: GAME_SETTLEMENT_STATUS.ACTIVE,
        actorUid: uid,
        subjectUid: uid,
        meta: { box, autoCashout, autoCashoutEnabled },
        idempotencyKey: `crash:${betId}:stake`
      });

      tx.set(betRef, {
        uid,
        username: uData.username || 'Oyuncu',
        avatar: sanitizePublicAvatarForOutput(uData.avatar),
        selectedFrame: pickUserSelectedFrame(uData || {}),
        box,
        amount,
        autoCashout,
        autoCashoutEnabled,
        cashed: false,
        win: 0,
        roundId: currentRoundId,
        createdAt: nowMs(),
        updatedAt: nowMs(),
        status: 'active',
        settlementStatus: GAME_SETTLEMENT_STATUS.ACTIVE,
        resultCode: 'pending',
        resultReason: '',
        settledAt: 0,
        cashoutSource: ''
      });
    });

    if (progressReward?.xpEarned > 0) {
      recordRewardLedger({
        uid,
        amount: progressReward.xpEarned,
        currency: 'XP',
        source: 'crash_spend_progress',
        referenceId: betId,
        idempotencyKey: 'crash_spend_progress:' + betId,
        meta: { amount, roundId: currentRoundId, box, spentMc: progressReward.spentMc, resultCode: GAME_RESULT_CODES.CRASH_BET_PLACED }
      }).catch(() => null);
    }

    if (!engineState.crashState.players[uid]) engineState.crashState.players[uid] = {};

    engineState.crashState.players[uid][`box${box}`] = {
      uid,
      username: uData.username || 'Oyuncu',
      avatar: sanitizePublicAvatarForOutput(uData.avatar),
      selectedFrame: pickUserSelectedFrame(uData || {}),
      betId,
      bet: amount,
      autoCashout,
      autoCashoutEnabled,
      cashed: false,
      cashingOut: false,
      win: 0,
      cashoutMult: 0,
      box,
      roundId: currentRoundId
    };

    engineState.triggerUpdate();

    persistCrashAudit({
      uid,
      betId,
      roundId: currentRoundId,
      eventType: 'bet_placed',
      resultCode: GAME_RESULT_CODES.CRASH_BET_PLACED,
      amount,
      payout: 0,
      meta: { box, autoCashout, autoCashoutEnabled, reason: 'bet_placed' },
      idempotencyKey: `crash:${betId}:bet_placed`
    });
    res.json({
      ok: true,
      ...(accountSync || {}),
      progressionReward: progressReward ? {
        xpEarned: progressReward.xpEarned || 0,
        activityEarned: progressReward.activityEarned || 0,
        roundsEarned: progressReward.roundsEarned || 0,
        spentMc: progressReward.spentMc || 0,
        source: progressReward.source || 'CRASH_BET'
      } : null
    });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/cashout', verifyAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const guardSnap = await colUsers().doc(uid).get();
    assertGamesAllowed(guardSnap.data() || {});
    const box = safeNum(req.body.box, 0);

    if (engineState.crashState.phase !== 'FLYING') {
      throw new Error(engineState.crashState.phase === 'CRASHED' ? 'Çok geç, tur sona erdi.' : 'Şu an çıkış alınamaz.');
    }

    const pBet = engineState.crashState.players[uid] && engineState.crashState.players[uid][`box${box}`];
    if (!pBet) throw new Error('Aktif tur kaydınız bulunmuyor.');
    if (pBet.cashed || pBet.cashingOut) throw new Error('Bu tur için çıkış işlemi zaten tamamlandı.');

    pBet.cashingOut = true;

    const elapsedMs = nowMs() - engineState.crashState.startTime;
    const exactCurrentMult = safeFloat(clamp(Math.max(1.00, Math.pow(Math.E, 0.00008 * Math.max(0, elapsedMs))), 1.00, CRASH_MAX_MULTIPLIER));

    if (exactCurrentMult >= engineState.crashState.crashPoint) {
      pBet.cashingOut = false;
      throw new Error('Çok geç, uçak patladı!');
    }

    const finalWin = safeFloat(pBet.bet * exactCurrentMult);
    const settledAt = nowMs();

    const settlement = await db.runTransaction(async (tx) => {
      const betRef = colCrashBets().doc(pBet.betId);
      const userRef = colUsers().doc(uid);
      const [betSnap, userSnap] = await Promise.all([tx.get(betRef), tx.get(userRef)]);
      if (!betSnap.exists) throw new Error('Aktif tur kaydı bulunmuyor.');

      const betDoc = betSnap.data() || {};
      const userData = userSnap.exists ? (userSnap.data() || {}) : {};
      const currentSettlement = cleanStr(betDoc.settlementStatus || '', 24);
      const alreadySettled = safeNum(betDoc.settledAt, 0) > 0 || currentSettlement === GAME_SETTLEMENT_STATUS.SETTLED || betDoc.cashed === true;
      if (alreadySettled) {
        return {
          duplicated: true,
          resultCode: cleanStr(betDoc.resultCode || '', 64),
          winAmount: safeFloat(betDoc.win || 0),
          cashoutMult: safeFloat(betDoc.cashoutMult || 0),
          cashoutSource: cleanStr(betDoc.cashoutSource || '', 32)
        };
      }

      if (cleanStr(betDoc.uid || '', 160) !== uid || safeNum(betDoc.box, 0) !== box) throw new Error('Tur kaydı doğrulanamadı.');
      if (cleanStr(betDoc.roundId || '', 160) !== String(pBet.roundId || engineState.crashState.roundId || '')) throw new Error('Tur eşleşmesi doğrulanamadı.');

      recordGameLedgerInTransaction(tx, {
        uid,
        gameType: 'crash',
        source: 'crash_cashout_payout',
        referenceId: pBet.betId,
        roomId: String(pBet.roundId || engineState.crashState.roundId || ''),
        roundId: String(pBet.roundId || engineState.crashState.roundId || ''),
        betId: pBet.betId,
        amount: Math.floor(finalWin),
        stake: pBet.bet,
        payout: finalWin,
        resultCode: GAME_RESULT_CODES.CRASH_CASHOUT_MANUAL,
        settlementStatus: GAME_SETTLEMENT_STATUS.SETTLED,
        actorUid: uid,
        subjectUid: uid,
        meta: { box, cashoutMult: exactCurrentMult, reason: 'cashout_manual' },
        idempotencyKey: `crash:${pBet.betId}:cashout_manual:payout`
      });

      tx.update(betRef, {
        cashed: true,
        win: finalWin,
        cashoutMult: exactCurrentMult,
        updatedAt: settledAt,
        status: 'settled',
        settlementStatus: GAME_SETTLEMENT_STATUS.SETTLED,
        resultCode: GAME_RESULT_CODES.CRASH_CASHOUT_MANUAL,
        resultReason: 'cashout_manual',
        settledAt,
        cashoutSource: 'manual'
      });
      tx.update(userRef, { balance: admin.firestore.FieldValue.increment(finalWin) });
      return {
        duplicated: false,
        resultCode: GAME_RESULT_CODES.CRASH_CASHOUT_MANUAL,
        winAmount: finalWin,
        cashoutMult: exactCurrentMult,
        cashoutSource: 'manual',
        accountSync: buildAccountSyncPayload(userData, { balance: safeFloat(userData.balance) + finalWin })
      };
    });

    pBet.cashingOut = false;
    pBet.cashed = true;
    pBet.win = settlement.winAmount;
    pBet.cashoutMult = settlement.cashoutMult;
    engineState.triggerUpdate();

    if (settlement.resultCode === GAME_RESULT_CODES.CRASH_CRASHED_LOSS) throw new Error('Çok geç, tur sona erdi.');

    if (!settlement.duplicated) {
      const historyEntry = buildCrashHistoryEntry({
        betId: pBet.betId,
        uid,
        roundId: String(pBet.roundId || engineState.crashState.roundId || ''),
        amount: pBet.bet,
        payout: settlement.winAmount,
        resultCode: GAME_RESULT_CODES.CRASH_CASHOUT_MANUAL,
        cashoutMult: settlement.cashoutMult,
        createdAt: settledAt
      });
      if (historyEntry) saveMatchHistory(historyEntry).catch(() => null);
      persistCrashAudit({
        uid,
        betId: pBet.betId,
        roundId: String(pBet.roundId || engineState.crashState.roundId || ''),
        eventType: 'bet_settled',
        resultCode: GAME_RESULT_CODES.CRASH_CASHOUT_MANUAL,
        amount: pBet.bet,
        payout: settlement.winAmount,
        meta: { box, cashoutMult: settlement.cashoutMult, reason: 'cashout_manual' },
        idempotencyKey: `crash:${pBet.betId}:cashout_manual`
      });
    }
    res.json({
      ok: true,
      winAmount: settlement.winAmount,
      cashoutMult: settlement.cashoutMult,
      duplicated: !!settlement.duplicated,
      ...(settlement.accountSync || {})
    });
  } catch (e) {
    const uid = req.user?.uid;
    const box = safeNum(req.body?.box, 0);
    const pBet = uid && engineState.crashState.players[uid] && engineState.crashState.players[uid][`box${box}`];

    if (pBet) {
      pBet.cashingOut = false;
      if (!pBet.cashed) { pBet.win = 0; pBet.cashoutMult = 0; }
      engineState.triggerUpdate();
    }
    res.json({ ok: false, error: e.message });
  }
});

module.exports = router;
