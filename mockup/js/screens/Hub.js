// Hub: the first tile on Home, like the PS5's Welcome hub. Your week at a glance: play time,
// games, achievements, library and storage, plus the games you play most and the ones closest
// to 100%. Sample values in the mockup; real OS: Steam play time and achievements via vantad.

import { VComponent } from '../core/VComponent.js';
import { VProgress } from '../components/VProgress.js';
import { avatarEl } from '../components/avatar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Profiles } from '../core/Profiles.js';
import { Region } from '../core/Region.js';
import { t, duration } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { GAMES } from '../data.js';
import { artImg } from '../art/index.js';

// Hours played per day, oldest first, ending today (sample data).
export const WEEK_HOURS = [1.8, 0.6, 2.9, 1.4, 0, 3.7, 2.4];
const STORAGE = { used: 588, total: 1000 }; // GB

export function weekSummary() {
  const minutes = Math.round(WEEK_HOURS.reduce((a, b) => a + b, 0) * 60);
  const games = GAMES.filter((g) => g.last != null && g.last <= 7).length;
  return { minutes, games };
}

// A row you can focus that opens the game: small art, title, a value and an optional bar.
class GameRow extends VComponent {
  constructor({ game, value, ratio, onActivate }) {
    super({ className: 'hub__row', focusable: true, label: game.title });
    this.el.append(artImg(game, 'header', 'hub__row-art'));
    const text = h('div', 'hub__row-text', `<span class="hub__row-title">${esc(game.title)}</span><span class="hub__row-value">${esc(value)}</span>`);
    if (ratio != null) text.append(new VProgress({ value: ratio, size: 'sm', showValue: false }).el);
    this.el.append(text);
    this.on('activate', onActivate);
  }
}

function stat(label, value, detail = '') {
  return h('div', 'hub__stat', `<span class="hub__stat-label">${esc(label)}</span><span class="hub__stat-value">${esc(value)}</span>${detail ? `<span class="hub__stat-detail">${esc(detail)}</span>` : ''}`);
}

// Play time per day: one series, so no legend (the heading names it). Bars start at the
// baseline with rounded tops; hovering a bar shows its value.
function weekChart() {
  const wrap = h('div', 'hub__chart');
  const max = Math.max(...WEEK_HOURS, 1);
  const today = new Date();
  const dayName = new Intl.DateTimeFormat(Region.locale, { weekday: 'short' });
  const tip = h('div', 'hub__tip');
  tip.hidden = true;
  const plot = h('div', 'hub__plot');
  WEEK_HOURS.forEach((hrs, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (WEEK_HOURS.length - 1 - i));
    const col = h('div', 'hub__col');
    const bar = h('div', 'hub__bar');
    bar.style.setProperty('--v', (hrs / max).toFixed(3));
    if (!hrs) bar.classList.add('is-zero');
    const label = `${dayName.format(d)} · ${duration(Math.round(hrs * 60))}`;
    col.setAttribute('aria-label', label);
    col.addEventListener('pointerenter', () => {
      tip.textContent = label;
      tip.hidden = false;
      tip.style.left = `${((i + 0.5) / WEEK_HOURS.length) * 100}%`;
      tip.style.bottom = `calc(${(hrs / max) * 100}% + 1.6rem)`;
    });
    col.addEventListener('pointerleave', () => (tip.hidden = true));
    col.append(bar, h('span', `hub__day${i === WEEK_HOURS.length - 1 ? ' is-today' : ''}`, esc(dayName.format(d))));
    plot.append(col);
  });
  wrap.append(plot, tip);
  return wrap;
}

export class HubScreen {
  constructor(app) {
    this.app = app;
    this.el = h('div', 'screen screen--hub');
    const scroll = h('div', 'screen__scroll');
    const page = h('div', 'hub');
    const me = Profiles.current;

    // Who and the headline numbers.
    const head = h('header', 'hub__head');
    head.append(avatarEl(me, 'avatar avatar--md'), h('div', 'hub__who', `<h1>${esc(t('welcomeBack', { name: me?.name || t('guest') }))}</h1>${me?.steam ? `<span>${esc(t('steamSummary', { level: me.steam.level, since: me.steam.since }))}</span>` : ''}`));

    const { minutes, games } = weekSummary();
    const steam = GAMES.filter((g) => g.ach);
    const got = steam.reduce((a, g) => a + g.ach[0], 0);
    const all = steam.reduce((a, g) => a + g.ach[1], 0);
    const installed = GAMES.filter((g) => g.installed).length;
    const stats = h('div', 'hub__stats');
    stats.append(
      stat(t('playTimeWeek'), duration(minutes)),
      stat(t('gamesPlayedWeek'), String(games)),
      stat(t('achievements'), `${got}/${all}`, `${Math.round((got / all) * 100)}%`),
      stat(t('library'), t('gamesCount', { n: GAMES.length }), t('installedCount', { n: installed })),
    );

    const week = h('section', 'hub__section hub__section--chart');
    week.append(h('h2', 'hub__title', esc(t('thisWeek'))), weekChart());

    const open = (g) => () => app.openGame(g);
    const most = h('section', 'hub__section');
    const mostList = h('div', 'hub__list');
    mostList.dataset.focusGroup = '';
    const top = [...GAMES].filter((g) => g.hours).sort((a, b) => b.hours - a.hours).slice(0, 5);
    top.forEach((g) => mostList.append(new GameRow({ game: g, value: t('hours', { n: g.hours }), ratio: g.hours / top[0].hours, onActivate: open(g) }).el));
    most.append(h('h2', 'hub__title', esc(t('mostPlayed'))), mostList);

    const close = h('section', 'hub__section');
    const closeList = h('div', 'hub__list');
    closeList.dataset.focusGroup = '';
    steam
      .filter((g) => g.ach[0] < g.ach[1] && g.ach[0] > 0)
      .sort((a, b) => b.ach[0] / b.ach[1] - a.ach[0] / a.ach[1])
      .slice(0, 4)
      .forEach((g) => closeList.append(new GameRow({ game: g, value: `${g.ach[0]}/${g.ach[1]}`, ratio: g.ach[0] / g.ach[1], onActivate: open(g) }).el));
    close.append(h('h2', 'hub__title', esc(t('closestToComplete'))), closeList);

    const storage = h('section', 'hub__section hub__section--storage');
    storage.append(
      h('h2', 'hub__title', esc(t('storage'))),
      new VProgress({ value: STORAGE.used / STORAGE.total, label: t('storageVal', { free: `${STORAGE.total - STORAGE.used} GB`, total: '1 TB' }), showValue: false }).el,
    );

    const grid = h('div', 'hub__grid');
    grid.append(most, close);
    page.append(head, stats, week, grid, storage);
    scroll.append(h('div', 'shell-gap'), page);
    this.el.append(scroll);
    this.shell = { title: t('hub'), hints: [['accept', t('open')], ['back', t('back')]] };
    this.first = mostList.firstChild?.__v;
  }

  enter() {
    if (this.first) FocusManager.focus(this.first, { silent: true });
  }
}
