// Launching and playing.
// Launch: the hero art pushes in and darkens, the logo settles in the centre, then the screen
// fades to black and the game takes over. In the mockup the "game" is its hero art, full screen,
// until you open the main menu (Guide/View or M) and choose Exit game.
// Real OS: vantad applies the game's profile, then gamescope starts Proton or the emulator.

import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { Settings } from '../core/Settings.js';
import { Motion } from '../core/motion.js';
import { promptGlyph } from '../components/VHintBar.js';
import { h } from '../core/util.js';
import { systemOf } from '../data.js';
import { artImg } from '../art/index.js';

export function launchGame(layer, g, done) {
  const sys = systemOf(g);
  const el = h('div', 'launch');
  const bg = artImg(g, 'hero', `launch__bg${sys ? ' is-pixel' : ''}`);
  const center = h('div', 'launch__center');
  const logo = artImg(g, 'logo', 'launch__logo');
  logo.alt = g.title;
  const status = h('div', 'launch__status', `<span class="launch__spinner"></span><span>Launching</span>`);
  center.append(logo, status);
  el.append(bg, h('div', 'launch__veil'), center);
  layer.append(el);

  Sound.play('launch');
  Haptics.play('launch');
  Motion.play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: Motion.out, fill: 'both' });
  Motion.play(bg, [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.12)', filter: 'brightness(0.35)' }], { duration: 2600, easing: Motion.out, fill: 'both' });
  Motion.play(logo, [{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'scale(1)' }], { delay: 250, duration: 900, easing: Motion.out, fill: 'both' });
  Motion.play(status, [{ opacity: 0 }, { opacity: 1 }], { delay: 700, duration: 400, fill: 'both' });

  const how = sys ? sys.emulator : 'Proton 10';
  setTimeout(() => (status.lastChild.textContent = `Starting · ${how} · ${Settings.get('tdp')} W`), 1100);
  setTimeout(() => {
    Motion.play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'both' });
    setTimeout(() => {
      el.remove();
      done();
    }, 400);
  }, 2700);
}

// The game, full screen. Returns the element so the app can remove it on exit.
export function gameView(layer, g) {
  const sys = systemOf(g);
  const el = h('div', 'ingame');
  el.append(artImg(g, 'hero', `ingame__art${sys ? ' is-pixel' : ''}`));
  const hint = h('div', 'ingame__hint', `${promptGlyph('mainMenu')}<span>Vanta menu</span>`);
  el.append(hint);
  layer.append(el);
  Motion.play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: Motion.out, fill: 'both' });
  Motion.play(hint, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: 900, duration: 500, fill: 'both' });
  setTimeout(() => Motion.play(hint, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'both' }), 5200);
  return el;
}
