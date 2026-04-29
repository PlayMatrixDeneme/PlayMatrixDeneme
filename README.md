# PlayMatrix AnaSayfa Rebuild

Bu paket, PlayMatrix için **AnaSayfa-only** yeni tasarım iskeletidir. Oyun, admin, market ve production socket dosyaları bu pakete eklenmedi. Paket; AnaSayfa tasarım dili, component yapısı, API adapter temeli, mock veri ve doğrulama testlerini içerir.

## Çalıştırma

```bash
npm run start
npm run verify:homepage
npm run audit:homepage
```

## Kapsam

- Yeni AnaSayfa tasarım dili
- Tasarım tokenları
- Responsive layout
- Modal/sheet altyapısı
- Oyun kartı standardı
- Liderlik/istatistik/ödül/hızlı eşleşme mock panelleri
- Avatar/çerçeve component standardı
- Homepage-only audit ve test kapısı

## Kapsam Dışı

- Online oyun runtime kodları
- Klasik oyun runtime kodları
- Admin panel
- Market
- Canlı socket altyapısı
- Production ekonomi işlemleri

Bu alanlar sonraki fazlarda aynı tasarım dili üzerine sırayla eklenecek.
