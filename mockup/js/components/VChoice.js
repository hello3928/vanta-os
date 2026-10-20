// VChoice: pick one of a few named options, shown like a compact dropdown.
// Left/right cycles, A steps forward. Pass `bind` to tie it to a Settings key.

import { VComponent } from '../core/VComponent.js';
import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { icon } from '../core/icons.js';
import { esc } from '../core/util.js';
import { Motion } from '../core/motion.js';

export class VChoice extends VComponent {
  constructor({ label, detail = '', icon: iconName, options = [], value, bind, onChange } = {}) {
    super({ className: 'v-control v-choice', focusable: true, label, activateSound: null, activateHaptic: null });
    this.options = options;
    this.key = bind;
    this.el.innerHTML = `
      <span class="v-control__icon">${iconName ? icon(iconName) : ''}</span>
      <span class="v-control__label">${esc(label)}</span>
      <span class="v-control__detail">${esc(detail)}</span>
      <span class="v-control__trail">
        <span class="v-choice__box">
          <span class="v-choice__arrow v-choice__arrow--prev">${icon('chevron')}</span>
          <span class="v-control__value"></span>
          <span class="v-choice__arrow v-choice__arrow--next">${icon('chevron')}</span>
        </span>
      </span>`;
    this.valueEl = this.el.querySelector('.v-control__value');
    this.el.querySelector('.v-choice__arrow--prev').addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycle(-1);
    });
    if (onChange) this.on('change', onChange);
    if (bind) this.bind(bind, (v) => this.render(v));
    else this.render(value ?? options[0]);
  }

  render(v) {
    this.value = v;
    this.valueEl.textContent = v;
  }

  cycle(delta) {
    const i = this.options.indexOf(this.value);
    const next = this.options[(i + delta + this.options.length) % this.options.length];
    if (this.key) Settings.set(this.key, next);
    else this.render(next);
    Sound.play('slider', { t: this.options.indexOf(next) / Math.max(1, this.options.length - 1) });
    Haptics.play('slider');
    Motion.play(this.valueEl, [{ opacity: 0, transform: `translateX(${delta * 12}px)` }, { opacity: 1, transform: 'none' }]);
    this.emit('change', next);
  }

  handleDirection(dir) {
    if (dir === 'left' || dir === 'right') {
      this.cycle(dir === 'right' ? 1 : -1);
      return true;
    }
    return false;
  }

  activate() {
    this.cycle(1);
  }
}
