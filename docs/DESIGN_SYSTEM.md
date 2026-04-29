# PlayMatrix Yeni Tasarım Dili

## Görsel Yön

- Koyu, premium oyun portalı hissi
- Kontrollü neon vurgu renkleri
- Glass panel, yumuşak gölge, derinlik ve layer standardı
- Mobil-first grid ve modal davranışı
- Büyük ama okunaklı CTA alanları

## Token Standardı

Tokenlar `public/styles/tokens.css` içinde tutulur.

- Arka plan: `--pm-bg`, `--pm-surface`, `--pm-surface-strong`
- Vurgu: `--pm-primary`, `--pm-secondary`, `--pm-danger`, `--pm-success`, `--pm-warning`
- Radius: `--pm-radius-*`
- Gölge: `--pm-shadow-*`
- Motion: `--pm-motion-fast`, `--pm-motion-normal`, `--pm-motion-slow`

## Component Standardı

- `Topbar`: hesap, seviye, aksiyonlar
- `Hero`: ana karşılama ve hızlı aksiyonlar
- `GameCard`: oyun giriş kartları
- `MetricCard`: istatistik kartları
- `Leaderboard`: liderlik alanı
- `RewardRail`: çark/promo/davet girişleri
- `Modal`: tek modal/sheet standardı
- `AvatarFrame`: avatar + frame bütünlüğü

## Mobil Kuralı

Global `touchmove preventDefault` kullanılmaz. Scroll kilidi sadece modal açıkken `body[data-modal-open="true"]` üzerinden uygulanır. Scrollable modal gövdeleri `touch-action: pan-y` kullanır.
