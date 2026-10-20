// Boot: logo on black while fonts and art warm up, then "Press any button" (browsers need a
// press before they allow sound). Pressing plays the start-up sound and rumble, then goes Home.

import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { h } from '../core/util.js';
import { mark, wordmark } from '../brand.js';

export class BootScreen {
  constructor(app, { ready } = {}) {
    this.app = app;
    this.ready = ready || Promise.resolve();
    const brand = Settings.get('brand');
    this.el = h('div', 'screen screen--boot');
    this.el.innerHTML = `
      <div class="boot__center">
        <div class="boot__mark">${mark(brand, { size: 120, color: '#ffffff' })}</div>
        <div class="boot__word">${wordmark(brand, { height: 26, color: '#ffffff' })}</div>
      </div>
      <button class="boot__prompt" type="button" disabled>Loading</button>`;
    this.prompt = this.el.querySelector('.boot__prompt');
    this.prompt.addEventListener('click', () => this.start());
    this.ready.then(() => {
      this.loaded = true;
      this.prompt.disabled = false;
      this.prompt.textContent = 'Press any button to start';
    });
  }

  enter() {
    this.prompt.focus({ preventScroll: true });
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
    this.el.classList.add('is-starting');
    setTimeout(() => this.app.go('home', {}, { replace: true }), 1500);
  }
}
