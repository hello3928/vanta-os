// VSlider: numeric setting. Left/right steps the value while focused; drag or tap the track with a pointer.
// The tick sound rises in pitch with the value. Pass `bind` to tie it to a Settings key.

import { VComponent } from '../core/VComponent.js';
import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { icon } from '../core/icons.js';
import { esc, h } from '../core/util.js';

export class VSlider extends VComponent {
  constructor({ label, icon: iconName, min = 0, max = 100, step = 5, value = 50, unit = '%', format, bind, onChange } = {}) {
    super({ className: 'v-control v-slider', focusable: true, label, activateSound: null, activateHaptic: null });
    this.el.setAttribute('role', 'slider');
    this.el.setAttribute('aria-valuemin', min);
    this.el.setAttribute('aria-valuemax', max);
    Object.assign(this, { min, max, step, unit, key: bind });
    this.format = format || ((v) => `${v}${unit}`);
    this.el.innerHTML = `
      <span class="v-control__icon">${iconName ? icon(iconName) : ''}</span>
      <span class="v-control__label">${esc(label)}</span>
      <span class="v-control__trail"><span class="v-control__value"></span></span>`;
    this.track = h('div', 'v-slider__track', '<div class="v-slider__fill"></div><div class="v-slider__knob"><div class="v-slider__thumb"></div></div>');
    this.el.append(this.track);
    this.valueEl = this.el.querySelector('.v-control__value');
    this.track.addEventListener('pointerdown', (e) => this.drag(e));
    if (onChange) this.on('change', onChange);
    if (bind) this.bind(bind, (v) => this.render(v));
    else this.render(value);
  }

  render(v) {
    this.value = v;
    const t = (v - this.min) / (this.max - this.min);
    this.track.style.setProperty('--pos', t.toFixed(4));
    this.valueEl.textContent = this.format(v);
    this.el.setAttribute('aria-valuenow', v);
  }

  setValue(v, { feedback = true } = {}) {
    const clamped = Math.min(this.max, Math.max(this.min, Math.round(v / this.step) * this.step));
    if (clamped === this.value) {
      if (feedback) Haptics.play('slider');
      return;
    }
    if (this.key) Settings.set(this.key, clamped);
    else this.render(clamped);
    if (feedback) {
      Sound.play('slider', { t: (clamped - this.min) / (this.max - this.min) });
      Haptics.play('slider');
    }
    this.emit('change', clamped);
  }

  handleDirection(dir) {
    if (dir === 'left' || dir === 'right') {
      this.setValue(this.value + (dir === 'right' ? this.step : -this.step));
      return true;
    }
    return false;
  }

  activate() {
    /* A does nothing on a slider; the value moves with left/right. */
  }

  drag(e) {
    e.preventDefault();
    if (this.disabled) return;
    const move = (ev) => {
      const r = this.track.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      this.setValue(this.min + t * (this.max - this.min));
    };
    move(e);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
}
