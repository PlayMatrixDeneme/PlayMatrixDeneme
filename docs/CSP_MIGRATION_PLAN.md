# CSP Migration Plan

Amaç: `unsafe-inline` bağımlılığını kademeli olarak kaldırmak ve strict CSP moduna güvenli geçmek.

Faz 0 kapsamında Firebase/Admin credential güvenliği ayrıdır: production Firebase Admin yalnız `FIREBASE_KEY` ile açılır; credential public runtime veya CSP raporlarına sızdırılmaz.

Geçiş adımları:

1. Inline script/event/style kullanımlarını dosya bazlı modüllere taşı.
2. `SECURITY_CSP_REPORT_ONLY=1` ile raporları topla.
3. Kalan `unsafe-inline` gereksinimlerini temizle.
4. `SECURITY_CSP_STRICT=1` ile strict moda geç.
