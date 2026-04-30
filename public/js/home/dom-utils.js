const doc = typeof document !== "undefined" ? document : null;

export const qs = (selector, root = doc) => root?.querySelector?.(selector) || null;
export const qsa = (selector, root = doc) => Array.from(root?.querySelectorAll?.(selector) || []);
export const byId = (id) => (doc ? doc.getElementById(id) : null);

export function createElement(tagName, className = "", text = "") {
  const node = doc.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== "") node.textContent = String(text);
  return node;
}

export function createEl(tagName, options = {}, children = []) {
  const node = doc.createElement(tagName);
  const opts = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const className = opts.className || opts.class || '';
  if (className) node.className = String(className);
  if (opts.id) node.id = String(opts.id);
  if (opts.text !== undefined && opts.text !== null) node.textContent = safeText(opts.text);
  if (opts.attrs && typeof opts.attrs === 'object') {
    Object.entries(opts.attrs).forEach(([key, value]) => {
      if (value === false || value === undefined || value === null) return;
      node.setAttribute(key, value === true ? '' : String(value));
    });
  }
  const childList = Array.isArray(children) ? children : [children];
  childList.forEach((child) => {
    if (child === undefined || child === null || child === false) return;
    node.appendChild(typeof child === 'string' ? doc.createTextNode(child) : child);
  });
  return node;
}

export function bindIfPresent(id, eventName, handler, options) {
  const element = byId(id);
  if (!element || typeof handler !== "function") return null;
  element.addEventListener(eventName, handler, options);
  return element;
}

export function setHidden(elementOrId, hidden = true) {
  const element = typeof elementOrId === "string" ? byId(elementOrId) : elementOrId;
  if (!element) return null;
  element.hidden = !!hidden;
  element.classList.toggle("is-hidden", !!hidden);
  element.setAttribute("aria-hidden", hidden ? "true" : "false");
  return element;
}

export function setExpanded(elementOrId, expanded = true) {
  const element = typeof elementOrId === "string" ? byId(elementOrId) : elementOrId;
  if (!element) return null;
  element.setAttribute("aria-expanded", expanded ? "true" : "false");
  return element;
}

export function safeText(value, fallback = "") {
  const normalized = value === undefined || value === null ? fallback : value;
  return String(normalized).replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

export function setText(id, value, fallback = "") {
  const element = byId(id);
  if (!element) return null;
  element.textContent = safeText(value, fallback);
  return element;
}

export function reportHomeError(scope, error, extra = {}) {
  try {
    if (typeof window.__PM_REPORT_CLIENT_ERROR__ === "function") {
      window.__PM_REPORT_CLIENT_ERROR__(scope, error, { source: "home-module", ...extra });
    }
  } catch (_) {}
}


export function replaceChildrenSafe(node, children = []) {
  if (!node) return null;
  const fragment = doc.createDocumentFragment();
  const list = Array.isArray(children) ? children : [children];
  list.forEach((child) => {
    if (child === undefined || child === null || child === false) return;
    fragment.appendChild(typeof child === 'string' ? doc.createTextNode(safeText(child)) : child);
  });
  node.replaceChildren(fragment);
  return node;
}

export function safeUrl(value = "", fallback = "") {
  const raw = safeText(value, fallback);
  if (!raw) return safeText(fallback, "");
  try {
    const parsed = new URL(raw, window.location.origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return safeText(fallback, "");
    return parsed.href;
  } catch (_) {
    return safeText(fallback, "");
  }
}

export function setSafeImage(img, src = "", fallback = "/assets/avatars/system/fallback.svg") {
  if (!img) return null;
  const safeFallback = safeUrl(fallback, "/assets/avatars/system/fallback.svg");
  img.src = safeUrl(src, safeFallback);
  img.addEventListener("error", () => {
    if (img.dataset.pmFallbackApplied === "1") return;
    img.dataset.pmFallbackApplied = "1";
    img.src = safeFallback;
  }, { once: true });
  return img;
}
