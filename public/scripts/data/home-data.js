export const userProfile = Object.freeze({
  name: 'Matrix Oyuncusu',
  username: 'MatrixOyuncusu',
  level: 24,
  progress: 72,
  balance: 50000,
  frame: 8,
  nextTarget: 'Seviye 25 için 28% kaldı',
  status: 'Güvenli oturum hazır'
});

export const heroPills = Object.freeze([
  'Güvenli Oturum',
  'Kayıt + Doğrulama',
  'AnaSayfa-only Paket',
  'Oyunlar Sonraki Faz'
]);

export const slides = Object.freeze([
  { icon: 'UI', title: 'Yeni tasarım dili', text: 'Kart, modal, topbar, avatar ve sosyal girişler tek premium görsel standarda bağlandı.', tone: 'violet' },
  { icon: 'SYS', title: 'Temiz kapsam', text: 'Oyun, admin ve market runtime dosyaları bu çalışma paketine eklenmedi.', tone: 'cyan' },
  { icon: 'MOB', title: 'Mobil güvenlik', text: 'Çift tık zoom, uzun basma seçimi ve modal scroll sorunları için kontrollü önlemler eklendi.', tone: 'green' }
]);

export const metrics = Object.freeze([
  { label: 'Ana alan', value: '9', detail: 'Eski homepage kapsamı geri geldi' },
  { label: 'Oyun runtime', value: '0', detail: 'Şimdilik pakete alınmadı' },
  { label: 'Modül', value: '18', detail: 'script.js parçalı mimari' },
  { label: 'CSS katmanı', value: '7', detail: 'style.css import sistemi' }
]);

export const profileActions = Object.freeze([
  { title: 'Hesabım', text: 'Profil, seviye, avatar ve çerçeve ayarları.', modal: 'account' },
  { title: 'Avatar / Çerçeve', text: 'Yeni tek component standardıyla gösterim.', modal: 'frame' },
  { title: 'Bildirimler', text: 'Ödül, davet ve sistem bildirimleri.', modal: 'notifications' }
]);

export const activityCards = Object.freeze([
  { title: 'Günlük Çark', value: 'Hazır', text: 'UI alanı aktif, ekonomi backend sonraki faz.' },
  { title: 'Aktif Oyuncu', value: 'Takipte', text: 'Aylık ödül görünümü hazırlandı.' },
  { title: 'Promosyon', value: 'Bağlanacak', text: 'Claim düzeltmesi ekonomi fazında.' },
  { title: 'Davet', value: '+50K MC', text: 'Atomik ödül modeli sonraki fazda.' }
]);

export const filters = Object.freeze([
  { id: 'all', label: 'Tümü' },
  { id: 'online', label: 'Online' },
  { id: 'classic', label: 'Klasik' },
  { id: 'system', label: 'Sistem' }
]);

export const games = Object.freeze([
  { title: 'Crash', category: 'online', icon: 'CR', text: 'Online oyun fazında yeni shell, interpolation ve kazanç güvenliğiyle eklenecek.', tags: ['Online', 'Yakında', 'Pasif'], glow: 'rgba(255, 85, 119, 0.28)' },
  { title: 'Satranç', category: 'online', icon: 'ST', text: 'Reconnect, topbar ve sonuç ekranı standardı tamamlanınca geri gelecek.', tags: ['Strateji', 'Yakında', 'Pasif'], glow: 'rgba(50, 220, 255, 0.25)' },
  { title: 'Pişti', category: 'online', icon: 'Pİ', text: 'Kart oyunu UI ve socket akışı oyun fazında yeniden bağlanacak.', tags: ['Kart', 'Yakında', 'Pasif'], glow: 'rgba(138, 109, 255, 0.28)' },
  { title: 'Snake Pro', category: 'classic', icon: 'SN', text: 'Klasik oyun skor güvenliği eklendikten sonra aktif edilecek.', tags: ['Klasik', 'Skor', 'Pasif'], glow: 'rgba(81, 242, 175, 0.2)' },
  { title: 'Space Pro', category: 'classic', icon: 'SP', text: 'Yeni bitiş ekranı ve leaderboard bağlantısıyla taşınacak.', tags: ['Klasik', 'Arcade', 'Pasif'], glow: 'rgba(255, 200, 90, 0.23)' },
  { title: 'Pattern Master', category: 'classic', icon: 'PM', text: 'Server-issued run token fazından sonra eklenecek.', tags: ['Zeka', 'Skor', 'Pasif'], glow: 'rgba(181, 128, 255, 0.26)' },
  { title: 'Hızlı Eşleş', category: 'system', icon: 'QE', text: 'Match queue ve oyun daveti sistemi sosyal/socket fazında bağlanacak.', tags: ['Queue', 'Socket', 'Plan'], glow: 'rgba(50, 220, 255, 0.18)' },
  { title: 'Turnuva Alanı', category: 'system', icon: 'TR', text: 'Liderlik, ödül ve oyun sonuçları tamamlandıktan sonra aktif olur.', tags: ['Turnuva', 'Ödül', 'Plan'], glow: 'rgba(255, 209, 102, 0.22)' }
]);

export const leaderboard = Object.freeze([
  { name: 'NeonRook', level: 42, score: '128.4K' },
  { name: 'CrashPilot', level: 37, score: '118.9K' },
  { name: 'PistiAce', level: 34, score: '101.2K' },
  { name: 'MatrixRunner', level: 29, score: '88.7K' },
  { name: 'OrbitWolf', level: 27, score: '74.3K' }
]);

export const rewards = Object.freeze([
  { icon: 'Ç', title: 'Günlük Çark', text: 'Spin UI hazır. Gerçek claim ekonomi fazında backend ile bağlanacak.', modal: 'wheel' },
  { icon: 'P', title: 'Promosyon Kodu', text: 'Kod giriş alanı geri geldi. Claim bug düzeltmesi ayrı fazda.', modal: 'promo' },
  { icon: 'D', title: 'Davet Et Kazan', text: 'Kod ve link üretme arayüzü yeni modal standardına taşındı.', modal: 'invite' },
  { icon: 'A', title: 'Aktif Oyuncu', text: 'Aylık ödül görünümü ve reset durumu için UI hazırlığı yapıldı.', modal: 'activity' }
]);

export const supportCards = Object.freeze([
  { title: 'Canlı Destek', text: 'Sorun bildirimi ve kategori seçimi yeni formda.', modal: 'support' },
  { title: 'Sistem Bildirimi', text: 'UI state ve toast sistemi tek merkezden çalışır.', modal: 'notifications' },
  { title: 'Güvenli Oturum', text: 'Session görünümü hazır, auth entegrasyonu sonraki fazda sertleşecek.', modal: 'login' }
]);

export const socials = Object.freeze([
  { icon: 'TR', title: 'Yerel Sohbet', text: 'Global sohbet alanı yeni sosyal merkeze taşındı.', modal: 'social-center' },
  { icon: 'DM', title: 'DM Kutusu', text: 'DM görünümü ve mesaj kutusu hazırlandı.', modal: 'social-center' },
  { icon: 'AR', title: 'Mesaj Ara', text: 'Arama tabı sosyal modal içinde yer alır.', modal: 'social-center' },
  { icon: 'İS', title: 'İstek Listesi', text: 'Arkadaşlık istekleri sekmesi geri geldi.', modal: 'social-center' },
  { icon: '+', title: 'Arkadaş Ekle', text: 'Kullanıcı adıyla ekleme formu korundu.', modal: 'social-center' },
  { icon: 'OG', title: 'Oyun Daveti', text: 'Oyunlar aktif olunca davet sistemi bağlanacak.', modal: 'social-center' }
]);

export const socialTabs = Object.freeze([
  { id: 'global', label: 'Yerel Sohbet (TR)', title: '#Yerel Sohbet', lines: ['Sistem: AnaSayfa sosyal girişi hazır.', 'MatrixOyuncusu: Oyunlar sonraki fazda bağlanacak.'] },
  { id: 'dm', label: 'DM Kutusu', title: 'DM Kutusu', lines: ['Henüz aktif DM bağlantısı yok.', 'UI state hazır.'] },
  { id: 'search', label: 'Mesaj Ara', title: 'Mesaj Ara', lines: ['Arama altyapısı sosyal backend fazında bağlanacak.'] },
  { id: 'requests', label: 'İstek Listesi', title: 'İstek Listesi', lines: ['Bekleyen istek görünümü hazır.'] },
  { id: 'add', label: 'Arkadaş Ekleme', title: 'Arkadaş Ekle', lines: ['Kullanıcı adı ile ekleme formu sonraki fazda API’ye bağlanır.'] },
  { id: 'invites', label: 'Oyun Daveti', title: 'Oyun Daveti', lines: ['Oyunlar pasif olduğu için davetler şimdilik kapalı.'] }
]);
