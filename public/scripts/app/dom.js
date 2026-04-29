export function qs(selector, root = document) {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Element bulunamadı: ${selector}`);
  return element;
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function el(tag, options = {}) {
  const node = document.createElement(tag);
  const { className, text, attrs, children } = options;
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    });
  }
  if (children) children.forEach((child) => node.append(child));
  return node;
}
