// VHintBar: button prompts along the bottom. Glyphs switch between controller and keyboard
// depending on what was used last.

import { VComponent } from '../core/VComponent.js';
import { Input } from '../core/Input.js';
import { esc, h } from '../core/util.js';

const GLYPHS = {
  gamepad: { accept: 'A', back: 'B', options: 'X', qam: '☰', mainMenu: '⧉', tabs: 'LB RB' },
  keyboard: { accept: 'Enter', back: 'Esc', options: 'X', qam: 'Q', mainMenu: 'M', tabs: '[ ]' },
};

export class VHintBar extends VComponent {
  constructor({ hints = [] } = {}) {
    super({ tag: 'footer', className: 'v-hintbar' });
    this.hints = hints;
    this.render();
    Input.onDevice(() => this.el.isConnected && this.render());
  }

  render() {
    const g = GLYPHS[Input.device === 'gamepad' ? 'gamepad' : 'keyboard'];
    this.el.replaceChildren(
      ...this.hints.map(([action, label]) => h('span', 'v-hint', `<span class="v-hint__btn">${esc(g[action] || action)}</span>${esc(label)}`)),
    );
  }
}
