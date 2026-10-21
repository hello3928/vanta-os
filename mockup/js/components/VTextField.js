// VTextField: a text row. A (or a click) opens the on-screen keyboard; the row updates as you type.
// password: true shows dots. Real OS: the same, with vantad's keyboard instead of VKeyboard.js.

import { VComponent } from '../core/VComponent.js';
import { Keyboard } from './VKeyboard.js';
import { icon } from '../core/icons.js';
import { esc, h } from '../core/util.js';

export class VTextField extends VComponent {
  constructor({ label, value = '', placeholder = '', maxLength = 24, hint = '', password = false, icon: iconName, onChange, onDone } = {}) {
    super({ className: `v-control v-field${password ? ' v-field--password' : ''}`, focusable: true, label, activateSound: null });
    this.el.innerHTML = `
      <span class="v-control__icon">${iconName ? icon(iconName) : ''}</span>
      <span class="v-control__label">${esc(label)}</span>
      <span class="v-control__detail">${esc(hint)}</span>`;
    this.box = h('span', 'v-field__box');
    const trail = h('span', 'v-control__trail');
    trail.append(this.box);
    this.el.append(trail);
    Object.assign(this, { label, placeholder, maxLength, password, text: value });
    if (onChange) this.on('change', onChange);
    if (onDone) this.on('done', onDone);
    this.paint();
  }

  get value() {
    return this.text;
  }

  set value(v) {
    this.text = v;
    this.paint();
  }

  paint() {
    const shown = this.password ? '•'.repeat(this.text.length) : this.text;
    this.box.classList.toggle('is-empty', !shown);
    this.box.textContent = shown || this.placeholder;
  }

  activate(meta) {
    if (this.disabled) return super.activate(meta);
    this.press();
    this.el.classList.add('is-typing');
    Keyboard.open({
      label: this.label,
      value: this.text,
      password: this.password,
      maxLength: this.maxLength,
      onInput: (text) => {
        this.value = text;
        this.emit('change', text);
      },
      onDone: (text) => {
        this.el.classList.remove('is-typing');
        this.value = text;
        this.emit('done', text);
      },
    });
  }
}
