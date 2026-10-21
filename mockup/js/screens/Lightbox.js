// Full-screen screenshot viewer. Left/right (or swipe) moves between shots, B closes.

import { VComponent } from '../core/VComponent.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Overlays } from '../core/Overlays.js';
import { Motion } from '../core/motion.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { t } from '../core/i18n.js';
import { h } from '../core/util.js';

class Viewer extends VComponent {
  constructor(lb) {
    super({ className: 'lightbox__stage', focusable: true, label: t('screenshots'), activateSound: null, activateHaptic: null });
    this.lb = lb;
  }
  handleDirection(dir) {
    if (dir === 'left' || dir === 'right') {
      this.lb.step(dir === 'right' ? 1 : -1);
      return true;
    }
    return dir === 'up' || dir === 'down';
  }
  activate() {
    this.lb.step(1);
  }
}

export function openLightbox(urls, start = 0, title = '') {
  let index = start;
  const el = h('div', 'lightbox');
  const img = h('img', 'lightbox__img');
  img.alt = title;
  const count = h('div', 'lightbox__count');
  const viewer = new Viewer(null);
  viewer.el.append(img);
  el.append(viewer.el, count, new VHintBar({ hints: [['accept', '→'], ['back', t('back')]] }).el);

  const show = (dir = 0) => {
    img.src = urls[index];
    count.textContent = `${title}  ·  ${index + 1} / ${urls.length}`;
    if (dir) Motion.play(img, [{ opacity: 0.2, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: Motion.out });
  };
  viewer.lb = {
    step(d) {
      index = (index + d + urls.length) % urls.length;
      Sound.play('move');
      Haptics.play('tick');
      show(d);
    },
  };

  let x0 = null;
  viewer.el.addEventListener('pointerdown', (e) => (x0 = e.clientX));
  viewer.el.addEventListener('pointerup', (e) => {
    if (x0 != null && Math.abs(e.clientX - x0) > 50) viewer.lb.step(e.clientX < x0 ? 1 : -1);
    x0 = null;
  });

  const view = {
    el,
    close({ silent = false } = {}) {
      if (view.closed) return;
      view.closed = true;
      Overlays.remove(view);
      FocusManager.popScope(el);
      if (!silent) Sound.play('close');
      Motion.play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      setTimeout(() => el.remove(), 210);
    },
  };
  Overlays.root.append(el);
  Overlays.open.push(view);
  show();
  Sound.play('open');
  Motion.play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: Motion.out });
  Motion.play(img, [{ transform: 'scale(0.96)' }, { transform: 'none' }], { duration: 420, easing: Motion.out });
  FocusManager.pushScope(el, { onBack: () => view.close({ silent: true }), initial: viewer });
  return view;
}
