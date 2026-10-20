// VTile: a piece of art you can focus. Used for game capsules, landscape tiles and cards.
// shape: 'capsule' (2:3, default) | 'landscape' (16:9) | 'card' (16:9 with text underneath)
// Art: pass `game` + `kind` (real art with generated fallback, see js/art), or `glyph` for a shortcut.
// fit: 'cover' (default) | 'box' (retro box art: contained over a blurred copy of itself)
// Focus: lifts on a spring with a light sweep across the art.
// On touch, the first tap focuses and the second tap opens.

import { VComponent } from '../core/VComponent.js';
import { VBadge } from './VBadge.js';
import { icon } from '../core/icons.js';
import { esc, h } from '../core/util.js';
import { artImg } from '../art/index.js';

export class VTile extends VComponent {
  constructor({ title, game, kind = 'capsule', fit = 'cover', glyph, badge, shape = 'capsule', kicker = '', subtitle = '', iconGame, onActivate } = {}) {
    super({
      className: `v-tile${shape !== 'capsule' ? ` v-tile--${shape}` : ''}`,
      focusable: true,
      label: title,
      tapToFocusFirst: true,
    });
    this.el.setAttribute('role', 'button');
    this.artEl = h('div', `v-tile__art${fit === 'box' ? ' v-tile__art--box' : ''}`);
    if (game) {
      if (fit === 'box') this.artEl.append(artImg(game, kind, 'v-tile__blur'));
      this.img = this.artEl.appendChild(artImg(game, kind, 'v-tile__img'));
      this.img.alt = title;
    }
    if (glyph) this.artEl.append(h('span', 'v-tile__glyph', `${icon(glyph)}<span>${esc(title)}</span>`));
    if (badge) this.badgeHost = this.artEl.appendChild(h('span', 'v-tile__badge', new VBadge(badge).el.outerHTML));
    this.el.append(this.artEl);
    if (shape === 'card') {
      const text = h('div', 'v-tile__text');
      if (iconGame) {
        const meta = h('div', 'v-tile__meta');
        meta.append(artImg(iconGame, 'capsule', 'v-tile__icon'), h('span', '', `${esc(kicker)}`));
        text.append(meta);
      } else if (kicker) text.append(h('span', 'v-tile__kicker', esc(kicker)));
      text.append(h('span', 'v-tile__title', esc(title)));
      if (subtitle) text.append(h('span', 'v-tile__sub', esc(subtitle)));
      this.el.append(text);
    }
    if (onActivate) this.on('activate', onActivate);
  }

  setBadge(badge) {
    this.badgeHost?.remove();
    this.badgeHost = badge ? this.artEl.appendChild(h('span', 'v-tile__badge', new VBadge(badge).el.outerHTML)) : null;
  }
}
