// Home: hero art for the selected game, recent games shelf, recently added, emulation.
// Motion: the hero crossfades when the selection changes and drifts slowly; the logo fades out
// and back in with the new game. The selected game's trailer becomes the music.
// Pull the hero down (drag, or Up from the top shelf) and it grows to full screen with the
// trailer playing; B, Down or pulling up shrinks it back. Nothing is moved between elements,
// so the trailer never flashes or restarts.

import { VTopBar } from '../components/VTopBar.js';
import { VRow } from '../components/VRow.js';
import { VTile } from '../components/VTile.js';
import { VButton } from '../components/VButton.js';
import { VHintBar } from '../components/VHintBar.js';
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
const HERO_H = 'min(68vh, 40rem)';

export class HomeScreen {
  constructor(app) {
    this.app = app;
    this.el = h('div', 'screen screen--home');
    const scroll = (this.scroll = h('div', 'screen__scroll'));

    this.heroEl = h('div', 'home__hero');
    this.drift = h('div', 'home__drift');
    this.layers = [h('img', 'home__bg'), h('img', 'home__bg')];
    this.layers.forEach((img) => (img.alt = ''));
    this.drift.append(...this.layers);
    this.shade = h('div', 'home__shade');
    this.heroEl.append(this.drift, this.shade);

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
    this.topbar = new VTopBar({ app });
    scroll.append(this.heroEl, this.topbar.el, this.content);
    this.hints = new VHintBar({
      hints: [
        ['accept', t('open')],
        ['up', t('trailer')],
        ['qam', t('quickAccess')],
        ['mainMenu', t('menu')],
      ],
    });
    this.el.append(scroll, this.hints.el);
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
    this.pending = setTimeout(() => this.render(g), 110);
  }

  render(g, { instant = false } = {}) {
    if (g === this.game) return;
    this.game = g;
    if (!instant) GameMusic.select(g);

    // Hero: load the new art into the hidden layer, then crossfade. Only opacity changes on the
    // layers; the slow drift lives on their wrapper, so swaps never jump.
    const front = this.layers.find((l) => l.classList.contains('is-on'));
    const next = this.layers.find((l) => l !== front);
    setArt(next, g, 'hero');
    next.classList.toggle('is-pixel', g.source === 'emu');
    const swap = () => {
      if (this.game !== g) return;
      next.classList.add('is-on');
      next.style.viewTransitionName = 'hero';
      if (front) {
        front.classList.remove('is-on');
        front.style.viewTransitionName = '';
      }
    };
    if (instant) swap();
    else next.decode().then(swap, swap);

    // Logo and details: fade the old ones out, then bring the new ones in.
    const running = this.app.running === g;
    const when = g.last == null ? t('notPlayed') : t('lastPlayedWhen', { when: relDays(g.last) });
    const meta = [running ? `<span class="home__live">${esc(t('running'))}</span>` : '', `<span>${esc(when)}</span>`, g.hours ? `<span>${esc(playtime(g))}</span>` : ''].join('');
    const apply = () => {
      if (this.game !== g) return;
      setArt(this.logoEl, g, 'logo');
      this.logoEl.alt = g.title;
      this.logoEl.style.viewTransitionName = 'game-logo';
      this.metaEl.innerHTML = meta;
    };
    if (instant) return apply();
    const out = { duration: 110, easing: 'ease-in', fill: 'forwards' };
    Motion.play(this.metaEl, [{ opacity: 1 }, { opacity: 0 }], out);
    Motion.play(this.logoEl, [{ opacity: 1 }, { opacity: 0 }], out)?.finished.then(() => {
      if (this.game !== g) return;
      apply();
      const show = () => {
        if (this.game !== g) return;
        Motion.play(this.logoEl, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: Motion.out, fill: 'forwards' });
        Motion.play(this.metaEl, [{ opacity: 0 }, { opacity: 1 }], { delay: 60, duration: 300, fill: 'forwards' });
      };
      this.logoEl.decode().then(show, show);
    });
  }

  // ---- full-screen trailer ----

  expand() {
    if (this.expanded) return;
    if (!this.game?.trailer) return this.nudge();
    this.expanded = true;
    const g = this.game;
    this.scroll.scrollTop = 0;
    const from = this.heroEl.getBoundingClientRect().height;
    this.heroEl.style.height = `${from}px`;
    void this.heroEl.offsetHeight;
    this.el.classList.add('is-expanded');
    this.heroEl.style.height = '100%';

    GameMusic.expanded = true;
    GameMusic.select(g, { now: !GameMusic.playing });
    GameMusic.video?.classList.toggle('is-visible', GameMusic.playing);
    Sound.play('open');
    Haptics.play('select');

    const player = h('div', 'home__player');
    const logo = artImg(g, 'logo', 'home__player-logo');
    logo.alt = g.title;
    const play = new VButton({ label: g.installed ? t('play') : t('install'), icon: g.installed ? 'play' : 'download', variant: 'primary', size: 'lg', activateSound: null });
    play.on('activate', () => {
      this.collapse({ silent: true, instant: true });
      this.app.launch(g);
    });
    play.on('edge', (dir) => dir === 'down' && this.collapse());
    const bar = h('div', 'home__player-bar', '<span></span>');
    const hints = new VHintBar({ hints: [['accept', g.installed ? t('play') : t('install')], ['back', t('back')]] });
    player.append(logo, play.el, bar, hints.el);
    this.heroEl.append(player);
    this.player = player;
    Motion.play(player, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { delay: 260, duration: 480, easing: Motion.out, fill: 'backwards' });
    this.progress = setInterval(() => {
      const v = GameMusic.video;
      if (v?.duration) bar.firstChild.style.width = `${(v.currentTime / v.duration) * 100}%`;
    }, 250);
    FocusManager.pushScope(player, { onBack: () => this.collapse({ silent: true }), initial: play });
  }

  collapse({ silent = false, instant = false } = {}) {
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
    Motion.play(player, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    setTimeout(() => player.remove(), 170);
    this.heroEl.style.height = `${this.heroEl.getBoundingClientRect().height}px`;
    void this.heroEl.offsetHeight;
    this.el.classList.remove('is-expanded');
    this.heroEl.style.height = HERO_H;
    GameMusic.expanded = false;
    GameMusic.video?.classList.toggle('is-visible', GameMusic.showVideo && GameMusic.playing);
    const clear = () => (this.heroEl.style.height = '');
    if (instant) clear();
    else setTimeout(clear, 600);
  }

  // A small bounce when there's no trailer to expand (retro games).
  nudge() {
    Motion.play(this.content, [{ transform: 'none' }, { transform: 'translateY(14px)' }, { transform: 'none' }], { duration: 420 });
  }

  // Drag down anywhere over the hero: the art stretches with you; let go past the line and it
  // keeps growing to full screen. Drag up on the full-screen trailer to shrink it back.
  pullGesture() {
    let start = null;
    let pull = 0;
    const set = (px) => {
      pull = px;
      this.heroEl.style.height = `calc(${HERO_H} + ${px}px)`;
      this.content.style.transform = px ? `translateY(${px}px)` : '';
      this.el.classList.toggle('is-pulling-ready', px > PULL_OPEN);
    };
    this.scroll.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      if (this.expanded) {
        start = { y: e.clientY, expanded: true };
        return;
      }
      if (this.scroll.scrollTop > 4 || e.clientY > this.heroEl.getBoundingClientRect().bottom) return;
      start = { y: e.clientY };
      this.dragged = false;
      this.el.classList.add('is-pulling');
    });
    window.addEventListener('pointermove', (e) => {
      if (!start || start.expanded || !this.el.isConnected) return;
      const dy = e.clientY - start.y;
      if (dy > 8) this.dragged = true;
      if (this.dragged) set(Math.max(0, Math.min(280, dy * 0.6)));
    });
    window.addEventListener('pointerup', (e) => {
      if (!start) return;
      const s = start;
      start = null;
      this.el.classList.remove('is-pulling', 'is-pulling-ready');
      if (s.expanded) {
        if (s.y - e.clientY > 80) this.collapse();
        return;
      }
      const open = pull > PULL_OPEN;
      this.content.style.transform = '';
      pull = 0;
      if (open) this.expand();
      else {
        this.el.classList.add('is-releasing');
        this.heroEl.style.height = HERO_H;
        setTimeout(() => {
          this.el.classList.remove('is-releasing');
          if (!this.expanded) this.heroEl.style.height = '';
        }, 460);
      }
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
