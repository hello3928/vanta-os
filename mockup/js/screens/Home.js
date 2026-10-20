// Home: hero art for the focused game, recent games shelf, news cards, emulation shelf.

import { VTopBar } from '../components/VTopBar.js';
import { VRow } from '../components/VRow.js';
import { VTile } from '../components/VTile.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { esc, h } from '../core/util.js';
import { GAMES, EVENTS, gameById, sourceLine } from '../data.js';
import { hero, logo, card } from '../art/index.js';
import { gameCapsule, playtime } from './shared.js';

export class HomeScreen {
  constructor(app) {
    this.app = app;
    this.el = h('div', 'screen screen--home');
    const scroll = h('div', 'screen__scroll');

    this.heroEl = h('div', 'home__hero');
    this.bgA = h('img', 'home__bg');
    this.bgB = h('img', 'home__bg');
    [this.bgA, this.bgB].forEach((img) => (img.alt = ''));
    this.heroEl.append(this.bgA, this.bgB, h('div', 'home__shade'));

    this.intro = h('div', 'home__intro');
    this.logoEl = h('img', 'home__logo');
    this.logoEl.alt = '';
    this.metaEl = h('div', 'home__meta');
    this.intro.append(this.logoEl, this.metaEl);

    const recent = GAMES.filter((g) => g.recent).sort((a, b) => a.recent - b.recent);
    this.recentRow = new VRow({ title: 'Recent games', align: 'start' });
    this.tiles = recent.map((g) => {
      const t = this.recentRow.addItem(gameCapsule(app, g));
      t.on('focus', () => this.show(g));
      return t;
    });
    const all = new VTile({ title: 'Go to library', glyph: 'library', onActivate: () => app.go('library') });
    this.recentRow.addItem(all);

    const news = new VRow({ title: "What's new" });
    EVENTS.forEach((e, i) => {
      const g = gameById(e.game);
      const t = new VTile({ shape: 'card', image: card(g, i), title: e.title, kicker: e.kind, subtitle: `${g.title} · ${e.when}` });
      t.on('focus', () => this.show(g));
      t.on('activate', () => app.go('game', { id: g.id }));
      news.addItem(t);
    });

    const emu = new VRow({ title: 'Emulation', meta: 'Your retro library' });
    GAMES.filter((g) => g.source === 'emu').forEach((g) => {
      const t = emu.addItem(gameCapsule(app, g));
      t.on('focus', () => this.show(g));
    });

    scroll.append(this.heroEl, new VTopBar({ app, title: 'Home' }).el, this.intro, this.recentRow.el, news.el, emu.el);
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
    this.show(recent[0]);
  }

  enter() {
    FocusManager.focus(this.tiles[0], { silent: true });
  }

  show(g) {
    if (g === this.game) return;
    this.game = g;
    const [front, back] = this.front === this.bgA ? [this.bgB, this.bgA] : [this.bgA, this.bgB];
    front.src = hero(g);
    front.classList.add('is-on');
    back.classList.remove('is-on');
    this.front = front;
    this.logoEl.src = logo(g);
    this.logoEl.alt = g.title;
    this.metaEl.innerHTML = `<span>${esc(g.last === 'Never' ? 'Not played yet' : `Last played ${g.last.toLowerCase()}`)}</span><span>${esc(playtime(g))}</span><span>${esc(sourceLine(g))}</span>`;
  }

  onTab(d) {
    if (d > 0) this.app.go('library');
  }
}
