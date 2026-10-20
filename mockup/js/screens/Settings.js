// Settings: category list on the left, the focused category's controls on the right.
// B inside the controls returns to the list; B on the list leaves Settings.

import { VTopBar } from '../components/VTopBar.js';
import { VListItem } from '../components/VListItem.js';
import { VToggle } from '../components/VToggle.js';
import { VSlider } from '../components/VSlider.js';
import { VChoice } from '../components/VChoice.js';
import { VButton } from '../components/VButton.js';
import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Motion } from '../core/motion.js';
import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { esc, h } from '../core/util.js';
import { GAMES, SYSTEMS, BIOS_LABEL } from '../data.js';
import { DIRECTIONS } from '../brand.js';

const EMU_COUNT = GAMES.filter((g) => g.source === 'emu').length;
const ACCENTS = { Ion: 'ion', Ember: 'ember', Mint: 'mint' };
const BRANDS = Object.fromEntries(Object.entries(DIRECTIONS).map(([id, d]) => [d.name, id]));
const nameOf = (map, id) => Object.keys(map).find((k) => map[k] === id);

const note = (text) => h('p', 'settings__note', esc(text));
const label = (text) => h('div', 'settings__label', esc(text));

const SECTIONS = [
  {
    id: 'display',
    label: 'Display',
    icon: 'desktop',
    build: () => [
      new VSlider({ label: 'Brightness', icon: 'sun', min: 10, max: 100, step: 5, bind: 'brightness' }),
      new VToggle({ label: 'Variable refresh rate', detail: 'Smoother frame pacing on displays that support it', icon: 'gauge', bind: 'vrr' }),
      new VToggle({ label: 'HDR', detail: 'Uses gamescope HDR when the display supports it', icon: 'sun', bind: 'hdr' }),
      new VChoice({ label: 'Upscaling (FSR)', detail: 'Default for games without their own profile', icon: 'sparkle', options: ['Off', 'Quality', 'Balanced', 'Performance'], bind: 'upscaling' }),
      new VChoice({ label: 'Frame limit', icon: 'gauge', options: ['Off', '30', '40', '60', '90', '120'], bind: 'fpsLimit' }),
    ],
  },
  {
    id: 'sound',
    label: 'Sound',
    icon: 'volume',
    build: () => {
      const row = h('div', 'settings__buttons');
      row.dataset.focusGroup = '';
      [
        ['select', 'Select'],
        ['back', 'Back'],
        ['toggleOn', 'Toggle'],
        ['notify', 'Notification'],
        ['error', 'Error'],
        ['boot', 'Start-up'],
      ].forEach(([name, text]) => row.append(new VButton({ label: text, size: 'sm', activateSound: null, onActivate: () => Sound.play(name) }).el));
      return [
        new VSlider({ label: 'Volume', icon: 'volume', min: 0, max: 100, step: 5, bind: 'volume' }),
        new VToggle({ label: 'Interface sounds', detail: 'Quiet clicks when you move and select', icon: 'volume', bind: 'sfx' }),
        new VSlider({ label: 'Interface sound volume', icon: 'volume', min: 0, max: 100, step: 5, bind: 'sfxVolume' }),
        label('Preview'),
        row,
      ];
    },
  },
  {
    id: 'controllers',
    label: 'Controllers',
    icon: 'gamepad',
    build: () => {
      const status = new VListItem({ label: 'Connected controllers', detail: Haptics.describe(), icon: 'gamepad' });
      window.addEventListener('gamepadconnected', () => status.setDetail(Haptics.describe()));
      return [
        status,
        new VChoice({ label: 'Haptics strength', detail: 'Rumble in games and in menus', icon: 'vibrate', options: ['Off', 'Low', 'High'], bind: 'haptics' }),
        new VToggle({ label: 'Haptics in menus', detail: 'A light tick each time the selection moves', icon: 'vibrate', bind: 'menuHaptics' }),
        new VListItem({ label: 'Test haptics', detail: 'Left motor, right motor, then both', icon: 'vibrate', chevron: true, onActivate: () => Haptics.play('test', { force: true }) }),
        new VListItem({ label: 'Button layout', detail: 'Remap buttons and back paddles', icon: 'gamepad', chevron: true, onActivate: () => VToast.show('Not available in this preview', { icon: 'info' }) }),
      ];
    },
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: 'bolt',
    build: () => [
      new VSlider({ label: 'Default TDP limit', icon: 'bolt', min: 3, max: 30, step: 1, bind: 'tdp', format: (v) => `${v} W` }),
      new VChoice({ label: 'CPU energy preference', detail: 'amd-pstate EPP', icon: 'chip', options: ['Power saver', 'Balanced', 'Performance'], bind: 'epp' }),
      new VChoice({ label: 'CPU scheduler', detail: 'scx_lavd keeps games responsive under load', icon: 'chip', options: ['scx_lavd', 'Kernel default'], bind: 'scheduler' }),
      new VToggle({ label: 'GameMode', detail: 'Raises game priority while playing', icon: 'gauge', bind: 'gamemode' }),
    ],
  },
  {
    id: 'emulation',
    label: 'Emulation',
    icon: 'disc',
    build: () => [
      new VListItem({ label: 'ROM folder', detail: '~/Games/roms/<system>', icon: 'folder', trail: `${EMU_COUNT} games` }),
      new VListItem({
        label: 'Rescan library',
        detail: 'Look for new games and BIOS files',
        icon: 'restart',
        chevron: true,
        onActivate: () => setTimeout(() => VToast.show(`Library is up to date: ${EMU_COUNT} games across ${SYSTEMS.length} systems`, { icon: 'check' }), 400),
      }),
      label('Systems'),
      ...SYSTEMS.map((s) => new VListItem({ label: s.name, detail: s.emulator, badge: BIOS_LABEL[s.bios] })),
      note('Vanta OS never includes BIOS files or games. Copy files you own into the folders above.'),
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: 'palette',
    build: () => {
      const accent = new VChoice({ label: 'Accent color', icon: 'palette', options: Object.keys(ACCENTS), value: nameOf(ACCENTS, Settings.get('accent')) });
      accent.on('change', (n) => Settings.set('accent', ACCENTS[n]));
      const brand = new VChoice({ label: 'Logo', detail: DIRECTIONS[Settings.get('brand')].summary, icon: 'sparkle', options: Object.keys(BRANDS), value: nameOf(BRANDS, Settings.get('brand')) });
      brand.on('change', (n) => {
        Settings.set('brand', BRANDS[n]);
        brand.el.querySelector('.v-control__detail').textContent = DIRECTIONS[BRANDS[n]].summary;
      });
      const link = h('a', 'settings__link', 'Compare the three logo directions');
      link.href = 'logos.html';
      return [accent, brand, link];
    },
  },
  {
    id: 'updates',
    label: 'System updates',
    icon: 'update',
    build: () => [
      new VListItem({ label: 'Vanta OS 0.1.0', detail: 'ghcr.io/hello3928/vanta-os:stable', icon: 'info', badge: { text: 'Up to date', tone: 'good' } }),
      new VChoice({ label: 'Update channel', icon: 'update', options: ['Stable', 'Beta'], bind: 'channel' }),
      new VListItem({ label: 'Check for updates', icon: 'update', chevron: true, onActivate: () => setTimeout(() => VToast.show('You have the latest version', { icon: 'check' }), 500) }),
      new VListItem({
        label: 'Roll back to previous version',
        detail: 'Restart into 0.0.9. Games, saves and settings are kept.',
        icon: 'restart',
        chevron: true,
        onActivate: async () => {
          const ok = await VDialog.confirm({
            title: 'Roll back to 0.0.9?',
            body: 'The device restarts into the previous system image. Your games, saves and settings are kept.',
            confirmLabel: 'Roll back and restart',
            danger: true,
          });
          if (ok) VToast.show('Rollback scheduled. Restart to finish.', { icon: 'restart' });
        },
      }),
    ],
  },
  {
    id: 'about',
    label: 'About',
    icon: 'info',
    build: () => [
      new VListItem({ label: 'Device', detail: 'ROG Ally X · AMD Ryzen Z1 Extreme · 24 GB', icon: 'chip' }),
      new VListItem({ label: 'Storage', detail: '412 GB free of 1 TB', icon: 'storage' }),
      new VListItem({ label: 'Software', detail: 'Fedora Atomic (bootc) · Mesa RADV · gamescope · Proton', icon: 'info' }),
    ],
  },
];

export class SettingsScreen {
  constructor(app) {
    this.app = app;
    this.el = h('div', 'screen screen--settings');
    const scroll = h('div', 'screen__scroll');
    const layout = h('div', 'settings');
    const nav = h('nav', 'settings__nav');
    nav.dataset.focusGroup = '';
    nav.dataset.highlight = '';
    this.pane = h('div', 'settings__pane');
    this.pane.dataset.focusGroup = '';
    this.pane.dataset.highlight = '';
    this.items = SECTIONS.map((s) => {
      const item = new VListItem({ label: s.label, icon: s.icon });
      item.on('focus', () => this.show(s));
      item.on('activate', () => {
        const first = this.pane.querySelector('.v-focusable')?.__v;
        if (first) FocusManager.focus(first, { silent: true });
      });
      nav.append(item.el);
      return item;
    });
    layout.append(nav, this.pane);
    scroll.append(new VTopBar({ app, title: 'Settings' }).el, layout);
    this.el.append(
      scroll,
      new VHintBar({
        hints: [
          ['accept', 'Select'],
          ['back', 'Back'],
        ],
      }).el,
    );
    this.show(SECTIONS[0]);
  }

  enter() {
    FocusManager.focus(this.items[0], { silent: true });
  }

  show(section) {
    if (this.section === section) return;
    this.section = section;
    this.items.forEach((it, i) => it.setSelected(SECTIONS[i] === section));
    this.pane.replaceChildren(h('h2', 'settings__pane-title', esc(section.label)), ...section.build().map((c) => c.el || c));
    if (this.built) Motion.stagger(this.pane.children, { from: 'translateY(6px)', step: 14, duration: 260 });
    this.built = true;
  }

  onBack() {
    const cur = FocusManager.current;
    if (cur && this.pane.contains(cur.el)) {
      FocusManager.focus(this.items[SECTIONS.indexOf(this.section)], { silent: true });
      return true;
    }
    return false;
  }
}
