export const PROFILE_STATS_MODULE = 'phase7-premium-profile-center';
const asNumber = (value, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function normalizePlayerStatsPayload(payload = {}) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const stats = data.statistics && typeof data.statistics === 'object' ? data.statistics : {};
  const gameStats = data.gameStats && typeof data.gameStats === 'object' ? data.gameStats : {};
  const total = gameStats.total && typeof gameStats.total === 'object' ? gameStats.total : {};
  return Object.freeze({
    uid: String(data.uid || '').trim(), username: String(data.username || 'Oyuncu').trim() || 'Oyuncu', email: String(data.email || '').trim(),
    emailVerified: Boolean(data.emailVerified || data.verified || data.isEmailVerified), avatar: String(data.avatar || '').trim(),
    selectedFrame: clamp(Math.floor(asNumber(data.selectedFrame ?? data.progression?.selectedFrame, 0)), 0, 100),
    accountLevel: clamp(Math.floor(asNumber(data.accountLevel ?? data.level ?? data.progression?.accountLevel, 1)), 1, 100),
    accountXp: Math.max(0, asNumber(data.accountXp ?? data.progression?.accountXp, 0)),
    accountLevelProgressPct: clamp(asNumber(data.accountLevelProgressPct ?? data.progression?.accountLevelProgressPct, 0), 0, 100),
    monthlyActiveScore: Math.max(0, asNumber(data.monthlyActiveScore ?? data.progression?.monthlyActivity ?? stats.monthlyActiveScore, 0)),
    totalRounds: Math.max(0, asNumber(data.totalRounds ?? total.rounds ?? stats.totalRounds, 0)),
    totalWins: Math.max(0, asNumber(data.totalWins ?? total.wins ?? stats.totalWins, 0)), totalLosses: Math.max(0, asNumber(data.totalLosses ?? total.losses ?? stats.totalLosses, 0)), totalDraws: Math.max(0, asNumber(data.totalDraws ?? total.draws ?? stats.totalDraws, 0)),
    winRatePct: clamp(asNumber(data.winRatePct ?? data.winRate ?? total.winRatePct ?? stats.winRatePct, 0), 0, 100), balance: Math.max(0, asNumber(data.balance ?? stats.balance, 0)), createdAt: asNumber(data.createdAt ?? data.memberSince ?? data.created_at, 0), lastSeen: asNumber(data.lastSeen ?? data.lastActiveAt, 0), usernameChangeRemaining: Math.max(0, asNumber(data.usernameChangeRemaining, 3)), usernameChangeLimit: Math.max(0, asNumber(data.usernameChangeLimit, 3)), gameStats, recentGames: Array.isArray(data.recentGames) ? data.recentGames.slice(0, 6) : []
  });
}
export function formatDateTR(timestamp = 0) { const numeric = asNumber(timestamp, 0); if (!numeric) return 'Yeni'; try { return new Date(numeric).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (_) { return 'Yeni'; } }
export function buildPhase7ProfileStats(payload = {}) { const normalized = normalizePlayerStatsPayload(payload); return Object.freeze([
  { key: 'totalRounds', label: 'Toplam Oyun', value: String(Math.round(normalized.totalRounds)), icon: 'fa-gamepad', meta: 'Tüm modlar' },
  { key: 'accountLevel', label: 'Hesap Seviyesi', value: String(normalized.accountLevel), icon: 'fa-arrow-trend-up', meta: '%' + normalized.accountLevelProgressPct.toFixed(1) },
  { key: 'monthlyActiveScore', label: 'Aylık Aktiflik', value: String(Math.round(normalized.monthlyActiveScore)), icon: 'fa-calendar-check', meta: 'Sezon aktivitesi' },
  { key: 'createdAt', label: 'Üye Tarihi', value: formatDateTR(normalized.createdAt), icon: 'fa-id-badge', meta: normalized.emailVerified ? 'Doğrulanmış' : 'Doğrulama bekliyor' }
]); }
export function buildPlayerStatsRows(payload = {}) { const normalized = normalizePlayerStatsPayload(payload); return Object.freeze({ general: [['Seviye', String(normalized.accountLevel)], ['Hesap XP', String(Math.round(normalized.accountXp))], ['Aylık Aktiflik', String(Math.round(normalized.monthlyActiveScore))], ['Toplam Oyun', String(Math.round(normalized.totalRounds))], ['Kazanma Oranı', '%' + normalized.winRatePct.toFixed(1)]], phase7: buildPhase7ProfileStats(normalized), recentGames: normalized.recentGames }); }
