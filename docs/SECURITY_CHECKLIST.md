# Security Checklist

## Firebase / Render Secret Rotate

- Render üzerinde Firebase Admin için yalnız `FIREBASE_KEY` kullanılmalı.
- `FIREBASE_KEY`, Firebase service-account JSON değeridir.
- Service-account JSON repo içine, Markdown dosyasına veya public asset içine yazılmamalı.
- Production boot sırasında Firebase Admin bağlanamazsa servis memory fallback ile açılmamalı.
- Public health çıktısında `firebase.ready=true`, `firebase.degraded=false`, `firebase.mode=admin-sdk`, `firebase.source=FIREBASE_KEY` görülmeli.
- Admin second factor raw değer olarak tutulmamalı; hash+salt kullanılmalı.
- Public runtime config içine secret, service-account, private key veya admin factor sızmamalı.
