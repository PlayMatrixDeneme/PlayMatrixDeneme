# PlayMatrix UI Redesign Contract — Faz 0

## Amaç

Bu belge, PlayMatrix ana sayfası ve bağlı UI yüzeylerinin Çarkbet mobil ekranlarındaki yerleşim iskeletini referans alarak; PlayMatrix içeriği, ücretsiz oyun platformu kimliği ve ferah modern tasarım diliyle yeniden kurulması için bağlayıcı tasarım ve geliştirme sözleşmesidir.

## Değişmez Proje Kuralları

1. Eski tasarımla alakalı hiçbir görsel karar final UI içinde kalmayacak.
2. Referans görsellerdeki layout oranları, hizalama mantığı, panel davranışı, mobil alt nav yapısı, sheet/drawer hissi ve dokunma alanları baz alınacak.
3. Referans görsellerdeki sarı/siyah ağırlıklı bahis sitesi paleti PlayMatrix'e ana tema olarak taşınmayacak.
4. PlayMatrix içinde karşılığı olmayan alanlar eklenmeyecek.
5. Gerçek para, para yatırma, para çekme, bahis geçmişi, canlı casino, slot, GSM doğrulama ve ödeme akışı gibi konsept dışı öğeler UI içine alınmayacak.
6. PlayMatrix karşılığı olan alanlar yeni iskelete uyarlanacak: Oyunlar, Liderlik, Sosyal Merkez, Destek, Günlük Çark, Promosyon Kodu, Davet, Profil, MC, Level, XP, Avatar ve Frame.
7. Kod yapısı dağıtılmayacak; her faz kendi sahiplik alanındaki dosyaları güncelleyecek.
8. HTML/CSS/JS değişiklikleri API kontratlarını, auth state'i, route normalizer yapısını, socket eventlerini ve oyun erişim yollarını kırmayacak.

## Referans Ekran Karşılıkları

| Referans ekran davranışı | PlayMatrix karşılığı | Uygulama kuralı |
|---|---|---|
| Üst logo + sağ auth/balance/avatar | PlayMatrix logo + Giriş/Kayıt veya MC/avatar | Ölçü ve hiyerarşi korunur; renk dili değiştirilir. |
| Yatay üst kategori nav | Ana Sayfa / Oyunlar / Liderlik / Sosyal / Destek | Casino/slot/canlı casino alanları eklenmez. |
| Banner slider | PlayMatrix üyelik, e-posta onay, aktivite ve oyun vitrini | Sarı bahis kampanyası dili kullanılmaz. |
| 2 sütun kategori butonları | Crash, Satranç, Pişti, Pattern Master, Space Pro, Snake Pro | Büyük dokunma alanı ve ikon oranları korunur. |
| Mobil alt nav | Ana Sayfa / Oyunlar / Promosyonlar / Çark / Destek | Para yatırma alanı kullanılmaz. |
| Login step-1 | Kullanıcı adı/e-posta ile giriş başlangıcı | Aynı spacing ve büyük input oranı. |
| Login step-2 | Şifre girişi + hesap doğrulama kartı | GSM yerine e-posta/kullanıcı bilgisi maskelenir. |
| Forgot password | E-posta tabanlı sıfırlama | GSM sekmesi tasarıma alınmaz. |
| Sol drawer | Oyunlar, Ödüller, Sosyal, Destek menüsü | Bahis/casino menüleri çıkarılır. |
| Sağ profil paneli | Profilim, Çark, Promosyon, Sosyal, Güvenlik, Çıkış | Para yatır/çek/bahis geçmişi çıkarılır. |

## Yasaklı UI Terimleri

Aşağıdaki terimler ana kullanıcı UI'ına eklenmeyecek; sadece eski dosya adı, yorum, migration notu veya referans analizi içinde geçebilir:

- Para Yatır
- Para Çek
- Bahis Geçmişi
- Canlı Casino
- Slotlar
- Casino
- GSM doğrulama
- Bilet etkinliği
- Gerçek para

## PlayMatrix İçerik Haritası

| Alan | Korunacak içerik | Yeni layout hedefi |
|---|---|---|
| Ana Sayfa | hero, oyun vitrini, leaderboard, stats | Referans ana akış: header → nav → slider → kategori grid → oyun kartları |
| Auth | login/register/forgot | 2 adımlı mobil form sistemi |
| Profil | kullanıcı adı, e-posta, avatar, frame, MC, XP | Referans profil paneli hissi |
| Çark | günlük ödül, cooldown, result | Gamification sheet |
| Promo | promo kodu | Ödül merkezi kartı |
| Davet | referral code/link | Paylaşılabilir davet kartı |
| Sosyal | global chat, DM, arkadaşlar, bildirim | Modern messaging sheet |
| Destek | support endpointleri | Alt nav ana aksiyonu |
| Leaderboard | rank, stats, top users | Premium tablo + top 3 vurgu |

## Eski Tasarım Temizlik Politikası

- Eski renk değişkenleri yeni tokenlara taşınmadan yeni bileşenlerde kullanılmayacak.
- `static-inline.css` kalıcı tasarım kaynağı sayılmayacak; Faz 1 sonrası sınıflar asıl CSS dosyalarına taşınacak.
- `legacy-home.runtime.js` geçiş uyumluluğu dışında büyütülmeyecek.
- Yeni UI davranışları `public/js/home/*`, `public/js/profile/*`, `public/js/social/*` modüllerinde sahiplik alanına göre kurulacak.
- Inline event handler ve inline style kullanılmayacak.

## Faz 1 Tasarım Sistemi

- Faz 1 tasarım sistemi: `docs/design-system-phase1.md`

## Faz 0 Kalite Kapısı

Faz 0 tamam sayılmadan önce şu sözleşmeler var olmalıdır:

- CSS sahiplik haritası
- JS modül bağımlılık haritası
- regresyon kontrol listesi
- faz kabul kriterleri
- viewport ve mobile safe-area kontratı
- auth/profile/social/market endpoint haritası
- yeni UI için yasaklı konsept listesi

