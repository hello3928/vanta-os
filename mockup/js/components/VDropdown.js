// VDropdown: a settings row whose value opens a popup list (like Steam Deck dropdowns).
// A opens the list; up/down moves; A picks; B closes without changing anything.
// options: ['Off', 'Low', 'High'] or [{ value, label }]. Values stored in English are shown
// translated through i18n.opt(). Pass `bind` to tie it to a Settings key.

import { VComponent } from '../core/VComponent.js';
import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { FocusManager } from '../core/FocusManager.js';
import { Overlays } from '../core/Overlays.js';
import { icon } from '../core/icons.js';
import { opt } from '../core/i18n.js';
import { esc, h, afterLayout } from '../core/util.js';

class Option extends VComponent {
  constructor(label, selected) {
    super({ tag: 'button', className: `v-menu__item${selected ? ' is-selected' : ''}`, focusable: true, label, activateSound: null });
    this.el.type = 'button';
    this.el.setAttribute('role', 'option');
    this.el.setAttribute('aria-selected', String(selected));
    this.el.innerHTML = `<span class="v-menu__label">${esc(label)}</span>${selected ? icon('check', 'v-menu__check') : ''}`;
  }
}

export class VDropdown extends VComponent {
  constructor({ label, detail = '', icon: iconName, options = [], value, bind, onChange } = {}) {
    super({ className: 'v-control v-dropdown', focusable: true, label, activateSound: null, activateHaptic: null });
    this.el.setAttribute('aria-haspopup', 'listbox');
    this.options = options.map((o) => (typeof o === 'object' ? o : { value: o, label: opt(o) }));
    this.key = bind;
    this.el.innerHTML = `
      <span class="v-control__icon">${iconName ? icon(iconName) : ''}</span>
      <span class="v-control__label">${esc(label)}</span>
      <span class="v-control__detail">${esc(detail)}</span>
      <span class="v-control__trail"><span class="v-dropdown__value"><span class="v-dropdown__text"></span>${icon('expand_more', 'v-dropdown__chevron')}</span></span>`;
    this.valueEl = this.el.querySelector('.v-dropdown__text');
    if (onChange) this.on('change', onChange);
    if (bind) this.bind(bind, (v) => this.render(v));
    else this.render(value ?? this.options[0]?.value);
  }

  render(v) {
    this.value = v;
    this.valueEl.textContent = this.options.find((o) => o.value === v)?.label ?? String(v);
  }

  activate() {
    if (this.disabled) return super.activate();
    this.press();
    this.openMenu();
  }

  openMenu() {
    const layer = h('div', 'v-layer v-layer--menu');
    const backdrop = h('div', 'v-backdrop v-backdrop--clear');
    const menu = h('div', 'v-menu');
    menu.setAttribute('role', 'listbox');
    const items = this.options.map((o) => {
      const item = new Option(o.label, o.value === this.value);
      item.on('activate', () => {
        if (o.value !== this.value) {
          if (this.key) Settings.set(this.key, o.value);
          else this.render(o.value);
          this.emit('change', o.value);
        }
        Sound.play('select');
        Haptics.play('select');
        close(true);
      });
      menu.append(item.el);
      return item;
    });
    layer.append(backdrop, menu);

    // Place the list under the value (or above it near the bottom of the screen).
    const anchor = this.el.querySelector('.v-dropdown__value').getBoundingClientRect();
    const room = window.innerHeight - anchor.bottom;
    menu.style.minWidth = `${Math.max(anchor.width, 200)}px`;
    menu.style.right = `${Math.max(12, window.innerWidth - anchor.right)}px`;
    if (room < Math.min(320, this.options.length * 52 + 16)) {
      menu.style.bottom = `${window.innerHeight - anchor.top + 6}px`;
      menu.classList.add('v-menu--up');
    } else menu.style.top = `${anchor.bottom + 6}px`;

    let closed = false;
    const view = {
      el: layer,
      close: ({ silent } = {}) => close(!silent ? false : true),
    };
    const close = (picked) => {
      if (closed) return;
      closed = true;
      Overlays.remove(view);
      FocusManager.popScope(menu);
      if (!picked) Sound.play('close');
      layer.classList.remove('is-open');
      setTimeout(() => layer.remove(), 180);
      this.el.classList.remove('is-open');
    };
    backdrop.addEventListener('click', () => close(false));
    Overlays.root.append(layer);
    Overlays.open.push(view);
    Sound.play('open');
    Haptics.play('tick');
    this.el.classList.add('is-open');
    afterLayout(layer, () => layer.classList.add('is-open'));
    FocusManager.pushScope(menu, { onBack: () => close(true), initial: items.find((i) => i.el.classList.contains('is-selected')) || items[0] });
  }
}
