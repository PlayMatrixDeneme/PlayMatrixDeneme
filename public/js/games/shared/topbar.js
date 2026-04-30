/* PlayMatrix shared account topbar hydration for online/classic games. */
const FALLBACK_AVATAR = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20128%20128%27%20role%3D%27img%27%20aria-label%3D%27PlayMatrix%20Avatar%27%3E%3Cdefs%3E%3ClinearGradient%20id%3D%27pmg%27%20x1%3D%270%27%20x2%3D%271%27%20y1%3D%270%27%20y2%3D%271%27%3E%3Cstop%20offset%3D%270%25%27%20stop-color%3D%27%23111827%27%2F%3E%3Cstop%20offset%3D%27100%25%27%20stop-color%3D%27%231f2937%27%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%27128%27%20height%3D%27128%27%20rx%3D%2728%27%20fill%3D%27url%28%23pmg%29%27%2F%3E%3Ccircle%20cx%3D%2764%27%20cy%3D%2750%27%20r%3D%2724%27%20fill%3D%27%23f59e0b%27%20fill-opacity%3D%27.94%27%2F%3E%3Cpath%20d%3D%27M26%20108c8-18%2024-28%2038-28s30%2010%2038%2028%27%20fill%3D%27%23fbbf24%27%20fill-opacity%3D%27.92%27%2F%3E%3Ctext%20x%3D%2764%27%20y%3D%27118%27%20text-anchor%3D%27middle%27%20font-family%3D%27Inter%2CArial%2Csans-serif%27%20font-size%3D%2716%27%20font-weight%3D%27700%27%20fill%3D%27%23f9fafb%27%3EPM%3C%2Ftext%3E%3C%2Fsvg%3E";

function finiteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeAvatarUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return FALLBACK_AVATAR;
  if (/^(https?:|data:image\/|\/|\.\/|\.\.\/)/i.test(raw)) return raw;
  return FALLBACK_AVATAR;
}

export function resolveAccountSnapshot(payload = {}) {
  const user = payload?.user && typeof payload.user === 'object' ? payload.user : payload;
  const progression = user?.progression && typeof user.progression === 'object' ? user.progression : {};
  const balance = finiteNumber(payload?.balance ?? user?.balance, 0);
  const accountLevel = Math.max(1, Math.floor(finiteNumber(user?.accountLevel ?? progression?.accountLevel ?? user?.level, 1)));
  const accountProgress = Math.max(0, Math.min(100, finiteNumber(progression?.accountLevelProgressPct ?? user?.accountLevelProgressPct, 0)));
  const avatar = safeAvatarUrl(user?.avatar ?? user?.selectedAvatar ?? payload?.avatar);
  const selectedFrame = Math.max(0, Math.floor(finiteNumber(user?.selectedFrame ?? payload?.selectedFrame, 0)));
  return { user, balance, accountLevel, accountProgress, avatar, selectedFrame };
}

function renderTopbarAvatar(host, snapshot) {
  if (!host) return;
  host.textContent = '';
  try {
    if (window.PMAvatar && typeof window.PMAvatar.createNode === 'function') {
      const node = window.PMAvatar.createNode({
        avatarUrl: snapshot.avatar || FALLBACK_AVATAR,
        level: snapshot.selectedFrame || 0,
        sizePx: 38,
        extraClass: 'pm-avatar--topbar pm-avatar--game-topbar',
        imageClass: 'pm-avatar-img',
        wrapperClass: 'pm-avatar',
        alt: 'Oyuncu avatarı'
      });
      host.replaceChildren(node);
      return;
    }
  } catch (_) {}
  const img = document.createElement('img');
  img.src = snapshot.avatar || FALLBACK_AVATAR;
  img.alt = 'Oyuncu avatarı';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  img.className = 'pm-classic-topbar-avatar-img';
  host.replaceChildren(img);
}

export function hydrateGameTopbar(payload = {}, options = {}) {
  const snapshot = resolveAccountSnapshot(payload);
  const balanceIds = options.balanceIds || ['uiBalance', 'ui-balance'];
  const levelBarId = options.levelBarId || 'uiAccountLevelBar';
  const levelPctId = options.levelPctId || 'uiAccountLevelPct';
  const levelBadgeId = options.levelBadgeId || 'uiAccountLevelBadge';
  const avatarHostId = options.avatarHostId || 'uiAccountAvatarHost';

  const balanceEl = balanceIds.map((id) => document.getElementById(id)).find(Boolean);
  if (balanceEl) {
    balanceEl.innerText = snapshot.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const levelBarEl = document.getElementById(levelBarId);
  const levelPctEl = document.getElementById(levelPctId);
  const levelBadgeEl = document.getElementById(levelBadgeId);
  if (levelBarEl) levelBarEl.style.width = `${snapshot.accountProgress}%`;
  if (levelPctEl) levelPctEl.innerText = `${snapshot.accountProgress.toFixed(1)}%`;
  if (levelBadgeEl) levelBadgeEl.innerText = String(snapshot.accountLevel);
  renderTopbarAvatar(document.getElementById(avatarHostId), snapshot);
  return snapshot;
}
