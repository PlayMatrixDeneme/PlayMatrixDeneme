# Faz 7 + Faz 8 Recheck Notları

## Faz 7 — Seviye / Aktiflik / Aylık Reset

- Backend ve frontend progression policy tek kaynakta tutulur: `utils/progression.js`.
- Frontend policy `public/data/progression-policy.js` exact decimal string değerlerini kullanır.
- Canonical user state artık exact UI alanlarını üst seviyede de taşır: `accountLevelCurrentXpExact`, `accountLevelNextXpExact`, `accountLevelSpanXpExact`, `accountLevelRemainingXpExact`.
- Aylık ödül tamamlanma kontrolü yalnızca `monthly_reward_runs/{YYYY-MM}` dokümanındaki `status=completed` durumuna bağlıdır.
- Kullanıcı dokümanındaki `lastMonthlyRewardKey` artık global tamamlanma sinyali olarak kullanılmaz; kısmi dağıtım sonrası kalan oyuncuların ödülsüz kalması engellenir.
- `processActivityResetIfNeeded` aylık ödül tamamlanmadan reset yapmaz; `monthly_rewards_pending` ile erteler.
- Monthly reward job içinde aktiflik reseti tek kez çağrılır.
- Aylık ödül job hata verirse run dokümanı `failed` durumuna alınır, tekrar deneme idempotent ledger key ile güvenli kalır.

## Faz 8 — Avatar / Çerçeve Sistemi

- Tek render kontratı `window.PMAvatar` olarak korunur.
- Server public avatar çıktıları `sanitizePublicAvatarForOutput` üzerinden geçer.
- Chat, DM/socket, Crash, Satranç ve Pişti oyuncu/avatar çıktıları kayıtlı manifest avatarı dışına çıkamaz.
- Profil ve admin güncelleme akışları sadece manifest içinde kayıtlı avatar linklerini kabul eder.
- Çerçeve seçimi sadece sayısal `selectedFrame` ile yapılır; harici frame URL/PNG/SVG alanları admin patch içinde reddedilir.
- `selectedFrame=0` çerçevesizdir.
- `selectedFrame > accountLevel` server tarafında reddedilir.
- Frame asset katalogu Faz 3 kararına göre `frame-1` → `frame-18` ile sınırlıdır.
