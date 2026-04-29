# Faz 9 — Sosyal Merkez / Chat / DM / Presence

## Sabit Kontrat

- Global chat retention: `LOBBY_CHAT_RETENTION_DAYS=7`.
- DM retention: `DIRECT_CHAT_RETENTION_DAYS=14`.
- DM edit window: `DIRECT_MESSAGE_EDIT_WINDOW_HOURS=24`.
- Presence socket kaynaklıdır ve `IDLE`, `MATCHMAKING`, `IN_GAME`, `OFFLINE` durumlarına normalize edilir.
- Tüm sosyal gerçek zamanlı aksiyonlar `social:event` envelope üzerinden de yayınlanır; eski event isimleri geriye uyumluluk için korunur.

## Mesaj Arama

DM arama artık `users/{uid}/chat_message_index` alt koleksiyonundaki indeks dokümanlarını kullanır. Yeni DM gönderimi, düzenleme ve silme işlemleri indeksi günceller. Retention cleanup, süresi dolan veya silinen DM içerikleriyle birlikte indeks kayıtlarını da temizler.

## Event Sistemi

Merkezi helper: `utils/socialEvents.js`

Kapsam:

- `presence.updated`
- `friends.request.created`
- `friends.request.accepted`
- `friends.request.declined`
- `friends.removed`
- `game.invite.created`
- `game.invite.accepted`
- `game.invite.declined`
- `chat.dm.created`
- `chat.dm.edited`
- `chat.dm.deleted`
- `chat.global.created`

## Avatar/Frame Güvenliği

Socket, chat, DM, oyun daveti ve presence payloadlarında avatar çıktıları `sanitizePublicAvatarForOutput` standardına bağlıdır.
