# Faz 7 + Faz 8 + Faz 9 Recheck

## Faz 7
- Frontend home runtime artık `accountXpExact/accountLevelScoreExact` alanlarını önce okur.
- BigInt progression hesaplaması `getAccountLevelProgressFromXp(accountXpExact)` üzerinden yapılır.
- UI tarafında exact XP string alanları korunur: `accountXpExact`, `accountLevelScoreExact`, `accountLevelCurrentXpExact`, `accountLevelNextXpExact`, `accountLevelSpanXpExact`, `accountLevelRemainingXpExact`.
- Aylık ödül kayıt kontrolü `monthly_reward_runs/{YYYY-MM}.status=completed` üzerinden yapılır.
- Aylık aktiflik reseti ödül dağıtımı tamamlanmadan çalışmaz.

## Faz 8
- Avatar outputları manifest dışına çıkamaz.
- Frame outputları kayıtlı frame asset indekslerine bağlanır.
- `PMAvatar` renderer kontratı korunur.
- `selectedFrame=0` çerçevesizdir.
- Kilitli frame seçimleri server tarafında reddedilir.

## Faz 9
- `check-social-phase9.js` artık açık `process.exit(0)` ile CI/deploy scriptlerinde askıda kalmaz.
- Socket reconnect sırasında eski `disconnectTimer` temizlenir; kullanıcı yeniden bağlandığında gecikmeli offline yazımı engellenir.
- Global chat, DM, arkadaşlık, oyun daveti ve presence akışları `social:event` kontratıyla korunur.
- DM search index ve retention cleanup eşleşmesi korunur.
