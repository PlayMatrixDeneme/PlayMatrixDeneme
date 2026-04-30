# PlayMatrix UI Redesign — Faz 1 Tasarım Sistemi

## Amaç

Faz 1, PlayMatrix ana UI katmanını eski renk/font/motion kararlarından ayırır ve sonraki fazların tamamı için tek kaynak tasarım sistemi kurar. Referans ekranlardaki sarı/siyah bahis sitesi paleti PlayMatrix'e taşınmaz; sadece yerleşim mantığı sonraki fazlarda kullanılacaktır.

## Renk Kararı — Ferah Soft-Dark

| Token | HEX | Kullanım |
|---|---:|---|
| `--bg-void` | `#0B1020` | Ana arka plan |
| `--bg-surface` | `#121A2B` | Kart yüzeyi |
| `--bg-elevated` | `#182238` | Modal, sheet, dropdown |
| `--bg-soft` | `#EEF6FF` | Light accent yüzeyi |
| `--bg-glass` | `rgba(18, 26, 43, .78)` | Cam efektli paneller |
| `--border-subtle` | `#26334D` | İnce çizgiler |
| `--border-strong` | `#3B4B6D` | Aktif/önemli çizgiler |
| `--accent-primary` | `#5BA7FF` | Ana mavi accent |
| `--accent-secondary` | `#8B5CF6` | Mor accent |
| `--accent-cyan` | `#22D3EE` | Ferah vurgu |
| `--accent-success` | `#2DD4BF` | Başarı/destek/online |
| `--accent-warning` | `#F8B84E` | Sadece ödül/MC detayı |
| `--accent-danger` | `#F43F5E` | Hata/çıkış |
| `--text-primary` | `#F4F8FF` | Ana metin |
| `--text-secondary` | `#AAB8D4` | İkincil metin |
| `--text-muted` | `#667795` | Pasif metin |
| `--text-inverse` | `#07111F` | Açık yüzey üstü metin |

## Tipografi Kararı

| Rol | Font | Weight | Kullanım |
|---|---|---:|---|
| Display | `Syne` | 700–800 | Logo, hero, büyük başlık |
| UI / Heading | `DM Sans` | 600–700 | Menü, panel başlığı |
| Body | `DM Sans` | 400–500 | Açıklama, form, kart metni |
| Numeric | `JetBrains Mono` | 500–700 | MC, ID, skor, level, sayaç |

## Motion Kararı

| Token | Değer |
|---|---|
| `--duration-fast` | `140ms` |
| `--duration-normal` | `240ms` |
| `--duration-slow` | `380ms` |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

## Faz 1 CSS Kuralları

- Yeni tasarım kodunda sabit HEX kullanılmaz; istisna sadece `public/css/tokens.css` içindeki kaynak token değerleridir.
- Eski `--bg`, `--text`, `--primary`, `--line`, `--muted` gibi değişkenler yalnızca geçiş uyumluluğu için bridge olarak tutulur.
- Yeni componentlerde ana tokenlar kullanılır: `--bg-void`, `--bg-surface`, `--bg-elevated`, `--accent-primary`, `--text-primary`.
- `public/shell-enhancements.css` ayrı `--pm-*` rengi üretmez; ana tokenlardan türetilmiş geçiş katmanı olarak kalır.
- `public/css/static-inline.css` kalıcı tasarım kaynağı değildir; Faz 1'de büyütülmez.

## Faz 1 Kabul Kriterleri

- `index.html` sadece Syne, DM Sans ve JetBrains Mono font importunu kullanır.
- `public/css/base.css` içinde selection, scrollbar, focus-visible, reduced motion ve global keyframe sistemi vardır.
- `public/css/tokens.css` tüm yeni tokenları içerir.
- Ana redesign CSS dosyalarında sabit HEX bulunmaz.
- Body/html reset iOS ve mobil overflow güvenliğiyle uyumludur.
