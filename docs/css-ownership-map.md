# PlayMatrix CSS Ownership Map — Faz 0

## Amaç

Bu belge, UI redesign sürecinde CSS dosyalarının sorumluluk sınırlarını belirler. Amaç; `index.html`, `home.css`, `components.css`, `layout.css`, `profile.css`, `social.css` ve `responsive.css` üzerinde kontrolsüz çakışmayı engellemektir.

## CSS Import Sırası

Zorunlu sıra:

1. `public/css/tokens.css`
2. `public/css/base.css`
3. `public/css/layout.css`
4. `public/css/components.css`
5. `public/css/home.css`
6. `public/css/social.css`
7. `public/css/profile.css`
8. `public/css/games.css`
9. `public/css/admin.css`
10. `public/css/responsive.css`
11. `public/avatar-frame.css`
12. `public/css/components/avatar-picker.css`
13. `public/shell-enhancements.css`
14. `public/css/static-inline.css` — geçici/migration katmanı; kalıcı tasarım kaynağı değildir.

## Dosya Sahipliği

| Dosya | Sahiplik alanı | Fazlarda kullanım kuralı |
|---|---|---|
| `public/css/tokens.css` | renk, spacing, radius, shadow, motion, z-index, typography tokenları | Faz 1 sonrası tüm yeni renkler buradan çekilecek. |
| `public/css/base.css` | reset, body/html, font, selection, scrollbar, focus-visible, reduced motion | Component özel class yazılmaz. |
| `public/css/layout.css` | app shell, topbar, nav, container, drawer, sheet, footer layout | Header/nav/sheet dışı kart tasarımı buraya eklenmez. |
| `public/css/components.css` | buton, chip, input, badge, toast, dropdown item, ortak kart bileşeni | Sayfa özel layout yazılmaz. |
| `public/css/home.css` | hero, banner, kategori grid, oyun vitrini, leaderboard/stats home yüzeyleri | Auth/profile/social özel stilleri buraya eklenmez. |
| `public/css/profile.css` | auth form, profile sheet, hesabım, avatar/frame picker entegrasyonu | Home hero veya social chat stili yazılmaz. |
| `public/css/social.css` | sosyal merkez, chat, arkadaşlar, bildirim, destek yüzeyleri | Faz 9'da gerekirse alt dosyalara bölünebilir. |
| `public/css/games.css` | oyun kartı ve oyun giriş yüzeyleri | Header/sheet/auth stilleri yazılmaz. |
| `public/css/responsive.css` | breakpoint, safe-area, mobile overflow, keyboard/sheet düzeltmeleri | Ana bileşen tasarımı değil, adaptasyon yazılır. |
| `public/avatar-frame.css` | avatar frame render kontratı | Profil ve leaderboard aynı kontratı kullanır. |
| `public/shell-enhancements.css` | mevcut shell iyileştirme geçiş katmanı | Faz 1'de token sistemine bağlanacak veya temizlenecek. |
| `public/css/static-inline.css` | eski inline style migration çıktısı | Yeni geliştirme yapılmaz; kademeli boşaltılır. |

## Yasaklar

- Yeni component içinde sabit HEX kullanılmayacak.
- Aynı selector farklı CSS dosyalarında çakışacak şekilde tekrar tanımlanmayacak.
- `!important` sadece mevcut kritik hotfix'i korumak için kullanılacak; yeni tasarımda kullanılmayacak.
- `static-inline.css` içine yeni tasarım kuralı eklenmeyecek.
- `social.css` içine auth/profile/home özel stili yazılmayacak.
- `layout.css` içine component-specific renk/ikon detayı yazılmayacak.

## Fazlara Göre CSS Stratejisi

| Faz | Ana CSS dosyaları | Dikkat |
|---|---|---|
| Faz 1 | `tokens.css`, `base.css` | Eski değişkenler bridge ile geçici korunur, yeni tokenlar ana kaynak olur. |
| Faz 2 | `layout.css`, `components.css` | Topbar ve üst nav. |
| Faz 3 | `layout.css`, `responsive.css`, `components.css` | Mobile nav ve sheet motoru. |
| Faz 4 | `profile.css`, `components.css` | Auth, register, forgot. |
| Faz 5 | `home.css`, `games.css`, `components.css` | Ana sayfa, slider, kategori grid, oyun kartları. |
| Faz 6 | `layout.css`, `profile.css`, `components.css` | Drawer/dropdown. |
| Faz 7 | `profile.css`, `avatar-frame.css`, `components/avatar-picker.css` | Hesabım, avatar, frame. |
| Faz 8 | `home.css`, `components.css` | Çark, promo, davet. |
| Faz 9 | `social.css`, gerekirse yeni alt sosyal CSS dosyaları | Chat/destek karmaşası azaltılır. |
| Faz 10 | `home.css`, `components.css` | Leaderboard/stats. |
| Faz 11 | `responsive.css`, `base.css` | Final responsive, accessibility ve performance temizliği. |

## Temizlik Kuralı

Bir selector yeni sisteme taşındığında:

1. Eski kaynağı bulunur.
2. Yeni sahiplik dosyasına taşınır.
3. Çakışan eski kural kaldırılır veya yorumla deprecated işaretlenir.
4. Mobil 375px, 390px, 414px ve desktop 1024px+ kontrol edilir.


## Faz 2 Ek Sahiplikleri

| Dosya | Faz 2 Sorumluluğu |
|---|---|
| `public/css/layout.css` | İki satırlı `topbar`, `topbar-primary`, `category-nav`, aktif nav state. |
| `public/css/components.css` | Guest/user auth aksiyonları, MC chip, günlük çark shortcut, avatar trigger ve dropdown itemları. |
| `public/css/responsive.css` | Mobil header yüksekliği, yatay nav scroll, küçük iPhone ölçüleri. |

## Faz 3 CSS Sahipliği

- `public/css/layout.css`: 5'li mobil alt nav, global sheet shell, sheet panel, sheet backdrop, drag handle ve aktif nav state.
- `public/css/components.css`: mobil tab focus-visible, sheet close/handle focus state, reduced-motion ve sheet açıkken nav pointer güvenliği.
- `public/css/responsive.css`: iPhone safe-area, 375px/390px/414px uyumu, bottom drawer transform ve `--sheet-drag-y` hareket sözleşmesi.

## FAZ 4 Auth Ownership

- `public/css/profile.css`: Auth, forgot, input shell, step progress ve hesap doğrulama kartı görsel sistemi.
- `public/css/components.css`: Faz 4 ortak disabled/busy form state yardımcıları.

## FAZ 5 Home Redesign Ownership

- `public/css/home.css`: 21:9 hero banner, shortcut grid, game showcase, mobile game carousel.
- `public/css/games.css`: game media safety surfaces and shared touch behavior.
- `public/css/components.css`: buttons, tags, chips and reusable CTA primitives.

## Faz 6 CSS Sahipliği

- `public/css/layout.css`: Drawer shell, sol/sağ drawer konumlandırması, overlay ve safe-area yerleşimi.
- `public/css/components.css`: Drawer butonları, hızlı kategori kartları, akordeonlar, menü itemları ve focus/hover state'leri.
- `public/css/profile.css`: Profil drawer üst kartı, avatar, MC bakiye ve ödül talep butonu.
