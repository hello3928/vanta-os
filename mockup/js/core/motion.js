// Motion helpers. The rules (see tokens.css): only transform and opacity animate, nothing
// overshoots, exits are quicker than entrances. Most motion is plain CSS transitions on
// state classes; this file covers the few things CSS can't do: one-off keyframes, and
// eased scrolling that behaves the same in every browser.
// Real OS: the same durations and curves in QML (Easing.OutCubic, 140–320 ms).

import { reducedMotion } from './util.js';

const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const Motion = {
  out: EASE_OUT,
  // Kept as names other modules use; both are the same calm curve now (no spring overshoot).
  spring: EASE_OUT,
  springSoft: EASE_OUT,
  springMs: 220,

  init() {},

  // One-off Web Animation. Long-lived elements must not use fill: 'forwards' (a leftover
  // animation would override CSS later); it's only for exits right before an element is removed.
  play(el, keyframes, opts = {}) {
    if (!el?.animate) return null;
    return el.animate(keyframes, { duration: 220, easing: EASE_OUT, ...opts, ...(reducedMotion() ? { duration: 1, delay: 0 } : {}) });
  },

  // Kept for compatibility; staggered entrances are gone on purpose.
  stagger() {},

  // Eased scrolling (consistent across browsers, unlike scroll-behavior: smooth).
  scrollTo(el, { left, top }, duration = 360) {
    const prev = tweens.get(el);
    if (prev) cancelAnimationFrame(prev.raf);
    const startL = el.scrollLeft;
    const startT = el.scrollTop;
    const toL = left ?? startL;
    const toT = top ?? startT;
    if (Math.abs(toL - startL) < 1 && Math.abs(toT - startT) < 1) return;
    if (reducedMotion()) {
      el.scrollLeft = toL;
      el.scrollTop = toT;
      return;
    }
    const t0 = performance.now();
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const tween = { raf: 0 };
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      el.scrollLeft = startL + (toL - startL) * ease(p);
      el.scrollTop = startT + (toT - startT) * ease(p);
      if (p < 1) tween.raf = requestAnimationFrame(frame);
      else tweens.delete(el);
    };
    tween.raf = requestAnimationFrame(frame);
    tweens.set(el, tween);
    // Background tabs pause animation frames: still land on the target.
    setTimeout(() => {
      if (tweens.get(el) !== tween) return;
      el.scrollLeft = toL;
      el.scrollTop = toT;
      tweens.delete(el);
    }, duration + 150);
  },
};

const tweens = new WeakMap();

// Play one of the animation classes from styles/animations.css ('slide-up', 'shake', ...).
// Resolves when it ends; the class is removed so it can play again.
export function animate(el, name) {
  return new Promise((resolve) => {
    if (!el) return resolve();
    const cls = `anim-${name}`;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.remove(cls);
      resolve();
    };
    el.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 700); // background tabs may never fire animationend
  });
}

// Exit animation for an element about to be removed: it keeps its end state until removed.
export function animateOut(el, name = 'fade-out') {
  return new Promise((resolve) => {
    if (!el) return resolve();
    el.classList.add(`anim-${name}`);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    el.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 400);
  });
}

// The sliding list highlight was removed: rows now show focus with their own background,
// which can't drift out of place while lists scroll or rebuild.
export const Highlight = { move() {} };
