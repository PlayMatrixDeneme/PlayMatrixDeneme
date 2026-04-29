import { el } from '../core/dom.js';
import { socialTabs } from '../data/home-data.js';
import { setSocialTab, homeState } from '../app/state.js';
import { showToast } from './toast.js';

const modalMap = new Map([
  ['login', { title: 'Giriş', subtitle: 'Auth entegrasyonu sonraki güvenlik fazında sertleştirilecek.', body: loginBody }],
  ['register', { title: 'Kayıt Ol', subtitle: 'Kayıt, e-posta onayı ve ödül akışı sonraki fazda bağlanacak.', body: registerBody }],
  ['account', { title: 'Hesabım', subtitle: 'Profil, seviye, bakiye, avatar ve çerçeve özeti.', body: accountBody }],
  ['frame', { title: 'Avatar / Çerçeve', subtitle: 'Tek component standardı ve çerçeve hizası.', body: frameBody }],
  ['wheel', { title: 'Günlük Çark', subtitle: 'UI hazır; gerçek claim ekonomi fazında.', body: wheelBody }],
  ['promo', { title: 'Promosyon Kodu', subtitle: 'Kod girişi geri geldi; claim mantığı ekonomi fazında düzeltilecek.', body: promoBody }],
  ['invite', { title: 'Davet Et ve Kazan', subtitle: 'Davet kodu ve link alanı yeni modal standardına taşındı.', body: inviteBody }],
  ['support', { title: 'Canlı Destek', subtitle: 'Sorun bildirim formu ve kategori alanları.', body: supportBody }],
  ['social-center', { title: 'Sosyal Merkez', subtitle: 'Yerel sohbet, DM, arama, istek, arkadaş ekleme ve oyun daveti.', body: socialBody }],
  ['quick-match', { title: 'Hızlı Eşleş', subtitle: 'Oyun ve socket fazından sonra aktif olacak.', body: quickMatchBody }],
  ['game-roadmap', { title: 'Oyun Fazı Planı', subtitle: 'Oyun sayfaları bu pakette yok; sadece pasif vitrin kartları var.', body: roadmapBody }],
  ['activity', { title: 'Aktif Oyuncu Ödülleri', subtitle: 'Aylık ödül ve reset görünümü.', body: activityBody }],
  ['notifications', { title: 'Bildirimler', subtitle: 'Toast ve sistem bildirimi standardı.', body: notificationsBody }],
  ['mobile-nav', { title: 'Menü', subtitle: 'Mobil hızlı gezinme.', body: mobileNavBody }]
]);

export function installModalSystem() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-modal]');
    if (!trigger) return;
    event.preventDefault();
    openModal(trigger.dataset.modal);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

export function openModal(id) {
  const config = modalMap.get(id);
  if (!config) return;
  const root = document.querySelector('[data-modal-root]');
  if (!root) return;
  root.replaceChildren();
  root.classList.add('is-open');
  const backdrop = el('div', 'pm-modal-backdrop');
  const shell = el('section', 'pm-modal-shell');
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-modal', 'true');
  shell.setAttribute('aria-label', config.title);
  const head = el('header', 'pm-modal-head');
  const title = el('div', 'pm-modal-title');
  const strong = el('strong', '', config.title);
  const span = el('span', '', config.subtitle);
  title.append(strong, span);
  const close = el('button', 'pm-icon-button', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Kapat');
  close.addEventListener('click', closeModal);
  head.append(title, close);
  const body = el('div', 'pm-modal-body');
  body.append(config.body());
  shell.append(head, body);
  backdrop.addEventListener('click', closeModal);
  root.append(backdrop, shell);
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  const root = document.querySelector('[data-modal-root]');
  if (!root) return;
  root.classList.remove('is-open');
  root.replaceChildren();
  document.body.style.overflow = '';
}

function field(label, type, placeholder) {
  const wrap = el('label', 'pm-field');
  wrap.append(el('span', '', label));
  const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') input.type = type;
  input.placeholder = placeholder;
  wrap.append(input);
  return wrap;
}

function actions(primaryText) {
  const row = el('div', 'pm-sheet-actions');
  const primary = el('button', 'pm-button pm-button-primary', primaryText);
  primary.type = 'button';
  primary.addEventListener('click', () => showToast('Demo arayüz işlemi alındı. Backend sonraki fazda bağlanacak.'));
  const close = el('button', 'pm-button pm-button-ghost', 'Kapat');
  close.type = 'button';
  close.addEventListener('click', closeModal);
  row.append(primary, close);
  return row;
}

function loginBody() {
  const wrap = el('div', 'pm-modal-grid');
  wrap.append(field('E-posta', 'email', 'ornek@playmatrix.com'), field('Şifre', 'password', '••••••••'));
  const full = el('div', 'pm-field-full');
  full.append(actions('Giriş Yap'));
  wrap.append(full);
  return wrap;
}

function registerBody() {
  const wrap = el('div', 'pm-modal-grid');
  wrap.append(field('Kullanıcı Adı', 'text', 'MatrixOyuncusu'), field('E-posta', 'email', 'ornek@playmatrix.com'), field('Şifre', 'password', 'En az 8 karakter'), field('Davet Kodu', 'text', 'İsteğe bağlı'));
  const full = el('div', 'pm-field-full');
  full.append(actions('Kayıt Ol'));
  wrap.append(full);
  return wrap;
}

function accountBody() {
  const user = homeState.user || {};
  const wrap = el('div', 'pm-modal-grid');
  wrap.append(infoCard('Kullanıcı', user.name || 'Matrix Oyuncusu'), infoCard('Hesap Seviyesi', `Seviye ${user.level || 1}`), infoCard('Bakiye', `${user.balance || 0} MC`), infoCard('Sonraki Hedef', user.nextTarget || 'Hazır'));
  const full = el('div', 'pm-field-full');
  full.append(actions('Profili Güncelle'));
  wrap.append(full);
  return wrap;
}

function frameBody() {
  const wrap = el('div', 'pm-modal-grid');
  for (let index = 1; index <= 18; index += 1) {
    wrap.append(infoCard(`Çerçeve ${index}`, index <= 8 ? 'Açık görünüm' : 'Seviye kilidi sonraki fazda'));
  }
  return wrap;
}

function wheelBody() {
  const wrap = el('div', 'pm-wheel');
  wrap.append(el('div', 'pm-wheel-disc'), el('p', '', 'Günlük çark görseli hazır. Gerçek ödül claim işlemi ekonomi fazında ledger ile bağlanacak.'), actions('Çarkı Çevir'));
  return wrap;
}

function promoBody() {
  const wrap = el('div', 'pm-modal-grid');
  wrap.append(field('Promosyon Kodu', 'text', 'PLAYMATRIX'), infoCard('Durum', 'Tekil claim düzeltmesi ekonomi fazında'));
  const full = el('div', 'pm-field-full');
  full.append(actions('Kodu Kullan'));
  wrap.append(full);
  return wrap;
}

function inviteBody() {
  const wrap = el('div', 'pm-modal-grid');
  wrap.append(field('Davet Kodun', 'text', 'PMX-PLAYER-2026'), field('Davet Linkin', 'text', 'https://playmatrix.com.tr/?ref=PMX'));
  const full = el('div', 'pm-field-full');
  full.append(actions('Kopyala'));
  wrap.append(full);
  return wrap;
}

function supportBody() {
  const wrap = el('div', 'pm-modal-grid');
  wrap.append(field('Konu', 'text', 'Örn: Hesap / Ödül / Profil'), field('Kategori', 'text', 'Genel'), field('Öncelik', 'text', 'Normal'));
  const message = field('Sorun Detayı', 'textarea', 'Sorunu hangi adımlarda gördüğünü yaz.');
  message.classList.add('pm-field-full');
  wrap.append(message);
  const full = el('div', 'pm-field-full');
  full.append(actions('Gönder'));
  wrap.append(full);
  return wrap;
}

function socialBody() {
  const wrap = el('div', 'pm-social-modal');
  const tabs = el('div', 'pm-social-tabs');
  const content = el('div', 'pm-social-content');
  const draw = () => {
    const active = socialTabs.find((tab) => tab.id === homeState.socialTab) || socialTabs[0];
    tabs.replaceChildren();
    socialTabs.forEach((tab) => {
      const button = el('button', tab.id === active.id ? 'is-active' : '', tab.label);
      button.type = 'button';
      button.addEventListener('click', () => { setSocialTab(tab.id); draw(); });
      tabs.append(button);
    });
    content.replaceChildren();
    const head = el('div', 'pm-social-content-head');
    head.append(el('strong', '', active.title), el('span', 'pm-status-pill', 'Önizleme'));
    const stream = el('div', 'pm-social-stream');
    active.lines.forEach((line) => stream.append(el('div', 'pm-chat-bubble', line)));
    const compose = el('div', 'pm-social-compose');
    const input = document.createElement('input');
    input.placeholder = 'Mesaj yazma backend fazında bağlanacak';
    const send = el('button', 'pm-button pm-button-primary', 'Gönder');
    send.type = 'button';
    send.addEventListener('click', () => showToast('Sosyal backend sonraki fazda bağlanacak.'));
    compose.append(input, send);
    content.append(head, stream, compose);
  };
  draw();
  wrap.append(tabs, content);
  return wrap;
}

function quickMatchBody() {
  return infoStack(['Hızlı eşleşme UI girişi korundu.', 'Match queue, socket ve oyun daveti sistemi oyun/sosyal fazlarında aktif edilecek.', 'Bu pakette oyun runtime dosyası yok.']);
}

function roadmapBody() {
  return infoStack(['Online oyunlar ayrı fazda eklenecek.', 'Klasik oyunlar ayrı fazda eklenecek.', 'Bu AnaSayfa paketi sadece tasarım dili ve ana giriş sistemidir.']);
}

function activityBody() {
  return infoStack(['Aktif oyuncu ödül görünümü hazır.', 'Aylık reset/catch-up mantığı backend fazında düzeltilecek.', 'Yeşil görünüp kırmızı kalan durumlar health raporuna bağlanacak.']);
}

function notificationsBody() {
  return infoStack(['Toast sistemi aktif.', 'Bildirim merkezi UI hazır.', 'Gerçek bildirim akışı sosyal/backend fazlarında bağlanacak.']);
}

function mobileNavBody() {
  const wrap = el('div', 'pm-modal-grid');
  [['AnaSayfa', '#hero'], ['Oyun Merkezi', '#games'], ['Liderlik', '#leaderboard'], ['Ödüller', '#rewards'], ['Sosyal', '#social']].forEach(([label, href]) => {
    const link = el('a', 'pm-button pm-button-ghost', label);
    link.href = href;
    link.addEventListener('click', closeModal);
    wrap.append(link);
  });
  return wrap;
}

function infoCard(title, text) {
  const card = el('article', 'pm-action-card');
  card.append(el('strong', '', title), el('span', '', text));
  return card;
}

function infoStack(lines) {
  const wrap = el('div', 'pm-profile-actions');
  lines.forEach((line, index) => wrap.append(infoCard(`Bilgi ${index + 1}`, line)));
  return wrap;
}
