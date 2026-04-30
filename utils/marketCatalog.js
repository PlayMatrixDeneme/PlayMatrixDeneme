'use strict';

const { cleanStr, safeNum } = require('./helpers');
const {
  FRAME_LEVEL_CAP,
  normalizeSelectedFrameLevel,
  getFrameAssetIndexForLevel,
  isSelectedFrameUnlocked,
  buildFrameState
} = require('./accountState');
const {
  DEFAULT_AVATAR,
  sanitizeAvatarForStorage,
  sanitizePublicAvatarForOutput,
  isAllowedAvatarValue
} = require('./avatarManifest');

const MARKET_CURRENCY = 'MC';
const FRAME_MARKET_MIN_LEVEL = 2;
const FRAME_MARKET_MAX_LEVEL = FRAME_LEVEL_CAP;
const FRAME_MARKET_POLICY_VERSION = 1;

function normalizeOwnedFrames(value = []) {
  const raw = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(',') : []);
  return Array.from(new Set(raw
    .map((item) => normalizeSelectedFrameLevel(item))
    .filter((item) => item > 0 && item <= FRAME_MARKET_MAX_LEVEL)))
    .sort((a, b) => a - b);
}

function hasFrameOwnership(user = {}, frameLevel = 0) {
  const safeFrame = normalizeSelectedFrameLevel(frameLevel);
  if (safeFrame <= 0) return true;
  return normalizeOwnedFrames(user.ownedFrames || user.unlockedFrames || []).includes(safeFrame);
}

function isFrameSelectableForUser(user = {}, frameLevel = 0) {
  const safeFrame = normalizeSelectedFrameLevel(frameLevel);
  if (safeFrame <= 0) return true;
  const accountLevel = safeNum(user.accountLevel || user.level, 1);
  return isSelectedFrameUnlocked(safeFrame, accountLevel) || hasFrameOwnership(user, safeFrame);
}

function assertFrameSelectableForUser(user = {}, frameLevel = 0) {
  const safeFrame = normalizeSelectedFrameLevel(frameLevel);
  if (safeFrame <= 0) return { ok: true, frameLevel: 0, reason: 'frameless' };
  if (isFrameSelectableForUser(user, safeFrame)) return { ok: true, frameLevel: safeFrame, reason: hasFrameOwnership(user, safeFrame) ? 'owned' : 'level' };
  const accountLevel = Math.max(1, Math.floor(safeNum(user.accountLevel || user.level, 1)));
  const error = new Error(`Bu çerçeve kilitli. Kullanmak için Seviye ${safeFrame} veya market sahipliği gerekir.`);
  error.code = 'FRAME_LOCKED';
  error.statusCode = 400;
  error.meta = { frameLevel: safeFrame, accountLevel };
  throw error;
}

function buildFrameMarketPrice(frameLevel = 0) {
  const safeFrame = normalizeSelectedFrameLevel(frameLevel);
  if (safeFrame <= 0) return 0;
  if (safeFrame <= 15) return 1200;
  if (safeFrame <= 30) return 2400;
  if (safeFrame <= 50) return 4200;
  if (safeFrame <= 80) return 6800;
  return 9800 + ((safeFrame - 80) * 1800);
}

function buildFrameMarketItem(frameLevel = 0) {
  const safeFrame = normalizeSelectedFrameLevel(frameLevel);
  if (safeFrame < FRAME_MARKET_MIN_LEVEL || safeFrame > FRAME_MARKET_MAX_LEVEL) return null;
  const assetIndex = getFrameAssetIndexForLevel(safeFrame);
  return Object.freeze({
    id: `frame_level_${safeFrame}`,
    type: 'frame',
    frameLevel: safeFrame,
    frameId: safeFrame,
    assetIndex,
    price: buildFrameMarketPrice(safeFrame),
    currency: MARKET_CURRENCY,
    title: `Seviye ${safeFrame} framessi`,
    description: `Profil, liderlik, sosyal merkez ve oyun topbar alanlarında kullanılabilir çerçeve.`,
    policyVersion: FRAME_MARKET_POLICY_VERSION
  });
}

const FRAME_MARKET_ITEMS = Object.freeze(
  Array.from({ length: FRAME_MARKET_MAX_LEVEL - FRAME_MARKET_MIN_LEVEL + 1 }, (_, index) => buildFrameMarketItem(index + FRAME_MARKET_MIN_LEVEL)).filter(Boolean)
);

function normalizeMarketItemId(value = '') {
  return cleanStr(value || '', 80).toLowerCase().replace(/[^a-z0-9_:-]/g, '');
}

function getMarketItem(itemId = '') {
  const safeId = normalizeMarketItemId(itemId);
  if (!safeId) return null;
  const frameMatch = safeId.match(/^frame_level_(\d{1,3})$/);
  if (frameMatch) return buildFrameMarketItem(frameMatch[1]);
  return null;
}

function listMarketItemsForUser(user = {}) {
  const ownedFrames = normalizeOwnedFrames(user.ownedFrames || user.unlockedFrames || []);
  const accountLevel = Math.max(1, Math.floor(safeNum(user.accountLevel || user.level, 1)));
  return FRAME_MARKET_ITEMS.map((item) => {
    const owned = ownedFrames.includes(item.frameLevel);
    const levelUnlocked = isSelectedFrameUnlocked(item.frameLevel, accountLevel);
    return {
      ...item,
      owned,
      locked: !owned && !levelUnlocked,
      levelUnlocked,
      selectable: owned || levelUnlocked,
      preview: buildFrameState(item.frameLevel, Math.max(accountLevel, item.frameLevel))
    };
  });
}

function normalizeAvatarFrameContract(input = {}, user = {}) {
  const frameId = normalizeSelectedFrameLevel(input.frameId ?? input.selectedFrame ?? input.level ?? 0);
  const level = Math.max(0, Math.floor(safeNum(input.level ?? user.accountLevel ?? user.level, 1)));
  const locked = !!input.locked || (frameId > 0 && !isFrameSelectableForUser({ ...user, accountLevel: level }, frameId));
  return Object.freeze({
    avatarUrl: sanitizePublicAvatarForOutput(input.avatarUrl || input.avatar || user.avatar || DEFAULT_AVATAR),
    frameId,
    size: Math.max(20, Math.min(220, Math.floor(safeNum(input.size ?? input.sizePx, 56)))),
    level,
    locked,
    interactive: !!input.interactive
  });
}

function validateAvatarUrlForStorage(value = '') {
  const normalized = sanitizeAvatarForStorage(value);
  if (!normalized || !isAllowedAvatarValue(normalized)) {
    const error = new Error('Geçersiz avatar URL.');
    error.code = 'INVALID_AVATAR_URL';
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

module.exports = {
  MARKET_CURRENCY,
  FRAME_MARKET_POLICY_VERSION,
  FRAME_MARKET_MIN_LEVEL,
  FRAME_MARKET_MAX_LEVEL,
  normalizeOwnedFrames,
  hasFrameOwnership,
  isFrameSelectableForUser,
  assertFrameSelectableForUser,
  buildFrameMarketPrice,
  buildFrameMarketItem,
  listMarketItemsForUser,
  normalizeMarketItemId,
  getMarketItem,
  normalizeAvatarFrameContract,
  validateAvatarUrlForStorage
};
