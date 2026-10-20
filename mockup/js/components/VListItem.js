// VListItem: a row in a list or menu. Optional detail line, trailing badge, chevron.

import { VComponent } from '../core/VComponent.js';
import { VBadge } from './VBadge.js';
import { icon } from '../core/icons.js';
import { esc } from '../core/util.js';

export class VListItem extends VComponent {
  constructor({ label, detail = '', icon: iconName, badge, chevron = false, trail = '', onActivate } = {}) {
    super({ className: 'v-control v-list-item', focusable: true, label });
    this.el.innerHTML = `
      <span class="v-control__icon">${iconName ? icon(iconName) : ''}</span>
      <span class="v-control__label">${esc(label)}</span>
      <span class="v-control__detail">${esc(detail)}</span>
      <span class="v-control__trail">${trail ? `<span class="v-control__value">${esc(trail)}</span>` : ''}${badge ? new VBadge(badge).el.outerHTML : ''}${chevron ? icon('chevron', 'v-chevron') : ''}</span>`;
    if (onActivate) this.on('activate', onActivate);
  }

  setSelected(v) {
    this.el.classList.toggle('is-selected', v);
    return this;
  }

  setDetail(text) {
    this.el.querySelector('.v-control__detail').textContent = text;
  }
}
