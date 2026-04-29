# Faz 6 — Hesap / Ödül / Ledger Sistemi

## Tek defter standardı

MC ve XP üreten tüm ödül akışları `reward_ledger` standardına bağlıdır. Kalıcı ödül kaynakları `config/rewardCatalog.js` içinde tanımlıdır.

Kapsam:

- Kayıt ödülü: `signup_reward`
- E-posta doğrulama: `email_verify_reward`
- Promo kodu: `promo_code`
- Günlük çark: `wheel_spin`
- Davet eden: `referral_inviter`
- Davet edilen: `referral_invitee`
- Satranç galibiyeti: `chess_win`
- Pişti online ödülü: `pisti_online_win`
- Crash XP: `crash_spend_progress`
- Klasik oyun XP: `classic_score_progress`
- Aylık aktiflik: `monthly_active_reward`
- Admin manuel ödül: `admin_manual_grant`
- Admin toplu ödül: `admin_bulk_grant`

## İdempotency

Ledger doküman ID standardı `buildLedgerDocId` ile üretilir. Aynı ödül aynı kullanıcı/kaynak/referans veya idempotency key ile tekrar yazılamaz.

## Promo kodları

Promo kullanım limiti server-side transaction içinde düşürülür. Her promo claim `promo_claims/{promoDocId}_{uid}` altında kayıt altına alınır. `onePerAccount=true` olan kodlarda aynı hesap ikinci kez ödül alamaz.

## Günlük çark

Çark ödülü server tarafında `crypto.randomInt` ile seçilir. Client yalnızca animasyon gösterir; ödül tutarı client tarafından kabul edilmez.

## Recheck Hardening

- Kayıt ve e-posta doğrulama ödülleri artık kullanıcı bakiyesi ile `reward_ledger` kaydını aynı Firestore transaction içinde yazar. Ledger dokümanı daha önce varsa bakiye tekrar artırılmaz.
- Promo kod claim registry tek kullanımlık kodlarda `promoDocId_uid`, çok kullanımlı kodlarda `promoDocId_uid_claimAt` doküman anahtarını kullanır; çoklu kullanım geçmişi overwrite edilmez.
- Promo ledger `referenceId` artık kullanıcı girişi yerine canonical `promoDocId` kullanır.
