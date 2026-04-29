# Faz 8 — Avatar / Çerçeve Sistemi

- Tek client renderer: `window.PMAvatar`.
- Avatar registry: `public/avatar-registry.js`, kaynak: `public/data/avatar-manifest.json`.
- Avatar linkleri sadece manifestte kayıtlı URL veya sistem fallback SVG olabilir.
- Server avatar doğrulaması: `utils/avatarManifest.js`.
- Server frame doğrulaması: `utils/accountState.js`.
- Frame 0 çerçevesizdir.
- Frame seçimi sayısal seviye üzerinden yapılır; harici frame URL/PNG/SVG alanları admin patch tarafında reddedilir.
- `selectedFrame > accountLevel` profile route ve admin route tarafında reddedilir.
- Görsel bütünlük `PMAvatar` + `avatar-frame.css` üzerinden tek ölçü/fit kontratıyla sağlanır.
- Modal açılma/kapanma animasyonları `.active`, `.is-opening`, `.is-closing` durumlarıyla stabilize edilmiştir.
