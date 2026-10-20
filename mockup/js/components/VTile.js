// VTile: a piece of art you can focus. Used for game capsules, landscape tiles and news cards.
// shape: 'capsule' (2:3, default) | 'landscape' (16:9) | 'card' (16:9 with text underneath)
// Pass `image` (a URL) for art, or `glyph` (an icon name) plus `title` for a shortcut tile.
// On touch, the first tap focuses and the second tap opens.

import { VComponent } from '../core/VComponent.js';
import { VBadge } from './VBadge.js';
import { icon } from '../core/icons.js';
import { esc, h } from '../core/util.js';

export class VTile extends VComponent {
  constructor({ title, image, glyph, badge, shape = 'capsule', kicker = '', subtitle = '', onActivate } = {}) {
    super({
      className: `v-tile${shape !== 'capsule' ? ` v-tile--${shape}` : ''}`,
      focusable: true,
      label: title,
      tapToFocusFirst: true,
    });
    this.el.setAttribute('role', 'button');
    this.artEl = h('div', 'v-tile__art');
    if (image) this.setImage(image, title);
    if (glyph) this.artEl.append(h('span', 'v-tile__glyph', `${icon(glyph)}<span>${esc(title)}</span>`));
    if (badge) this.artEl.append(h('span', 'v-tile__badge', new VBadge(badge).el.outerHTML));
    this.el.append(this.artEl);
    if (shape === 'card') {
      this.el.append(
        h(
          'div',
          'v-tile__text',
          `${kicker ? `<span class="v-tile__kicker">${esc(kicker)}</span>` : ''}<span class="v-tile__title">${esc(title)}</span>${subtitle ? `<span class="v-tile__sub">${esc(subtitle)}</span>` : ''}`,
        ),
      );
    }
    if (onActivate) this.on('activate', onActivate);
  }

  setImage(src, alt = '') {
    let img = this.artEl.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.decoding = 'async';
      this.artEl.prepend(img);
    }
    img.alt = alt;
    img.src = src;
  }
}
