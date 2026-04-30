import { homeState } from './state.js';
import { homeFetch } from './api.js';
import { createAvatarFrameNode, renderEmptyState } from './renderers.js';

function formatMc(value = 0) {
  return `${Number(value || 0).toLocaleString('tr-TR')} MC`;
}

function getMarketRoot() {
  return document.querySelector('[data-market-root], #marketItems, #frameMarketItems');
}

function buildMarketCard(item = {}) {
  const card = document.createElement('article');
  card.className = `market-item-card${item.owned ? ' is-owned' : ''}${item.locked ? ' is-locked' : ''}`;
  card.dataset.marketItemId = item.id || '';
  card.dataset.itemType = item.type || '';
  card.dataset.frameId = String(item.frameId || item.frameLevel || 0);

  const preview = document.createElement('div');
  preview.className = 'market-item-preview';
  preview.appendChild(createAvatarFrameNode({
    avatarUrl: window.__PM_HOME_STATE__?.getState?.()?.account?.avatar || '/assets/avatars/system/fallback.svg',
    frameId: item.frameId || item.frameLevel || 0,
    level: item.frameLevel || 0,
    size: 72,
    locked: item.locked && !item.owned,
    interactive: false,
    extraClass: 'pm-avatar--market',
    alt: item.title || 'Market önizleme'
  }));

  const title = document.createElement('strong');
  title.className = 'market-item-title';
  title.textContent = item.title || 'Market ürünü';

  const meta = document.createElement('span');
  meta.className = 'market-item-meta';
  meta.textContent = item.owned ? 'Sahip olundu' : (item.levelUnlocked ? 'Seviye ile açık' : formatMc(item.price));

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'market-purchase-btn';
  action.textContent = item.owned ? 'Alındı' : 'Satın Al';
  action.disabled = !!item.owned;
  action.dataset.marketPurchase = item.id || '';

  card.append(preview, title, meta, action);
  return card;
}

async function loadMarketItems(target = getMarketRoot()) {
  if (!target) return null;
  target.dataset.marketLoading = 'true';
  try {
    const payload = await homeFetch('/api/market/items');
    const items = Array.isArray(payload?.items) ? payload.items : [];
    homeState.setState({ market: { items, ownedFrames: payload?.ownedFrames || [] } });
    if (!items.length) {
      renderEmptyState(target, 'Market ürünleri hazırlanıyor.', 'market-empty-state');
      return payload;
    }
    const fragment = document.createDocumentFragment();
    items.slice(0, 24).forEach((item) => fragment.appendChild(buildMarketCard(item)));
    target.replaceChildren(fragment);
    return payload;
  } finally {
    target.dataset.marketLoading = 'false';
  }
}

async function purchaseMarketItem(itemId = '') {
  const safeItemId = String(itemId || '').trim();
  if (!safeItemId) return null;
  const payload = await homeFetch('/api/market/purchase', {
    method: 'POST',
    body: JSON.stringify({ itemId: safeItemId })
  });
  await loadMarketItems().catch(() => null);
  return payload;
}

export function installMarketStateModule(root = document) {
  window.__PM_HOME_MARKET__ = Object.freeze({ loadMarketItems, purchaseMarketItem });

  const marketRoot = getMarketRoot();
  if (marketRoot) loadMarketItems(marketRoot).catch(() => renderEmptyState(marketRoot, 'Market şu anda yüklenemedi.', 'market-empty-state is-error'));

  root.addEventListener('click', async (event) => {
    const button = event.target?.closest?.('[data-market-purchase]');
    if (!button) return;
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    try {
      await purchaseMarketItem(button.dataset.marketPurchase || '');
      button.textContent = 'Alındı';
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Tekrar Dene';
      try { window.showToast?.('Market', error.message || 'Satın alma tamamlanamadı.', 'error'); } catch (_) {}
    }
  }, true);

  return true;
}
