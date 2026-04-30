# PlayMatrix UI Redesign — Faz 4 Auth Akışı

## Kapsam

Faz 4, Çarkbet referansındaki iki adımlı mobil auth iskeletini PlayMatrix içeriğine uyarlayan giriş, kayıt ve şifre sıfırlama akışıdır. Sarı/siyah referans dili taşınmadı; Faz 1 Soft-Dark token sistemi kullanıldı.

## Güncellenen Alanlar

- `index.html`
  - `data-sheet="auth"`
  - `data-sheet="forgot"`
- `public/css/profile.css`
- `public/css/components.css`
- `public/js/home/auth-modal.js`
- `public/js/home/api.js`
- `routes/auth.routes.js`

## Giriş Akışı

1. Kullanıcı adı veya e-posta alınır.
2. Kullanıcı adı girildiyse `/api/auth/resolve-login` ile e-posta çözümlenir.
3. E-posta maskelenmiş şekilde hesap doğrulama kartında gösterilir.
4. Şifre adımı açılır.
5. Final submit mevcut Firebase auth akışına bırakılır.

## Kayıt Akışı

1. Kullanıcı adı, isim soyisim ve e-posta alınır.
2. Şifre adımı açılır.
3. Onay kartı gösterilir.
4. Final submit mevcut kayıt ve e-posta doğrulama akışına bırakılır.

## Şifre Sıfırlama

- GSM kaldırıldı.
- E-posta tek yöntem olarak bırakıldı.
- Kullanıcı adı alanı opsiyonel destek alanıdır.
- Sıfırlama final submit mevcut Firebase reset akışına bırakılır.

## Güvenlik ve Uyumluluk

- Auth API kontratı kırılmadı.
- Legacy runtime final login/register/reset işlemlerini yürütmeye devam eder.
- Faz 4 modülü sadece akış, validasyon, görsel state ve adım yönetimi yapar.
- `/api/auth/resolve-login` artık `maskedEmail`, `displayIdentifier` ve `method` döndürür.
- `homeFetch` JSON body normalize eder.

## Konsept Dışı Kaldırılanlar

- GSM ile sıfırlama
- Para yatırma/çekme dili
- Bahis geçmişi dili
- Casino/slot dili
