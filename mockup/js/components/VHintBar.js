// VHintBar: button prompts along the bottom. Glyphs follow the input in use: Xbox, PlayStation,
// Nintendo or Steam Deck buttons for a controller, keycaps for the keyboard. Settings → Controllers
// can force one style. promptGlyph() is shared by anything else that shows a button.

import { VComponent } from '../core/VComponent.js';
import { Input } from '../core/Input.js';
import { Settings } from '../core/Settings.js';
import { glyph } from '../core/glyphs.js';
import { esc, h, whileConnected } from '../core/util.js';

const FORCED = { Xbox: 'xbox', PlayStation: 'ps', Nintendo: 'nintendo', 'Steam Deck': 'deck' };

export function promptGlyph(action) {
  const forced = FORCED[Settings.get('glyphs')];
  return forced ? glyph(action, 'gamepad', forced) : glyph(action, Input.device, Input.family);
}

// Re-render whenever the controller or the prompt setting changes, for as long as `el` is shown.
export function onPromptChange(fn, el) {
  whileConnected(el, (f) => Input.onDevice(f), fn);
  whileConnected(el, (f) => Settings.on('glyphs', f), fn);
}

export class VHintBar extends VComponent {
  constructor({ hints = [] } = {}) {
    super({ tag: 'footer', className: 'v-hintbar' });
    this.hints = hints;
    this.render();
    onPromptChange(() => this.render(), this.el);
  }

  render() {
    this.el.replaceChildren(...this.hints.map(([action, label]) => h('span', 'v-hint', `<span class="v-hint__glyphs">${promptGlyph(action)}</span>${esc(label)}`)));
  }
}
