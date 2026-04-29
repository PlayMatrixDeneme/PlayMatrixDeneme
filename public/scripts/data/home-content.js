export const metrics = Object.freeze([
  { label: 'Aktif sistem', value: '4', suffix: 'panel' },
  { label: 'Yeni UI token', value: '38', suffix: 'adet' },
  { label: 'Homepage test', value: '7', suffix: 'kapı' },
  { label: 'Kapsam dışı dosya', value: '0', suffix: 'oyun' }
]);

export const games = Object.freeze([
  { title: 'Crash', description: 'Sonraki fazda yeni oyun shell sistemine taşınacak online oyun kartı.', status: 'soon', tags: ['Online', 'Risk', 'Yakında'], glow: 'rgba(255, 94, 122, .28)' },
  { title: 'Satranç', description: 'Yeni topbar, reconnect ve sonuç ekranı standardı bu karta bağlanacak.', status: 'soon', tags: ['Online', 'Strateji', 'Yakında'], glow: 'rgba(0, 212, 255, .26)' },
  { title: 'Pişti', description: 'Kart oyunu deneyimi aynı premium oyun kabuğu ile yenilenecek.', status: 'soon', tags: ['Online', 'Kart', 'Yakında'], glow: 'rgba(124, 92, 255, .30)' },
  { title: 'Klasik Oyunlar', description: 'Snake, Space ve Pattern Master sonraki fazda tek tek bağlanacak.', status: 'soon', tags: ['Klasik', 'Skor', 'Yakında'], glow: 'rgba(255, 209, 102, .22)' },
  { title: 'Hızlı Eşleş', description: 'Match queue ve davet sistemi yeni sosyal fazdan sonra aktif edilecek.', status: 'soon', tags: ['Eşleşme', 'Socket', 'Yakında'], glow: 'rgba(79, 240, 166, .24)' },
  { title: 'Turnuva Alanı', description: 'Liderlik ve ödül altyapısı tamamlandıktan sonra açılacak üst seviye alan.', status: 'soon', tags: ['Turnuva', 'Ödül', 'Plan'], glow: 'rgba(157, 135, 255, .26)' }
]);

export const leaderboard = Object.freeze([
  { name: 'NeonRook', level: 42, score: '128.4K' },
  { name: 'CrashPilot', level: 37, score: '118.9K' },
  { name: 'PistiAce', level: 34, score: '101.2K' },
  { name: 'MatrixRunner', level: 29, score: '88.7K' }
]);

export const rewards = Object.freeze([
  { icon: 'Ç', title: 'Günlük Çark', text: 'Yeni modal standardıyla bağlanacak.' },
  { icon: 'P', title: 'Promosyon Kodu', text: 'Claim akışı sonraki ekonomi fazında düzeltilecek.' },
  { icon: 'D', title: 'Davet Et Kazan', text: 'Atomik ödül sistemiyle yeniden bağlanacak.' }
]);

export const socialCards = Object.freeze([
  { icon: 'TR', title: 'Yerel Sohbet', text: 'Global sohbet UI kapısı.', state: 'live' },
  { icon: 'DM', title: 'DM Kutusu', text: 'Mesajlaşma fazında bağlanacak.', state: 'soon' },
  { icon: '+', title: 'Arkadaş Ekle', text: 'Arkadaşlık istekleri yeni sheet ile gelecek.', state: 'soon' }
]);
