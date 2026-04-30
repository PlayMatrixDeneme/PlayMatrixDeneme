# PlayMatrix UI Redesign — Faz 2 Shell Sözleşmesi

## Kapsam

Faz 2, ana shell katmanını Çarkbet referansındaki mobil yerleşim iskeletine yaklaştırır; fakat PlayMatrix konsepti dışındaki bahis, ödeme, casino ve para yatırma/çekme öğelerini kullanmaz.

## Header Yapısı

- `header.topbar[data-shell-phase="2"]` ana shell köküdür.
- `topbar-primary` birinci satırdır:
  - sol: PlayMatrix logo ve kısa brand,
  - sağ: guest auth aksiyonları veya user account aksiyonları.
- `category-nav` ikinci satırdır:
  - Ana Sayfa,
  - Oyunlar,
  - Liderlik,
  - Sosyal,
  - Destek.

## Guest State

Guest state içinde yalnızca şu aksiyonlar görünür:

- `Giriş Yap`
- `Kayıt Ol`

Bu iki buton `#topbarAuthActions` içinde tutulur. `data-auth-state="guest"` aktif olduğunda görünür.

## User State

User state içinde şu alanlar görünür:

- MC bakiye chip'i,
- Günlük Çark kısayolu,
- Avatar profil trigger'ı,
- Profil dropdown menüsü.

User state `#topUser.is-visible` ve `.topbar[data-auth-state="user"]` ile senkronize edilir.

## Konsept Dışı Yasaklar

Header, dropdown ve kategori nav içinde şu ifadeler kullanılmaz:

- Para Yatır
- Para Çek
- Bahis Geçmişi
- Casino
- Slot
- Canlı Casino

## JS Sahipliği

- `public/js/home/shell.js`: aktif nav, shell action proxy, dropdown erişilebilirlik, auth chrome sync.
- `public/js/home/account.js`: auth state ile topbar görünümünü senkronize eder.
- `public/js/home/state.js`: `shell.activeNav` ve `shell.authState` alanlarını taşır.
- `public/js/home/profile-panel.js`: mevcut profile/dropdown fallback davranışlarını korur.

## CSS Sahipliği

- `layout.css`: iki satırlı topbar, kategori nav, shell yerleşimi.
- `components.css`: auth butonları, MC chip, çark kısayolu, avatar trigger, dropdown itemları.
- `responsive.css`: mobil topbar yüksekliği, yatay kategori nav, iPhone genişlikleri.

## Kabul Notu

Faz 2 yalnızca shell/header/topbar/üst navigasyon sorumluluğunu üstlenir. Mobil alt nav ve bottom sheet sistemi Faz 3 kapsamındadır.
