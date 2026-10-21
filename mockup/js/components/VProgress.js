// VProgress: loading bar. Determinate (set(0..1)) or indeterminate (a moving segment).
// Optional label on the left and percentage on the right. tone: 'accent' | 'good' | 'light'.
// The fill moves with a transform, so updates are smooth and cheap.

import { VComponent } from '../core/VComponent.js';
import { esc, h } from '../core/util.js';

export class VProgress extends VComponent {
  constructor({ value = 0, indeterminate = false, label = '', showValue = true, size = 'md', tone = 'accent' } = {}) {
    super({ className: `v-progress v-progress--${size} v-progress--${tone}` });
    this.el.setAttribute('role', 'progressbar');
    this.el.setAttribute('aria-valuemin', '0');
    this.el.setAttribute('aria-valuemax', '100');
    this.head = h('div', 'v-progress__head', `<span class="v-progress__label">${esc(label)}</span><span class="v-progress__value text-mono"></span>`);
    if (!label && !showValue) this.head.hidden = true;
    this.showValue = showValue;
    this.track = h('div', 'v-progress__track', '<div class="v-progress__fill"></div>');
    this.el.append(this.head, this.track);
    this.setIndeterminate(indeterminate);
    this.set(value);
  }

  set(value) {
    this.value = Math.max(0, Math.min(1, value));
    this.el.style.setProperty('--p', this.value.toFixed(4));
    this.el.setAttribute('aria-valuenow', Math.round(this.value * 100));
    this.head.querySelector('.v-progress__value').textContent = this.showValue && !this.indeterminate ? `${Math.round(this.value * 100)}%` : '';
    return this;
  }

  setLabel(text) {
    this.head.querySelector('.v-progress__label').textContent = text;
    this.head.hidden = false;
    return this;
  }

  setIndeterminate(on) {
    this.indeterminate = on;
    this.el.classList.toggle('is-indeterminate', on);
    if (on) this.el.removeAttribute('aria-valuenow');
    return this.set(this.value ?? 0);
  }
}
