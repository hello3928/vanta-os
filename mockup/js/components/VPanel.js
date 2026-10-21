// VPanel: a drawer that slides in from the left (main menu) or right (quick access, game options).
// It opens its own focus scope; B or tapping outside closes it and returns focus.
// Pass `rail` (a VTabs with variant 'rail') to add the vertical icon tabs on the outer edge.

import { VComponent } from '../core/VComponent.js';
import { FocusManager } from '../core/FocusManager.js';
import { Overlays } from '../core/Overlays.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { esc, h, afterLayout } from '../core/util.js';
import { Motion } from '../core/motion.js';

export class VPanel extends VComponent {
  constructor({ title = '', subtitle = '', side = 'right', rail = null, header = null } = {}) {
    super({ className: 'v-layer' });
    const backdrop = h('div', 'v-backdrop');
    backdrop.addEventListener('click', () => this.close());
    this.panel = h('aside', `v-panel v-panel--${side}`);
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', title || 'Menu');
    const main = h('div', 'v-panel__main');
    this.head = h('header', 'v-panel__head');
    this.header = header;
    this.titleEl = h('h2', 'v-panel__title', esc(title));
    this.subEl = h('div', 'v-panel__sub', esc(subtitle));
    this.head.append(this.titleEl, this.subEl);
    if (header) this.head.append(header);
    this.side = side;
    this.body = h('div', 'v-panel__body');
    main.append(this.head, this.body);
    this.panel.append(main);
    if (rail) {
      const railEl = h('div', 'v-panel__rail');
      railEl.append(rail.el);
      this.panel.append(railEl);
    }
    this.el.append(backdrop, this.panel);
  }

  section(title) {
    this.body.append(h('div', 'v-panel__section', esc(title)));
    return this;
  }

  addItems(...items) {
    items.flat().forEach((c) => this.body.append(c.el || c));
    return this;
  }

  clear() {
    this.body.replaceChildren();
    return this;
  }

  setTitle(title, subtitle = '') {
    this.titleEl.textContent = title;
    this.subEl.textContent = subtitle;
  }

  open({ initial } = {}) {
    Overlays.add(this);
    Sound.play('open');
    Haptics.play('tick');
    afterLayout(this.el, () => this.el.classList.add('is-open'));
    this.isOpen = true;
    FocusManager.pushScope(this.panel, { onBack: () => this.close({ silent: true }), initial });
    return this;
  }

  close({ silent = false } = {}) {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (!silent) {
      Sound.play('close');
      Haptics.play('back');
    }
    Overlays.remove(this);
    FocusManager.popScope(this.panel);
    this.el.classList.remove('is-open');
    setTimeout(() => this.el.remove(), 240);
    this.emit('close');
  }
}
