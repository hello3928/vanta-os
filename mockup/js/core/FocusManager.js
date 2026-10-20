// Spatial focus navigation for controller and keyboard.
// - Scopes form a stack: the screen is the root scope, and panels and dialogs push their own.
// - Moving picks the nearest focusable element in that direction.
// - Each [data-focus-group] (a row, a list) remembers its last focused item, so going back
//   into a row returns you to where you were, like on a console.

import { reducedMotion } from './util.js';

function gap(a1, a2, b1, b2) {
  if (b2 < a1) return a1 - b2;
  if (b1 > a2) return b1 - a2;
  return 0;
}

export const FocusManager = {
  current: null,
  scopes: [],

  get scope() {
    return this.scopes[this.scopes.length - 1];
  },

  setRoot(el, { onBack } = {}) {
    this.current?.onBlur();
    this.current = null;
    this.scopes = [{ el, onBack, memory: new WeakMap(), prev: null }];
  },

  pushScope(el, { onBack, initial } = {}) {
    this.scopes.push({ el, onBack, memory: new WeakMap(), prev: this.current });
    this.current?.onBlur();
    this.current = null;
    this.focusFirst(initial);
  },

  popScope(el) {
    const i = this.scopes.findIndex((s) => s.el === el);
    if (i <= 0) return;
    const wasTop = i === this.scopes.length - 1;
    const [s] = this.scopes.splice(i, 1);
    if (!wasTop) return;
    this.current?.onBlur();
    this.current = null;
    if (s.prev?.el.isConnected) this.focus(s.prev, { silent: true });
    else this.focusFirst();
  },

  inScope(comp) {
    return !!this.scope?.el.contains(comp.el);
  },

  focusables(root = this.scope?.el) {
    if (!root) return [];
    return [...root.querySelectorAll('.v-focusable')].filter((el) => el.__v && el.getClientRects().length);
  },

  focusFirst(initial) {
    const target = initial && initial.el.isConnected ? initial : this.focusables()[0]?.__v;
    if (target) this.focus(target, { silent: true });
  },

  focus(comp, { silent = false } = {}) {
    if (!comp || comp === this.current) return;
    this.current?.onBlur();
    this.current = comp;
    comp.onFocus({ silent });
    try {
      comp.el.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
    this.reveal(comp.el);
    const group = comp.el.closest('[data-focus-group]');
    if (group && this.scope) this.scope.memory.set(group, comp);
  },

  reveal(el) {
    const behavior = reducedMotion() ? 'auto' : 'smooth';
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
    const track = el.closest('[data-align="start"]');
    if (track) {
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      track.scrollTo({ left: Math.max(0, el.offsetLeft - pad), behavior });
    }
  },

  move(dir) {
    const cur = this.current;
    if (cur && cur.el.isConnected && cur.handleDirection(dir)) return;
    const list = this.focusables();
    if (!cur || !list.includes(cur.el)) {
      this.focusFirst();
      return;
    }
    // A container can send a direction to a specific group: data-nav-down=".hero-actions".
    const routed = cur.el.closest(`[data-nav-${dir}]`)?.getAttribute(`data-nav-${dir}`);
    const target = routed && this.scope.el.querySelector(routed);
    if (target && !target.contains(cur.el)) {
      const remembered = this.scope.memory.get(target);
      const pick = remembered?.el.isConnected ? remembered.el : list.find((el) => target.contains(el));
      if (pick) {
        this.focus(pick.__v);
        return;
      }
    }
    const r = cur.el.getBoundingClientRect();
    const tolX = r.width * 0.2;
    const tolY = r.height * 0.2;
    const rcx = (r.left + r.right) / 2;
    const rcy = (r.top + r.bottom) / 2;
    let best = null;
    let bestScore = Infinity;

    for (const el of list) {
      if (el === cur.el) continue;
      const c = el.getBoundingClientRect();
      const ccx = (c.left + c.right) / 2;
      const ccy = (c.top + c.bottom) / 2;
      let primary;
      let secondary;
      if (dir === 'right') {
        if (c.left < r.right - tolX || ccx <= rcx) continue;
        primary = Math.max(0, c.left - r.right);
        secondary = gap(r.top, r.bottom, c.top, c.bottom) + Math.abs(ccy - rcy) * 0.1;
      } else if (dir === 'left') {
        if (c.right > r.left + tolX || ccx >= rcx) continue;
        primary = Math.max(0, r.left - c.right);
        secondary = gap(r.top, r.bottom, c.top, c.bottom) + Math.abs(ccy - rcy) * 0.1;
      } else if (dir === 'down') {
        if (c.top < r.bottom - tolY || ccy <= rcy) continue;
        primary = Math.max(0, c.top - r.bottom);
        secondary = gap(r.left, r.right, c.left, c.right) + Math.abs(ccx - rcx) * 0.1;
      } else {
        if (c.bottom > r.top + tolY || ccy >= rcy) continue;
        primary = Math.max(0, r.top - c.bottom);
        secondary = gap(r.left, r.right, c.left, c.right) + Math.abs(ccx - rcx) * 0.1;
      }
      const score = primary + secondary * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (!best) {
      cur.emit('edge', dir);
      return;
    }

    // Entering a different group: return to the item remembered there.
    const group = best.closest('[data-focus-group]');
    if (group && !group.contains(cur.el)) {
      const remembered = this.scope.memory.get(group);
      if (remembered?.el.isConnected && list.includes(remembered.el)) best = remembered.el;
    }
    this.focus(best.__v);
  },

  accept() {
    this.current?.activate();
  },

  back() {
    if (this.current?.handleBack?.()) return;
    this.scope?.onBack?.();
  },
};
