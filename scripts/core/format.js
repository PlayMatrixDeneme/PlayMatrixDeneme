export function formatNumber(value) {
  return new Intl.NumberFormat('tr-TR').format(Number(value || 0));
}

export function clampPercent(value) {
  const number = Number(value || 0);
  return Math.max(0, Math.min(100, number));
}
