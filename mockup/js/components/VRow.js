// VRow: a titled horizontal shelf. It is a focus group, so it remembers the last focused item.
// align: 'start' keeps the focused item pinned to the left edge (console style) | 'nearest'

import { VComponent } from '../core/VComponent.js';
import { esc, h } from '../core/util.js';

export class VRow extends VComponent {
  constructor({ title = '', meta = '', align = 'nearest', children = [] } = {}) {
    super({ tag: 'section', className: 'v-row' });
    this.el.dataset.focusGroup = '';
    if (title) this.el.append(h('div', 'v-row__head', `<h2 class="v-row__title">${esc(title)}</h2>${meta ? `<span class="v-row__meta">${esc(meta)}</span>` : ''}`));
    this.track = h('div', 'v-row__track');
    if (align === 'start') this.track.dataset.align = 'start';
    this.el.append(this.track);
    this.items = [];
    children.forEach((c) => this.addItem(c));
  }

  addItem(child) {
    this.items.push(child);
    this.track.append(child.el);
    return child;
  }
}
