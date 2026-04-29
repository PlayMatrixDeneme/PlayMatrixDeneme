# Render Firebase Admin Standardı

Firebase Admin yalnız `FIREBASE_KEY` ile başlatılır.

`FIREBASE_KEY`, Firebase Console > Project settings > Service accounts > Generate new private key ile indirilen service-account JSON içeriğinin Render Environment içine secret olarak eklenmiş değeridir.

Doğru boot kontratı:

- `firebase.ready=true`
- `firebase.degraded=false`
- `firebase.mode=admin-sdk`
- `firebase.source=FIREBASE_KEY`

Render logunda `private_key` eksik/geçersiz hatası görülürse `FIREBASE_KEY` içine Firebase Web Config yazılmıştır veya service-account JSON içindeki PEM private key bozulmuştur. Çözüm: Firebase Console üzerinden yeni service-account JSON üret, JSON dosyasının tamamını `FIREBASE_KEY` değerine gir, deploy/restart yap.

Firebase Admin bağlanamazsa servis memory store ile açılmaz. Bu davranış veri sıfırlanmasını engellemek için bilinçli olarak kapalıdır.
