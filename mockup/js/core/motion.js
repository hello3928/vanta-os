// Motion system. One spring drives focus, drawers and value changes, so everything moves
// with the same physical feel. Real OS: the same constants go into QML SpringAnimation.

import { reducedMotion } from './util.js';

// Simulates a damped spring and turns it into a CSS linear() easing.
function springCurve({ stiffness = 210, damping = 21, mass = 1, samples = 48 } = {}) {
  const dt = 1 / 240;
  let x = 0;
  let v = 0;
  const points = [];
  let t = 0;
  while (t < 3) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    t += dt;
    points.push(x);
    if (t > 0.25 && Math.abs(x - 1) < 0.0008 && Math.abs(v) < 0.01) break;
  }
  const duration = Math.round(t * 1000);
  const step = Math.max(1, Math.floor(points.length / samples));
  const values = [0];
  for (let i = step; i < points.length; i += step) values.push(+points[i].toFixed(4));
  values.push(1);
  return { easing: `linear(${values.join(', ')})`, duration };
}

export const Motion = {
  spring: 'cubic-bezier(0.3, 1.35, 0.5, 1)',
  springSoft: 'cubic-bezier(0.25, 1.1, 0.4, 1)',
  springMs: 420,
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',

  init() {
    if (!CSS.supports('transition-timing-function', 'linear(0, 1)')) return;
    const snappy = springCurve({ stiffness: 260, damping: 22 });
    const soft = springCurve({ stiffness: 170, damping: 24 });
    this.spring = snappy.easing;
    this.springSoft = soft.easing;
    this.springMs = snappy.duration;
    const root = document.documentElement.style;
    root.setProperty('--spring', snappy.easing);
    root.setProperty('--spring-soft', soft.easing);
    root.setProperty('--d-spring', `${snappy.duration}ms`);
  },

  // Web Animations helper that respects reduced motion.
  play(el, keyframes, opts = {}) {
    if (!el?.animate) return null;
    if (reducedMotion()) return el.animate(keyframes, { duration: 1, fill: opts.fill });
    return el.animate(keyframes, { duration: this.springMs, easing: this.spring, ...opts });
  },

  // Staggered entrance for a list of elements.
  stagger(els, { from = 'translateY(10px)', step = 22, max = 14, delay = 0, duration } = {}) {
    [...els].slice(0, max).forEach((el, i) =>
      this.play(el, [{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], {
        delay: delay + i * step,
        fill: 'backwards',
        ...(duration ? { duration } : {}),
      }),
    );
  },

  // Eased scrolling (consistent across browsers, unlike scroll-behavior: smooth).
  scrollTo(el, { left, top }, duration = 460) {
    const tween = tweens.get(el);
    if (tween) cancelAnimationFrame(tween);
    const startL = el.scrollLeft;
    const startT = el.scrollTop;
    const dl = (left ?? startL) - startL;
    const dtp = (top ?? startT) - startT;
    if (!dl && !dtp) return;
    if (reducedMotion()) {
      el.scrollLeft = startL + dl;
      el.scrollTop = startT + dtp;
      return;
    }
    const t0 = performance.now();
    const ease = (p) => 1 - Math.pow(1 - p, 4);
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      el.scrollLeft = startL + dl * ease(p);
      el.scrollTop = startT + dtp * ease(p);
      if (p < 1) tweens.set(el, requestAnimationFrame(frame));
      else tweens.delete(el);
    };
    tweens.set(el, requestAnimationFrame(frame));
    // Background tabs pause animation frames: make sure we still land on the target.
    setTimeout(() => {
      if (tweens.has(el)) return;
      el.scrollLeft = startL + dl;
      el.scrollTop = startT + dtp;
    }, duration + 120);
  },
};

const tweens = new WeakMap();

// Sliding highlight for lists: one pill that glides between rows, like console settings menus.
// Any container with [data-highlight] gets it for its .v-control rows.
export const Highlight = {
  move(el) {
    document.querySelectorAll('.v-highlight.is-active').forEach((hl) => {
      if (!hl.parentElement.contains(el)) hl.classList.remove('is-active');
    });
    const host = el.closest('[data-highlight]');
    if (!host || !el.classList.contains('v-control')) return;
    let hl = [...host.children].find((c) => c.classList.contains('v-highlight'));
    const fresh = !hl;
    if (fresh) {
      hl = document.createElement('div');
      hl.className = 'v-highlight';
      host.prepend(hl);
    }
    const box = el.getBoundingClientRect();
    const hostBox = host.getBoundingClientRect();
    const x = box.left - hostBox.left + host.scrollLeft;
    const y = box.top - hostBox.top + host.scrollTop;
    if (fresh) hl.style.transition = 'none';
    hl.style.transform = `translate(${x}px, ${y}px)`;
    hl.style.width = `${box.width}px`;
    hl.style.height = `${box.height}px`;
    hl.classList.add('is-active');
    if (fresh) {
      void hl.offsetWidth;
      hl.style.transition = '';
    }
  },
};
