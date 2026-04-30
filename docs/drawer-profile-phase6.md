# Faz 6 — Dropdown, Sol Menü Drawer ve Profil Açılır Paneli

## Kapsam

Faz 6, PlayMatrix ana sayfasında referans mobil yapının iki kritik menü desenini PlayMatrix konseptine uyarlar:

- Sol kategori drawer
- Sağ profil drawer / desktop profil dropdown

Bu fazda bahis, ödeme, para yatırma, para çekme, casino ve slot terminolojisi kullanılmaz. Menü aksiyonları PlayMatrix özelliklerine bağlanır.

## Güncellenen Alanlar

- `index.html`
  - `menuDrawerTrigger`
  - `drawerShell`
  - `menuDrawer`
  - `profileDrawer`
  - profil dropdown itemları
- `public/css/layout.css`
- `public/css/components.css`
- `public/css/profile.css`
- `public/js/home/drawer-engine.js`
- `public/js/home/app.js`
- `public/js/home/mobile-scroll.js`

## Sol Menü Drawer

Sol drawer şu yapıya sahiptir:

- Büyük logo ve kısa açıklama
- 2x2 hızlı kategori kartları
  - Oyunlar
  - Liderlik
  - Ödüller
  - Sosyal
- Büyük aksiyon butonları
  - Günlük Çark
  - Destek
- Akordeon menüler
  - Oyunlar
  - Sosyal
  - Ödül Merkezi
  - Hesap

## Profil Drawer

Profil drawer şu yapıya sahiptir:

- Büyük avatar
- Kullanıcı adı
- UID
- MC bakiye
- Ödül Talep butonu
- Profil menüsü
  - Profilim
  - Günlük Çark
  - Promosyon Kodu
  - Arkadaşlar
  - Sosyal Merkez
  - Bildirimler
  - Oturum Geçmişi
  - Oyuncu Koruma / Güvenlik
  - Çıkış Yap

## Davranış Kontratı

- `window.openDrawer(name)` ile `menu` veya `profile` drawer açılır.
- `window.closeDrawer()` aktif drawer kapatır.
- ESC drawer kapatır.
- Backdrop tıklaması drawer kapatır.
- Swipe gesture drawer kapatır.
- Drawer açıkken body scroll kilitlenir.
- Focus aktif drawer içinde tutulur.
- Mobilde avatar trigger sağ profil drawer açar.
- Desktop profilde mevcut dropdown davranışı korunur.

## Konsept Dışı Alanlar

Aşağıdaki terimler drawer/dropdown içine eklenmez:

- Para Yatır
- Para Çek
- Bahis Geçmişi
- Casino
- Slot
- Canlı Casino

## Kabul Kriterleri

- Sol drawer açılıp kapanır.
- Profil drawer açılıp kapanır.
- Desktop dropdown bozulmaz.
- Mobil profil trigger drawer açar.
- Menü aksiyonları mevcut sheet/action sistemine bağlanır.
- Body scroll lock çalışır.
- Focus trap çalışır.
- Sabit HEX renk kullanılmaz.
- Konsept dışı terim yoktur.
