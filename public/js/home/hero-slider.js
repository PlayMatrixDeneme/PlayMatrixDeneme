export function installHeroSliderGuards(root = document) {
  const carousel = root.querySelector?.("#heroPromoCarousel");
  const track = root.querySelector?.("#heroPromoTrack, .hero-slider-track");
  const viewport = root.querySelector?.("#heroPromoViewport, .hero-slider-viewport");
  const dots = Array.from(root.querySelectorAll?.("#heroPromoDots .hero-slider-dot") || []);
  if (!track) return false;

  track.dataset.module = "hero-slider";
  track.dataset.phase = "5";
  track.setAttribute("aria-live", "polite");

  if (carousel) {
    carousel.dataset.heroSliderReady = "1";
    carousel.dataset.phase = "5";
  }

  if (viewport) {
    viewport.dataset.heroSwipe = "enabled";
    viewport.setAttribute("tabindex", viewport.getAttribute("tabindex") || "0");
    viewport.setAttribute("aria-roledescription", "carousel");
  }

  dots.forEach((dot, index) => {
    dot.dataset.slideIndex = dot.dataset.slideIndex || String(index);
    dot.setAttribute("type", "button");
    if (!dot.hasAttribute("aria-label")) dot.setAttribute("aria-label", `${index + 1}. slayta git`);
  });

  return true;
}
