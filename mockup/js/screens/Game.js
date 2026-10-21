// Game page: hero with logo, play bar, then the per-game performance profile beside plain details.
// The hero and logo morph in from the screen you came from (View Transitions), and the game's
// music keeps playing from Home.
// Real OS: the profile is saved per game and vantad applies it at launch.

import { VButton } from '../components/VButton.js';
import { VDropdown } from '../components/VDropdown.js';
import { frameLimit, tdpSlider, upscaling, runtimeControl } from './perf.js';
import { Device, runtimeOf, gameUpscalers } from '../core/Device.js';
import { VSlider } from '../components/VSlider.js';
import { VToggle } from '../components/VToggle.js';
import { VBadge } from '../components/VBadge.js';
import { VPanel } from '../components/VPanel.js';
import { VListItem } from '../components/VListItem.js';
import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';
import { FocusManager } from '../core/FocusManager.js';
import { GameMusic } from '../core/GameMusic.js';
import { Settings } from '../core/Settings.js';
import { t, relDays } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { gameById, systemOf, BIOS_LABEL } from '../data.js';
import { artImg, screenshots } from '../art/index.js';
import { VRow } from '../components/VRow.js';
import { VTile } from '../components/VTile.js';
import { openLightbox } from './Lightbox.js';
import { capitalize } from './shared.js';

export class GameScreen {
  constructor(app, { id }) {
    const g = gameById(id);
    const sys = systemOf(g);
    this.app = app;
    this.game = g;
    this.el = h('div', 'screen screen--game');
    const scroll = h('div', 'screen__scroll');

    const heroEl = h('div', 'game__hero');
    const bg = artImg(g, 'hero', `game__bg${sys ? ' is-pixel' : ''}`);
    const lg = artImg(g, 'logo', 'game__logo');
    lg.alt = g.title;
    const shade = h('div', 'game__shade');
    heroEl.append(bg, shade, lg);
    if (app.running !== g) GameMusic.attach(heroEl, g, shade);

    const bar = h('div', 'game__bar');
    bar.dataset.focusGroup = '';
    bar.dataset.scrollTop = '';
    const running = app.running === g;
    this.play = new VButton({
      label: running ? t('resume') : g.installed ? t('play') : t('install'),
      icon: running ? 'resume' : g.installed ? 'play' : 'download',
      variant: g.installed || running ? 'play' : 'primary',
      size: 'lg',
      activateSound: null,
    });
    this.play.on('activate', () => (running ? app.resume() : app.launch(g)));
    const stat = (label, value) => `<div class="game__stat"><span>${esc(label)}</span><strong>${value}</strong></div>`;
    const stats = h('div', 'game__stats');
    stats.innerHTML =
      stat(t('lastPlayed'), esc(g.last == null ? t('never') : capitalize(relDays(g.last)))) +
      stat(t('playTime'), esc(g.hours ? t('hours', { n: g.hours }) : '—')) +
      (g.ach
        ? stat(t('achievements'), `${g.ach[0]}/${g.ach[1]} <span class="game__ach"><span style="width:${Math.round((g.ach[0] / g.ach[1]) * 100)}%"></span></span>`)
        : stat(t('emulator'), esc(sys.emulator)));
    const props = new VButton({ icon: 'sliders', ariaLabel: t('properties'), onActivate: () => this.properties() });
    bar.append(this.play.el, stats, props.el);

    const body = h('div', 'game__body');
    const profile = h('section', 'game__section');
    profile.dataset.focusGroup = '';
    profile.append(h('h2', 'game__heading', esc(t('perfProfile'))));
    [
      tdpSlider({ value: Settings.get('tdp') }),
      frameLimit({ value: Device.frameOptions().includes(Settings.get('fpsLimit')) ? Settings.get('fpsLimit') : 'Off' }),
      sys ? new VDropdown({ label: t('internalRes'), options: ['Native', '2×', '3×', '4×'], value: '2×' }) : upscaling({ game: g, value: Settings.get('upscaling') }),
      runtimeControl(g),
      new VToggle({ label: t('perfOverlay') }),
    ].forEach((c) => profile.append(c.el));

    const side = h('aside', 'game__side');
    const badge = sys ? new VBadge({ text: t(BIOS_LABEL[sys.bios].key), tone: BIOS_LABEL[sys.bios].tone }) : new VBadge({ text: t('verified'), tone: 'good', icon: 'check' });
    const compat = h('section', 'game__section');
    compat.append(h('h2', 'game__heading', esc(t('compatibility'))), badge.el, h('p', 'game__note', esc(sys ? t('emuNote', { emu: sys.emulator }) : t('verifiedNote'))));
    const details = h('section', 'game__section');
    details.innerHTML = `<h2 class="game__heading">${esc(t('details'))}</h2>
      <dl class="game__dl">
        <dt>${esc(t('genre'))}</dt><dd>${esc(g.genre)}</dd>
        <dt>${esc(t('source'))}</dt><dd>${esc(sys ? sys.name : 'Steam')}</dd>
        <dt>${esc(t('runsWith'))}</dt><dd>${esc(runtimeLabel(g))}</dd>
        ${upscalerList(g)}
        ${g.size ? `<dt>${esc(t('size'))}</dt><dd>${esc(g.size)}</dd>` : ''}
      </dl>`;
    side.append(compat, details);
    body.append(profile, side);

    const parts = [heroEl, h('div', 'shell-gap'), bar];
    const thumbs = screenshots(g, 'thumb');
    if (thumbs.length) {
      const full = screenshots(g, 'full');
      const shelf = new VRow({ title: t('screenshots') });
      shelf.el.classList.add('game__shots');
      thumbs.forEach((src, i) => shelf.addItem(new VTile({ shape: 'landscape', src, title: `${g.title} ${i + 1}`, onActivate: () => openLightbox(full, i, g.title) })));
      parts.push(shelf.el);
    }
    scroll.append(...parts, body);
    this.el.append(scroll);
    this.shell = { title: g.title, hints: [
          ['accept', t('select')],
          ['options', t('properties')],
          ['back', t('back')],
        ] };
  }

  enter() {
    FocusManager.focus(this.play, { silent: true });
  }

  onOptions() {
    this.properties();
  }

  properties() {
    const g = this.game;
    const sys = systemOf(g);
    const panel = new VPanel({ title: t('properties'), subtitle: g.title });
    const items = [
      runtimeControl(g, { icon: 'chip' }),
      new VToggle({ label: t('cloudSaves'), icon: 'cloud', value: true }),
      new VListItem({ label: t('browseFiles'), icon: 'folder', chevron: true, onActivate: () => VToast.show(t('notAvailable'), { icon: 'info' }) }),
    ];
    if (g.installed) {
      items.push(
        new VListItem({
          label: t('uninstall'),
          detail: g.size || '',
          icon: 'trash',
          chevron: true,
          onActivate: async () => {
            const ok = await VDialog.confirm({ title: t('uninstallQ', { game: g.title }), body: t('uninstallBody'), confirmLabel: t('uninstall'), cancelLabel: t('cancel'), danger: true });
            if (!ok) return;
            g.installed = false;
            panel.close({ silent: true });
            VToast.show(t('uninstalled', { game: g.title }), { icon: 'trash' });
            this.app.refresh();
          },
        }),
      );
    }
    panel.addItems(items).open();
  }
}

function runtimeLabel(g) {
  const runtime = runtimeOf(g);
  if (runtime === 'emulator') return systemOf(g).emulator;
  return runtime === 'native' ? t('runtimeNative') : 'Proton';
}

// The game's own upscalers, with the ones this GPU can't run marked.
function upscalerList(g) {
  const list = gameUpscalers(g);
  if (!list.length) return '';
  const items = list.map((u) => (u.works ? esc(u.name) : `<span class="game__na">${esc(u.name)} (${esc(t('needsNvidia'))})</span>`)).join(', ');
  return `<dt>${esc(t('gameUpscalers'))}</dt><dd>${items}</dd>`;
}
