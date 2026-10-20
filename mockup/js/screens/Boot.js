// Boot: the wordmark resolves out of a soft blur while art loads, then "Press any button"
// (browsers need a press before they allow sound). Pressing plays the start-up sound and rumble;
// the wordmark brightens and lifts away as Home fades up underneath.

import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { Motion } from '../core/motion.js';
import { h } from '../core/util.js';
import { wordmark } from '../brand.js';

export class BootScreen {
  constructor(app, { ready } = {}) {
    this.app = app;
    this.ready = ready || Promise.resolve();
    this.el = h('div', 'screen screen--boot');
    this.word = h('div', 'boot__word', wordmark(Settings.get('brand'), { height: 40, color: '#ffffff' }));
    this.sweep = h('div', 'boot__sweep');
    this.word.append(this.sweep);
    this.prompt = h('button', 'boot__prompt', 'Loading');
    this.prompt.type = 'button';
    this.prompt.disabled = true;
    this.prompt.addEventListener('click', () => this.start());
    this.el.append(this.word, this.prompt);
    this.ready.then(() => {
      this.loaded = true;
      this.prompt.disabled = false;
      this.prompt.textContent = 'Press any button';
      Motion.play(this.prompt, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: 'both' });
    });
  }

  enter() {
    this.prompt.focus({ preventScroll: true });
    Motion.play(this.word, [{ opacity: 0, filter: 'blur(14px)', transform: 'scale(0.96)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 1400, easing: Motion.out, fill: 'both' });
    Motion.play(this.sweep, [{ transform: 'translateX(-120%)' }, { transform: 'translateX(120%)' }], { delay: 700, duration: 1300, easing: 'ease-in-out', fill: 'both' });
  }

  onAnyInput(action) {
    if (action === 'padConnected' || action === 'padDisconnected') return false;
    this.start();
    return true;
  }

  start() {
    if (this.starting || !this.loaded) return;
    this.starting = true;
    Sound.unlock();
    Sound.play('boot');
    Haptics.play('boot');
    Motion.play(this.prompt, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'both' });
    Motion.play(this.sweep, [{ transform: 'translateX(-120%)' }, { transform: 'translateX(120%)' }], { duration: 900, easing: 'ease-in-out', fill: 'both' });
    Motion.play(this.word, [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 1, transform: 'scale(1.02)', offset: 0.55 }, { opacity: 0, transform: 'scale(1.08)', filter: 'blur(6px)' }], { delay: 500, duration: 900, easing: Motion.out, fill: 'both' });
    setTimeout(() => this.app.go('home', {}, { replace: true, transition: 'boot' }), 1250);
  }
}
