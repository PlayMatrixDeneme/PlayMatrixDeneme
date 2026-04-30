/* PlayMatrix shared online game DOM sanitizer. */
export function escapeHTML(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
}

export function escapeAttribute(value = '') {
  return escapeHTML(value).replace(/`/g, '&#96;');
}

export function setSafeText(target, value = '') {
  if (!target) return null;
  target.textContent = String(value ?? '');
  return target;
}

export function safeDatasetValue(value = '') {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

export function createSafeElement(tagName = 'div', { className = '', text = '', attrs = {} } = {}) {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(key)) return;
    el.setAttribute(key, String(value ?? ''));
  });
  return el;
}
