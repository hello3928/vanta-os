// Home: hero art for the selected game, recent games shelf, recently added, emulation.
// Motion: the hero crossfades and settles when the selection changes, then drifts slowly;
// the logo and details rise in after it.

import { VTopBar } from '../components/VTopBar.js';
import { VRow } from '../components/VRow.js';
import { VTile } from '../components/VTile.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Motion } from '../core/motion.js';
import { esc, h } from '../core/util.js';
import { GAMES } from '../data.js';
import { setArt } from '../art/index.js';
import { gameCapsule, playtime } from './shared.js';

export class HomeScreen {
  constructor(app) {
    this.app = app;
    this.el = h('div', 'screen screen--home');
    const scroll = h('div', 'screen__scroll');

    this.heroEl = h('div', 'home__hero');
    this.layers = [h('img', 'home__bg'), h('img', 'home__bg')];
    this.layers.forEach((img) => (img.alt = ''));
    this.heroEl.append(...this.layers, h('div', 'home__shade'));

    this.intro = h('div', 'home__intro');
    this.logoEl = h('img', 'home__logo');
    this.logoEl.alt = '';
    this.metaEl = h('div', 'home__meta');
    this.intro.append(this.logoEl, this.metaEl);

    let recent = GAMES.filter((g) => g.recent).sort((a, b) => a.recent - b.recent);
    if (app.running) recent = [app.running, ...recent.filter((g) => g !== app.running)];
    this.recentRow = new VRow({ title: 'Recent games', align: 'start' });
    this.recentRow.el.dataset.scrollTop = '';
    this.tiles = recent.map((g) => {
      const t = this.recentRow.addItem(gameCapsule(app, g));
      t.on('focus', () => this.show(g));
      return t;
    });
    this.recentRow.addItem(new VTile({ title: 'Library', glyph: 'library', onActivate: () => app.go('library') }));

    const added = new VRow({ title: 'Recently added' });
    GAMES.filter((g) => /ago/.test(g.added || '')).forEach((g) => {
      const t = new VTile({ shape: 'card', game: g, kind: 'header', title: g.title, iconGame: g, kicker: `Added ${g.added}`, subtitle: g.installed ? g.genre : `Not installed · ${g.size}` });
      t.on('focus', () => this.show(g));
      t.on('activate', () => app.openGame(g, t));
      added.addItem(t);
    });

    const emu = new VRow({ title: 'Emulation' });
    GAMES.filter((g) => g.source === 'emu').forEach((g) => {
      const t = emu.addItem(gameCapsule(app, g));
      t.on('focus', () => this.show(g));
    });

    scroll.append(this.heroEl, new VTopBar({ app }).el, this.intro, this.recentRow.el, added.el, emu.el);
    this.el.append(
      scroll,
      new VHintBar({
        hints: [
          ['accept', 'Open'],
          ['qam', 'Quick access'],
          ['mainMenu', 'Menu'],
        ],
      }).el,
    );
    this.render(recent[0], { instant: true });
  }

  enter() {
    const g = this.app.lastGame;
    const tile = this.tiles.find((t) => t.game === g) || this.tiles[0];
    FocusManager.focus(tile, { silent: true });
  }

  // Wait for the selection to settle before swapping the hero, so fast scrolling stays calm.
  show(g) {
    clearTimeout(this.pending);
    this.pending = setTimeout(() => this.render(g), 90);
  }

  render(g, { instant = false } = {}) {
    if (g === this.game) return;
    this.game = g;
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
    this.metaEl.innerHTML = [running ? '<span class="home__live">Running</span>' : '', `<span>${esc(g.last === 'Never' ? 'Not played yet' : `Last played ${g.last.toLowerCase()}`)}</span>`, `<span>${esc(playtime(g))}</span>`].join('');
    if (!instant) {
      Motion.play(this.logoEl, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: 60 });
      Motion.play(this.metaEl, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: 130 });
    }
  }

  onTab(d) {
    if (d > 0) this.app.go('library');
  }
}
