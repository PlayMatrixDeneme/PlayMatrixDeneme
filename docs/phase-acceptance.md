# PlayMatrix Phase Acceptance — UI Redesign

## Faz 0 Kabul Kriterleri

Faz 0 tamam sayılmadan önce aşağıdakiler sağlanmalıdır:

- [ ] UI redesign sözleşmesi yazılıdır.
- [ ] CSS sahiplik haritası yazılıdır.
- [ ] JS modül bağımlılık haritası yazılıdır.
- [ ] Regresyon kontrol listesi yazılıdır.
- [ ] Faz kabul kriterleri yazılıdır.
- [ ] `.env.example` gerçek secret içermeden kalite kapısının beklediği temel değerleri taşır.
- [ ] Viewport mobil erişilebilirlik için `initial-scale=1.0` kontratına alınmıştır.
- [ ] `check:ui-redesign-phase0` kalite komutu çalışır.
- [ ] `index.html` ana sheet sectionları sözleşmeye uygundur: `auth`, `forgot`, `profile`, `wheel`, `promo`, `support`, `invite`, `social`.
- [ ] Eski tasarım temizliği için dosya sahipliği ve migration kuralı netleşmiştir.

## Tüm Fazlar İçin Ortak Kabul Kriterleri

- [ ] Eski tasarımdan görsel kalıntı bırakılmaz.
- [ ] Sarı/siyah bahis paleti ana tema olarak kullanılmaz.
- [ ] PlayMatrix konseptinde karşılığı olmayan alan eklenmez.
- [ ] Tüm yeni renkler token sisteminden gelir.
- [ ] Mobil 375px'de yatay taşma yoktur.
- [ ] iOS safe-area ve alt nav çakışması yoktur.
- [ ] Konsolda yeni hata yoktur.
- [ ] Auth state bozulmaz.
- [ ] Sheet/drawer/dropdown dış tıklama ve ESC ile kapanır.
- [ ] Tüm icon-only butonlarda `aria-label` vardır.
- [ ] Route/link kırılmaz.
- [ ] Oyun kartları canonical route'a yönlenir.
- [ ] Giriş gerektiren aksiyonlar auth guard kullanır.
- [ ] Finalde gereksiz/ölü CSS ve JS temizlenir.

## Faz Matrisi

| Faz | Kabul sonucu |
|---|---|
| Faz 0 | Proje koruma, harita ve sözleşme tamam. |
| Faz 1 | Token, font, reset ve motion sistemi tamam. |
| Faz 2 | Header/topbar tamam. |
| Faz 3 | Mobile nav ve sheet motoru tamam. |
| Faz 4 | Auth/register/forgot tamam. |
| Faz 5 | Ana sayfa, slider, kategori ve oyun vitrini tamam. |
| Faz 6 | Drawer/dropdown ve profil açılır paneli tamam. |
| Faz 7 | Hesabım, avatar, frame, MC ve level tamam. |
| Faz 8 | Çark, promo ve davet tamam. |
| Faz 9 | Sosyal merkez, chat, arkadaşlar ve destek tamam. |
| Faz 10 | Leaderboard, rank ve istatistik tamam. |
| Faz 11 | Responsive, accessibility, performance ve release tamam. |

## Değişiklik Güvenliği

Her fazdan önce:

1. Değiştirilecek dosyalar listelenir.
2. Etkilenen route/API/modül bağımlılıkları kontrol edilir.
3. Mevcut çalışan davranış korunur.

Her fazdan sonra:

1. İlgili `npm run check:*` komutları çalıştırılır.
2. `docs/regression-checklist.md` üzerinden görsel/runtime kontrol yapılır.
3. Değiştirilen, eklenen ve silinen dosyalar raporlanır.


## Faz 1 — Ferah Tasarım Sistemi Kabul Kriterleri

Faz 1 tamam sayılmadan önce:

- `public/css/tokens.css` Ferah Soft-Dark palette tokenlarını eksiksiz içerir.
- `public/css/base.css` global body/html reset, `::selection`, scrollbar, `:focus-visible`, `prefers-reduced-motion` ve ortak keyframe sistemini içerir.
- `index.html` font importu sadece `Syne`, `DM Sans` ve `JetBrains Mono` ailelerini yükler.
- Eski Inter/Montserrat/Orbitron/Space Grotesk importu ana sayfadan kaldırılmıştır.
- `layout.css`, `components.css`, `home.css`, `profile.css`, `social.css`, `games.css`, `shell-enhancements.css` ve `components/avatar-picker.css` içinde sabit HEX renk kullanılmaz; renkler token veya rgba token yardımcıları ile çalışır.
- Eski token adları sadece bridge olarak desteklenir, yeni yazılan CSS içinde kullanılmaz.
- Reduced motion açık olan kullanıcıda animasyonlar pratik olarak devre dışı kalır.

## Faz 2 — Ana Shell, Header ve Üst Navigasyon Kabul Kriterleri

- [ ] `header.topbar` eski tek satırlı yapıdan iki satırlı shell yapısına geçer.
- [ ] Logo solda, auth/account aksiyonları sağda hizalanır.
- [ ] Guest state yalnızca `Giriş Yap` ve `Kayıt Ol` gösterir.
- [ ] User state MC bakiye, günlük çark kısayolu ve avatar trigger gösterir.
- [ ] Üst kategori nav `Ana Sayfa`, `Oyunlar`, `Liderlik`, `Sosyal`, `Destek` öğelerini içerir.
- [ ] Aktif nav state accent renk ve alt çizgiyle görünür.
- [ ] Header içinde `Para Yatır`, `Para Çek`, `Bahis Geçmişi`, `Casino`, `Slot`, `Canlı Casino` terimleri kullanılmaz.
- [ ] Auth state değiştiğinde header görsel olarak bozulmaz.
- [ ] Profil trigger `aria-expanded` değerini dropdown durumuna göre günceller.
- [ ] Mobilde iki satırlı header 375px genişlikte yatay taşma üretmez.
- [ ] CSS sabit HEX renk içermez; token sistemi kullanılır.
- [ ] Faz 2 kalite kapısı `npm run check:ui-redesign-phase2` başarılı geçer.

## Faz 3 — Mobil Alt Nav ve Global Sheet Motoru Kabul Kriterleri

- `mobile-nav` tam 5 aksiyon içerir: Ana Sayfa, Oyunlar, Promosyonlar, Çark, Destek.
- Konsept dışı ödeme/bahis aksiyonları mobil nav içinde yer almaz.
- `sheetShell`, `sheetBackdrop`, `sheetPanel`, `sheetHandle`, `sheetClose` aynı global sheet motoruna bağlıdır.
- `auth`, `forgot`, `profile`, `wheel`, `promo`, `support`, `invite`, `social` sheet alanları tek motorla açılır/kapanır.
- Backdrop click, ESC, close button ve drag-to-close çalışır.
- Sheet açıkken body scroll kilitlenir; kapanınca önceki scroll konumu korunur.
- 375px/390px/414px mobil genişlikte alt nav iPhone safe-area ile çakışmaz.
- Destek aksiyonu success accent ile ayrışır.

## FAZ 4 — Auth Akışı Kabul Kriterleri

- Giriş akışı iki adımlıdır: kullanıcı adı/e-posta → şifre.
- Şifre sıfırlama sadece e-posta tabanlıdır; GSM yoktur.
- Kayıt akışı üç adımlıdır: kimlik → şifre → onay.
- `authSubmitBtn`, final aşamalarda mevcut Firebase auth akışını bozmaz.
- `authPasswordToggle` ve `authRegisterPasswordToggle` erişilebilir `aria-pressed` state kullanır.
- Hata state input grubuna uygulanır ve kullanıcıya `aria-live` yardım metni verilir.
- Auth sheet mobilde tek kolon, büyük dokunma alanları ve safe-area uyumlu çalışır.

## FAZ 5 Kabul Kriterleri

- `#hero` alanı `home-stage` ve `data-phase="5"` ile açılır.
- `#homeShortcutGrid` altı PlayMatrix oyunlarıyla sınırlıdır.
- `#gamesGrid` eski düz grid yerine Phase 5 game showcase contract kullanır.
- Ana sayfa vitrininde Casino/Slot/Para Yatır/Para Çek/Bahis Geçmişi terimleri bulunmaz.
- Oyun route değerleri canonical route sözleşmesini korur.

## Faz 6 — Dropdown, Yan Menü ve Profil Açılır Paneli Kabul Kriterleri

- `drawerShell` Faz 6 işaretiyle bulunur.
- Sol `menuDrawer` ve sağ `profileDrawer` bulunur.
- Menü tetikleyici `menuDrawerTrigger` erişilebilir `aria-controls` ve `aria-expanded` kullanır.
- Profil trigger mobilde sağ profil drawer açacak şekilde drawer engine tarafından yönetilir.
- Sol drawer 2x2 hızlı kategori kartı içerir: Oyunlar, Liderlik, Ödüller, Sosyal.
- Sol drawer Günlük Çark ve Destek büyük aksiyonlarını içerir.
- Sol drawer Oyunlar, Sosyal, Ödül Merkezi ve Hesap akordeonlarını içerir.
- Profil drawer büyük avatar, kullanıcı adı, UID, MC bakiye ve Ödül Talep butonu içerir.
- Profil drawer menüsü Profilim, Günlük Çark, Promosyon Kodu, Arkadaşlar, Sosyal Merkez, Bildirimler, Oturum Geçmişi, Oyuncu Koruma / Güvenlik ve Çıkış Yap itemlarını içerir.
- Drawer ESC, backdrop, close butonu ve swipe gesture ile kapanır.
- Drawer açıkken body scroll kilitlenir.
- Drawer içinde focus trap vardır.
- Header/dropdown/drawer içinde Para Yatır, Para Çek, Bahis Geçmişi, Casino, Slot ve Canlı Casino terimleri bulunmaz.


## FAZ 7 Kabul Kriterleri
- Profil panelinde büyük avatar, UID, hesap seviyesi, MC kartı ve XP bar görünür.
- Profil istatistikleri 4 ana kartla gösterilir.
- Avatar seçici seçili/aktif/kilitli durumlarını açık gösterir.
- Kilitli frame kartları tıklanamaz ve disabled kalır.
- Profil kaydetme işlemi loading/success/error durumlarını gösterir.
- MC, level, avatar ve frame verileri backend canonical profile state ile uyumludur.
