# Service Account Rotate

1. Firebase Console > Project settings > Service accounts alanından yeni private key üret.
2. İndirilen JSON dosyasını repo içine koyma.
3. Render > Environment alanında `FIREBASE_KEY` değerini yeni service-account JSON ile değiştir.
4. Eski service-account key değerini Firebase Console üzerinden revoke et.
5. Render deploy/restart sonrasında `/healthz` çıktısını doğrula.

Beklenen sağlık çıktısı:

```json
{
  "firebase": {
    "ready": true,
    "degraded": false,
    "mode": "admin-sdk",
    "source": "FIREBASE_KEY"
  }
}
```

Bu projede Firebase Admin credential için tek çalışma standardı `FIREBASE_KEY` değeridir.
