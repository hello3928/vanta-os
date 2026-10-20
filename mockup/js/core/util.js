// Small DOM helpers shared by components and screens.

export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function h(tag, className = '', html = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html) el.innerHTML = html;
  return el;
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Starts a CSS transition on an element that was just inserted: forces a layout, then applies
// the change. Unlike requestAnimationFrame this also works in background tabs.
export function afterLayout(el, fn) {
  void el.offsetWidth;
  fn();
}
