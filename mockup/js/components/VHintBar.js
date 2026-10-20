// VHintBar: button prompts along the bottom. Glyphs follow the input in use: Xbox, PlayStation,
// Nintendo or Steam Deck buttons for a controller, keycaps for the keyboard. Settings → Controllers
// can force one style. promptGlyph() is shared by anything else that shows a button.

import { VComponent } from '../core/VComponent.js';
import { Input } from '../core/Input.js';
import { Settings } from '../core/Settings.js';
import { glyph } from '../core/glyphs.js';
import { esc, h } from '../core/util.js';

const FORCED = { Xbox: 'xbox', PlayStation: 'ps', Nintendo: 'nintendo', 'Steam Deck': 'deck' };

export function promptGlyph(action) {
  const forced = FORCED[Settings.get('glyphs')];
  return forced ? glyph(action, 'gamepad', forced) : glyph(action, Input.device, Input.family);
}

// Re-render callbacks whenever the controller or the prompt setting changes.
export function onPromptChange(fn) {
  Input.onDevice(fn);
  Settings.on('glyphs', fn);
}

export class VHintBar extends VComponent {
  constructor({ hints = [] } = {}) {
    super({ tag: 'footer', className: 'v-hintbar' });
    this.hints = hints;
    this.render();
    onPromptChange(() => this.el.isConnected && this.render());
  }

  render() {
    this.el.replaceChildren(...this.hints.map(([action, label]) => h('span', 'v-hint', `<span class="v-hint__glyphs">${promptGlyph(action)}</span>${esc(label)}`)));
  }
}
