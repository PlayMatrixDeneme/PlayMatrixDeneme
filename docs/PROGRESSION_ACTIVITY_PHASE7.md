# Faz 7 — Seviye / Aktiflik / Aylık Reset

- Backend ana policy: `utils/progression.js`
- Frontend policy dosyası: `public/data/progression-policy.js`
- Frontend policy backend değerlerinden üretilmiş exact decimal string tablolarını kullanır.
- XP değerleri BigInt decimal string olarak taşınır: `accountXpExact`, `accountLevelScoreExact`, `accountLevelNextXpExact`.
- UI için exact string formatlayıcıları: `formatXpExact`, `compactXpExact`.
- Aylık dönem timezone: `Europe/Istanbul`.
- Reset penceresi: `ACTIVITY_RESET_WINDOW_HOURS`.
- Aylık ödül penceresi: `MONTHLY_REWARD_WINDOW_HOURS`.
- Aylık ödül dağıtımı `monthly_reward_runs/{YYYY-MM}` + `reward_ledger` idempotency ile korunur.
- Reset sonrası `monthlyActiveScore/activityScore/monthlyActivity=0`, rank sınıfı `rank-level`, pass claim map yeni `__periodKey` ile başlar.
