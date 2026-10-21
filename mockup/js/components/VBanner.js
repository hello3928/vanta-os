// VBanner: an inline message inside a page or panel (not a popup).
// tone: 'error' | 'warning' | 'info' | 'success'. Optional action button.

import { VComponent } from '../core/VComponent.js';
import { VButton } from './VButton.js';
import { icon } from '../core/icons.js';
import { esc, h } from '../core/util.js';

const ICONS = { error: 'error', warning: 'warning', info: 'info', success: 'check_circle' };

export class VBanner extends VComponent {
  constructor({ tone = 'info', title = '', message = '', action, onAction } = {}) {
    super({ className: `v-banner v-banner--${tone}` });
    this.el.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    const text = h('div', 'v-banner__text', `${title ? `<strong>${esc(title)}</strong>` : ''}${message ? `<span>${esc(message)}</span>` : ''}`);
    this.el.append(h('span', 'v-banner__icon', icon(ICONS[tone])), text);
    if (action) {
      this.button = new VButton({ label: action, size: 'sm', variant: 'secondary', onActivate: onAction });
      this.el.append(this.button.el);
    }
  }
}
