// Vanta OS mockup: router and wiring. Screens are built only from the components in ./components.

import { FocusManager } from './core/FocusManager.js';
import { Input } from './core/Input.js';
import { Sound } from './core/Sound.js';
import { Haptics } from './core/Haptics.js';
import { Settings } from './core/Settings.js';
import { Overlays } from './core/Overlays.js';
import { VToast } from './components/VToast.js';
import { BootScreen } from './screens/Boot.js';
import { HomeScreen } from './screens/Home.js';
import { LibraryScreen } from './screens/Library.js';
import { GameScreen } from './screens/Game.js';
import { SettingsScreen } from './screens/Settings.js';
import { openMainMenu, openQuickAccess } from './screens/Menus.js';
import { openPowerMenu } from './screens/PowerMenu.js';
import { launchGame } from './screens/Launch.js';
import { GAMES } from './data.js';
import { afterLayout } from './core/util.js';
import { loadFonts, capsule } from './art/index.js';

const SCREENS = { boot: BootScreen, home: HomeScreen, library: LibraryScreen, game: GameScreen, settings: SettingsScreen };

const appEl = document.getElementById('app');
const stage = document.getElementById('stage');
const layer = document.getElementById('overlay');
Overlays.setRoot(layer);
VToast.setHost(document.getElementById('toasts'));

// Fonts must be loaded before the logos are painted; then warm the capsule cache in small batches.
const ready = loadFonts(GAMES).then(
  () =>
    new Promise((resolve) => {
      let i = 0;
      const step = () => {
        GAMES.slice(i, i + 4).forEach(capsule);
        i += 4;
        if (i < GAMES.length) setTimeout(step, 0);
        else resolve();
      };
      step();
    }),
);

const App = {
  screen: null,
  stack: [],
  busy: false,

  go(name, params = {}, { replace = false, fromBack = false } = {}) {
    Overlays.closeAll();
    const key = name + JSON.stringify(params);
    if (this.screen?.key === key) return;
    const screen = new SCREENS[name](App, name === 'boot' ? { ready } : params);
    screen.name = name;
    screen.key = key;
    if (replace) this.stack = [];
    if (!fromBack) {
      const i = this.stack.findIndex((s) => s.key === key);
      if (i >= 0) this.stack.length = i;
      this.stack.push({ key, name, params });
    }
    screen.el.classList.add('is-entering');
    stage.replaceChildren(screen.el);
    afterLayout(screen.el, () => screen.el.classList.remove('is-entering'));
    this.screen = screen;
    FocusManager.setRoot(screen.el, {
      onBack: () => {
        if (!screen.onBack?.()) this.back();
      },
    });
    screen.enter?.();
  },

  back() {
    if (this.stack.length < 2) return;
    this.stack.pop();
    const prev = this.stack[this.stack.length - 1];
    this.go(prev.name, prev.params, { fromBack: true });
  },

  toggleMainMenu() {
    if (this.screen?.name === 'boot') return;
    const top = Overlays.top();
    Overlays.closeAll();
    if (!top?.isMainMenu) openMainMenu(App).isMainMenu = true;
  },

  toggleQuickAccess() {
    if (this.screen?.name === 'boot') return;
    const top = Overlays.top();
    Overlays.closeAll();
    if (!top?.isQuickAccess) openQuickAccess(App);
  },

  openPower() {
    Overlays.closeAll();
    openPowerMenu(App);
  },

  launch(game) {
    if (this.busy) return;
    Overlays.closeAll();
    this.busy = true;
    launchGame(layer, game, () => (this.busy = false));
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
};
for (const [key, apply] of Object.entries(EFFECTS)) {
  apply(Settings.get(key));
  Settings.on(key, apply);
}

Input.init((action, meta) => {
  if (action !== 'padDisconnected') Sound.unlock();
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
