// Settings: category list on the left, the focused category's rows on the right.
// Rows are label + value, with a second line only where it tells you something you need.
// B inside the rows returns to the list; B on the list leaves Settings.

import { VListItem } from '../components/VListItem.js';
import { VToggle } from '../components/VToggle.js';
import { VSlider } from '../components/VSlider.js';
import { VDropdown } from '../components/VDropdown.js';
import { VButton } from '../components/VButton.js';
import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';
import { FocusManager } from '../core/FocusManager.js';
import { Motion } from '../core/motion.js';
import { Settings } from '../core/Settings.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { t, i18n, LANGUAGES } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { GAMES, SYSTEMS, BIOS_LABEL } from '../data.js';
import { DIRECTIONS } from '../brand.js';
import { Profiles } from '../core/Profiles.js';
import { openProfileEditor } from './ProfileEditor.js';

const EMU_COUNT = GAMES.filter((g) => g.source === 'emu').length;
const ACCENTS = { Ion: 'ion', Ember: 'ember', Mint: 'mint' };
const BRANDS = Object.fromEntries(Object.entries(DIRECTIONS).map(([id, d]) => [d.name, id]));
const nameOf = (map, id) => Object.keys(map).find((k) => map[k] === id);
const label = (text) => h('div', 'settings__label', esc(text));
const note = (text) => h('p', 'settings__note', esc(text));

const SECTIONS = [
  {
    id: 'profile',
    label: () => t('profile'),
    icon: 'person',
    build: (app) => {
      const me = Profiles.current;
      const rows = [];
      if (me) {
        const edit = new VListItem({ label: me.name, detail: t('editProfile'), chevron: true });
        edit.on('activate', () => openProfileEditor(app, me));
        rows.push(edit);
      }
      rows.push(new VListItem({ label: t('switchUser'), chevron: true, onActivate: () => app.switchUser() }));
      return rows;
    },
  },
  {
    id: 'display',
    label: () => t('display'),
    icon: 'desktop',
    build: () => [
      new VSlider({ label: t('brightness'), min: 10, max: 100, step: 5, bind: 'brightness' }),
      new VToggle({ label: t('vrr'), bind: 'vrr' }),
      new VToggle({ label: t('hdr'), bind: 'hdr' }),
      new VDropdown({ label: t('upscaling'), options: ['Off', 'Quality', 'Balanced', 'Performance'], bind: 'upscaling' }),
      new VDropdown({ label: t('frameLimit'), options: ['Off', '30', '40', '60', '90', '120'], bind: 'fpsLimit' }),
    ],
  },
  {
    id: 'sound',
    label: () => t('sound'),
    icon: 'volume',
    build: () => {
      const row = h('div', 'settings__buttons');
      row.dataset.focusGroup = '';
      [
        ['select', t('previewSelect')],
        ['toggleOn', t('previewToggle')],
        ['notify', t('previewNotify')],
        ['error', t('previewError')],
      ].forEach(([name, text]) => row.append(new VButton({ label: text, size: 'sm', activateSound: null, onActivate: () => Sound.play(name) }).el));
      return [
        new VSlider({ label: t('volume'), min: 0, max: 100, step: 5, bind: 'volume' }),
        new VToggle({ label: t('gameMusic'), bind: 'gameMusic' }),
        new VSlider({ label: t('musicVolume'), min: 0, max: 100, step: 5, bind: 'musicVolume' }),
        new VToggle({ label: t('trailerBg'), bind: 'trailerVideo' }),
        new VToggle({ label: t('interfaceSounds'), bind: 'sfx' }),
        new VSlider({ label: t('uiVolume'), min: 0, max: 100, step: 5, bind: 'sfxVolume' }),
        label(t('preview')),
        row,
      ];
    },
  },
  {
    id: 'controllers',
    label: () => t('controllers'),
    icon: 'gamepad',
    build: () => {
      const status = new VListItem({ label: t('connectedControllers'), detail: describePads() });
      window.addEventListener('gamepadconnected', () => status.setDetail(describePads()));
      return [
        status,
        new VDropdown({ label: t('buttonPrompts'), detail: t('buttonPromptsDetail'), options: ['Automatic', 'Xbox', 'PlayStation', 'Nintendo', 'Steam Deck'], bind: 'glyphs' }),
        new VDropdown({ label: t('hapticsStrength'), options: ['Off', 'Low', 'High'], bind: 'haptics' }),
        new VToggle({ label: t('menuHaptics'), bind: 'menuHaptics' }),
        new VListItem({ label: t('testHaptics'), chevron: true, onActivate: () => Haptics.play('test', { force: true }) }),
        new VListItem({ label: t('buttonLayout'), chevron: true, onActivate: () => VToast.show(t('notAvailable'), { icon: 'info' }) }),
      ];
    },
  },
  {
    id: 'performance',
    label: () => t('performance'),
    icon: 'bolt',
    build: () => [
      new VSlider({ label: t('defaultTdp'), min: 3, max: 30, step: 1, bind: 'tdp', format: (v) => `${v} W` }),
      new VDropdown({ label: t('epp'), options: ['Power saver', 'Balanced', 'Performance'], bind: 'epp' }),
      new VDropdown({ label: t('scheduler'), options: ['scx_lavd', 'Kernel default'], bind: 'scheduler' }),
      new VToggle({ label: 'GameMode', bind: 'gamemode' }),
    ],
  },
  {
    id: 'emulation',
    label: () => t('emulation'),
    icon: 'disc',
    build: () => [
      new VListItem({ label: t('romFolder'), detail: '~/Games/roms', trail: t('gamesCount', { n: EMU_COUNT }) }),
      new VListItem({ label: t('rescan'), chevron: true, onActivate: () => setTimeout(() => VToast.show(t('libraryUpToDate'), { icon: 'checkCircle' }), 400) }),
      label(t('systems')),
      ...SYSTEMS.map((s) => new VListItem({ label: s.name, detail: s.emulator, badge: { text: t(BIOS_LABEL[s.bios].key), tone: BIOS_LABEL[s.bios].tone } })),
      note(t('biosNote')),
    ],
  },
  {
    id: 'appearance',
    label: () => t('appearance'),
    icon: 'palette',
    build: () => {
      const accent = new VDropdown({ label: t('accent'), options: Object.keys(ACCENTS), value: nameOf(ACCENTS, Settings.get('accent')) });
      accent.on('change', (n) => Settings.set('accent', ACCENTS[n]));
      const brand = new VDropdown({ label: t('logo'), options: Object.keys(BRANDS), value: nameOf(BRANDS, Settings.get('brand')) });
      brand.on('change', (n) => Settings.set('brand', BRANDS[n]));
      const link = h('a', 'settings__link', esc(t('compareLogos')));
      link.href = 'logos.html';
      return [accent, brand, link];
    },
  },
  {
    id: 'language',
    label: () => t('language'),
    icon: 'language',
    build: () => {
      const choice = new VDropdown({ label: t('language'), options: LANGUAGES.map((l) => ({ value: l.code, label: l.name })), value: i18n.lang });
      choice.on('change', (code) => Settings.set('language', code));
      return [choice];
    },
  },
  {
    id: 'system',
    label: () => t('system'),
    icon: 'update',
    build: (app) => [
      new VListItem({ label: 'Vanta OS 0.1.0', detail: 'ghcr.io/hello3928/vanta-os:stable', badge: { text: t('upToDate'), tone: 'good' } }),
      new VDropdown({ label: t('updateChannel'), options: ['Stable', 'Beta'], bind: 'channel' }),
      new VListItem({ label: t('checkUpdates'), chevron: true, onActivate: () => setTimeout(() => VToast.show(t('latest'), { icon: 'checkCircle' }), 500) }),
      new VListItem({
        label: t('rollback'),
        chevron: true,
        onActivate: async () => {
          const ok = await VDialog.confirm({ title: t('rollbackQ'), body: t('rollbackBody'), confirmLabel: t('rollbackConfirm'), cancelLabel: t('cancel'), danger: true });
          if (ok) VToast.show(t('rollbackScheduled'), { icon: 'restart' });
        },
      }),
      new VListItem({ label: t('runSetup'), chevron: true, onActivate: () => app.go('setup', {}, { replace: true }) }),
      new VListItem({ label: t('componentGallery'), chevron: true, onActivate: () => app.go('kit') }),
    ],
  },
  {
    id: 'about',
    label: () => t('about'),
    icon: 'info',
    build: () => [
      new VListItem({ label: t('device'), detail: 'ROG Ally X · AMD Ryzen Z1 Extreme · 24 GB' }),
      new VListItem({ label: t('storage'), detail: t('storageVal', { free: '412 GB', total: '1 TB' }) }),
      new VListItem({ label: t('software'), detail: 'Fedora Atomic (bootc) · Mesa RADV · gamescope · Proton' }),
    ],
  },
];

function describePads() {
  let pads = [];
  try {
    pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
  } catch {
    /* blocked */
  }
  return pads.length ? pads.map((p) => p.id.replace(/\(.*?\)/g, '').trim()).join(', ') : t('noController');
}

export class SettingsScreen {
  constructor(app, { section } = {}) {
    this.app = app;
    this.el = h('div', 'screen screen--settings');
    const scroll = h('div', 'screen__scroll');
    const layout = h('div', 'settings');
    const nav = h('nav', 'settings__nav');
    nav.dataset.focusGroup = '';
    this.pane = h('div', 'settings__pane');
    this.pane.dataset.focusGroup = '';
    this.items = SECTIONS.map((s) => {
      const item = new VListItem({ label: s.label(), icon: s.icon });
      item.on('focus', () => this.show(s));
      item.on('activate', () => {
        const first = this.pane.querySelector('.v-focusable')?.__v;
        if (first) FocusManager.focus(first, { silent: true });
      });
      nav.append(item.el);
      return item;
    });
    layout.append(nav, this.pane);
    scroll.append(h('div', 'shell-gap'), layout);
    this.el.append(scroll);
    this.shell = { title: t('settings'), hints: [
          ['accept', t('select')],
          ['back', t('back')],
        ] };
    this.start = SECTIONS.find((s) => s.id === section) || SECTIONS[0];
    this.show(this.start);
  }

  enter() {
    FocusManager.focus(this.items[SECTIONS.indexOf(this.start)], { silent: true });
  }

  show(section) {
    if (this.section === section) return;
    this.section = section;
    this.items.forEach((it, i) => it.setSelected(SECTIONS[i] === section));
    this.pane.replaceChildren(h('h2', 'settings__pane-title', esc(section.label())), ...section.build(this.app).map((c) => c.el || c));
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
