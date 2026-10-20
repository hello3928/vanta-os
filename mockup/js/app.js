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
import { BootScreen } from './screens/Boot.js';
import { HomeScreen } from './screens/Home.js';
import { LibraryScreen } from './screens/Library.js';
import { GameScreen } from './screens/Game.js';
import { SettingsScreen } from './screens/Settings.js';
import { openMainMenu, openQuickAccess } from './screens/Menus.js';
import { openPowerMenu } from './screens/PowerMenu.js';
import { launchGame, gameView } from './screens/Launch.js';
import { GAMES } from './data.js';
import { loadFonts, preload } from './art/index.js';

const SCREENS = { boot: BootScreen, home: HomeScreen, library: LibraryScreen, game: GameScreen, settings: SettingsScreen };

Motion.init();
const appEl = document.getElementById('app');
const stage = document.getElementById('stage');
const layer = document.getElementById('overlay');
Overlays.setRoot(layer);
VToast.setHost(document.getElementById('toasts'));

// Icon and stand-in logo fonts must be ready before the first screen; capsules start loading too.
preload(GAMES.filter((g) => g.recent), ['capsule', 'hero', 'logo']);
preload(GAMES, ['capsule']);
const ready = Promise.all([loadFonts(GAMES), document.fonts.load('24px "Material Symbols Rounded"').catch(() => {}), new Promise((r) => setTimeout(r, 900))]);

const App = {
  screen: null,
  stack: [],
  busy: false,
  running: null,
  inGame: false,
  lastGame: null,

  go(name, params = {}, { replace = false, fromBack = false, transition } = {}) {
    Overlays.closeAll();
    const key = name + JSON.stringify(params);
    if (this.screen?.key === key && !transition) return;
    if (replace) this.stack = [];
    if (!fromBack) {
      const i = this.stack.findIndex((s) => s.key === key);
      if (i >= 0) this.stack.length = i;
      this.stack.push({ key, name, params });
    }
    const swap = () => {
      GameMusic.claimed = false;
      const screen = new SCREENS[name](App, name === 'boot' ? { ready } : params);
      screen.name = name;
      screen.key = key;
      screen.el.classList.add('is-entering');
      if (transition === 'boot') screen.el.classList.add('is-booting');
      stage.replaceChildren(screen.el);
      if (!GameMusic.claimed) GameMusic.release();
      afterLayout(screen.el, () => screen.el.classList.remove('is-entering', 'is-booting'));
      this.screen = screen;
      FocusManager.setRoot(screen.el, {
        onBack: () => {
          if (!screen.onBack?.()) this.back();
        },
      });
      screen.enter?.();
    };
    // Morph shared elements (hero art, logo) between screens where the browser supports it.
    if (document.startViewTransition && !reducedMotion() && this.screen && name !== 'boot' && transition !== 'boot') {
      document.startViewTransition(swap);
    } else swap();
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
    this.go(cur.name, cur.params, { fromBack: true });
  },

  openGame(g, tile) {
    this.lastGame = g;
    // The tile's art becomes the game page's hero during the transition.
    const img = tile?.img;
    if (img && this.screen?.name !== 'home') img.style.viewTransitionName = 'hero';
    this.go('game', { id: g.id });
  },

  toggleMainMenu() {
    if (this.screen?.name === 'boot' || this.busy) return;
    const top = Overlays.top();
    Overlays.closeAll();
    if (!top?.isMainMenu) openMainMenu(App).isMainMenu = true;
  },

  toggleQuickAccess() {
    if (this.screen?.name === 'boot' || this.busy) return;
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
      VToast.show(`${g.title} was added to your downloads`, { icon: 'download' });
      return;
    }
    if (this.running && this.running !== g) {
      VToast.show(`Exit ${this.running.title} before starting another game`, { icon: 'info', tone: 'bad' });
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
    Motion.play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' });
    setTimeout(() => el.remove(), 320);
    if (refresh) this.refresh();
  },

  async exitGame() {
    const g = this.running;
    const ok = await VDialog.confirm({ title: `Exit ${g.title}?`, body: 'Unsaved progress will be lost.', confirmLabel: 'Exit game', danger: true });
    if (!ok) return;
    this.running = null;
    if (this.inGame) this.leaveGameView();
    else this.refresh();
    VToast.show(`${g.title} closed`, { icon: 'exit', sound: 'back' });
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

  restart() {
    this.running = null;
    this.gameEl?.remove();
    this.gameEl = null;
    this.inGame = false;
    this.go('boot', {}, { replace: true });
  },
};

// Settings → live effects
const EFFECTS = {
  accent: (a) => (document.documentElement.dataset.accent = a),
  brightness: (v) => (appEl.style.filter = v >= 100 ? '' : `brightness(${0.3 + (0.7 * v) / 100})`),
  volume: (v) => Sound.setSystemVolume(v / 100),
  sfx: (on) => Sound.setEnabled(on),
  sfxVolume: (v) => Sound.setUiVolume(v / 100),
  haptics: (v) => (Haptics.level = v),
  menuHaptics: (v) => (Haptics.menus = v),
  gameMusic: (on) => GameMusic.setEnabled(on),
  musicVolume: (v) => GameMusic.setVolume(v / 100),
  trailerVideo: (on) => GameMusic.setShowVideo(on),
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
    VToast.show(`Controller connected: ${meta.pad.id.replace(/\(.*?\)/g, '').trim() || 'gamepad'}`, { icon: 'gamepad' });
    return;
  }
  if (action === 'padDisconnected') {
    VToast.show('Controller disconnected', { icon: 'gamepad', tone: 'bad' });
    return;
  }
  if (App.busy || action === 'pointer') return;
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
      if (App.inGame) App.leaveGameView({ refresh: false });
      App.go('home');
      break;
    case 'power':
      App.openPower();
      break;
  }
});

// A deep link like #home or #library skips the boot screen.
const start = location.hash.slice(1);
if (SCREENS[start] && start !== 'boot' && start !== 'game') ready.then(() => App.go(start, {}, { replace: true }));
else App.go('boot', {}, { replace: true });
