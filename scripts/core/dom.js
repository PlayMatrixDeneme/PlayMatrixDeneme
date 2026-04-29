export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clear(node) {
  if (node) node.replaceChildren();
}

export function safeText(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
}
