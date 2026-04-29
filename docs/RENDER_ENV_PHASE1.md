# PLAYMATRIX Faz 1 — Render / Domain / Base Path

## Render ENV

Production Render servisinde aşağıdaki origin listesi kullanılmalıdır:

```env
ALLOWED_ORIGINS=https://playmatrix.com.tr,https://www.playmatrix.com.tr,https://playmatrixdeneme.github.io
```

Yanlış kullanım:

```env
ALLOWED_ORIGINS=https://playmatrixdeneme.github.io/PlayMatrixDeneme/
```

CORS origin path içermez. GitHub Pages proje path'i `/PlayMatrixDeneme/` frontend base-path konusudur.

## PUBLIC_BASE_PATH

Render production ana domain kökte çalıştığı için varsayılan değer boş bırakılır:

```env
PUBLIC_BASE_PATH=
```

GitHub Pages statik deneme dağıtımı `https://playmatrixdeneme.github.io/PlayMatrixDeneme/` altında çalıştığında frontend runtime `/PlayMatrixDeneme` base path'ini otomatik algılar.

## Health / Readiness

- `/healthz`: minimal public health.
- `/api/healthz`: API namespace health alias.
- `/readyz`: Firebase Admin ve ENV doğrulaması hazırsa 200 döner.
- `/api/readyz`: API namespace readiness alias.

## Render bind standardı

Server, Render uyumluluğu için `HOST=0.0.0.0` ve `PORT` üzerinden dinler.
