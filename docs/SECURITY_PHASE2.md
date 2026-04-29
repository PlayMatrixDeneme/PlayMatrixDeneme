# PLAYMATRIX Faz 2 — Security Hardening

## Amaç

Faz 2; auth/session, admin gate, CSP geçişi ve güvenli link davranışlarını server-side doğrulanabilir hale getirir.

## Session Contract

- Raw server session token client JS response içine dönmez.
- Raw server session token `localStorage` veya `sessionStorage` içine yazılmaz.
- Session taşıma merkezi `HttpOnly` `pm_session` cookie üzerinden yapılır.
- `x-session-token` legacy header kabulü default kapalıdır.
- Production ENV içinde `LEGACY_SESSION_HEADER_ENABLED=0` kalmalıdır.

## Admin Gate Contract

Admin zinciri:

```txt
Firebase Auth -> Server session -> Admin UID/email check -> 2FA/3FA gate -> client gate key -> server-side permission -> audit log
```

- İkinci adım parola plaintext ENV olarak tutulmaz.
- `ADMIN_PANEL_SECOND_FACTOR_HASH_HEX` ve `ADMIN_PANEL_SECOND_FACTOR_SALT_HEX` zorunludur.
- Üçüncü adım `ADMIN_PANEL_THIRD_FACTOR_NAME` ile server-side doğrulanır.
- Admin route erişimleri server-side `createAdminGuard` ve permission checker üzerinden geçer.
- Başarısız gate denemeleri ve kritik admin route erişimleri audit log'a yazılır.

## CSP Contract

Faz 2 geçiş değeri:

```env
SECURITY_CSP_STRICT=0
SECURITY_CSP_REPORT_ONLY=1
```

Final strict geçişi, inline script/style temizliği tamamlandıktan sonra yapılmalıdır:

```env
SECURITY_CSP_STRICT=1
SECURITY_CSP_REPORT_ONLY=0
```

CSP rapor endpointi:

```txt
POST /api/security/csp-report
```

## Kontrol Komutu

```bash
npm run check:phase2
```

Bu komut Faz 0, Faz 1 ve Faz 2 kalite kapılarını birlikte çalıştırır.
