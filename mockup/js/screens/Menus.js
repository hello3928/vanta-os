// The two system drawers:
// - Main menu (left; Guide/View button, M, or the Vanta button in the top bar)
// - Quick access (right; Start/☰, Q, or the ··· button): notifications, quick settings, performance

import { VPanel } from '../components/VPanel.js';
import { VTabs } from '../components/VTabs.js';
import { VListItem } from '../components/VListItem.js';
import { VSlider } from '../components/VSlider.js';
import { VToggle } from '../components/VToggle.js';
import { VChoice } from '../components/VChoice.js';
import { VToast } from '../components/VToast.js';
import { FocusManager } from '../core/FocusManager.js';
import { esc, h } from '../core/util.js';
import { Settings } from '../core/Settings.js';
import { wordmark } from '../brand.js';
import { artImg } from '../art/index.js';

export function openMainMenu(app) {
  const header = h('div', 'menu__header');
  const brand = h('div', 'menu__brand', wordmark(Settings.get('brand'), { height: 18, color: '#ffffff' }));
  const profile = h('div', 'menu__profile', '<span class="menu__avatar">H</span><span><strong>hello3928</strong><span>Online</span></span>');
  header.append(brand, profile);
  const panel = new VPanel({ side: 'left', header });
  const current = app.screen?.name;
  const items = [];

  if (app.running) {
    const g = app.running;
    const now = h('div', 'menu__now');
    now.append(artImg(g, 'header', 'menu__now-art'), h('div', 'menu__now-text', `<span>Now playing</span><strong>${esc(g.title)}</strong>`));
    panel.addItems(now);
    const resume = new VListItem({ label: 'Resume game', icon: 'resume' });
    resume.on('activate', () => {
      panel.close({ silent: true });
      app.resume();
    });
    const exit = new VListItem({ label: 'Exit game', icon: 'exit' });
    exit.on('activate', () => {
      panel.close({ silent: true });
      app.exitGame();
    });
    items.push(resume, exit);
    panel.addItems(resume, exit, h('div', 'menu__rule'));
  }

  [
    ['home', 'Home', 'home', () => app.go('home')],
    ['library', 'Library', 'library', () => app.go('library')],
    ['emu', 'Emulation', 'disc', () => app.go('library', { filter: 'emu' })],
    ['downloads', 'Downloads', 'download', () => VToast.show('No downloads in progress', { icon: 'download' })],
    ['settings', 'Settings', 'sliders', () => app.go('settings')],
    ['power', 'Power', 'power', () => app.openPower()],
  ].forEach(([id, label, ic, go]) => {
    const item = new VListItem({ label, icon: ic });
    item.el.classList.add('menu__item');
    if (id === current && !app.inGame) item.setSelected(true);
    item.on('activate', () => {
      panel.close({ silent: true });
      if (app.inGame && id !== 'power' && id !== 'downloads') app.leaveGameView({ refresh: false });
      go();
    });
    items.push(item);
    panel.addItems(item);
  });
  panel.open({ initial: items.find((i) => i.el.classList.contains('is-selected')) || items[0] });
  return panel;
}

const QAM_TABS = [
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'quick', label: 'Quick settings', icon: 'sliders' },
  { id: 'performance', label: 'Performance', icon: 'bolt' },
];

function quickSettings() {
  return [
    new VSlider({ label: 'Brightness', icon: 'sun', min: 10, max: 100, step: 5, bind: 'brightness' }),
    new VSlider({ label: 'Volume', icon: 'volume', min: 0, max: 100, step: 5, bind: 'volume' }),
    new VToggle({ label: 'Wi-Fi', detail: 'Home-5G', icon: 'wifi', bind: 'wifi' }),
    new VToggle({ label: 'Bluetooth', detail: '1 controller connected', icon: 'bluetooth', bind: 'bluetooth' }),
    new VToggle({ label: 'Airplane mode', icon: 'moon', bind: 'airplane' }),
    new VToggle({ label: 'Game music', icon: 'music_note', bind: 'gameMusic' }),
    new VToggle({ label: 'Interface sounds', icon: 'volume', bind: 'sfx' }),
    new VChoice({ label: 'Haptics', icon: 'vibrate', options: ['Off', 'Low', 'High'], bind: 'haptics' }),
  ];
}

function performance() {
  return [
    new VChoice({ label: 'Performance overlay', icon: 'gauge', options: ['Off', 'FPS', 'Basic', 'Full'], bind: 'overlay' }),
    new VChoice({ label: 'Frame limit', icon: 'gauge', options: ['Off', '30', '40', '60', '90', '120'], bind: 'fpsLimit' }),
    new VToggle({ label: 'Limit TDP', icon: 'bolt', bind: 'tdpLimit' }),
    new VSlider({ label: 'TDP limit', icon: 'bolt', min: 3, max: 30, step: 1, bind: 'tdp', format: (v) => `${v} W` }),
    new VChoice({ label: 'Upscaling (FSR)', icon: 'sparkle', options: ['Off', 'Quality', 'Balanced', 'Performance'], bind: 'upscaling' }),
    new VToggle({ label: 'Variable refresh rate', icon: 'desktop', bind: 'vrr' }),
  ];
}

function notifications() {
  return [
    new VListItem({ label: 'Neon Drift updated', detail: 'Night Circuit update installed · 2 min ago', icon: 'download' }),
    new VListItem({ label: 'Controller connected', detail: 'Wireless controller · 12 min ago', icon: 'gamepad' }),
    new VListItem({ label: 'Vanta OS is up to date', detail: 'Version 0.1.0 · Today', icon: 'check' }),
  ];
}

export function openQuickAccess(app, tab = 'quick') {
  const rail = new VTabs({ tabs: QAM_TABS, value: tab, variant: 'rail' });
  const panel = new VPanel({ side: 'right', rail });
  const render = (id) => {
    const t = QAM_TABS.find((x) => x.id === id);
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    panel.setTitle(t.label, id === 'performance' ? 'Battery 72% · about 2 h 40 min at 11.4 W' : id === 'quick' ? `${time} · Battery 72%` : '3 new');
    panel.clear().addItems(id === 'quick' ? quickSettings() : id === 'performance' ? performance() : notifications());
  };
  rail.on('change', (id) => render(id));
  // Like a console quick menu, focusing a rail icon switches the page straight away.
  rail.tabs.forEach((t) => t.on('focus', () => rail.select(t.id)));
  render(tab);
  panel.isQuickAccess = true;
  panel.open({ initial: panel.body.querySelector('.v-focusable')?.__v });
  // Moving right from the content lands on the rail; left from the rail goes back to the content.
  panel.body.dataset.navRight = '.v-panel__rail';
  rail.el.closest('.v-panel__rail').dataset.navLeft = '.v-panel__body';
  panel.stepTab = (d) => {
    rail.step(d);
    FocusManager.focus(rail.activeTab, { silent: true });
  };
  return panel;
}
