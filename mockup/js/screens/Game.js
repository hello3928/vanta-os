// Game page: hero with logo, play bar, per-game performance profile, compatibility and details.
// Real OS: the profile is saved per game and vantad applies it at launch.

import { VTopBar } from '../components/VTopBar.js';
import { VButton } from '../components/VButton.js';
import { VChoice } from '../components/VChoice.js';
import { VSlider } from '../components/VSlider.js';
import { VToggle } from '../components/VToggle.js';
import { VBadge } from '../components/VBadge.js';
import { VPanel } from '../components/VPanel.js';
import { VListItem } from '../components/VListItem.js';
import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Settings } from '../core/Settings.js';
import { esc, h } from '../core/util.js';
import { gameById, systemOf, BIOS_LABEL } from '../data.js';
import { hero, logo } from '../art/index.js';
import { playtime } from './shared.js';

export class GameScreen {
  constructor(app, { id }) {
    const g = gameById(id);
    const sys = systemOf(g);
    this.app = app;
    this.el = h('div', 'screen screen--game');
    const scroll = h('div', 'screen__scroll');

    const heroEl = h('div', 'game__hero');
    const bg = h('img', 'game__bg');
    bg.src = hero(g);
    bg.alt = '';
    const lg = h('img', 'game__logo');
    lg.src = logo(g);
    lg.alt = g.title;
    heroEl.append(bg, h('div', 'game__shade'), lg);

    const bar = h('div', 'game__bar');
    bar.dataset.focusGroup = '';
    this.play = new VButton({ label: g.installed ? 'Play' : 'Install', icon: g.installed ? 'play' : 'download', variant: 'primary', size: 'lg', activateSound: null });
    this.play.on('activate', () => app.launch(g));
    const stats = h('div', 'game__stats');
    const stat = (label, value) => `<div class="game__stat"><span>${esc(label)}</span><strong>${value}</strong></div>`;
    stats.innerHTML =
      stat('Last played', esc(g.last)) +
      stat('Play time', esc(playtime(g).replace(' played', ''))) +
      (g.ach
        ? stat('Achievements', `${g.ach[0]}/${g.ach[1]} <span class="game__ach"><span style="width:${Math.round((g.ach[0] / g.ach[1]) * 100)}%"></span></span>`)
        : stat('Emulator', esc(sys.emulator)));
    const props = new VButton({ icon: 'sliders', ariaLabel: 'Game properties', onActivate: () => this.properties(g) });
    bar.append(this.play.el, stats, props.el);

    const body = h('div', 'game__body');
    const profile = h('section', 'game__card');
    profile.dataset.focusGroup = '';
    profile.append(h('h2', 'game__card-title', 'Performance profile'), h('p', 'game__card-note', 'Applies to this game only. Everything else uses your defaults.'));
    [
      new VSlider({ label: 'TDP limit', icon: 'bolt', min: 3, max: 30, step: 1, value: Settings.get('tdp'), format: (v) => `${v} W` }),
      new VChoice({ label: 'Frame limit', icon: 'gauge', options: ['Off', '30', '40', '60', '90', '120'], value: Settings.get('fpsLimit') }),
      new VChoice({ label: 'Upscaling (FSR)', icon: 'sparkle', options: ['Off', 'Quality', 'Balanced', 'Performance'], value: Settings.get('upscaling') }),
      sys
        ? new VChoice({ label: 'Internal resolution', icon: 'desktop', options: ['Native', '2×', '3×', '4×'], value: '2×' })
        : new VChoice({ label: 'Compatibility tool', icon: 'chip', options: ['Proton 10', 'Proton Experimental', 'GE-Proton'] }),
      new VToggle({ label: 'Performance overlay', detail: 'Frame rate, frame time and power draw', icon: 'gauge' }),
    ].forEach((c) => profile.append(c.el));

    const side = h('aside', 'game__side');
    const compat = h('section', 'game__card');
    compat.append(h('h2', 'game__card-title', 'Compatibility'));
    if (sys) {
      compat.append(new VBadge({ ...BIOS_LABEL[sys.bios], icon: 'chip' }).el, h('p', 'game__card-note', `Runs in ${esc(sys.emulator)} with controller mapping and save states set up.`));
    } else {
      compat.append(new VBadge({ text: 'Vanta Ready', tone: 'good', icon: 'check' }).el, h('p', 'game__card-note', 'Tested on Vanta OS. Controls, text size and default performance are all good.'));
    }
    const details = h('section', 'game__card');
    details.innerHTML = `<h2 class="game__card-title">Details</h2>
      <dl class="game__dl">
        <dt>Genre</dt><dd>${esc(g.genre)}</dd>
        <dt>Source</dt><dd>${esc(sys ? sys.name : 'Steam')}</dd>
        <dt>Size</dt><dd>${esc(g.size || 'ROM file')}</dd>
      </dl>`;
    side.append(compat, details);
    body.append(profile, side);

    scroll.append(heroEl, new VTopBar({ app, title: g.title }).el, bar, body);
    this.el.append(
      scroll,
      new VHintBar({
        hints: [
          ['accept', 'Select'],
          ['options', 'Properties'],
          ['back', 'Back'],
        ],
      }).el,
    );
    this.game = g;
  }

  enter() {
    FocusManager.focus(this.play, { silent: true });
  }

  onOptions() {
    this.properties(this.game);
  }

  properties(g) {
    const sys = systemOf(g);
    const panel = new VPanel({ title: 'Properties', subtitle: g.title });
    const items = [
      sys
        ? new VChoice({ label: 'Emulator', icon: 'chip', options: [sys.emulator, ...(sys.emulator.startsWith('RetroArch') ? [] : ['RetroArch core'])] })
        : new VChoice({ label: 'Compatibility tool', icon: 'chip', options: ['Proton 10', 'Proton Experimental', 'GE-Proton'] }),
      new VListItem({ label: 'Browse local files', icon: 'folder', chevron: true, onActivate: () => VToast.show('Mockup: this opens the file browser', { icon: 'folder' }) }),
      new VListItem({ label: 'Controller layout', icon: 'gamepad', chevron: true, onActivate: () => VToast.show('Mockup: per-game controller layouts come in a later milestone', { icon: 'gamepad' }) }),
    ];
    if (g.installed) {
      items.push(
        new VButton({
          label: 'Uninstall',
          icon: 'trash',
          variant: 'danger',
          block: true,
          onActivate: async () => {
            const ok = await VDialog.confirm({
              title: `Uninstall ${g.title}?`,
              body: g.size ? `This frees ${g.size}. Your saves stay in the cloud and on this device.` : 'Your save files and save states stay on this device.',
              confirmLabel: 'Uninstall',
              danger: true,
            });
            if (ok) VToast.show(`Mockup: ${g.title} would be uninstalled now`, { icon: 'trash' });
          },
        }),
      );
    }
    panel.addItems(items).open();
  }
}

