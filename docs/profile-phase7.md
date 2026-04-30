# FAZ 7 — Hesabım, Profil, Avatar, Frame, Level ve MC Paneli

## Kapsam
- Profil sheet yapısı premium hesap merkezi olarak yeniden düzenlendi.
- Büyük avatar/frame header, UID, seviye badge, MC kartı ve XP bar eklendi.
- 4'lü istatistik grid eklendi: Toplam Oyun, Hesap Seviyesi, Aylık Aktiflik, Üye Tarihi.
- Avatar ve çerçeve seçicileri açık/kilitli/seçili/disabled durumlarını net gösterecek biçimde güncellendi.
- Kilitli frame kartları disabled ve aria-disabled olarak kalır; tıklanamaz.
- Profil kaydetme işleminde loading, success ve error durumu gösterilir.

## Konsept Dışı Temizlik
- Para yatırma, para çekme ve bahis geçmişi dili profil merkezine eklenmedi.
- MC yalnızca oyun içi bakiye olarak gösterildi.

## Ana Dosyalar
- index.html
- public/css/profile.css
- public/css/components/avatar-picker.css
- public/avatar-frame.css
- public/js/home/legacy-home.runtime.js
- public/js/home/profile-panel.js
- public/js/profile/profile-stats.js
- public/js/profile/avatar-picker.js
- public/js/profile/frame-picker.js
- routes/profile.routes.js
