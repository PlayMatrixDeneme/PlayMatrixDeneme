# FAZ 3 — Mobil Alt Nav ve Global Sheet Motoru

## Kapsam

Faz 3, PlayMatrix ana sayfasındaki mobil alt navigasyonu 5 ana aksiyona indirir ve tüm sheet açılır panellerini tek global motor altında toplar.

## Mobil Alt Nav

Kesin 5 aksiyon:

1. Ana Sayfa
2. Oyunlar
3. Promosyonlar
4. Çark
5. Destek

`Para Yatır`, `Para Çek`, `Bahis Geçmişi`, `Casino`, `Slot` ve benzeri PlayMatrix konsepti dışı aksiyonlar kullanılmaz.

## Sheet Motoru

Global motor: `public/js/home/sheet-engine.js`

Desteklenen davranışlar:

- Global backdrop
- Blur overlay
- Drag handle
- Sağ üst kapat butonu
- ESC ile kapatma
- Backdrop click ile kapatma
- Body scroll lock
- Focus trap
- Safe-area uyumlu bottom padding
- Mobilde bottom drawer animasyonu

## Bağlanan Sheet Alanları

- `auth`
- `forgot`
- `profile`
- `wheel`
- `promo`
- `support`
- `invite`
- `social`

## Kabul Kriterleri

- Mobil nav 5 butondan fazla içermez.
- Mobil nav sabit/floating bottom bar olarak çalışır.
- Destek butonu success accent kullanır.
- Sheet açıkken body scroll kilitlenir.
- Sheet backdrop, kapat butonu, ESC ve drag gesture ile kapanır.
- iPhone safe-area alt boşluğu hesaba katılır.
- Eski modal davranışları korunur; yeni sheet motoru legacy runtime ile çakışmaz.
