// The end of first-time setup: the logo draws itself in with the welcome jingle, then a short
// tour of Home points at each area with the right button for your controller.
// The tour can be skipped with B and shown again from Settings > System.

import { VButton } from '../components/VButton.js';
import { promptGlyph } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Overlays } from '../core/Overlays.js';
import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { t } from '../core/i18n.js';
import { esc, h, afterLayout } from '../core/util.js';
import { mark } from '../brand.js';

// Logo moment: about two seconds, then resolves.
export function playWelcome(layer) {
  return new Promise((resolve) => {
    const el = h('div', 'welcome');
    el.innerHTML = mark('orbit', { size: 132, color: '#ffffff', className: 'logo-draw' });
    layer.append(el);
    afterLayout(el, () => el.classList.add('is-in'));
    setTimeout(() => {
      Sound.play('welcome');
      Haptics.play('notify');
    }, 150);
    setTimeout(() => {
      el.classList.remove('is-in');
      el.classList.add('is-out');
      setTimeout(() => {
        el.remove();
        resolve();
      }, 450);
    }, 2300);
  });
}

// Each step points at an element on Home (or the centre of the screen) and names its button.
const STEPS = [
  { target: () => document.querySelector('.screen--home .v-row'), title: 'tourGamesTitle', body: 'tourGames' },
  { target: () => document.querySelector('.screen--home .home__widgets'), title: 'tourWidgetsTitle', body: 'tourWidgets' },
  { target: () => document.querySelector('#shell .v-topbar__status'), title: 'tourTopTitle', body: 'tourTop' },
  { target: null, title: 'tourMenuTitle', body: 'tourMenu' },
  { target: null, title: 'tourQamTitle', body: 'tourQam' },
  { target: null, title: 'tourTrailerTitle', body: 'tourTrailer' },
];

// "Press {qam} for ..." with the controller's glyph in place of {action}.
function withGlyphs(text) {
  return esc(text).replace(/\{(\w+)\}/g, (_, action) => `<span class="tour__glyph">${promptGlyph(action)}</span>`);
}

export function startTour(app) {
  Overlays.closeAll();
  const layer = h('div', 'v-layer tour');
  const spot = h('div', 'tour__spot');
  const card = h('div', 'tour__card');
  card.setAttribute('role', 'dialog');
  layer.append(spot, card);
  const view = { el: layer, close: () => finish() };
  Overlays.add(view);
  let i = 0;
  let closed = false;

  const finish = () => {
    if (closed) return;
    closed = true;
    Settings.set('tourDone', true);
    Overlays.remove(view);
    FocusManager.popScope(card);
    layer.classList.remove('is-open');
    setTimeout(() => layer.remove(), 220);
  };

  const show = () => {
    const step = STEPS[i];
    const el = step.target?.();
    el?.scrollIntoView({ block: 'nearest' });
    requestAnimationFrame(() => {
      const r = el?.getBoundingClientRect();
      layer.classList.toggle('is-centred', !r);
      if (r) {
        const pad = 10;
        // Kept inside the screen, so full-width rows still read as a box.
        const left = Math.max(12, r.left - pad);
        const right = Math.min(window.innerWidth - 12, r.right + pad);
        Object.assign(spot.style, { left: `${left}px`, top: `${r.top - pad}px`, width: `${right - left}px`, height: `${r.height + pad * 2}px` });
        // Card below the target if it fits, otherwise above it.
        const below = r.bottom + pad + 16;
        const fits = below + 200 < window.innerHeight;
        card.style.left = `${Math.min(Math.max(16, r.left), window.innerWidth - 400)}px`;
        card.style.top = fits ? `${below}px` : '';
        card.style.bottom = fits ? '' : `${window.innerHeight - r.top + pad + 16}px`;
      } else {
        Object.assign(spot.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
        Object.assign(card.style, { left: '', top: '', bottom: '' });
      }
    });
    const last = i === STEPS.length - 1;
    const next = new VButton({ label: last ? t('done') : t('next'), variant: 'primary', onActivate: () => (last ? finish() : go(1)) });
    const skip = new VButton({ label: t('skip'), variant: 'ghost', onActivate: finish });
    const actions = h('div', 'tour__actions');
    actions.append(...(last ? [] : [skip.el]), next.el);
    card.replaceChildren(
      h('span', 'tour__step', esc(t('tourStep', { n: i + 1, total: STEPS.length }))),
      h('h2', 'tour__title', esc(t(step.title))),
      h('p', 'tour__body', withGlyphs(t(step.body))),
      actions,
    );
    FocusManager.popScope(card);
    FocusManager.pushScope(card, { onBack: finish, initial: next });
  };
  const go = (d) => {
    i += d;
    Sound.play('tab');
    show();
  };

  afterLayout(layer, () => layer.classList.add('is-open'));
  show();
}
