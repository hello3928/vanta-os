// VSpinner: spinning wheel for short waits. size: 'sm' | 'md' | 'lg'.
// Use VProgress instead when you know how far along something is.

import { VComponent } from '../core/VComponent.js';

export class VSpinner extends VComponent {
  constructor({ size = 'md', label = 'Loading', tone = 'accent' } = {}) {
    super({ tag: 'span', className: `v-spinner v-spinner--${size} v-spinner--${tone}` });
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-label', label);
    this.el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="v-spinner__track" cx="12" cy="12" r="10"/><circle class="v-spinner__arc" cx="12" cy="12" r="10" pathLength="100"/></svg>';
  }
}
