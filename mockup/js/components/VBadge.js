// VBadge: small status label. tone: default | accent | good | warn | muted. Not focusable.

import { VComponent } from '../core/VComponent.js';
import { icon } from '../core/icons.js';
import { esc } from '../core/util.js';

export class VBadge extends VComponent {
  constructor({ text = '', tone = 'default', icon: iconName } = {}) {
    super({ tag: 'span', className: `v-badge v-badge--${tone}` });
    this.el.innerHTML = `${iconName ? icon(iconName) : ''}${esc(text)}`;
  }
}
