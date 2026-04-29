# FIREBASE_KEY Render Log Fix

Render logunda `private_key` eksik/geçersiz hatası görülürse sorun `FIREBASE_KEY` değerinin Firebase Admin service-account JSON olmamasıdır.

Doğru kaynak:

1. Firebase Console
2. Project settings
3. Service accounts
4. Generate new private key
5. İndirilen JSON dosyasının tüm içeriği
6. Render Environment `FIREBASE_KEY` değeri

Yanlış kaynak: Firebase Web Config. Web config yalnız public client tarafı içindir ve Admin SDK başlatamaz.

Beklenen startup logu:

```txt
firebase_admin_ready source=FIREBASE_KEY mode=admin-sdk degraded=false
```

Beklenen health çıktısı:

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
