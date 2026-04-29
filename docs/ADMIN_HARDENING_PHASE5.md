# Faz 5 — Admin Panel Sertleştirme

## Zorunlu admin zinciri

Admin API ve korumalı admin HTML yüzeyleri şu sıraya bağlıdır:

1. Firebase ID token ile server session bootstrap.
2. Server session üzerinden UID + e-posta admin guard.
3. İkinci faktör (`ADMIN_PANEL_SECOND_FACTOR_HASH_HEX` + salt).
4. Üçüncü faktör (`ADMIN_PANEL_THIRD_FACTOR_NAME`).
5. `admin_matrix` kaynaklı server session.
6. `x-admin-client-key` + UID/e-posta/sessionId eşleşmesi.
7. Permission gate (`requireAdminPermission`).

`/admin/admin.html`, `/admin/health.html`, `/ops/health`, `/health-dashboard` yalnızca `admin_matrix` session sonrası açılır. Bootstrap session tek başına panel veya health dashboard erişimi sağlamaz.

## Kullanıcı düzenleme senkronu

Admin e-posta düzenleme akışı önce Firebase Auth üzerinde `auth.updateUser` ile senkron yapar, ardından Firestore kullanıcı dokümanını günceller. Firestore güncellemesi hata verirse Auth e-posta rollback denenir.

## Denetim kayıtları

Bakiye, hesap seviyesi, XP, hesap seviye skoru ve seçili çerçeve değişimleri audit metadata içinde `auditedValueDiff` ve `auditedValueFields` olarak kaydedilir.

Kapsam:

- Tek kullanıcı düzenleme.
- Tek kullanıcı değer sıfırlama.
- Tüm kullanıcı değer sıfırlama.
- Matrix nuclear reset.
- Manuel admin ödülü.
- Toplu admin ödülü.

## Toplu ödül idempotency

Toplu admin ödülleri `admin_bulk_reward_runs/{bulkId}` altında kayıt altına alınır. Aynı `bulkId` aynı parametrelerle tekrar çalıştırılırsa kullanıcı başına ledger idempotency nedeniyle tekrar bakiye yazılmaz. Aynı `bulkId` farklı tutar/kaynak/aktör/gerekçe ile kullanılırsa işlem `BULK_REWARD_IDEMPOTENCY_CONFLICT` ile reddedilir.
