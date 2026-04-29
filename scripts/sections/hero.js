import { el, clear } from '../core/dom.js';
import { heroPills, slides } from '../data/home-data.js';
import { homeState, setSlide } from '../app/state.js';

export function renderHero() {
  const pillRoot = document.querySelector('[data-hero-pills]');
  const track = document.querySelector('[data-carousel-track]');
  const dots = document.querySelector('[data-carousel-dots]');
  clear(pillRoot);
  clear(track);
  clear(dots);
  heroPills.forEach((item) => {
    const pill = el('span', 'pm-pill');
    pill.append(el('i'), document.createTextNode(item));
    pillRoot.append(pill);
  });
  slides.forEach((slide, index) => {
    const card = el('article', `pm-slide${index === homeState.slide ? ' is-active' : ''}`);
    card.dataset.tone = slide.tone;
    const top = el('div', 'pm-slide-top');
    top.append(el('span', 'pm-slide-icon', slide.icon), el('span', 'pm-status-pill', 'Aktif'));
    const copy = el('div');
    copy.append(el('h3', '', slide.title), el('p', '', slide.text));
    card.append(top, copy);
    track.append(card);
    const dot = el('button', index === homeState.slide ? 'is-active' : '');
    dot.type = 'button';
    dot.setAttribute('aria-label', `${index + 1}. slayt`);
    dot.addEventListener('click', () => { setSlide(index); renderHero(); });
    dots.append(dot);
  });
}

export function startHeroCarousel() {
  window.setInterval(() => {
    setSlide((homeState.slide + 1) % slides.length);
    renderHero();
  }, 5200);
}
