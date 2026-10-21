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

// Wraps a subscriber so it removes itself once `el` has been on the page and then left it.
// `subscribe(fn)` must return an unsubscribe function.
export function whileConnected(el, subscribe, fn) {
  let seen = false;
  let off = null;
  off = subscribe((...args) => {
    if (!el.isConnected) {
      if (seen) off?.();
      return;
    }
    seen = true;
    fn(...args);
  });
  setTimeout(() => (seen = seen || el.isConnected), 0);
  return off;
}
