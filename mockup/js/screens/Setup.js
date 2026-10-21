// First-time setup. Two columns, as on PS5: the step title on the left, the choices on the right.
// Steps: language, network (password on the on-screen keyboard), system and Steam updates, sign-in
// (Steam and/or a Vanta account), controller, profile, done. Updates come before sign-in because
// the preinstalled Steam client has to be current before it can sign in.
// Picking a language switches the whole interface straight away. Runs on first start, or again
// from Settings → System.

import { VListItem } from '../components/VListItem.js';
import { VButton } from '../components/VButton.js';
import { VSpinner } from '../components/VSpinner.js';
import { VProgress } from '../components/VProgress.js';
import { VAlert } from '../components/VAlert.js';
import { Keyboard } from '../components/VKeyboard.js';
import { promptGlyph, onPromptChange } from '../components/VHintBar.js';
import { nameField, pictureChooser } from './ProfileEditor.js';
import { FocusManager } from '../core/FocusManager.js';
import { Settings } from '../core/Settings.js';
import { Haptics } from '../core/Haptics.js';
import { Sound } from '../core/Sound.js';
import { Profiles } from '../core/Profiles.js';
import { animate } from '../core/motion.js';
import { icon } from '../core/icons.js';
import { t, i18n, LANGUAGES } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { avatarEl } from '../components/avatar.js';
import { steamSignIn, vantaSignIn } from './Accounts.js';

const STEPS = ['language', 'network', 'updates', 'account', 'controller', 'profile', 'done'];
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
    this.timers = [];
    this.el = h('div', 'screen screen--setup');
    this.render();
  }

  enter() {
    this.focusFirst();
  }

  destroy() {
    this.clearTimers();
    this.stopSignIn?.();
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  later(fn, ms) {
    this.timers.push(setTimeout(fn, ms));
  }

  focusFirst() {
    const first = this.body.querySelector('.is-selected.v-focusable, .v-focusable')?.__v;
    if (first) FocusManager.focus(first, { silent: true });
  }

  go(step) {
    this.clearTimers();
    this.stopSignIn?.();
    this.stopSignIn = null;
    this.accountView = 'choose';
    this.unhook?.();
    this.unhook = null;
    const forward = step > this.step;
    this.step = step;
    this.render(forward ? 'slide-left' : 'slide-right');
    this.focusFirst();
  }

  onBack() {
    if (this.busy) return true;
    if (STEPS[this.step] === 'account' && this.accountView !== 'choose') {
      this.showAccounts();
      return true;
    }
    if (this.canGoBack()) this.go(this.step - 1);
    return true; // there's nothing behind setup
  }

  // Once updates are installed there's no going back past them.
  canGoBack() {
    const id = STEPS[this.step];
    return this.step > 0 && id !== 'updates' && id !== 'done' && STEPS[this.step - 1] !== 'updates';
  }

  hints() {
    const id = STEPS[this.step];
    const canGoBack = this.canGoBack() || (id === 'account' && this.accountView !== 'choose');
    return [['accept', t('select')], ...(canGoBack ? [['back', t('back')]] : [])];
  }

  render(anim) {
    const id = STEPS[this.step];
    const frame = h('div', 'setup');
    const aside = h('div', 'setup__aside');
    this.head = h('div', 'setup__head');
    const progress = h('div', 'setup__progress');
    progress.setAttribute('aria-hidden', 'true');
    STEPS.slice(0, -1).forEach((_, i) => progress.append(h('span', i < this.step ? 'is-done' : i === this.step ? 'is-current' : '')));
    aside.append(this.head, progress);
    this.body = h('div', 'setup__body');
    this.body.dataset.focusGroup = '';
    frame.append(aside, this.body);
    this[id]();
    this.el.replaceChildren(frame);
    this.shell = { topbar: false, hints: this.hints() };
    if (this.app.screen === this) this.app.setHints(this.shell.hints);
    if (anim) {
      animate(this.head, 'fade-in');
      animate(this.body, anim);
    }
  }

  title(key, subKey) {
    const last = STEPS.length - 1;
    const step = this.step < last ? `<span class="setup__step">${esc(t('stepOf', { n: this.step + 1, total: last }))}</span>` : '';
    this.head.innerHTML = `${step}<h1 class="setup__title">${esc(t(key))}</h1>${subKey ? `<p class="setup__sub">${esc(t(subKey))}</p>` : ''}`;
  }

  actions(...buttons) {
    const row = h('div', 'setup__actions');
    buttons.forEach((b) => row.append(b.el));
    this.body.append(row);
  }

  // ---------- 1. Language ----------
  language() {
    this.title('setupLanguage', 'setupLanguageSub');
    LANGUAGES.forEach((l) => {
      const item = new VListItem({ label: l.name });
      item.el.dataset.lang = l.code;
      item.el.querySelector('.v-control__trail').innerHTML = icon('check', 'setup__check');
      item.setSelected(l.code === i18n.lang);
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
    this.title('setupLanguage', 'setupLanguageSub');
    this.app.setHints(this.hints());
    this.body.querySelectorAll('.v-list-item').forEach((row) => row.classList.toggle('is-selected', row.dataset.lang === i18n.lang));
  }

  // ---------- 2. Network ----------
  network() {
    this.title('setupNetwork', 'setupNetworkSub');
    NETWORKS.forEach((n) => {
      const item = new VListItem({ label: n.ssid, icon: n.bars, detail: n.secured ? t('secured') : t('openNetwork') });
      if (this.network === n.ssid) {
        item.setDetail(t('connected'));
        item.el.querySelector('.v-control__trail').innerHTML = icon('check', 'setup__check');
        item.setSelected(true);
      }
      item.on('activate', () => {
        if (this.busy) return;
        if (this.network === n.ssid) return this.go(this.step + 1);
        if (n.secured) this.askPassword(n, item);
        else this.connect(n, item);
      });
      this.body.append(item.el);
    });
    const skip = new VButton({ label: t('later'), variant: 'ghost' });
    skip.on('activate', () => !this.busy && this.go(this.step + 1));
    this.actions(skip);
  }

  askPassword(n, item, value = '') {
    Keyboard.open({
      label: t('passwordFor', { ssid: n.ssid }),
      value,
      password: true,
      maxLength: 63,
      onDone: (pw) => {
        if (!pw) return;
        this.connect(n, item, pw);
      },
    });
  }

  connect(n, item, password = null) {
    this.busy = true;
    const trail = item.el.querySelector('.v-control__trail');
    trail.replaceChildren(new VSpinner({ size: 'sm', label: t('connecting') }).el);
    item.setDetail(t('connecting'));
    this.later(async () => {
      this.busy = false;
      // WPA2 passwords are 8 to 63 characters; anything shorter is rejected.
      if (password !== null && password.length < 8) {
        trail.replaceChildren();
        item.setDetail(t('secured'));
        const choice = await VAlert.error({
          title: t('wifiFailTitle'),
          message: t('wifiFailBody', { ssid: n.ssid }),
          code: t('errorCode', { code: 'NET-0x1F' }),
          actions: [
            { id: 'retry', label: t('tryAgain') },
            { id: 'cancel', label: t('cancel') },
          ],
        });
        if (choice === 'retry') this.askPassword(n, item);
        return;
      }
      this.network = n.ssid;
      Settings.set('wifi', true);
      trail.innerHTML = icon('check', 'setup__check');
      item.setDetail(t('connected'));
      Sound.play('toggleOn');
      this.later(() => this.go(this.step + 1), 500);
    }, 1400);
  }

  // ---------- 5. Controller ----------
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
      pad.innerHTML = `<span class="setup__pad-icon">${icon('gamepad')}</span><div class="setup__pad-name">${esc(name)}</div><div class="setup__pad-glyphs">${['accept', 'back', 'options', 'prevTab', 'nextTab', 'qam', 'mainMenu'].map((a) => promptGlyph(a)).join('')}</div>`;
    };
    draw();
    onPromptChange(draw, pad);
    const test = new VListItem({ label: t('testHaptics'), icon: 'vibrate', chevron: true });
    test.on('activate', () => Haptics.play('test', { force: true }));
    this.body.append(pad, test.el);
    const next = new VButton({ label: t('continue'), variant: 'primary' });
    next.on('activate', () => this.go(this.step + 1));
    this.actions(next);
    // The card reacts to each button press.
    const onKey = () => animate(pad, 'press');
    window.addEventListener('keydown', onKey);
    this.unhook = () => window.removeEventListener('keydown', onKey);
  }

  // ---------- 6. Profile ----------
  profile() {
    this.title('setupProfile', 'setupProfileSub');
    this.draft = this.draft || { name: '', color: Profiles.nextColor(), photo: null };
    const preview = h('div', 'setup__avatar');
    const paint = () => preview.replaceChildren(avatarEl({ ...this.draft, name: this.draft.name || t('defaultName') }, 'avatar avatar--lg'));
    paint();
    const name = nameField(this.draft.name);
    const chooser = pictureChooser(this.draft, paint);
    name.on('change', (v) => {
      this.draft.name = v;
      paint();
      // The colour swatches show the same initial as the preview.
      const initial = [...(v || t('defaultName')).trim()][0]?.toLocaleUpperCase() || '?';
      chooser.querySelectorAll('.avatar__letter').forEach((l) => (l.textContent = initial));
    });
    const from = this.draft.fromSteam ? h('div', 'setup__from', `${icon('cloud_download')}<span>${esc(t('importedFromSteam'))}</span>`) : '';
    this.body.append(preview, ...(from ? [from] : []), name.el, h('div', 'setup__label', esc(t('picture'))), chooser);
    const next = new VButton({ label: t('continue'), variant: 'primary' });
    next.on('activate', () => this.go(this.step + 1));
    this.actions(next);
  }

  // ---------- 3. Updates: Vanta OS, then Steam ----------
  updates() {
    this.title('setupUpdates', 'setupUpdatesSub');
    const card = h('div', 'setup__card');
    const bar = new VProgress({ indeterminate: true, label: t('checkingUpdates'), size: 'lg' });
    const steam = new VProgress({ indeterminate: true, label: t('steamWaitingUpdate'), size: 'lg' });
    card.append(bar.el, steam.el);
    this.body.append(card);
    const next = new VButton({ label: t('continue'), variant: 'primary' });
    next.setDisabled(true);
    next.on('activate', () => this.go(this.step + 1));
    this.actions(next);
    this.busy = true;

    // Check, then download in uneven steps, as real downloads do.
    this.later(() => {
      bar.setIndeterminate(false).set(0).setLabel(t('downloadingUpdate', { version: '0.1.1' }));
      let p = 0;
      const tick = () => {
        p = Math.min(1, p + 0.04 + Math.random() * 0.09);
        bar.set(p);
        if (p < 1) return this.later(tick, 160 + Math.random() * 220);
        bar.setLabel(t('updateInstalled', { version: '0.1.1' }));
        bar.el.classList.add('v-progress--good');
        this.updateSteam(steam, next);
      };
      tick();
    }, 1600);
  }

  // Steam comes preinstalled and updates itself on first start.
  updateSteam(bar, next) {
    bar.setIndeterminate(false).set(0).setLabel(t('updatingSteam'));
    let p = 0;
    const tick = () => {
      p = Math.min(1, p + 0.08 + Math.random() * 0.12);
      bar.set(p);
      if (p < 1) return this.later(tick, 140 + Math.random() * 180);
      bar.setLabel(t('steamUpToDate'));
      bar.el.classList.add('v-progress--good');
      this.busy = false;
      next.setDisabled(false);
      Sound.play('notify');
      FocusManager.focus(next, { silent: true });
    };
    this.later(tick, 400);
  }

  // ---------- 4. Sign in ----------
  account() {
    this.accounts = this.accounts || { steam: null, vanta: null };
    this.title('setupAccount', 'setupAccountSub');
    this.showAccounts(true);
  }

  // The choice: Steam, a Vanta account, or later. Either or both can be linked.
  showAccounts(first = false) {
    this.stopSignIn?.();
    this.stopSignIn = null;
    this.accountView = 'choose';
    const { steam, vanta } = this.accounts;
    const steamRow = new VListItem({ label: t('signInSteam'), icon: 'qr_code_2', detail: steam ? t('signedInAs', { name: steam.persona }) : t('steamOptionDetail'), chevron: !steam });
    const vantaRow = new VListItem({ label: t('vantaAccount'), icon: 'person', detail: vanta ? vanta.email : t('vantaOptionDetail'), chevron: !vanta });
    [
      [steamRow, steam],
      [vantaRow, vanta],
    ].forEach(([row, linked]) => {
      if (linked) {
        row.el.querySelector('.v-control__trail').innerHTML = icon('check', 'setup__check');
        row.setSelected(true);
      }
    });
    steamRow.on('activate', () => !steam && this.openSignIn('steam'));
    vantaRow.on('activate', () => !vanta && this.openSignIn('vanta'));
    this.body.replaceChildren(steamRow.el, vantaRow.el);
    const linked = steam || vanta;
    const next = new VButton({ label: linked ? t('continue') : t('later'), variant: linked ? 'primary' : 'ghost' });
    next.on('activate', () => this.go(this.step + 1));
    this.actions(next);
    if (!first) {
      animate(this.body, 'slide-right');
      FocusManager.focus(linked ? next : steamRow, { silent: true });
      this.app.setHints(this.hints());
    }
  }

  openSignIn(kind) {
    this.accountView = kind;
    const host = h('div', 'setup__signin');
    this.body.replaceChildren(host);
    animate(this.body, 'slide-left');
    const onDone = (account) => {
      this.accounts[kind] = account;
      // Steam's name and picture become the profile defaults; both can still be changed.
      if (kind === 'steam') {
        const draft = this.draft || { name: '', color: Profiles.nextColor(), photo: null };
        this.draft = { ...draft, name: draft.name || account.persona, photo: draft.photo || account.avatar, fromSteam: true };
      }
      this.showAccounts();
    };
    this.stopSignIn = kind === 'steam' ? steamSignIn(host, { onDone }) : vantaSignIn(host, { onDone });
    this.app.setHints(this.hints());
  }

  // ---------- 7. Done ----------
  done() {
    this.title('setupDone', 'setupDoneSub');
    const preview = h('div', 'setup__done');
    const profile = { ...(this.draft || { color: Profiles.nextColor(), photo: null }), name: this.draft?.name || t('defaultName') };
    const linked = [this.accounts?.steam && `Steam · ${this.accounts.steam.persona}`, this.accounts?.vanta && `${t('vantaAccount')} · ${this.accounts.vanta.email}`].filter(Boolean);
    preview.append(avatarEl(profile, 'avatar avatar--xl'), h('div', 'setup__name', esc(profile.name)), ...linked.map((l) => h('div', 'setup__linked', `${icon('check', 'setup__check')}<span>${esc(l)}</span>`)));
    this.body.append(preview);
    const start = new VButton({ label: t('getStarted'), variant: 'primary', size: 'lg' });
    start.on('activate', () => {
      const p = Profiles.add({ ...profile, steam: this.accounts?.steam || null, vanta: this.accounts?.vanta || null });
      Profiles.use(p.id);
      Settings.set('setupDone', true);
      this.app.go('home', {}, { replace: true });
    });
    this.actions(start);
  }
}
