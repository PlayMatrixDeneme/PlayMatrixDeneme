# PlayMatrix Regression Checklist — Faz 0

## Amaç

Bu liste, her redesign fazından sonra sistem bütünlüğünün bozulmadığını doğrulamak için kullanılacak zorunlu regresyon kontrolüdür.

## 1. Genel Runtime Kontrolü

- [ ] Ana sayfa açılıyor.
- [ ] Konsolda boot hatası yok.
- [ ] `window.__PM_HOME_MODULES__` modül sonuçları başarısız modül göstermiyor.
- [ ] `script.js` module entry çalışıyor.
- [ ] `legacy-home.runtime.js` sadece compatibility katmanı olarak kalıyor.
- [ ] `playmatrix-runtime.js` ve `playmatrix-api.js` path çözümlemeyi bozmuyor.

## 2. Responsive Kontrolü

- [ ] 360px genişlikte yatay taşma yok.
- [ ] 375px iPhone genişlikte yatay taşma yok.
- [ ] 390px iPhone genişlikte alt nav kesilmiyor.
- [ ] 414px iPhone genişlikte sheet ve drawer düzgün açılıyor.
- [ ] 768px tablet görünümde grid geçişleri bozulmuyor.
- [ ] 1024px+ desktop görünümde header/nav dengesi korunuyor.
- [ ] iOS Safari alt browser bar ile bottom nav çakışmıyor.
- [ ] Klavye açılınca auth/chat inputları görünür kalıyor.

## 3. Auth Kontrolü

- [ ] Giriş sheet'i açılıyor.
- [ ] Register sheet'i açılıyor.
- [ ] Forgot password sheet'i açılıyor.
- [ ] Step geçişleri state kaybetmiyor.
- [ ] Input focus/error/loading state çalışıyor.
- [ ] Hatalı giriş kullanıcıya okunabilir mesaj gösteriyor.
- [ ] Başarılı login sonrası header account state güncelleniyor.
- [ ] Logout sonrası misafir state doğru dönüyor.

## 4. Header / Nav / Drawer Kontrolü

- [ ] Giriş yok state: Giriş + Kayıt Ol görünüyor.
- [ ] Giriş var state: MC + avatar + profil trigger görünüyor.
- [ ] Desktop nav aktif state çalışıyor.
- [ ] Mobile bottom nav 5 ana aksiyonda kalıyor.
- [ ] Sol drawer açılıp kapanıyor.
- [ ] Profil drawer/dropdown açılıp kapanıyor.
- [ ] ESC, dış tıklama ve close butonu çalışıyor.
- [ ] Body scroll lock açılış/kapanışta doğru uygulanıyor.

## 5. Home / Game Catalog Kontrolü

- [ ] Hero/banner slider çalışıyor.
- [ ] Dot navigation ve swipe/interaction state bozulmuyor.
- [ ] Oyun kategori blokları doğru route'a gider.
- [ ] Crash route doğru.
- [ ] Satranç route doğru.
- [ ] Pişti route doğru.
- [ ] Pattern Master route doğru.
- [ ] Space Pro route doğru.
- [ ] Snake Pro route doğru.
- [ ] Auth gerektiren oyunlar misafir kullanıcıyı login'e yönlendirir.

## 6. Profile / Avatar / Frame Kontrolü

- [ ] Profil sheet açılıyor.
- [ ] Kullanıcı adı/e-posta/UID/MC/level alanları doğru render ediliyor.
- [ ] Avatar picker açılıyor.
- [ ] Frame picker açılıyor.
- [ ] Kilitli frame tıklanamaz.
- [ ] Seçili frame net görünür.
- [ ] Avatarlar soluk/opacity hatası göstermiyor.
- [ ] Profil kaydetme success/error state gösteriyor.

## 7. Reward / Promo / Invite Kontrolü

- [ ] Günlük çark sheet açılıyor.
- [ ] Çark cooldown state gösteriyor.
- [ ] Spin sırasında buton disabled oluyor.
- [ ] Sonuç state okunabilir gösteriliyor.
- [ ] Promo kodu inputu çalışıyor.
- [ ] Promo success/error state çalışıyor.
- [ ] Davet kodu ve linki kopyalanabiliyor.
- [ ] MC ödülleri gerçek para gibi sunulmuyor.

## 8. Social / Support Kontrolü

- [ ] Sosyal merkez sheet açılıyor.
- [ ] Global chat sekmesi açılıyor.
- [ ] Arkadaşlar sekmesi açılıyor.
- [ ] DM alanı mobilde taşmıyor.
- [ ] Typing/unread/online göstergeleri çakışmıyor.
- [ ] Destek sheet açılıyor.
- [ ] Yetkisiz kullanıcı için auth guard doğru çalışıyor.

## 9. Accessibility Kontrolü

- [ ] Icon-only butonlarda `aria-label` var.
- [ ] Dialog/sheet role ve aria state uyumlu.
- [ ] Focus-visible görünür.
- [ ] Keyboard ile close/action erişilebilir.
- [ ] Reduced motion etkinse animasyonlar azalıyor.
- [ ] Kontrastlar okunabilir.

## 10. Release Komutları

- [ ] `npm run check:ui-redesign-phase0`
- [ ] `npm run check:routes`
- [ ] `npm run check:html`
- [ ] `npm run check:viewport-contract`
- [ ] `npm run check:home-phase10`
- [ ] `npm run check:final-smoke`


## Sheet Kontrol Notu

- [ ] Sheet aç/kapat, dış tıklama, ESC ve scroll lock davranışı her faz sonunda doğrulanır.
