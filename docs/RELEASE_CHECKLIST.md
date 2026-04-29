# PLAYMATRIX Release Checklist

## 1. ENV ve Domain Kontrolü

- [ ] `.env.example` güncel Render/Firebase kontratını temsil ediyor.
- [ ] Render `ALLOWED_ORIGINS` içinde production domainleri var.
- [ ] Render `ALLOWED_ORIGINS` içinde deneme origin var: `https://playmatrixdeneme.github.io`.
- [ ] `FIREBASE_KEY` Render üzerinde raw service-account JSON olarak tanımlı.
- [ ] Raw secret repo içinde yok.
- [ ] Firebase Auth Authorized Domains içine `playmatrixdeneme.github.io` eklendi.

## 2. Faz 0 Kalite Kapısı

```bash
npm run check:phase0
```

Başarılı olmadan sonraki faza geçilmez.

## 2.1 Faz 1 Deploy / Domain Kontrolü

```bash
npm run check:phase1
```

- [ ] `/maintenance` canonical route 200 döndürüyor.
- [ ] Legacy maintenance pathleri `/maintenance` route'una redirect oluyor.
- [ ] `/readyz` Firebase Admin hazır değilse 503, hazırsa 200 dönüyor.
- [ ] Render `ALLOWED_ORIGINS` path içermiyor.
- [ ] GitHub Pages deneme dağıtımında `/PlayMatrixDeneme` base path algılanıyor.


## 2.2 Faz 2 Security / Auth / CSP Kontrolü

```bash
npm run check:phase2
```

- [ ] Raw session token API response içinde dönmüyor.
- [ ] Raw session token JS storage içinde tutulmuyor.
- [ ] `LEGACY_SESSION_HEADER_ENABLED=0`.
- [ ] `SECURITY_CSP_REPORT_ONLY=1` geçiş modu aktif.
- [ ] `/api/security/csp-report` endpointi aktif.
- [ ] Admin second/third factor server-side doğrulanıyor.
- [ ] Admin gate ve kritik route erişimleri audit log yazıyor.

## 3. Strict Release Kontrolü

```bash
npm run check:release-readiness
```

Strict kontrol final release öncesi hatasız geçmelidir.

## 4. Güvenlik Kontrolü

- [ ] Admin raw token JS storage içinde tutulmuyor.
- [ ] HttpOnly cookie session akışı korunuyor.
- [ ] CSP report-only fazı tamamlandı.
- [ ] CSP strict production için açıldı.
- [ ] External blank linklerde `rel="noopener noreferrer"` var.
- [ ] Admin kritik işlemleri audit log yazıyor.

## 5. Veri Bütünlüğü Kontrolü

- [ ] Promo code duplicate guard transaction içinde çalışıyor.
- [ ] Monthly reward idempotent state machine ile çalışıyor.
- [ ] Oyun kazançları ledger olmadan bakiye/XP yazmıyor.
- [ ] Pişti/Satranç/Crash kazanç ve XP akışları endpoint testlerinden geçti.
- [ ] Klasik oyun skor/kazanç akışları server-side doğrulanıyor.

## 6. Chat ve Sosyal Sistem Kontrolü

- [ ] Silinmiş DM/global mesajlar arama sonucunda görünmüyor.
- [ ] DM search index sonucu gerçek mesaj state'i ile yeniden doğrulanıyor.
- [ ] Invite TTL server-side enforce ediliyor.
- [ ] Presence online/offline/oyunda state'i stale cleanup ile doğrulanıyor.

## 7. UI/UX ve Mobil Kontrol

- [ ] Android modal scroll ve nested scroll test edildi.
- [ ] Ana sayfa liderlik/istatistik render alanları safe DOM contract kullanıyor.
- [ ] Avatar/çerçeve tüm breakpointlerde hizalı.
- [ ] Market locked/passive item davranışı doğru.
- [ ] Oyun topbarları gerçek account level/progress gösteriyor.

## 8. Final Paketleme

- [ ] Güncellenen dosyalar listelendi.
- [ ] Eklenen dosyalar listelendi.
- [ ] Silinen dosyalar listelendi.
- [ ] Eksik Render ENV listelendi.
- [ ] ZIP üretildi.
- [ ] ZIP içinde `.env`, service account JSON veya private key yok.
