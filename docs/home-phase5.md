# FAZ 5 — Ana Sayfa, Hero Banner, Kategori Blokları ve Oyun Vitrini

## Kapsam

FAZ 5, PlayMatrix ana sayfasını referans mobil yerleşim iskeletine göre yeniden düzenler:

1. Header ve üst kategori navigasyonunun altında 21:9 banner slider.
2. İki sütunlu büyük oyun kategori blokları.
3. PlayMatrix oyunlarına ait kart vitrini.
4. Arama, filtreleme, boş durum ve route güvenliği.
5. Liderlik bölümüne kontrollü geçiş.

## Tasarım Kararı

Referans görsellerdeki koyu/sarı bahis dili doğrudan taşınmadı. Yerleşim oranı korundu; renk dili Faz 1 Soft-Dark token sistemine bağlandı.

Kullanılan PlayMatrix karşılıkları:

- Spor/Slot/Casino yerine: Crash, Satranç, Pişti, Pattern Master, Space Pro, Snake Pro.
- Para yatırma/çekme dili kullanılmadı.
- Banner içerikleri gerçek para çağrışımı yapmadan oyun, profil güvenliği ve liderlik ekseninde kurgulandı.

## Güncellenen Alanlar

- `index.html`
  - `#hero`
  - `#heroPromoCarousel`
  - `#homeShortcutGrid`
  - `#games`
  - `#gamesGrid`
- `public/css/home.css`
- `public/css/games.css`
- `public/css/components.css`
- `public/js/home/hero-slider.js`
- `public/js/home/game-catalog.js`
- `public/js/home/renderers.js`
- `public/js/home/app.js`
- `public/js/home/legacy-home.runtime.js`

## Kabul Kriterleri

- Ana sayfada eski hero metin ağırlıklı düzen kalmamalı.
- Banner slider 21:9 orana yakın çalışmalı.
- Mobilde kategori blokları 2 sütun olmalı.
- Oyun kartları mobilde yatay carousel hissi vermeli.
- Sarı/siyah referans dili ana tema olarak kullanılmamalı.
- Casino, Slot, Para Yatır, Para Çek, Bahis Geçmişi ana sayfa vitrini içinde yer almamalı.
- Route değerleri kırılmamalı:
  - `/online-games/crash`
  - `/online-games/chess`
  - `/online-games/pisti`
  - `/classic-games/pattern-master`
  - `/classic-games/space-pro`
  - `/classic-games/snake-pro`
