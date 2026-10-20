// Library: tabs (All games / Installed / Steam / Emulation) over a grid of capsules.
// Emulation adds a row of system filters.

import { VTopBar } from '../components/VTopBar.js';
import { VTabs } from '../components/VTabs.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Motion } from '../core/motion.js';
import { esc, h } from '../core/util.js';
import { t } from '../core/i18n.js';
import { GAMES, SYSTEMS } from '../data.js';
import { gameCapsule } from './shared.js';

const FILTERS = () => [
  { id: 'all', label: t('allGames') },
  { id: 'installed', label: t('installed') },
  { id: 'steam', label: t('steam') },
  { id: 'emu', label: t('emulation') },
];

export class LibraryScreen {
  constructor(app, { filter = 'all' } = {}) {
    this.app = app;
    this.system = 'all';
    this.el = h('div', 'screen screen--library');
    const scroll = h('div', 'screen__scroll');

    const head = h('div', 'library__head');
    this.tabs = new VTabs({ tabs: FILTERS(), value: filter, bumpers: true, onChange: () => this.render() });
    this.countEl = h('span', 'library__count');
    head.append(this.tabs.el, this.countEl);
    this.sub = h('div', 'library__sub');
    this.gridHost = h('div', 'library__grid');
    scroll.append(new VTopBar({ app, title: t('library') }).el, head, this.sub, this.gridHost);
    this.el.append(
      scroll,
      new VHintBar({
        hints: [
          ['accept', t('open')],
          ['tabs', t('switchTab')],
          ['back', t('back')],
        ],
      }).el,
    );
    this.render();
  }

  enter() {
    const last = [...this.gridHost.querySelectorAll('.v-tile')].find((t) => t.__v.game === this.app.lastGame);
    const first = last?.__v || this.gridHost.querySelector('.v-focusable')?.__v;
    FocusManager.focus(first || this.tabs.activeTab, { silent: true });
  }

  games() {
    const f = this.tabs.value;
    return GAMES.filter((g) => {
      if (f === 'installed') return g.installed;
      if (f === 'steam') return g.source === 'steam';
      if (f === 'emu') return g.source === 'emu' && (this.system === 'all' || g.system === this.system);
      return true;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }

  render() {
    this.sub.replaceChildren();
    if (this.tabs.value === 'emu') {
      const withGames = SYSTEMS.filter((s) => GAMES.some((g) => g.system === s.id));
      const chips = new VTabs({
        variant: 'chips',
        tabs: [{ id: 'all', label: t('allSystems') }, ...withGames.map((s) => ({ id: s.id, label: s.name }))],
        value: this.system,
        onChange: (id) => {
          this.system = id;
          this.renderGrid();
        },
      });
      this.sub.append(chips.el);
    }
    this.renderGrid();
    if (!FocusManager.current?.el.isConnected) this.enter();
  }

  renderGrid() {
    const list = this.games();
    this.countEl.textContent = t('gamesCount', { n: list.length });
    if (!list.length) {
      this.gridHost.replaceChildren(h('div', 'library__empty', `<strong>${esc(t('emptyTitle'))}</strong><span>${esc(t('emptyBody'))}</span>`));
      return;
    }
    const grid = h('div', 'v-grid');
    list.forEach((g) => grid.append(gameCapsule(this.app, g).el));
    this.gridHost.replaceChildren(grid);
    Motion.stagger(grid.children, { from: 'translateY(14px) scale(0.97)', step: 16, max: 24 });
  }

  onTab(d) {
    this.tabs.step(d);
  }
}
