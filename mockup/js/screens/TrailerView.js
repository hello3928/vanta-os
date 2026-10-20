// Full-screen trailer. Opened by pulling the Home hero down (drag, or Up from the top shelf).
// It grows out of the hero's rectangle, and the same video element keeps playing, so the music
// never restarts. B, Down, or pulling it back up returns it to the hero.

import { VButton } from '../components/VButton.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Overlays } from '../core/Overlays.js';
import { GameMusic } from '../core/GameMusic.js';
import { Motion } from '../core/motion.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { t } from '../core/i18n.js';
import { h } from '../core/util.js';
import { artImg } from '../art/index.js';

const inset = (r) => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`;

export function openTrailer(app, g, { from, home }) {
  const el = h('div', 'trailer-full');
  const still = artImg(g, 'hero', 'trailer-full__still');
  const stage = h('div', 'trailer-full__stage');
  stage.append(still);
  const shade = h('div', 'trailer-full__shade');
  const info = h('div', 'trailer-full__info');
  const logo = artImg(g, 'logo', 'trailer-full__logo');
  logo.alt = g.title;
  const actions = h('div', 'trailer-full__actions');
  const play = new VButton({ label: g.installed ? t('play') : t('install'), icon: g.installed ? 'play' : 'download', variant: 'primary', size: 'lg', activateSound: null });
  actions.append(play.el);
  const bar = h('div', 'trailer-full__bar', '<span></span>');
  info.append(logo, actions, bar);
  el.append(stage, shade, info, new VHintBar({ hints: [['accept', g.installed ? t('play') : t('install')], ['back', t('back')]] }).el);

  Overlays.root.append(el);
  GameMusic.expanded = true;
  GameMusic.attach(stage, g);
  GameMusic.select(g, { now: !GameMusic.playing });
  GameMusic.video.classList.toggle('is-visible', GameMusic.playing);

  Sound.play('open');
  Haptics.play('select');
  const r = from.getBoundingClientRect();
  Motion.play(el, [{ clipPath: inset(r) }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: 560, easing: Motion.out });
  Motion.play(info, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { delay: 220, duration: 500, easing: Motion.out, fill: 'backwards' });

  const progress = setInterval(() => {
    const v = GameMusic.video;
    if (v?.duration) bar.firstChild.style.width = `${(v.currentTime / v.duration) * 100}%`;
  }, 250);

  const view = {
    el,
    isTrailer: true,
    close({ silent = false } = {}) {
      if (view.closed) return;
      view.closed = true;
      clearInterval(progress);
      Overlays.remove(view);
      FocusManager.popScope(el);
      if (!silent) {
        Sound.play('close');
        Haptics.play('back');
      }
      const to = from.isConnected ? from.getBoundingClientRect() : r;
      Motion.play(info, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      Motion.play(el, [{ clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: inset(to) }], { duration: 480, easing: Motion.out, fill: 'forwards' });
      setTimeout(() => {
        GameMusic.expanded = false;
        if (home?.el.isConnected) GameMusic.attach(home.heroEl, g, home.shade);
        GameMusic.video?.classList.toggle('is-visible', GameMusic.showVideo && GameMusic.playing);
        el.remove();
      }, 480);
    },
  };
  play.on('activate', () => {
    view.close({ silent: true });
    app.launch(g);
  });
  Overlays.open.push(view);
  FocusManager.pushScope(el, { onBack: () => view.close({ silent: true }), initial: play });
  play.on('edge', (dir) => dir === 'down' && view.close());

  // Pull it back up to close.
  let startY = null;
  el.addEventListener('pointerdown', (e) => (startY = e.clientY));
  el.addEventListener('pointerup', (e) => {
    if (startY != null && startY - e.clientY > 80) view.close();
    startY = null;
  });
  return view;
}
