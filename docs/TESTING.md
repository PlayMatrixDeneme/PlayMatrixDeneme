# Test ve Doğrulama

## Ana Komut

```bash
npm run verify:homepage
```

## Kontrol Zinciri

1. `check:structure` — zorunlu dosya ve klasörler var mı?
2. `check:html` — HTML içinde referans verilen CSS/JS/asset dosyaları var mı?
3. `check:assets` — public asset registry geçerli mi?
4. `check:routes` — homepage-only rota standardı korunuyor mu?
5. `check:secrets` — server-only secret sızıntısı var mı?
6. `check:modules` — JS modülleri syntax olarak geçerli mi?
7. `audit:homepage` — baseline raporu üretir.
