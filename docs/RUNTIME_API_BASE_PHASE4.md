# Faz 4 — AnaSayfa Runtime ve API Base Standardı

## Karar

Client tarafında API adresi için tek üretim kaynağı `PUBLIC_API_BASE` değeridir.

Render backend bu değeri `/api/public/runtime-config` üzerinden döndürür. Statik frontend senaryosunda ilk isteği atabilmek için `public/playmatrix-static-runtime.js` aynı PUBLIC_API_BASE değerini bootstrap olarak taşır; `playmatrix-api.js`, `firebase-runtime.js` ve `playmatrix-runtime.js` artık ayrı üretim backend fallback'i üretmez.

## Çalışma Sırası

1. `public/playmatrix-static-runtime.js`
   - Static hosting için `window.__PM_STATIC_RUNTIME_CONFIG__` ve `window.__PM_RUNTIME.apiBase` değerini hazırlar.
   - Kaynak etiketi: `static-public-api-base-bootstrap`.

2. `public/playmatrix-api.js`
   - API base adaylarını sadece runtime kaynaklarından alır.
   - Hardcoded ikinci production backend fallback içermez.
   - Production host üzerinde `window.location.origin` API fallback olarak kullanılmaz.

3. `public/firebase-runtime.js`
   - Runtime config'i `${apiBase}/api/public/runtime-config` üzerinden çeker.
   - Firebase web config'i runtime config'ten alır.
   - Runtime config başarısızsa yalnız statik public bootstrap config'e döner.

4. `public/playmatrix-runtime.js`
   - API çağrılarında `window.__PM_API__.getApiBaseSync()` kullanır.
   - Bağımsız API base üretmez.

## HTML Meta Kararı

`meta[name="playmatrix-api-url"]` boş bırakılmadı; boş meta etiketleri kaldırıldı. Runtime tamamen `window.__PM_RUNTIME` + `/api/public/runtime-config` kontratına bağlandı.

## Render Zorunlu Değişken

```env
PUBLIC_API_BASE=https://emirhan-siye.onrender.com
```

Production ortamında `PUBLIC_API_BASE` eksikse env validation hata verir.
