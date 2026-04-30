# PlayMatrix JS Module Map — Faz 0

## Amaç

Bu belge, UI redesign sırasında JavaScript modüllerinin sorumluluk sınırlarını ve kritik bağımlılıklarını belirler. Amaç; home runtime, social modülleri, profile modülleri, sheet/modal sistemi ve API bağlantılarının kırılmasını engellemektir.

## Entry ve Boot Zinciri

| Dosya | Rol | Değişiklik kuralı |
|---|---|---|
| `index-boot.js` | erken boot/uyumluluk | Sadece boot güvenliği ve path uyumu için değiştirilebilir. |
| `script.js` | home app module entry | Sadece `bootHomeApplication` çağrısı kalmalı. |
| `public/js/home/app.js` | home orchestrator | Yeni modül sadece burada kontrollü sırayla install edilir. |
| `public/js/home/legacy-home.runtime.js` | compatibility runtime | Yeni özellik eklenmez; kademeli küçültülür. |
| `public/js/home/stability-guard.js` | runtime guard | Görsel redesign logic'i buraya yazılmaz. |

## Home Modül Sahipliği

| Modül | Sahiplik | Bağımlılık |
|---|---|---|
| `state.js` | home store, session bridge | account, profile, reward, social entry |
| `api.js` | frontend API helper | auth/profile/market/social endpointleri |
| `renderers.js` | güvenli DOM render yardımcıları | game cards, avatar nodes |
| `modals.js` | global sheet/modal manager | auth, profile, wheel, promo, invite, social |
| `modal.js` | modal safety/focus/close guard | sheet motoru |
| `mobile-scroll.js` | scroll lock, touch policy, safe-area | mobile nav, sheet |
| `account.js` | header account, MC, level, XP | profile panel |
| `auth-modal.js` | login/register/forgot guard | auth routes |
| `profile-panel.js` | profil dropdown/sheet guard | profile routes, avatar/frame |
| `game-catalog.js` | oyun route/catalog normalizer | renderers, games |
| `hero-slider.js` | banner slider guard | home UI |
| `leaderboard.js` | leaderboard guard | stats/API |
| `stats.js` | stats cards | leaderboard/API |
| `market.js` | market/reward state | market routes |
| `reward-ui.js` | wheel/reward UI guards | market/profile routes |
| `invite-ui.js` | invite/referral UI | profile/social routes |
| `social-entry.js` | social sheet entry guard | social modules/socket |

## Profile Modülleri

| Modül | Rol | Kırılmaması gerekenler |
|---|---|---|
| `public/js/profile/avatar-picker.js` | avatar seçimi | avatar manifest, storage URL validasyonu |
| `public/js/profile/frame-picker.js` | frame seçimi | locked/passive/selected state |
| `public/js/profile/profile-stats.js` | profil istatistikleri | profile sheet ve leaderboard tutarlılığı |

## Social Modülleri

| Modül | Rol | Kırılmaması gerekenler |
|---|---|---|
| `public/js/social/chat-global.js` | global chat | socket eventleri |
| `public/js/social/chat-dm.js` | DM chat | retention/search index davranışı |
| `public/js/social/friends.js` | arkadaş listesi | friend request lifecycle |
| `public/js/social/invites.js` | oyun/party davetleri | TTL ve idempotency |
| `public/js/social/notifications.js` | bildirimler | unread badge |
| `public/js/social/presence.js` | online/presence | heartbeat ve stale cleanup |
| `public/js/social/social-state.js` | social store | sosyal sheet sekmeleri |

## Backend Endpoint Haritası

| Alan | Route dosyası | UI kullanımı |
|---|---|---|
| Auth | `routes/auth.routes.js` | login, register, forgot/session |
| Profile | `routes/profile.routes.js` | hesabım, avatar, frame, level, MC |
| Market/Reward | `routes/market.routes.js` | günlük çark, market, purchase, promo |
| Social | `routes/social.routes.js` | arkadaşlık ve sosyal veri |
| Social Center | `routes/socialcenter.routes.js` | sosyal merkez vitrin/özet |
| Chat | `routes/chat.routes.js` | DM/global chat |
| Support | `routes/support.routes.js` | destek sheet |
| Notifications | `routes/notifications.routes.js` | bildirimler |
| Live | `routes/live.routes.js` | canlı runtime/veri durumu |

## Redesign Sırasında Değişiklik Kuralı

- Yeni UI state'i önce `state.js` veya ilgili domain modülüne eklenir.
- DOM yazımı için doğrudan unsafe `innerHTML` kullanılmaz; güvenli renderer/helper kullanılır.
- Sheet açma/kapama davranışı tek modal manager üzerinden yürür.
- Legacy runtime içine yeni kalıcı feature eklenmez.
- Route değişiklikleri `game-catalog.js` ve backend route dosyalarıyla eşzamanlı kontrol edilir.
- Socket event isimleri UI redesign nedeniyle değiştirilmez.
- Auth guard ve server session kontratı bozulmaz.

## Kritik Bağımlılık Zincirleri

1. `script.js` → `home/app.js` → `state/api/renderers/modals/mobile-scroll` → domain modülleri.
2. `modals.js` + `modal.js` + `mobile-scroll.js` → auth/profile/wheel/promo/invite/social sheetleri.
3. `account.js` + `profile-panel.js` → header, dropdown, profile sheet.
4. `social-entry.js` → `social/*` modülleri → `sockets/index.js`.
5. `game-catalog.js` → oyun kartları → canonical route endpoints.


## Faz 2 Ek Modül Haritası

| Modül | Sorumluluk |
|---|---|
| `public/js/home/shell.js` | Shell auth chrome sync, aktif üst nav, `data-shell-action` proxy, dropdown aria sync. |
| `public/js/home/account.js` | `topbarAuthActions` ve `topUser` görünürlüğünü auth state ile senkronize eder. |
| `public/js/home/state.js` | `shell.activeNav` ve `shell.authState` state alanlarını taşır. |

## Faz 3 JS Sahipliği

- `public/js/home/sheet-engine.js`: global sheet motoru, 5'li mobil nav delegasyonu, body scroll lock koordinasyonu, focus trap, ESC/backdrop/close/drag kapatma.
- `public/js/home/mobile-scroll.js`: `pm-sheet-open` sınıfıyla scroll lock senkronizasyonu.
- `public/js/home/app.js`: `installPhase3SheetEngine` modülünü boot zincirine ekler.
- `public/js/home/legacy-home.runtime.js`: uyumluluk katmanı olarak kalır; Faz 3 sheet motoru legacy sheet class değişimlerini gözlemleyip normalize eder.

## FAZ 4 Auth Ownership

- `public/js/home/auth-modal.js`: İki adımlı login, üç adımlı kayıt, e-posta tabanlı forgot, input validasyon, password toggle, busy/error state.
- `public/js/home/api.js`: JSON body normalize edilmiş `homeFetch` yardımcı fonksiyonu.
- `routes/auth.routes.js`: Kullanıcı adı/e-posta çözümleme endpoint'i için maskelenmiş e-posta payload'u.

## FAZ 5 Home Module Ownership

- `public/js/home/hero-slider.js`: banner accessibility and carousel guards.
- `public/js/home/game-catalog.js`: canonical game routes and access labels.
- `public/js/home/renderers.js`: `createHomeGameCard` renderer contract.
- `public/js/home/legacy-home.runtime.js`: compatibility runtime; dynamic game card and hero carousel output now emits Phase 5 surfaces.

## Faz 6 JS Sahipliği

- `public/js/home/drawer-engine.js`: Sol menü drawer ve sağ profil drawer aç/kapat, ESC, backdrop, focus trap, swipe close, profile identity sync.
- `public/js/home/app.js`: `installPhase6DrawerEngine` modülünü home boot sırasına ekler.
- `public/js/home/mobile-scroll.js`: Drawer açıkken body scroll lock ve drawer içi scroll istisnasını yönetir.
- `public/js/home/profile-panel.js`: Mevcut profil sheet ve avatar/frame fallback davranışını korur.
- `public/js/home/social-entry.js`: Sosyal panel giriş noktalarını korur; drawer aksiyonları `social` sheet'e proxy olur.
