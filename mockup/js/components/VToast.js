// VToast: short notification in the top-right corner. Not focusable; plays the notify sound.

import { VComponent } from '../core/VComponent.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { icon } from '../core/icons.js';
import { esc, afterLayout } from '../core/util.js';

let host = null;

export class VToast extends VComponent {
  static setHost(el) {
    host = el;
  }

  constructor({ text, icon: iconName = 'bell', tone = 'default' }) {
    super({ className: `v-toast v-toast--${tone}` });
    this.el.setAttribute('role', 'status');
    this.el.innerHTML = `${icon(iconName)}<span>${esc(text)}</span>`;
  }

  static show(text, { icon: iconName, tone, sound = 'notify', duration = 3200 } = {}) {
    if (!host) return;
    const t = new VToast({ text, icon: iconName, tone });
    host.append(t.el);
    if (sound) Sound.play(sound);
    Haptics.play(tone === 'bad' ? 'error' : 'notify');
    afterLayout(t.el, () => t.el.classList.add('is-in'));
    setTimeout(() => {
      t.el.classList.remove('is-in');
      setTimeout(() => t.el.remove(), 300);
    }, duration);
    return t;
  }
}
