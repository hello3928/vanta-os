// VTextField: a text input you can reach with the controller. A (or a click) starts typing;
// Enter or Esc finishes. Real OS: A opens the on-screen keyboard (Maliit or a Vanta keyboard).

import { VComponent } from '../core/VComponent.js';
import { FocusManager } from '../core/FocusManager.js';
import { esc, h } from '../core/util.js';

export class VTextField extends VComponent {
  constructor({ label, value = '', placeholder = '', maxLength = 24, hint = '', onChange } = {}) {
    super({ className: 'v-control v-field', focusable: true, label, activateSound: 'select' });
    this.el.innerHTML = `<span class="v-control__label">${esc(label)}</span><span class="v-control__detail">${esc(hint)}</span>`;
    this.input = h('input', 'v-field__input');
    Object.assign(this.input, { type: 'text', value, placeholder, maxLength, spellcheck: false, autocomplete: 'off' });
    this.input.setAttribute('aria-label', label);
    const trail = h('span', 'v-control__trail');
    trail.append(this.input);
    this.el.append(trail);
    this.input.addEventListener('input', () => this.emit('change', this.value));
    this.input.addEventListener('blur', () => this.el.classList.remove('is-typing'));
    this.input.addEventListener('focus', () => {
      this.el.classList.add('is-typing');
      if (FocusManager.current !== this) FocusManager.focus(this, { silent: true });
    });
    if (onChange) this.on('change', onChange);
  }

  get value() {
    return this.input.value;
  }

  activate(meta) {
    super.activate(meta);
    this.input.focus();
    this.input.select();
  }
}
