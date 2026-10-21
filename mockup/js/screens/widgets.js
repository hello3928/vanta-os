// Home widgets, like the PS5's: a row of small and medium cards under Recent games with play
// time, achievements, friends, downloads and storage. Focusable like tiles.
// Sample values in the mockup; real OS: Steam play time, achievements and friends via vantad.

import { VComponent } from '../core/VComponent.js';
import { VToast } from '../components/VToast.js';
import { Region } from '../core/Region.js';
import { t, duration } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { GAMES } from '../data.js';

// Hours played per day, oldest first, ending today.
const WEEK_HOURS = [1.8, 0.6, 2.9, 1.4, 0, 3.7, 2.4];
const FRIENDS = [
  { name: 'rook', color: '#3d5a80', game: 'Helldivers 2' },
  { name: 'mira', color: '#7a3e52', game: null },
  { name: 'jaxx', color: '#2f6f69', game: 'Balatro' },
];
const STORAGE = { free: 412, total: 1000 }; // GB

class Widget extends VComponent {
  constructor({ size = 's', label, onActivate }) {
    super({ className: `widget widget--${size}`, focusable: true, label });
    this.el.setAttribute('role', 'button');
    this.head = h('div', 'widget__label', esc(label));
    this.body = h('div', 'widget__body');
    this.el.append(this.head, this.body);
    if (onActivate) this.on('activate', onActivate);
  }
}

const value = (text, detail = '') => `<span class="widget__value">${esc(text)}</span>${detail ? `<span class="widget__detail">${esc(detail)}</span>` : ''}`;
const bar = (ratio) => `<span class="widget__bar"><span style="transform:scaleX(${ratio.toFixed(3)})"></span></span>`;

// Play time: the week's total and a bar per day (today in bold). One series, so no legend.
function playTime(app) {
  const w = new Widget({ size: 'm', label: t('thisWeek'), onActivate: () => app.go('library') });
  const minutes = Math.round(WEEK_HOURS.reduce((a, b) => a + b, 0) * 60);
  const max = Math.max(...WEEK_HOURS, 1);
  const day = new Intl.DateTimeFormat(Region.locale, { weekday: 'narrow' });
  const today = new Date();
  const bars = WEEK_HOURS.map((hrs, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (WEEK_HOURS.length - 1 - i));
    const last = i === WEEK_HOURS.length - 1;
    return `<span class="widget__col${last ? ' is-today' : ''}" title="${esc(duration(Math.round(hrs * 60)))}"><span class="widget__colbar${hrs ? '' : ' is-zero'}" style="--v:${(hrs / max).toFixed(3)}"></span><span class="widget__day">${esc(day.format(d))}</span></span>`;
  }).join('');
  w.body.innerHTML = `${value(duration(minutes))}<span class="widget__chart">${bars}</span>`;
  return w;
}

function achievements(app) {
  const steam = GAMES.filter((g) => g.ach);
  const got = steam.reduce((a, g) => a + g.ach[0], 0);
  const all = steam.reduce((a, g) => a + g.ach[1], 0);
  const w = new Widget({ label: t('achievements'), onActivate: () => app.go('library') });
  w.body.innerHTML = `${value(String(got), t('ofTotal', { n: all }))}${bar(got / all)}`;
  return w;
}

function friends() {
  const online = FRIENDS.length;
  const w = new Widget({ size: 'm', label: t('friendsOnlineCount', { n: online }), onActivate: () => VToast.show(t('notAvailable'), { icon: 'group' }) });
  w.body.innerHTML = `<span class="widget__friends">${FRIENDS.map(
    (f) => `<span class="widget__friend"><span class="avatar avatar--xs" style="background:${f.color}"><span class="avatar__letter">${esc(f.name[0].toUpperCase())}</span></span><span class="widget__friend-text"><span>${esc(f.name)}</span><span class="${f.game ? 'is-playing' : ''}">${esc(f.game ? f.game : t('online'))}</span></span></span>`,
  ).join('')}</span>`;
  return w;
}

function downloads() {
  const queued = GAMES.filter((g) => !g.installed).length;
  const w = new Widget({ label: t('downloads'), onActivate: () => VToast.show(t('noDownloads'), { icon: 'download' }) });
  w.body.innerHTML = value(t('upToDate'), t('notInstalledCount', { n: queued }));
  return w;
}

function storage(app) {
  const w = new Widget({ label: t('storage'), onActivate: () => app.go('settings', { section: 'about' }) });
  w.body.innerHTML = `${value(`${STORAGE.free} GB`, t('freeOf', { total: '1 TB' }))}${bar(1 - STORAGE.free / STORAGE.total)}`;
  return w;
}

export function homeWidgets(app) {
  return [playTime(app), achievements(app), friends(), downloads(), storage(app)];
}
