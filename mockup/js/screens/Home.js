// Home: hero art for the selected game, recent games shelf, recently added, emulation.
// The selected game's trailer becomes the music and, after a moment, the moving background.
//
// The hero is always full screen height and shown through a clip. Pulling it down (drag, or Up
// from the top shelf) widens the clip until the trailer fills the screen; B, Down or pulling up
// narrows it again. Only the clip animates, so the art and video never move, rescale or restart.

import { VRow } from '../components/VRow.js';
import { VTile } from '../components/VTile.js';
import { VHintBar } from '../components/VHintBar.js';
import { VButton } from '../components/VButton.js';
import { FocusManager } from '../core/FocusManager.js';
import { Motion } from '../core/motion.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { GameMusic } from '../core/GameMusic.js';
import { t, relDays } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { GAMES } from '../data.js';
import { setArt, artImg } from '../art/index.js';
import { gameCapsule, playtime } from './shared.js';

const PULL_OPEN = 110; // px of pull that opens the full-screen trailer
const PULL_MAX = 260;

export class HomeScreen {
  constructor(app) {
    this.app = app;
    this.cleanup = [];
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
    const lib = new VTile({ title: t('library'), glyph: 'library', className: 'v-tile--more', onActivate: () => app.go('library') });
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
    // A strip of page colour over the hero's clip edge (see .home__seam in screens.css).
    scroll.append(this.heroEl, h('div', 'home__seam'), h('div', 'shell-gap'), this.content);
    this.el.append(scroll);
    this.shell = { title: '', topbarNav: false, hints: [
          ['accept', t('open')],
          ['up', t('trailer')],
          ['qam', t('quickAccess')],
          ['mainMenu', t('menu')],
        ] };
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

  destroy() {
    clearTimeout(this.pending);
    clearTimeout(this.logoTimer);
    clearInterval(this.progress);
    this.cleanup.forEach((fn) => fn());
  }

  // Wait for the selection to settle before swapping the hero, so fast scrolling stays calm.
  show(g) {
    clearTimeout(this.pending);
    this.pending = setTimeout(() => this.render(g), 120);
  }

  render(g, { instant = false } = {}) {
    if (g === this.game) return;
    this.game = g;
    if (!instant) GameMusic.select(g);

    // Hero: load the new art into the hidden layer, then crossfade (opacity only).
    const front = this.layers.find((l) => l.classList.contains('is-on'));
    const next = this.layers.find((l) => l !== front);
    setArt(next, g, 'hero');
    next.classList.toggle('is-pixel', g.source === 'emu');
    const swap = () => {
      if (this.game !== g) return;
      next.classList.add('is-on');
      front?.classList.remove('is-on');
    };
    if (instant) swap();
    else next.decode().then(swap, swap);

    // Logo and details: a quick fade out on a CSS class, swap, fade back in once loaded.
    const running = this.app.running === g;
    const when = g.last == null ? t('notPlayed') : t('lastPlayedWhen', { when: relDays(g.last) });
    const meta = [running ? `<span class="home__live">${esc(t('running'))}</span>` : '', `<span>${esc(when)}</span>`, g.hours ? `<span>${esc(playtime(g))}</span>` : ''].join('');
    const apply = () => {
      setArt(this.logoEl, g, 'logo');
      this.logoEl.alt = g.title;
      this.metaEl.innerHTML = meta;
    };
    if (instant) return apply();
    clearTimeout(this.logoTimer);
    this.logoEl.classList.add('is-swapping');
    this.metaEl.classList.add('is-swapping');
    this.logoTimer = setTimeout(() => {
      if (this.game !== g) return;
      apply();
      const reveal = () => {
        if (this.game !== g) return;
        this.logoEl.classList.remove('is-swapping');
        this.metaEl.classList.remove('is-swapping');
      };
      this.logoEl.decode().then(reveal, reveal);
    }, 100);
  }

  // ---- full-screen trailer ----

  setPull(px) {
    this.pull = px;
    this.el.style.setProperty('--pull', `${px}px`);
  }

  expand() {
    if (this.expanded) return;
    if (!this.game?.trailer) return this.nudge();
    this.expanded = true;
    const g = this.game;
    if (this.scroll.scrollTop > 0) this.scroll.scrollTop = 0;
    this.setPull(0);
    this.el.classList.add('is-expanded');
    this.app.shell.hide(true);

    GameMusic.expanded = true;
    GameMusic.select(g, { now: !GameMusic.playing });
    GameMusic.video?.classList.toggle('is-visible', GameMusic.playing);
    Sound.play('open');
    Haptics.play('select');

    const player = h('div', 'home__player');
    const logo = artImg(g, 'logo', 'home__player-logo');
    logo.alt = g.title;
    const play = new VButton({
      label: g.installed ? t('play') : t('install'),
      icon: g.installed ? 'play' : 'download',
      variant: g.installed ? 'play' : 'primary',
      size: 'lg',
      activateSound: null,
    });
    play.on('activate', () => {
      this.collapse({ silent: true });
      this.app.launch(g);
    });
    play.on('edge', (dir) => dir === 'down' && this.collapse());
    const bar = h('div', 'home__player-bar', '<span></span>');
    const hints = new VHintBar({ hints: [['accept', g.installed ? t('play') : t('install')], ['back', t('back')]] });
    player.append(logo, play.el, bar, hints.el);
    this.heroEl.append(player);
    this.player = player;
    void player.offsetWidth;
    player.classList.add('is-in');
    this.progress = setInterval(() => {
      const v = GameMusic.video;
      if (v?.duration) bar.style.setProperty('--progress', (v.currentTime / v.duration).toFixed(4));
    }, 250);
    FocusManager.pushScope(player, { onBack: () => this.collapse({ silent: true }), initial: play });
  }

  collapse({ silent = false } = {}) {
    if (!this.expanded) return;
    this.expanded = false;
    clearInterval(this.progress);
    FocusManager.popScope(this.player);
    if (!silent) {
      Sound.play('close');
      Haptics.play('back');
    }
    const player = this.player;
    this.player = null;
    player.classList.remove('is-in');
    setTimeout(() => player.remove(), 200);
    this.el.classList.remove('is-expanded');
    this.app.shell.hide(false);
    GameMusic.expanded = false;
    GameMusic.video?.classList.toggle('is-visible', GameMusic.showVideo && GameMusic.playing);
  }

  // A small bounce when there's no trailer to expand (retro games).
  nudge() {
    Motion.play(this.content, [{ transform: 'translateY(0)' }, { transform: 'translateY(12px)' }, { transform: 'translateY(0)' }], { duration: 360 });
  }

  // Drag down over the hero: it stretches with you; let go past the line and it opens fully.
  // Drag up on the full-screen trailer to close it.
  pullGesture() {
    let start = null;
    const listen = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts);
      this.cleanup.push(() => target.removeEventListener(type, fn, opts));
    };
    listen(this.scroll, 'pointerdown', (e) => {
      if (e.button) return;
      if (this.expanded) {
        start = { y: e.clientY, expanded: true };
        return;
      }
      if (this.scroll.scrollTop > 4 || e.clientY > this.shade.getBoundingClientRect().bottom) return;
      start = { y: e.clientY };
      this.dragged = false;
    });
    listen(window, 'pointermove', (e) => {
      if (!start || start.expanded) return;
      const dy = e.clientY - start.y;
      if (!this.dragged && dy > 8) {
        this.dragged = true;
        this.el.classList.add('is-pulling');
      }
      if (this.dragged) this.setPull(Math.max(0, Math.min(PULL_MAX, dy * 0.6)));
    });
    listen(window, 'pointerup', (e) => {
      if (!start) return;
      const s = start;
      start = null;
      if (s.expanded) {
        if (s.y - e.clientY > 80) this.collapse();
        return;
      }
      this.el.classList.remove('is-pulling');
      if ((this.pull || 0) > PULL_OPEN) this.expand();
      else this.setPull(0);
    });
    // A drag shouldn't also count as a click on whatever was under the pointer.
    listen(
      this.scroll,
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

  onBack() {
    if (this.expanded) {
      this.collapse({ silent: true });
      return true;
    }
    return false;
  }

  onTab(d) {
    if (d > 0 && !this.expanded) this.app.go('library');
  }
}
