# PLAYMATRIX Referans Uyumluluk Notu

Bu fazda `GÜNCEL.zip` hedef kod olarak korunur. `PLAYMATRİX.zip` yalnızca çalışan Firebase/Admin/Render davranışı için referans alınır.

## Sabitlenen Kriterler

- Firebase Admin credential kaynağı: `FIREBASE_KEY`.
- Production ortamında memory Firestore fallback yoktur.
- Firebase Admin bağlanamazsa uygulama sahte başarılı şekilde açılmaz.
- Health kontratı:
  - `firebase.ready === true`
  - `firebase.degraded === false`
  - `firebase.mode === "admin-sdk"`
  - `firebase.source === "FIREBASE_KEY"`

## Admin Route Register Kriteri

Admin HTML erişimi public static mount üzerinden bypass edilemez.

Korumalı sayfalar:

- `/admin/admin.html`
- `/public/admin/admin.html`
- `/admin/health.html`
- `/public/admin/health.html`
- `/ops/health`
- `/health-dashboard`

Bu route'lar, root `public/` static mount işleminden önce register edilir.

## Admin Guard Zinciri

1. Firebase ID token doğrulama
2. Server session doğrulama
3. UID/e-posta eşleşmeli admin guard
4. Second factor doğrulama
5. Third factor doğrulama
6. Client gate key üretimi
7. Admin dashboard/API erişiminde `x-admin-client-key` + server session eşleşmesi
8. Admin API permission kontrolü

`/api/auth/admin/bootstrap` sadece Firebase oturumu oluşturur; admin API erişimi için tek başına yeterli değildir. Admin API guard ikinci ve üçüncü faktör sonrası üretilen `x-admin-client-key` değerini aktif server session ID ile eşleştirmeden isteği kabul etmez.
