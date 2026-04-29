
(function () {
  "use strict";

  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;

  const $ = (id) => doc.getElementById(id);
  const qs = (selector, scope = doc) => scope.querySelector(selector);
  const qsa = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));

  function setExpanded(node, expanded) {
    if (!node) return;
    node.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function openDrawer() {
    body.classList.add("pm-drawer-open");
    const drawer = $("pmVideoDrawer");
    if (drawer) drawer.setAttribute("aria-hidden", "false");
    setExpanded($("pmMenuToggle"), true);
  }

  function closeDrawer() {
    body.classList.remove("pm-drawer-open");
    const drawer = $("pmVideoDrawer");
    if (drawer) drawer.setAttribute("aria-hidden", "true");
    setExpanded($("pmMenuToggle"), false);
  }

  function safeClick(target) {
    if (!target) return false;
    try {
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    } catch (_) {
      try {
        target.click();
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  function openMarket() {
    const launcher = $("pm-market-launcher");
    if (launcher && safeClick(launcher)) return;
    window.setTimeout(() => {
      const retry = $("pm-market-launcher");
      if (retry) safeClick(retry);
    }, 180);
  }

  function runHomeAction(action) {
    closeDrawer();

    const map = {
      login: "loginBtn",
      register: "registerBtn",
      wheel: "navWheelItem",
      promo: "navBonusItem",
      support: "navSupportItem",
      invite: "navInviteItem",
      social: "navSocialItem",
      profile: "navProfileItem"
    };

    if (action === "market") {
      openMarket();
      return;
    }

    const id = map[action];
    if (id) safeClick($(id));
  }

  function installActionDelegation() {
    doc.addEventListener("click", (event) => {
      const actionNode = event.target.closest("[data-home-action]");
      if (actionNode) {
        const action = actionNode.getAttribute("data-home-action");
        if (action) {
          event.preventDefault();
          runHomeAction(action);
          return;
        }
      }

      const mobileActionNode = event.target.closest("[data-mobile-action]");
      if (mobileActionNode) {
        const action = mobileActionNode.getAttribute("data-mobile-action");
        if (action) {
          // Legacy runtime also listens to these buttons. This fallback only fires its equivalent trigger.
          window.setTimeout(() => runHomeAction(action), 0);
        }
      }

      const hashNode = event.target.closest('a[href^="#"], button[data-mobile-link]');
      if (!hashNode) return;

      const selector = hashNode.getAttribute("href") || hashNode.getAttribute("data-mobile-link");
      if (!selector || selector === "#") return;

      const target = qs(selector);
      if (!target) return;

      event.preventDefault();
      closeDrawer();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      syncActiveNav(selector);
    });
  }

  function installDrawer() {
    $("pmMenuToggle")?.addEventListener("click", openDrawer, { passive: true });
    $("pmMenuClose")?.addEventListener("click", closeDrawer, { passive: true });
    $("pmDrawerScrim")?.addEventListener("click", closeDrawer, { passive: true });

    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDrawer();
    });
  }

  function syncActiveNav(selector) {
    qsa(".nav-link, .mobile-tab").forEach((node) => {
      const current = node.getAttribute("href") || node.getAttribute("data-mobile-link");
      if (current) node.classList.toggle("is-active", current === selector);
    });
  }

  function installActiveSectionObserver() {
    const sections = ["#hero", "#games", "#leaderboard"].map((selector) => qs(selector)).filter(Boolean);
    if (!("IntersectionObserver" in window) || !sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible?.target?.id) syncActiveNav(`#${visible.target.id}`);
    }, { root: null, rootMargin: "-24% 0px -58% 0px", threshold: [0.12, 0.25, 0.4] });

    sections.forEach((section) => observer.observe(section));
  }

  function installHeroSlider() {
    const track = $("heroPromoTrack");
    const dots = qsa("#heroPromoDots .hero-slider-dot");
    if (!track || dots.length < 2) return;

    const slides = qsa(".hero-slide", track);
    let index = 0;
    let timer = null;

    const setSlide = (nextIndex, userInitiated) => {
      if (!slides.length) return;
      index = (Number(nextIndex) + slides.length) % slides.length;
      track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-current", active ? "true" : "false");
      });

      if (userInitiated) restart();
    };

    const restart = () => {
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(() => setSlide(index + 1, false), 5200);
    };

    dots.forEach((dot, dotIndex) => {
      dot.addEventListener("click", () => setSlide(dotIndex, true), { passive: true });
    });

    let startX = 0;
    let startY = 0;
    let touching = false;

    track.addEventListener("touchstart", (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      touching = true;
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true });

    track.addEventListener("touchend", (event) => {
      if (!touching) return;
      touching = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        setSlide(index + (dx < 0 ? 1 : -1), true);
      }
    }, { passive: true });

    setSlide(0, false);
    restart();

    doc.addEventListener("visibilitychange", () => {
      if (doc.hidden && timer) window.clearInterval(timer);
      else restart();
    });
  }

  function installViewportLock() {
    let lastTouchEnd = 0;

    doc.addEventListener("dblclick", (event) => {
      event.preventDefault();
    }, { capture: true });

    doc.addEventListener("gesturestart", (event) => {
      event.preventDefault();
    }, { capture: true });

    doc.addEventListener("touchend", (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 320) event.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });

    doc.addEventListener("contextmenu", (event) => {
      const editable = event.target.closest("input, textarea, select, [contenteditable='true']");
      const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
      if (coarse && !editable) event.preventDefault();
    }, { capture: true });

    root.style.touchAction = "manipulation";
  }

  function installAuthStateMirror() {
    const topUser = $("topUser");
    const login = $("loginBtn");
    const register = $("registerBtn");

    const sync = () => {
      const display = topUser ? window.getComputedStyle(topUser).display : "none";
      const inlineDisplay = topUser?.style?.display || "";
      const authed = display !== "none" || (!!inlineDisplay && inlineDisplay !== "none");
      body.classList.toggle("is-authenticated", authed);
      if (login && register && authed) {
        login.setAttribute("aria-hidden", "true");
        register.setAttribute("aria-hidden", "true");
      } else {
        login?.removeAttribute("aria-hidden");
        register?.removeAttribute("aria-hidden");
      }
    };

    sync();

    if (topUser && "MutationObserver" in window) {
      new MutationObserver(sync).observe(topUser, { attributes: true, attributeFilter: ["style", "class", "hidden"] });
    }

    window.setInterval(sync, 2500);
  }

  function installFooterAccordions() {
    qsa(".pm-footer-accordion details").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        qsa(".pm-footer-accordion details").forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });
  }

  function installPerformanceHints() {
    qsa("img").forEach((img) => {
      if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
      if (!img.hasAttribute("loading") && !img.classList.contains("pm-brand-logo")) img.setAttribute("loading", "lazy");
      img.setAttribute("draggable", "false");
    });
  }

  function boot() {
    body.classList.add("pm-video-redesign-ready");
    installViewportLock();
    installDrawer();
    installActionDelegation();
    installActiveSectionObserver();
    installHeroSlider();
    installAuthStateMirror();
    installFooterAccordions();
    installPerformanceHints();
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
