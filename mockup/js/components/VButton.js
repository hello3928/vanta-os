// VButton: the one button used everywhere.
// variant: primary | secondary | ghost | danger    size: sm | md | lg
// Icon-only when there is no label (pass ariaLabel then).

import { VComponent } from '../core/VComponent.js';
import { icon } from '../core/icons.js';
import { esc } from '../core/util.js';

export class VButton extends VComponent {
  constructor({ label = '', icon: iconName, variant = 'secondary', size = 'md', block = false, ariaLabel, activateSound, onActivate } = {}) {
    super({
      tag: 'button',
      className: ['v-button', `v-button--${variant}`, `v-button--${size}`, !label && 'v-button--icon', block && 'v-button--block'].filter(Boolean).join(' '),
      focusable: true,
      label: ariaLabel || label,
      activateSound: activateSound ?? 'select',
    });
    this.el.type = 'button';
    this.iconName = iconName;
    this.setLabel(label);
    if (onActivate) this.on('activate', onActivate);
  }

  setLabel(label) {
    this.label = label;
    this.el.innerHTML = `${this.iconName ? icon(this.iconName) : ''}${label ? `<span class="v-button__label">${esc(label)}</span>` : ''}`;
    return this;
  }
}
