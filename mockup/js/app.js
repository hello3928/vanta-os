// Vanta OS mockup: router and wiring. Screens are built only from the components in ./components.

import { FocusManager } from './core/FocusManager.js';
import { Input } from './core/Input.js';
import { Sound } from './core/Sound.js';
import { Haptics } from './core/Haptics.js';
import { Settings } from './core/Settings.js';
import { Overlays } from './core/Overlays.js';
import { Motion } from './core/motion.js';
import { GameMusic } from './core/GameMusic.js';
import { afterLayout, h, reducedMotion } from './core/util.js';
import { VToast } from './components/VToast.js';
import { VDialog } from './components/VDialog.js';
import { VTopBar } from './components/VTopBar.js';
import { VHintBar } from './components/VHintBar.js';
import { Keyboard } from './components/VKeyboard.js';
import { SetupScreen } from './screens/Setup.js';
import { UsersScreen } from './screens/Users.js';
import { HomeScreen } from './screens/Home.js';
import { LibraryScreen } from './screens/Library.js';
import { GameScreen } from './screens/Game.js';
import { SettingsScreen } from './screens/Settings.js';
import { playWelcome, startTour } from './screens/Tour.js';
import { openMainMenu, openQuickAccess } from './screens/Menus.js';
import { openPowerMenu } from './screens/PowerMenu.js';
import { launchGame, gameView } from './screens/Launch.js';
import { GAMES } from './data.js';
import { t, i18n } from './core/i18n.js';
import { Profiles } from './core/Profiles.js';
import { normalizeForDevice } from './core/Device.js';
import { SonyHaptics } from './core/SonyHaptics.js';

SonyHaptics.restore();
import { loadFonts, preload } from './art/index.js';

const SCREENS = { setup: SetupScreen, users: UsersScreen, home: HomeScreen, library: LibraryScreen, game: GameScreen, settings: SettingsScreen };

Motion.init();
const appEl = document.getElementById('app');
const stage = document.getElementById('stage');
const layer = document.getElementById('overlay');
const dimEl = document.getElementById('dim');
Overlays.setRoot(layer);
const shellEl = document.getElementById('shell');
VToast.setHost(document.getElementById('toasts'));

// Icon and stand-in logo fonts must be ready before the first screen; capsules start loading too.
preload(GAMES.filter((g) => g.recent), ['capsule', 'hero', 'logo']);
preload(GAMES, ['capsule']);
const ready = Promise.all([loadFonts(GAMES), document.fonts.load('500 16px Figtree').catch(() => {}), new Promise((r) => setTimeout(r, 900))]);

// The shell: one top bar and one hint bar for the whole app. Pages don't build their own; they
// declare `shell = { title, hints, topbar, hintbar }` and the shell updates in place, so the bars
// stay still while pages change underneath. Screens with changing prompts call App.setHints().
const Shell = {
  top: null,
  hints: null,
  scrollEl: null,

  build() {
    this.top?.el.remove();
    this.hints?.el.remove();
    this.top = new VTopBar({ app: App });
    this.hints = new VHintBar();
    shellEl.append(this.top.el, this.hints.el);
    this.onScroll = () => this.top.el.classList.toggle('is-scrolled', this.scrollEl.scrollTop > 4);
  },

  apply(screen) {
    const s = screen.shell || {};
    if (!App.inGame) this.hide(false);
    // Up from the top of the page reaches the bar, except where Up already means something (Home).
    FocusManager.chrome = s.topbar === false ? null : this.top.el;
    FocusManager.chromeNav = s.topbarNav !== false;
    this.top.setTitle(s.title || '');
    // A page with a dark side strip (Settings) continues it up through the top bar.
    this.top.el.style.setProperty('--strip', s.strip || '0px');
    this.top.el.classList.toggle('is-hidden', s.topbar === false);
    this.setHints(s.hints || [], s.hintbar === false);
    // The bar gets a background once the page scrolls under it.
    this.scrollEl?.removeEventListener('scroll', this.onScroll);
    this.scrollEl = screen.el.querySelector('.screen__scroll');
    this.scrollEl?.addEventListener('scroll', this.onScroll, { passive: true });
    this.top.el.classList.toggle('is-scrolled', (this.scrollEl?.scrollTop || 0) > 4);
  },

  setHints(hints, hidden = false) {
    this.hints.setHints(hints);
    this.hints.el.classList.toggle('is-hidden', hidden || !hints.length);
  },

  // Full-screen moments (the expanded trailer, a game) hide both bars.
  hide(on) {
    shellEl.classList.toggle('is-hidden', on);
  },
};

const App = {
  shell: Shell,
  screen: null,
  stack: [],
  busy: false,
  running: null,
  inGame: false,
  lastGame: null,

  // Screens crossfade: the new screen fades in over the old one, then the old one is
  // destroyed (its listeners and timers removed). `instant` skips the fade, for in-place refreshes.
  go(name, params = {}, { replace = false, fromBack = false, transition, instant = false } = {}) {
    Overlays.closeAll();
    const key = name + JSON.stringify(params);
    if (this.screen?.key === key && !transition) return;
    if (replace) this.stack = [];
    if (!fromBack) {
      const i = this.stack.findIndex((s) => s.key === key);
      if (i >= 0) this.stack.length = i;
      this.stack.push({ key, name, params });
    }
    const old = this.screen;
    GameMusic.claimed = false;
    const screen = new SCREENS[name](App, params);
    screen.name = name;
    screen.key = key;
    this.screen = screen;
    if (old) {
      old.el.classList.add('is-leaving');
      old.destroy?.();
    }
    stage.querySelectorAll('.screen.is-leaving').forEach((el) => el !== old?.el && el.remove());
    const fade = old && !instant && !reducedMotion();
    if (fade) screen.el.classList.add('is-entering');
    stage.append(screen.el);
    if (!GameMusic.claimed) GameMusic.release();
    Shell.apply(screen);
    FocusManager.setRoot(screen.el, {
      onBack: () => {
        if (!screen.onBack?.()) this.back();
      },
    });
    screen.enter?.();
    if (fade) {
      afterLayout(screen.el, () => screen.el.classList.remove('is-entering'));
      setTimeout(() => old.el.remove(), 260);
    } else old?.el.remove();
  },

  back() {
    if (this.stack.length < 2) return;
    this.stack.pop();
    const prev = this.stack[this.stack.length - 1];
    this.go(prev.name, prev.params, { fromBack: true });
  },

  // Rebuild the current screen in place (after a library change, for example).
  refresh() {
    const cur = this.stack[this.stack.length - 1];
    if (!cur) return;
    this.screen.key = null;
    this.go(cur.name, cur.params, { fromBack: true, instant: true });
  },

  openGame(g, tile) {
    this.lastGame = g;
    this.go('game', { id: g.id });
  },

  toggleMainMenu() {
    if (this.locked() || this.busy) return;
    const top = Overlays.top();
    Overlays.closeAll();
    if (!top?.isMainMenu) openMainMenu(App).isMainMenu = true;
  },

  // From the top bar: open Quick access on a given page; the same button again closes it.
  openQuickAccess(tab) {
    if (this.locked() || this.busy) return;
    const top = Overlays.top();
    Overlays.closeAll();
    if (top?.isQuickAccess && top.tab === tab) return;
    openQuickAccess(App, tab);
  },

  toggleQuickAccess() {
    if (this.locked() || this.busy) return;
    const top = Overlays.top();
    Overlays.closeAll();
    if (!top?.isQuickAccess) openQuickAccess(App);
  },

  openPower() {
    Overlays.closeAll();
    openPowerMenu(App);
  },

  launch(g) {
    if (this.busy) return;
    if (!g.installed) {
      VToast.show(t('addedToDownloads', { game: g.title }), { icon: 'download' });
      return;
    }
    if (this.running && this.running !== g) {
      VToast.show(t('exitFirst', { game: this.running.title }), { icon: 'info', tone: 'bad' });
      return;
    }
    Overlays.closeAll();
    this.busy = true;
    this.lastGame = g;
    GameMusic.release();
    launchGame(layer, g, () => {
      this.busy = false;
      this.running = g;
      this.showGame();
    });
  },

  showGame() {
    this.inGame = true;
    Shell.hide(true);
    this.gameEl = gameView(layer, this.running);
  },

  resume() {
    if (!this.running) return;
    Overlays.closeAll();
    if (!this.inGame) this.showGame();
  },

  // Hide the game (it keeps running) and show the Vanta UI.
  leaveGameView({ refresh = true } = {}) {
    if (!this.gameEl) return;
    const el = this.gameEl;
    this.gameEl = null;
    this.inGame = false;
    Shell.hide(false);
    Motion.play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' });
    setTimeout(() => el.remove(), 320);
    if (refresh) this.refresh();
  },

  async exitGame() {
    const g = this.running;
    const ok = await VDialog.confirm({ title: t('exitQ', { game: g.title }), body: t('exitBody'), confirmLabel: t('exitGame'), cancelLabel: t('cancel'), danger: true });
    if (!ok) return;
    this.running = null;
    if (this.inGame) this.leaveGameView();
    else this.refresh();
    VToast.show(t('closed', { game: g.title }), { icon: 'exit', sound: 'back' });
  },

  sleep() {
    Overlays.closeAll();
    GameMusic.release();
    const el = h('div', 'sleep');
    layer.append(el);
    Motion.play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: Motion.out, fill: 'both' });
    this.sleeping = () => {
      this.sleeping = null;
      Sound.play('boot');
      Haptics.play('notify');
      Motion.play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: Motion.out, fill: 'both' });
      setTimeout(() => el.remove(), 720);
      if (!this.inGame && this.screen?.game) GameMusic.select(this.screen.game);
    };
  },

  // Setup and "Who's playing?" own the whole screen: no menus there.
  locked() {
    return ['setup', 'users'].includes(this.screen?.name);
  },

  switchUser() {
    if (this.running) {
      VToast.show(t('exitFirst', { game: this.running.title }), { icon: 'info', tone: 'bad' });
      return;
    }
    this.go('users', {}, { replace: true });
  },

  // Power actions and switching user ask first. With a game running, the message says what
  // happens to it.
  async request(kind) {
    if (kind === 'switchUser' && this.running) return this.switchUser();
    const g = this.running;
    const copy = {
      sleep: ['sleepQ', g ? t('sleepBodyGame', { game: g.title }) : '', 'sleep', false],
      restart: ['restartQ', g ? t('powerBodyGame', { game: g.title }) : '', 'restart', true],
      shutDown: ['shutDownQ', g ? t('powerBodyGame', { game: g.title }) : '', 'shutDown', true],
      switchUser: ['switchUserQ', '', 'switchUser', false],
    }[kind];
    const ok = await VDialog.confirm({ title: t(copy[0]), body: copy[1], confirmLabel: t(copy[2]), cancelLabel: t('cancel'), danger: copy[3] });
    if (ok) this[kind]();
  },

  // Shut down: the screen goes dark; any button turns the device back on.
  shutDown() {
    this.restart({ wait: true });
  },

  // Restart and shut down: a moment of black, then "Who's playing?".
  restart({ wait = false } = {}) {
    this.running = null;
    this.gameEl?.remove();
    this.gameEl = null;
    this.inGame = false;
    Shell.hide(false);
    GameMusic.release();
    const black = h('div', 'sleep');
    layer.append(black);
    Motion.play(black, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'both' });
    const wake = () => {
      this.go('users', {}, { replace: true });
      Motion.play(black, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: 'both' });
      setTimeout(() => black.remove(), 720);
    };
    setTimeout(() => {
      if (!wait) return wake();
      this.sleeping = () => {
        this.sleeping = null;
        Sound.play('boot');
        Haptics.play('boot');
        wake();
      };
    }, 900);
  },

  setHints(hints) {
    Shell.setHints(hints);
  },

  // Reset system: erase profiles, accounts, settings and saved networks, then start again at
  // first-time setup. Real OS: vantad removes user data and /etc changes, keeping installed
  // games, and the device reboots into setup.
  resetSystem() {
    Overlays.closeAll();
    GameMusic.release();
    const black = h('div', 'sleep');
    layer.append(black);
    Motion.play(black, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'both' });
    setTimeout(() => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('vanta.'))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* storage blocked: nothing saved to erase */
      }
      location.reload();
    }, 900);
  },

  // End of first-time setup: the logo and jingle, then the tour of Home.
  async welcome() {
    this.busy = true;
    await playWelcome(layer);
    this.busy = false;
    startTour(App);
  },

  tour() {
    this.go('home');
    setTimeout(() => startTour(App), 500);
  },

  // Rebuild the current screen in the new language, keeping your place in Settings.
  relocalize() {
    if (!this.screen || this.screen.name === 'setup') return;
    const top = this.stack[this.stack.length - 1];
    if (this.screen.name === 'settings') top.params = { section: 'language' };
    this.screen.key = null;
    this.go(top.name, top.params, { fromBack: true, instant: true });
  },
};

// Handy for debugging in the browser console.
window.__vanta = App;

Shell.build();

// Settings → live effects
const EFFECTS = {
  accent: (a) => (document.documentElement.dataset.accent = a),
  // A dark layer over everything, not a CSS filter: filters on the whole app make every frame slow.
  brightness: (v) => dimEl.style.setProperty('--dim', ((100 - v) / 100 * 0.75).toFixed(3)),
  volume: (v) => Sound.setSystemVolume(v / 100),
  sfx: (on) => Sound.setEnabled(on),
  sfxVolume: (v) => Sound.setUiVolume(v / 100),
  haptics: (v) => (Haptics.level = v),
  menuHaptics: (v) => (Haptics.menus = v),
  language: (code) => {
    i18n.set(code);
    Shell.build();
    App.relocalize();
  },
  gameMusic: (on) => GameMusic.setEnabled(on),
  musicVolume: (v) => GameMusic.setVolume(v / 100),
  trailerVideo: (on) => GameMusic.setShowVideo(on),
  // Mockup: previewing another device changes which settings apply.
  device: () => {
    normalizeForDevice();
    if (!App.screen) return;
    Shell.build();
    if (App.screen.name === 'settings') App.stack[App.stack.length - 1].params = { section: 'system' };
    App.refresh();
  },
};
for (const [key, apply] of Object.entries(EFFECTS)) {
  apply(Settings.get(key));
  Settings.on(key, apply);
}

Input.init((action, meta) => {
  if (action !== 'padDisconnected') Sound.unlock();
  if (App.sleeping) {
    App.sleeping();
    return;
  }
  if (App.screen?.onAnyInput?.(action)) return;
  if (action === 'padConnected') {
    VToast.show(t('controllerConnected', { name: meta.pad.id.replace(/\(.*?\)/g, '').trim() || 'Gamepad' }), { icon: 'gamepad' });
    return;
  }
  if (action === 'padDisconnected') {
    VToast.show(t('controllerDisconnected'), { icon: 'gamepad', tone: 'bad' });
    return;
  }
  if (App.busy || action === 'pointer') return;
  if (Keyboard.handleAction(action)) return;
  // While a game is on screen it gets the input; only the system buttons reach Vanta.
  if (App.inGame && !Overlays.top() && !['mainMenu', 'qam', 'power'].includes(action)) return;
  switch (action) {
    case 'up':
    case 'down':
    case 'left':
    case 'right':
      FocusManager.move(action);
      break;
    case 'accept':
      FocusManager.accept();
      break;
    case 'back':
      if (FocusManager.scopes.length > 1 || App.stack.length > 1 || App.screen?.onBack) {
        Sound.play('back');
        Haptics.play('back');
      }
      FocusManager.back();
      break;
    case 'options':
      if (FocusManager.scopes.length === 1 && App.screen?.onOptions) App.screen.onOptions();
      else FocusManager.current?.options();
      break;
    case 'qam':
      App.toggleQuickAccess();
      break;
    case 'mainMenu':
      App.toggleMainMenu();
      break;
    case 'prevTab':
    case 'nextTab': {
      const d = action === 'nextTab' ? 1 : -1;
      const top = Overlays.top();
      if (top?.stepTab) top.stepTab(d);
      else if (FocusManager.scopes.length === 1) App.screen?.onTab?.(d);
      break;
    }
    case 'home':
      if (App.locked()) break;
      if (App.inGame) App.leaveGameView({ refresh: false });
      App.go('home');
      break;
    case 'power':
      if (!App.locked()) App.openPower();
      break;
  }
});

// Start-up: no boot animation (it comes later). Wait for fonts, then first-time setup or
// "Who's playing?". A deep link like #home or #library skips straight there.
const start = location.hash.slice(1);
ready.then(() => {
  if (!Settings.get('setupDone') || !Profiles.list.length) App.go('setup', {}, { replace: true });
  else if (SCREENS[start] && !['game', 'setup', 'users'].includes(start)) App.go(start, {}, { replace: true });
  else App.go('users', {}, { replace: true });
});
