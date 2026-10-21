// First-time setup: language, Wi-Fi, controller check, profile. Picking a language switches the
// whole interface straight away. Runs on first start, or again from Settings → System.

import { VListItem } from '../components/VListItem.js';
import { VButton } from '../components/VButton.js';
import { VHintBar, promptGlyph, onPromptChange } from '../components/VHintBar.js';
import { nameField, pictureChooser } from './ProfileEditor.js';
import { FocusManager } from '../core/FocusManager.js';
import { Settings } from '../core/Settings.js';
import { Haptics } from '../core/Haptics.js';
import { Profiles } from '../core/Profiles.js';
import { Motion } from '../core/motion.js';
import { t, i18n, LANGUAGES } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { avatarEl } from '../components/avatar.js';

const STEPS = ['language', 'wifi', 'controller', 'profile', 'done'];
const NETWORKS = [
  { ssid: 'Home-5G', bars: 'wifi', secured: true },
  { ssid: 'Home-2.4G', bars: 'network_wifi_3_bar', secured: true },
  { ssid: 'Upstairs', bars: 'network_wifi_2_bar', secured: true },
  { ssid: 'CoffeeShop-Guest', bars: 'network_wifi_1_bar', secured: false },
];

export class SetupScreen {
  constructor(app, { step = 0 } = {}) {
    this.app = app;
    this.step = step;
    this.el = h('div', 'screen screen--setup');
    this.render();
  }

  enter() {
    this.focusFirst();
  }

  focusFirst() {
    const first = this.body.querySelector('.is-selected.v-focusable, .v-focusable')?.__v;
    if (first) FocusManager.focus(first, { silent: true });
  }

  go(step) {
    this.step = step;
    this.render();
    this.focusFirst();
  }

  onBack() {
    if (this.step > 0 && this.step < STEPS.length - 1) {
      this.go(this.step - 1);
      return true;
    }
    return true; // there's nothing behind setup
  }

  render() {
    const id = STEPS[this.step];
    const frame = h('div', 'setup');
    const progress = h('div', 'setup__progress');
    STEPS.slice(0, -1).forEach((_, i) => progress.append(h('span', i <= this.step ? 'is-done' : '')));
    this.head = h('div', 'setup__head');
    this.body = h('div', 'setup__body');
    this.body.dataset.highlight = '';
    this.body.dataset.focusGroup = '';
    frame.append(progress, this.head, this.body);
    this[id]();
    this.el.replaceChildren(
      frame,
      new VHintBar({
        hints: [
          ['accept', t('select')],
          ...(this.step > 0 && this.step < STEPS.length - 1 ? [['back', t('back')]] : []),
        ],
      }).el,
    );
    Motion.stagger([this.head, ...this.body.children].filter((c) => !c.classList.contains('v-highlight')), { from: 'translateY(12px)', step: 30 });
  }

  title(key, subKey) {
    const step = this.step < STEPS.length - 1 ? `<span class="setup__step">${esc(t('stepOf', { n: this.step + 1, total: STEPS.length - 1 }))}</span>` : '';
    this.head.innerHTML = `${step}<h1 class="setup__title">${esc(t(key))}</h1>${subKey ? `<p class="setup__sub">${esc(t(subKey))}</p>` : ''}`;
  }

  language() {
    this.title('setupLanguage');
    LANGUAGES.forEach((l) => {
      const item = new VListItem({ label: l.name, trail: l.code === i18n.lang ? '✓' : '' });
      if (l.code === i18n.lang) item.setSelected(true);
      // Moving over a language previews it; choosing it continues.
      item.on('focus', () => {
        if (i18n.lang === l.code) return;
        Settings.set('language', l.code);
        this.refreshText();
      });
      item.on('activate', () => {
        Settings.set('language', l.code);
        this.go(1);
      });
      this.body.append(item.el);
    });
  }

  // Re-translate the heading and hints in place, without rebuilding the list under the cursor.
  refreshText() {
    this.title('setupLanguage');
    this.el.querySelector('.v-hintbar')?.replaceWith(new VHintBar({ hints: [['accept', t('select')]] }).el);
    this.body.querySelectorAll('.v-list-item').forEach((row) => {
      const on = row.getAttribute('aria-label') === LANGUAGES.find((l) => l.code === i18n.lang).name;
      row.classList.toggle('is-selected', on);
      const v = row.querySelector('.v-control__value');
      if (v) v.textContent = on ? '✓' : '';
      else if (on) row.querySelector('.v-control__trail').innerHTML = '<span class="v-control__value">✓</span>';
    });
  }

  wifi() {
    this.title('setupWifi', 'setupWifiSub');
    NETWORKS.forEach((n) => {
      const item = new VListItem({ label: n.ssid, icon: n.bars, detail: n.secured ? t('secured') : '' });
      if (this.network === n.ssid) item.setDetail(t('connected'));
      item.on('activate', () => {
        if (this.network === n.ssid) return this.go(2);
        item.setDetail(t('connecting'));
        setTimeout(() => {
          this.network = n.ssid;
          Settings.set('wifi', true);
          this.go(2);
        }, 900);
      });
      this.body.append(item.el);
    });
    const later = new VButton({ label: t('later'), variant: 'ghost' });
    later.on('activate', () => this.go(2));
    this.body.append(h('div', 'setup__actions', ''));
    this.body.lastChild.append(later.el);
  }

  controller() {
    this.title('setupController', 'setupControllerSub');
    const pad = h('div', 'setup__pad');
    const draw = () => {
      let pads = [];
      try {
        pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
      } catch {
        /* blocked */
      }
      const name = pads[0]?.id.replace(/\(.*?\)/g, '').trim() || t('builtIn');
      pad.innerHTML = `<div class="setup__pad-name">${esc(name)}</div><div class="setup__pad-glyphs">${['accept', 'back', 'options', 'prevTab', 'nextTab', 'qam', 'mainMenu'].map((a) => promptGlyph(a)).join('')}</div>`;
    };
    draw();
    onPromptChange(() => pad.isConnected && draw());
    const test = new VListItem({ label: t('testHaptics'), icon: 'vibrate', chevron: true });
    test.on('activate', () => Haptics.play('test', { force: true }));
    const next = new VButton({ label: t('continue'), variant: 'primary' });
    next.on('activate', () => this.go(3));
    const actions = h('div', 'setup__actions');
    actions.append(next.el);
    this.body.append(pad, test.el, actions);
    // Light up the glyph of each button as it's pressed.
    this.unhook?.();
    const onKey = () => Motion.play(pad, [{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 260 });
    window.addEventListener('keydown', onKey);
    this.unhook = () => window.removeEventListener('keydown', onKey);
  }

  profile() {
    this.unhook?.();
    this.title('setupProfile', 'setupProfileSub');
    this.draft = this.draft || { name: '', color: Profiles.nextColor(), photo: null };
    const preview = h('div', 'setup__done');
    const paint = () => preview.replaceChildren(avatarEl({ ...this.draft, name: this.draft.name || t('defaultName') }, 'avatar avatar--lg'));
    paint();
    const name = nameField(this.draft.name);
    name.on('change', (v) => {
      this.draft.name = v;
      paint();
    });
    const chooser = pictureChooser(this.draft, paint);
    const next = new VButton({ label: t('continue'), variant: 'primary' });
    next.on('activate', () => this.go(4));
    const actions = h('div', 'setup__actions');
    actions.append(next.el);
    this.body.append(preview, name.el, h('div', 'setup__label', esc(t('picture'))), chooser, actions);
  }

  done() {
    this.title('setupDone', 'setupDoneSub');
    const preview = h('div', 'setup__done');
    const profile = { ...(this.draft || { color: Profiles.nextColor(), photo: null }), name: this.draft?.name || t('defaultName') };
    preview.append(avatarEl(profile, 'avatar avatar--xl'), h('div', 'profile__name', esc(profile.name)));
    const start = new VButton({ label: t('getStarted'), variant: 'primary', size: 'lg' });
    start.on('activate', () => {
      const p = Profiles.add(profile);
      Profiles.use(p.id);
      Settings.set('setupDone', true);
      this.app.go('home', {}, { replace: true });
    });
    const actions = h('div', 'setup__actions');
    actions.append(start.el);
    this.body.append(preview, actions);
  }
}
