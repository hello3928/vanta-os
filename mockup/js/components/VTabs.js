// VTabs: a row of tabs. A selects; LB/RB (or [ and ]) step through them via step().
// variant: 'line' (underline) | 'chips' (small filters) | 'rail' (vertical icons, label as tooltip)

import { VComponent } from '../core/VComponent.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { icon } from '../core/icons.js';
import { esc, h } from '../core/util.js';
import { promptGlyph, onPromptChange } from './VHintBar.js';

class VTab extends VComponent {
  constructor({ id, label, icon: iconName }, iconOnly = false) {
    super({ tag: 'button', className: 'v-tab', focusable: true, label, focusSound: 'tab', activateSound: 'tab', activateHaptic: 'tick' });
    this.el.type = 'button';
    this.el.setAttribute('role', 'tab');
    this.id = id;
    this.el.innerHTML = `${iconName ? icon(iconName) : ''}${iconOnly ? '' : esc(label)}`;
  }
}

export class VTabs extends VComponent {
  constructor({ tabs = [], value, variant = 'line', bumpers = false, onChange } = {}) {
    super({ className: `v-tabs v-tabs--${variant}` });
    this.el.setAttribute('role', 'tablist');
    this.el.dataset.focusGroup = '';
    this.value = value === undefined ? tabs[0]?.id : value;
    this.tabs = tabs.map((t) => {
      const tab = new VTab(t, variant === 'rail');
      if (variant === 'rail') tab.el.title = t.label;
      tab.on('activate', () => this.select(t.id));
      return tab;
    });
    const lb = bumpers && h('span', 'v-tabs__bumper');
    const rb = bumpers && h('span', 'v-tabs__bumper');
    if (lb) this.el.append(lb);
    this.tabs.forEach((t) => this.el.append(t.el));
    if (rb) {
      this.el.append(rb);
      const draw = () => {
        lb.innerHTML = promptGlyph('prevTab');
        rb.innerHTML = promptGlyph('nextTab');
      };
      draw();
      onPromptChange(draw, this.el);
    }
    if (onChange) this.on('change', onChange);
    this.sync();
  }

  get activeTab() {
    return this.tabs.find((t) => t.id === this.value);
  }

  select(id, { silent = true } = {}) {
    if (id === this.value) return;
    this.value = id;
    this.sync();
    if (!silent) {
      Sound.play('tab');
      Haptics.play('tick');
    }
    this.emit('change', id);
  }

  step(delta) {
    const i = this.tabs.findIndex((t) => t.id === this.value);
    const next = this.tabs[(i + delta + this.tabs.length) % this.tabs.length];
    this.select(next.id, { silent: false });
  }

  sync() {
    this.tabs.forEach((t) => {
      t.el.classList.toggle('is-active', t.id === this.value);
      t.el.setAttribute('aria-selected', String(t.id === this.value));
    });
  }
}
