// Game launch transition. Real OS: vantad applies the game's profile, then gamescope starts
// Steam/Proton or the emulator. Here it plays the launch sound and rumble, then returns.

import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { Settings } from '../core/Settings.js';
import { VToast } from '../components/VToast.js';
import { esc, h, afterLayout } from '../core/util.js';
import { systemOf } from '../data.js';
import { hero, logo } from '../art/index.js';

export function launchGame(layer, g, done) {
  const sys = systemOf(g);
  const how = sys ? sys.emulator : 'Proton 10';
  const el = h(
    'div',
    'launch',
    `<img class="launch__bg" alt="" src="${hero(g)}">
     <div class="launch__center">
       <img class="launch__logo" alt="${esc(g.title)}" src="${logo(g)}">
       <div class="launch__status"><span class="launch__spinner"></span>${esc(g.installed ? `Starting · ${how} · ${Settings.get('tdp')} W` : 'Mockup: downloads are simulated')}</div>
     </div>`,
  );
  layer.append(el);
  Sound.play('launch');
  Haptics.play('launch');
  afterLayout(el, () => el.classList.add('is-in'));
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => {
      el.remove();
      done();
      VToast.show(g.installed ? `Mockup: ${g.title} would be running now` : `Mockup: ${g.title} would download now`, { icon: g.installed ? 'play' : 'download' });
    }, 300);
  }, 2600);
}
