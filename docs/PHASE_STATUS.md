# PLAYMATRIX Faz Durumu

## Aktif Faz

**Faz 2 — Güvenlik Sertleştirme: Auth, Session, CSP, Admin Gate**

Bu fazın amacı kodu dağıtmadan, mevcut proje davranışını değiştirmeden ve sonraki fazlara güvenli zemin hazırlayarak kalite kapısını merkezi hale getirmektir.

## Faz 0 Kapsamı

### Tamamlananlar

- `check:env-contract` eklendi.
- `check:phase0` kalite kapısı eklendi.
- `check:release-readiness` strict release kontrolü eklendi.
- `.env.example` Render/Firebase referans ENV dosyası olarak güncellendi.
- Deneme domaini için doğru CORS origin değeri `.env.example` içine eklendi: `https://playmatrixdeneme.github.io`.
- Faz bazlı doğrulama dosyası oluşturuldu.
- Final release checklist dokümanı oluşturuldu.

### Faz 0 Zorunlu Kalite Kapısı

Aşağıdaki komut Faz 0 için zorunlu kapıdır:

```bash
npm run check:phase0
```

Bu komut şu kontrolleri çalıştırır:

- `node --check server.js`
- `check:env-contract`
- `check:routes`
- `check:html`
- `check:maintenance`
- `check:security-phase0`
- `check:render-runtime`
- `check:bootstrap`
- `check:errors`
- `check:firebase-key-contract`

### Strict Release Kapısı

Aşağıdaki komut tüm release blokajlarını strict modda denetler:

```bash
npm run check:release-readiness
```

Strict mod, gelecek fazlarda onarılacak bilinen blokajları da hata kabul eder.

## Bilinen Gelecek Faz Blokajları

Bu fazda bilerek davranışsal onarım yapılmadı. Aşağıdaki alanlar sonraki fazlarda onarılacak:

- DM arama / silinmiş mesaj revalidation.
- Promo duplicate guard standardı.
- Monthly reward state machine standardı.
- Pişti XP transaction standardı.
- CSP strict geçişi.
- Android modal / viewport scroll contract.
- Legacy docs/tool kalıntıları.
- Büyük legacy dosyaların modülerleştirilmesi.

## Eksik Render ENV

Render tarafında mevcut production ENV listesine deneme domain origin değeri eklenmelidir:

```env
ALLOWED_ORIGINS=https://playmatrix.com.tr,https://www.playmatrix.com.tr,https://playmatrixdeneme.github.io
```

Yanlış değer:

```env
ALLOWED_ORIGINS=https://playmatrixdeneme.github.io/PlayMatrixDeneme/
```

CORS origin path içermez. GitHub Pages path'i `/PlayMatrixDeneme/` ayrı base-path konusudur ve Faz 1 kapsamına alınmalıdır.

## Faz Kapanış Standardı

Her faz sonunda şu bilgiler raporlanacaktır:

1. Güncellenen dosyalar.
2. Eklenen dosyalar.
3. Silinen dosyalar.
4. Eksik Render ENV.
5. Çalıştırılan kontroller.
6. Geçen kontroller.
7. Kalan blokajlar.

## Faz 1 — Deploy, ENV, Domain, Route ve Maintenance Temeli

Durum: Tamamlandı.

- Maintenance fiziksel klasörü ASCII `Bakim/` standardına çekildi.
- Canonical maintenance route `/maintenance` olarak ayarlandı.
- Eski `/Bakım`, `/Bak%C4%B1m`, `/Bakim`, `/bakim` pathleri güvenli redirect olarak korundu.
- `/healthz`, `/api/healthz`, `/readyz`, `/api/readyz` endpoint kontratı kuruldu.
- Render bind standardı `HOST=0.0.0.0` ile güçlendirildi.
- `PUBLIC_BASE_PATH` runtime contract eklendi.
- GitHub Pages `/PlayMatrixDeneme` base-path otomatik algılama eklendi.

Kalite kapısı:

```bash
npm run check:phase1
```


## Faz 2 — Güvenlik Sertleştirme: Auth, Session, CSP, Admin Gate

Durum: Tamamlandı.

- Raw session token client response içinden kaldırıldı.
- `pm_session_token` localStorage/sessionStorage kullanımı kaldırıldı.
- Session taşıma HttpOnly `pm_session` cookie contract'ına çekildi.
- `LEGACY_SESSION_HEADER_ENABLED=0` production contract olarak eklendi.
- Auth middleware session ve activity touch davranışı throttled hale getirildi.
- Admin second/third factor server-side doğrulama zinciri audit log ile güçlendirildi.
- Admin route guard başarısızlıkları ve kritik admin erişimleri audit log'a bağlandı.
- CSP report-only geçiş modu ve `/api/security/csp-report` endpointi eklendi.
- External `target="_blank"` linkleri `rel="noopener noreferrer"` ile sertleştirildi.

Kalite kapısı:

```bash
npm run check:phase2
```

### Faz 2 Render ENV

Production geçiş değeri:

```env
SECURITY_CSP_STRICT=0
SECURITY_CSP_REPORT_ONLY=1
LEGACY_SESSION_HEADER_ENABLED=0
SESSION_TOUCH_THROTTLE_MS=60000
```

Admin ikinci adım plaintext olarak girilmez. Render üzerinde sadece hash+salt kullanılmalıdır:

```env
ADMIN_PANEL_SECOND_FACTOR_HASH_HEX=<server-side hash>
ADMIN_PANEL_SECOND_FACTOR_SALT_HEX=<server-side salt>
```
