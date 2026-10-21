// The two system drawers:
// - Main menu (left; Guide/View button, M, or the profile picture in the top bar)
// - Quick access (right; Start/☰, Q, or the ··· button): notifications, quick settings, performance

import { VPanel } from '../components/VPanel.js';
import { VTabs } from '../components/VTabs.js';
import { VListItem } from '../components/VListItem.js';
import { VSlider } from '../components/VSlider.js';
import { VToggle } from '../components/VToggle.js';
import { VDropdown } from '../components/VDropdown.js';
import { frameLimit, tdpToggle, tdpSlider, upscaling, vrrToggle } from './perf.js';
import { Device } from '../core/Device.js';
import { VToast } from '../components/VToast.js';
import { FocusManager } from '../core/FocusManager.js';
import { Settings } from '../core/Settings.js';
import { Profiles } from '../core/Profiles.js';
import { t, duration } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { wordmark } from '../brand.js';
import { artImg } from '../art/index.js';
import { avatarEl } from '../components/avatar.js';
import { openProfileEditor } from './ProfileEditor.js';

export function openMainMenu(app) {
  const header = h('div', 'menu__header');
  header.append(h('div', 'menu__brand', wordmark(Settings.get('brand'), { height: 18, color: '#ffffff' })));
  const me = Profiles.current;
  const profile = h('div', 'menu__profile');
  profile.append(avatarEl(me, 'avatar avatar--sm'), h('span', '', `<strong>${esc(me?.name || t('guest'))}</strong><span>${esc(t('online'))}</span>`));
  header.append(profile);
  const panel = new VPanel({ side: 'left', header });
  const current = app.screen?.name;
  const items = [];

  if (app.running) {
    const g = app.running;
    const now = h('div', 'menu__now');
    now.append(artImg(g, 'header', 'menu__now-art'), h('div', 'menu__now-text', `<span>${esc(t('nowPlaying'))}</span><strong>${esc(g.title)}</strong>`));
    panel.addItems(now);
    const resume = new VListItem({ label: t('resumeGame'), icon: 'resume' });
    resume.on('activate', () => {
      panel.close({ silent: true });
      app.resume();
    });
    const exit = new VListItem({ label: t('exitGame'), icon: 'exit' });
    exit.on('activate', () => {
      panel.close({ silent: true });
      app.exitGame();
    });
    items.push(resume, exit);
    panel.addItems(resume, exit, h('div', 'menu__rule'));
  }

  [
    ['home', t('home'), 'home', () => app.go('home')],
    ['library', t('library'), 'library', () => app.go('library')],
    ['emu', t('emulation'), 'disc', () => app.go('library', { filter: 'emu' })],
    ['downloads', t('downloads'), 'download', () => VToast.show(t('noDownloads'), { icon: 'download' })],
    ['settings', t('settings'), 'sliders', () => app.go('settings')],
    ...(me ? [['edit', t('editProfile'), 'person_edit', () => openProfileEditor(app, me)]] : []),
    ['user', t('switchUser'), 'user', () => app.switchUser()],
    ['power', t('power'), 'power', () => app.openPower()],
  ].forEach(([id, label, ic, go]) => {
    const item = new VListItem({ label, icon: ic });
    item.el.classList.add('menu__item');
    if (id === current && !app.inGame) item.setSelected(true);
    item.on('activate', () => {
      panel.close({ silent: true });
      if (app.inGame && !['power', 'downloads', 'edit'].includes(id)) app.leaveGameView({ refresh: false });
      go();
    });
    items.push(item);
    panel.addItems(item);
  });
  panel.open({ initial: items.find((i) => i.el.classList.contains('is-selected')) || items[0] });
  return panel;
}

const QAM_TABS = () => [
  { id: 'notifications', label: t('notifications'), icon: 'bell' },
  { id: 'quick', label: t('quickSettings'), icon: 'sliders' },
  { id: 'performance', label: t('performance'), icon: 'bolt' },
];

function quickSettings() {
  return [
    new VSlider({ label: t('brightness'), icon: 'sun', min: 10, max: 100, step: 5, bind: 'brightness' }),
    new VSlider({ label: t('volume'), icon: 'volume', min: 0, max: 100, step: 5, bind: 'volume' }),
    new VToggle({ label: t('wifi'), detail: 'Home-5G', icon: 'wifi', bind: 'wifi' }),
    new VToggle({ label: t('bluetooth'), icon: 'bluetooth', bind: 'bluetooth' }),
    new VToggle({ label: t('airplane'), icon: 'airplane', bind: 'airplane' }),
    new VToggle({ label: t('gameMusic'), icon: 'music_note', bind: 'gameMusic' }),
    new VToggle({ label: t('interfaceSounds'), icon: 'volume', bind: 'sfx' }),
    new VDropdown({ label: t('haptics'), icon: 'vibrate', options: ['Off', 'Low', 'High'], bind: 'haptics' }),
  ];
}

// Applies to the running game when there is one, so its runtime decides what's available.
function performance(app) {
  const game = app.running;
  return [
    new VDropdown({ label: t('perfOverlay'), icon: 'speed', options: ['Off', 'FPS', 'Basic', 'Full'], bind: 'overlay' }),
    frameLimit({ icon: 'speed' }),
    tdpToggle({ icon: 'bolt' }),
    tdpSlider({ icon: 'bolt' }),
    upscaling({ icon: 'sparkle', game }),
    vrrToggle({ icon: 'monitor' }),
  ];
}

function notifications() {
  return [
    new VListItem({ label: t('notifUpdated', { game: 'Cyberpunk 2077' }), detail: '3.1 GB', icon: 'download' }),
    new VListItem({ label: t('notifController'), icon: 'gamepad' }),
    new VListItem({ label: t('notifUpToDate'), detail: '0.1.0', icon: 'checkCircle' }),
  ];
}

export function openQuickAccess(app, tab = 'quick') {
  const tabs = QAM_TABS();
  const rail = new VTabs({ tabs, value: tab, variant: 'rail' });
  const panel = new VPanel({ side: 'right', rail });
  const render = (id) => {
    const label = tabs.find((x) => x.id === id).label;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const sub = id === 'notifications' ? '' : id === 'quick' ? time : Device.current.battery ? t('batteryLeft', { n: 72, time: duration(160) }) : Device.current.name;
    panel.setTitle(label, sub);
    panel.clear().addItems(id === 'quick' ? quickSettings() : id === 'performance' ? performance(app) : notifications());
  };
  rail.on('change', (id) => render(id));
  // Like a console quick menu, focusing a rail icon switches the page straight away.
  rail.tabs.forEach((tb) => tb.on('focus', () => rail.select(tb.id)));
  render(tab);
  panel.isQuickAccess = true;
  panel.open({ initial: panel.body.querySelector('.v-focusable')?.__v });
  panel.body.dataset.navRight = '.v-panel__rail';
  rail.el.closest('.v-panel__rail').dataset.navLeft = '.v-panel__body';
  panel.stepTab = (d) => {
    rail.step(d);
    FocusManager.focus(rail.activeTab, { silent: true });
  };
  return panel;
}
