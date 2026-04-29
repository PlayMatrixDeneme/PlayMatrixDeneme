const CATEGORY_LABELS = Object.freeze({ all: 'Tümü', frame: 'Çerçeve', stats_background: 'İstatistik Arka Planı', chat_bubble: 'Chat Balonu', nameplate: 'Nameplate', badge: 'Rozet', name_style: 'İsim Efekti' });
const RARITY_LABELS = Object.freeze({ common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic' });
function apiFetch(path, options = {}) {
  const api = window.__PM_API__;
  if (api?.fetchJson) return api.fetchJson(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  return fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }).then(async (res) => {
    const payload = await res.json().catch(() => null);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || `HTTP ${res.status}`);
    return payload;
  });
}
function text(value, fallback = '') { return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, '').trim(); }
function formatMc(value) { const n = Number(value || 0); return `${Math.floor(Number.isFinite(n) ? n : 0).toLocaleString('tr-TR')} MC`; }
function el(tag, className = '', content = '') { const node = document.createElement(tag); if (className) node.className = className; if (content) node.textContent = content; return node; }
function preview(item) {
  const box = el('div', `pm-market-card__preview ${text(item.previewClass)}`.trim());
  if (item.assetUrl) { const img = document.createElement('img'); img.src = item.assetUrl; img.alt = item.name || 'Market ürünü'; img.loading = 'lazy'; img.decoding = 'async'; box.appendChild(img); }
  else box.appendChild(el('span', 'pm-market-card__sample', item.type === 'name_style' ? 'PLAYMATRIX' : item.name || 'PM'));
  return box;
}
function ensureRoot() {
  let launcher = document.getElementById('pm-market-launcher');
  if (!launcher) { launcher = el('button', 'pm-market-launcher'); launcher.id = 'pm-market-launcher'; launcher.type = 'button'; launcher.setAttribute('aria-haspopup', 'dialog'); launcher.innerHTML = '<span aria-hidden="true">✦</span><strong>Market</strong>'; document.body.appendChild(launcher); }
  let modal = document.getElementById('pm-market-modal');
  if (!modal) {
    modal = el('section', 'pm-market-modal'); modal.id = 'pm-market-modal'; modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'pm-market-title');
    const panel = el('div', 'pm-market-panel');
    const header = el('header', 'pm-market-header');
    const titleWrap = el('div', 'pm-market-titlewrap'); titleWrap.append(el('span', 'pm-market-eyebrow', 'PlayMatrix Kozmetik Vitrini'));
    const title = el('h2', 'pm-market-title', 'Premium Market'); title.id = 'pm-market-title'; titleWrap.append(title, el('p', 'pm-market-subtitle', 'MC ile çerçeve, rozet, chat skin, nameplate ve özel isim efektleri satın al.'));
    const balance = el('div', 'pm-market-balance', 'MC: —'); balance.id = 'pm-market-balance';
    const close = el('button', 'pm-market-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Marketi kapat'); header.append(titleWrap, balance, close);
    const filters = el('nav', 'pm-market-filters'); Object.entries(CATEGORY_LABELS).forEach(([key, label]) => { const btn = el('button', 'pm-market-filter', label); btn.type = 'button'; btn.dataset.type = key; if (key === 'all') btn.classList.add('is-active'); filters.appendChild(btn); });
    const status = el('div', 'pm-market-status', 'Market yükleniyor...'); status.id = 'pm-market-status'; const grid = el('div', 'pm-market-grid'); grid.id = 'pm-market-grid'; panel.append(header, filters, status, grid); modal.appendChild(panel); document.body.appendChild(modal);
  }
  return { launcher, modal };
}
function setOpen(modal, open) { modal.hidden = !open; modal.classList.toggle('is-open', !!open); document.documentElement.classList.toggle('pm-market-open', !!open); document.body.classList.toggle('pm-market-open', !!open); }
function render(state) {
  const grid = document.getElementById('pm-market-grid'); const status = document.getElementById('pm-market-status'); const balance = document.getElementById('pm-market-balance'); if (!grid || !status) return;
  grid.replaceChildren(); if (balance) balance.textContent = `MC: ${formatMc(state.balance)}`; const items = (state.items || []).filter((item) => state.filter === 'all' || item.type === state.filter); status.textContent = items.length ? `${items.length} ürün listeleniyor.` : 'Bu kategoride ürün bulunamadı.';
  items.forEach((item) => { const card = el('article', `pm-market-card is-${text(item.rarity, 'common')}`); card.dataset.itemId = item.id; const top = el('div', 'pm-market-card__top'); top.append(el('span', 'pm-market-card__type', CATEGORY_LABELS[item.type] || item.type), el('span', 'pm-market-card__rarity', RARITY_LABELS[item.rarity] || item.rarity || 'Common')); const name = el('h3', 'pm-market-card__name', item.name || item.id); const desc = el('p', 'pm-market-card__desc', item.description || 'Premium PlayMatrix kozmetiği.'); const footer = el('footer', 'pm-market-card__footer'); const price = el('strong', 'pm-market-card__price', formatMc(item.priceMcExact)); const action = el('button', 'pm-market-card__action', item.equipped ? 'Kuşanıldı' : (item.owned ? 'Kuşan' : 'Satın Al')); action.type = 'button'; action.dataset.action = item.owned ? 'equip' : 'purchase'; action.dataset.itemId = item.id; action.dataset.type = item.type; action.disabled = !!item.equipped; footer.append(price, action); card.append(top, preview(item), name, desc, footer); grid.appendChild(card); });
}
async function load(state) { const status = document.getElementById('pm-market-status'); if (status) status.textContent = 'Market yükleniyor...'; const payload = await apiFetch('/api/market/me').catch(() => apiFetch('/api/market/catalog')); state.items = Array.isArray(payload.items) ? payload.items : []; state.balance = payload.balance || 0; render(state); }
async function handleAction(event, state) { const button = event.target.closest('[data-action][data-item-id]'); if (!button) return; const action = button.dataset.action; const itemId = button.dataset.itemId; const type = button.dataset.type; button.disabled = true; const old = button.textContent; button.textContent = action === 'purchase' ? 'Satın alınıyor...' : 'Kuşanılıyor...'; try { await apiFetch(action === 'purchase' ? '/api/market/purchase' : '/api/market/equip', { method: 'POST', body: JSON.stringify(action === 'purchase' ? { itemId } : { itemId, type }) }); await load(state); } catch (error) { button.disabled = false; button.textContent = old; const status = document.getElementById('pm-market-status'); if (status) status.textContent = error?.message || 'Market işlemi başarısız.'; } }
export function installMarketUi() {
  if (window.__PM_MARKET_UI_INSTALLED__) return true; window.__PM_MARKET_UI_INSTALLED__ = true; const state = { items: [], balance: 0, filter: 'all' }; const { launcher, modal } = ensureRoot();
  launcher.addEventListener('click', async () => { setOpen(modal, true); await load(state).catch((error) => { const status = document.getElementById('pm-market-status'); if (status) status.textContent = error?.message || 'Market açılamadı.'; }); });
  modal.querySelector('.pm-market-close')?.addEventListener('click', () => setOpen(modal, false));
  modal.addEventListener('click', (event) => { if (event.target === modal) setOpen(modal, false); handleAction(event, state); });
  modal.querySelector('.pm-market-filters')?.addEventListener('click', (event) => { const btn = event.target.closest('[data-type]'); if (!btn) return; state.filter = btn.dataset.type || 'all'; modal.querySelectorAll('.pm-market-filter').forEach((node) => node.classList.toggle('is-active', node === btn)); render(state); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) setOpen(modal, false); });
  return true;
}
