// Home: hero art for the selected game, recent games shelf, recently added, emulation.
// Motion: the hero crossfades and settles when the selection changes, then drifts slowly;
// the logo and details rise in after it. The selected game's trailer becomes the music.
// Pull the hero down (drag, or Up from the top shelf) to expand the trailer to full screen.

import { VTopBar } from '../components/VTopBar.js';
import { VRow } from '../components/VRow.js';
import { VTile } from '../components/VTile.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Motion } from '../core/motion.js';
import { GameMusic } from '../core/GameMusic.js';
import { t, relDays } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { GAMES } from '../data.js';
import { setArt } from '../art/index.js';
import { gameCapsule, playtime } from './shared.js';
import { openTrailer } from './TrailerView.js';

const PULL_OPEN = 110; // px of pull that opens the full-screen trailer

export class HomeScreen {
  constructor(app) {
    this.app = app;
    this.el = h('div', 'screen screen--home');
    const scroll = (this.scroll = h('div', 'screen__scroll'));

    this.heroEl = h('div', 'home__hero');
    this.layers = [h('img', 'home__bg'), h('img', 'home__bg')];
    this.layers.forEach((img) => (img.alt = ''));
    this.shade = h('div', 'home__shade');
    this.heroEl.append(...this.layers, this.shade);

    this.intro = h('div', 'home__intro');
    this.logoEl = h('img', 'home__logo');
    this.logoEl.alt = '';
    this.metaEl = h('div', 'home__meta');
    this.intro.append(this.logoEl, this.metaEl);

    let recent = GAMES.filter((g) => g.recent).sort((a, b) => a.recent - b.recent);
    if (app.running) recent = [app.running, ...recent.filter((g) => g !== app.running)];
    this.recentRow = new VRow({ title: t('recentGames'), align: 'start' });
    this.recentRow.el.dataset.scrollTop = '';
    this.tiles = recent.map((g) => {
      const tile = this.recentRow.addItem(gameCapsule(app, g));
      tile.on('focus', () => this.show(g));
      tile.on('edge', (dir) => dir === 'up' && this.expand());
      return tile;
    });
    const lib = new VTile({ title: t('library'), glyph: 'library', onActivate: () => app.go('library') });
    lib.on('edge', (dir) => dir === 'up' && this.expand());
    this.recentRow.addItem(lib);

    const added = new VRow({ title: t('recentlyAdded') });
    GAMES.filter((g) => g.added != null)
      .sort((a, b) => a.added - b.added)
      .forEach((g) => {
        const tile = new VTile({ shape: 'card', game: g, kind: 'header', title: g.title, kicker: t('addedWhen', { when: relDays(g.added) }) });
        tile.on('focus', () => this.show(g));
        tile.on('activate', () => app.openGame(g, tile));
        added.addItem(tile);
      });

    const emu = new VRow({ title: t('emulation') });
    GAMES.filter((g) => g.source === 'emu').forEach((g) => {
      const tile = emu.addItem(gameCapsule(app, g));
      tile.on('focus', () => this.show(g));
    });

    this.content = h('div', 'home__content');
    this.content.append(this.intro, this.recentRow.el, added.el, emu.el);
    scroll.append(this.heroEl, new VTopBar({ app }).el, this.content);
    this.el.append(
      scroll,
      new VHintBar({
        hints: [
          ['accept', t('open')],
          ['up', t('trailer')],
          ['qam', t('quickAccess')],
          ['mainMenu', t('menu')],
        ],
      }).el,
    );
    this.render(recent[0], { instant: true });
    GameMusic.attach(this.heroEl, this.game, this.shade);
    this.pullGesture();
  }

  enter() {
    const g = this.app.lastGame;
    const tile = this.tiles.find((x) => x.game === g) || this.tiles[0];
    FocusManager.focus(tile, { silent: true });
    this.render(tile.game, { instant: true });
    GameMusic.select(this.game);
  }

  // Wait for the selection to settle before swapping the hero, so fast scrolling stays calm.
  show(g) {
    clearTimeout(this.pending);
    this.pending = setTimeout(() => this.render(g), 90);
  }

  render(g, { instant = false } = {}) {
    if (g === this.game) return;
    this.game = g;
    if (!instant) GameMusic.select(g);
    const front = this.layers.find((l) => l.classList.contains('is-on'));
    const next = this.layers.find((l) => l !== front);
    setArt(next, g, 'hero');
    next.classList.toggle('is-pixel', g.source === 'emu');
    const swap = () => {
      if (this.game !== g) return;
      next.classList.remove('is-on');
      void next.offsetWidth;
      next.classList.add('is-on');
      next.style.viewTransitionName = 'hero';
      if (front) {
        front.classList.remove('is-on');
        front.style.viewTransitionName = '';
      }
    };
    if (instant || next.complete) swap();
    else next.decode().then(swap, swap);

    setArt(this.logoEl, g, 'logo');
    this.logoEl.alt = g.title;
    this.logoEl.style.viewTransitionName = 'game-logo';
    const running = this.app.running === g;
    const when = g.last == null ? t('notPlayed') : t('lastPlayedWhen', { when: relDays(g.last) });
    this.metaEl.innerHTML = [running ? `<span class="home__live">${esc(t('running'))}</span>` : '', `<span>${esc(when)}</span>`, g.hours ? `<span>${esc(playtime(g))}</span>` : ''].join('');
    if (!instant) {
      Motion.play(this.logoEl, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: 60 });
      Motion.play(this.metaEl, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: 130 });
    }
  }

  expand() {
    if (this.trailer && !this.trailer.closed) return;
    if (!this.game?.trailer) {
      this.nudge();
      return;
    }
    this.trailer = openTrailer(this.app, this.game, { from: this.heroEl, home: this });
  }

  // A small bounce when there's no trailer to expand (retro games).
  nudge() {
    Motion.play(this.content, [{ transform: 'none' }, { transform: 'translateY(14px)' }, { transform: 'none' }], { duration: 420 });
  }

  // Drag down anywhere over the hero: the art stretches with you; let go past the line to expand.
  pullGesture() {
    let start = null;
    let pull = 0;
    const set = (px) => {
      pull = px;
      this.heroEl.style.height = `calc(min(70vh, 40rem) + ${px}px)`;
      this.content.style.transform = `translateY(${px}px)`;
      this.el.classList.toggle('is-pulling-ready', px > PULL_OPEN);
    };
    const reset = () => {
      this.el.classList.add('is-releasing');
      set(0);
      setTimeout(() => this.el.classList.remove('is-releasing'), 450);
    };
    this.scroll.addEventListener('pointerdown', (e) => {
      if (this.scroll.scrollTop > 4 || e.button) return;
      if (e.clientY > this.heroEl.getBoundingClientRect().bottom) return;
      start = e.clientY;
      this.dragged = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (start == null || !this.el.isConnected) return;
      const dy = e.clientY - start;
      if (dy > 8) this.dragged = true;
      if (this.dragged) set(Math.max(0, Math.min(260, dy * 0.6)));
    });
    window.addEventListener('pointerup', () => {
      if (start == null) return;
      start = null;
      const open = pull > PULL_OPEN;
      reset();
      if (open) this.expand();
    });
    // A drag shouldn't also count as a click on whatever was under the pointer.
    this.scroll.addEventListener(
      'click',
      (e) => {
        if (this.dragged) {
          e.stopPropagation();
          e.preventDefault();
          this.dragged = false;
        }
      },
      true,
    );
  }

  onTab(d) {
    if (d > 0) this.app.go('library');
  }
}
