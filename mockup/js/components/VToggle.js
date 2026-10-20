// VToggle: on/off setting row. Pass `bind` to tie it to a Settings key.

import { VComponent } from '../core/VComponent.js';
import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { icon } from '../core/icons.js';
import { esc } from '../core/util.js';

export class VToggle extends VComponent {
  constructor({ label, detail = '', icon: iconName, value = false, bind, onChange } = {}) {
    super({ className: 'v-control v-toggle', focusable: true, label, activateSound: null, activateHaptic: null });
    this.el.setAttribute('role', 'switch');
    this.el.innerHTML = `
      <span class="v-control__icon">${iconName ? icon(iconName) : ''}</span>
      <span class="v-control__label">${esc(label)}</span>
      <span class="v-control__detail">${esc(detail)}</span>
      <span class="v-control__trail"><span class="v-switch"></span></span>`;
    this.key = bind;
    if (onChange) this.on('change', onChange);
    if (bind) this.bind(bind, (v) => this.render(v));
    else this.render(value);
  }

  render(v) {
    this.value = !!v;
    this.el.classList.toggle('is-on', this.value);
    this.el.setAttribute('aria-checked', String(this.value));
  }

  activate(meta) {
    if (this.disabled) return super.activate(meta);
    const next = !this.value;
    // Play after the change so turning UI sounds back on is audible.
    if (this.key) Settings.set(this.key, next);
    else this.render(next);
    Sound.play(next ? 'toggleOn' : 'toggleOff');
    Haptics.play('toggle');
    this.press();
    this.emit('change', next);
  }
}
