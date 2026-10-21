// Sign-in flows shared by first-time setup and Settings → Accounts.
//
// Steam: Vanta OS never handles Steam passwords. The Steam client (preinstalled, updated during
// setup) does the sign-in: the QR code comes from Steam and is approved in the Steam Mobile App,
// and "Sign in with account name" opens Steam's own sign-in window. Vanta only learns which
// account signed in. In the mockup the approval is simulated after a few seconds.
// Once signed in, the library, achievements, screenshots, play time and friends come from the
// Steam client's local data and Steam's Web API; installs, launches and cloud saves go through
// the client itself. See docs/TECH_STACK.md → Steam and accounts.
//
// Vanta account: Vanta's own account (email + password) for syncing profiles and settings
// between devices. The mockup checks the form and stores only the email, never the password.

import { VButton } from '../components/VButton.js';
import { VTextField } from '../components/VTextField.js';
import { VSpinner } from '../components/VSpinner.js';
import { VBanner } from '../components/VBanner.js';
import { VAlert } from '../components/VAlert.js';
import { FocusManager } from '../core/FocusManager.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { icon } from '../core/icons.js';
import { animate } from '../core/motion.js';
import { t, i18n } from '../core/i18n.js';
import { esc, h } from '../core/util.js';

const SYNC = [
  { key: 'syncProfile', icon: 'account_circle', count: () => t('syncProfileDone') },
  { key: 'syncLibrary', icon: 'library', count: (n) => t('gamesCount', { n }), n: 214 },
  { key: 'syncCollections', icon: 'folder', count: (n) => t('collectionsCount', { n }), n: 9 },
  { key: 'syncAchievements', icon: 'trophy', count: (n) => t('achievementsCount', { n }), n: 1386 },
  { key: 'syncScreenshots', icon: 'photo_library', count: (n) => t('screenshotsCount', { n }), n: 412 },
  { key: 'syncControllers', icon: 'gamepad', count: (n) => t('layoutsCount', { n }), n: 14 },
  { key: 'syncFriends', icon: 'group', count: (n) => t('friendsCount', { n }), n: 37 },
];

// What Vanta imports from the signed-in Steam account (sample values in the mockup).
// Real OS: persona name, avatar, level and SteamID from the client (avatar cache in
// ~/.steam/steam/config/avatarcache) or the Web API's GetPlayerSummaries.
function sampleSteamAccount() {
  return {
    persona: 'vanta_player',
    avatar: sampleAvatar(),
    steamId: '76561198000000000',
    level: 23,
    since: 2014,
  };
}

// A stand-in Steam profile picture: a small landscape, as a 184×184 image like Steam's.
function sampleAvatar() {
  const c = document.createElement('canvas');
  c.width = c.height = 184;
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 184);
  sky.addColorStop(0, '#1b2a4a');
  sky.addColorStop(0.6, '#c2603a');
  sky.addColorStop(1, '#f2a65a');
  x.fillStyle = sky;
  x.fillRect(0, 0, 184, 184);
  x.fillStyle = '#ffd89a';
  x.beginPath();
  x.arc(120, 96, 22, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#2a1d2e';
  x.beginPath();
  x.moveTo(0, 150);
  x.lineTo(46, 104);
  x.lineTo(82, 136);
  x.lineTo(126, 92);
  x.lineTo(184, 146);
  x.lineTo(184, 184);
  x.lineTo(0, 184);
  x.fill();
  x.fillStyle = '#140d16';
  x.fillRect(0, 160, 184, 24);
  return c.toDataURL('image/jpeg', 0.9);
}

// A stand-in QR code (finder squares plus a fixed pattern). The real one comes from Steam.
function qrSvg() {
  const n = 25;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  let cells = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rand() > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return `<svg class="signin__qr" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><g fill="#0b0e13">${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}${cells}</g></svg>`;
}

// Steam sign-in: QR code, waiting for approval, then the first sync.
// Returns a cleanup function (stops the timers when the view goes away).
export function steamSignIn(host, { onDone }) {
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const card = h('div', 'signin');
  const status = h('div', 'signin__status');
  status.append(new VSpinner({ size: 'sm', label: t('steamWaiting') }).el, h('span', '', esc(t('steamWaiting'))));
  card.append(
    h('div', 'signin__code', qrSvg()),
    h('div', 'signin__text', `<strong>${esc(t('steamScanTitle'))}</strong><span>${esc(t('steamScanBody'))}</span>`),
    status,
  );
  const alt = new VButton({ label: t('steamUseName'), variant: 'ghost' });
  alt.on('activate', () => VAlert.info({ title: t('steamUseName'), message: t('steamUseNameBody') }));
  const actions = h('div', 'signin__actions');
  actions.append(alt.el);
  host.replaceChildren(card, actions);
  FocusManager.focus(alt, { silent: true });

  // Mockup: the phone approves after a few seconds.
  later(() => {
    const account = sampleSteamAccount();
    status.innerHTML = `${icon('check', 'signin__ok')}<span>${esc(t('signedInAs', { name: account.persona }))}</span>`;
    Sound.play('toggleOn');
    Haptics.play('select');
    later(() => {
      const { el, done } = syncCard(later);
      host.replaceChildren(el);
      animate(el, 'fade-in');
      done.then(() => {
        const next = new VButton({ label: t('continue'), variant: 'primary' });
        next.on('activate', () => onDone(account));
        const row = h('div', 'signin__actions');
        row.append(next.el);
        host.append(row);
        FocusManager.focus(next, { silent: true });
        Sound.play('notify');
      });
    }, 900);
  }, 4200);
  return () => timers.forEach(clearTimeout);
}

// Library, achievements, screenshots and friends coming in one after another.
function syncCard(later) {
  const el = h('div', 'signin signin--sync');
  el.append(h('div', 'signin__text', `<strong>${esc(t('syncTitle'))}</strong>`));
  const list = h('div', 'sync');
  const rows = SYNC.map((s) => {
    const row = h('div', 'sync__row', `<span class="sync__icon">${icon(s.icon)}</span><span class="sync__label">${esc(t(s.key))}</span><span class="sync__state"></span>`);
    row.querySelector('.sync__state').append(new VSpinner({ size: 'sm', tone: 'muted' }).el);
    list.append(row);
    return { row, s };
  });
  el.append(list);
  const done = new Promise((resolve) => {
    rows.forEach(({ row, s }, i) =>
      later(() => {
        row.querySelector('.sync__state').innerHTML = `<span class="sync__count">${esc(s.count(s.n?.toLocaleString(i18n.lang)))}</span>${icon('check', 'signin__ok')}`;
        row.classList.add('is-done');
        Sound.play('key');
        if (i === rows.length - 1) resolve();
      }, 600 + i * 450),
    );
  });
  return { el, done };
}

// Vanta account: email and password, then create an account or sign in.
export function vantaSignIn(host, { onDone }) {
  const timers = [];
  const email = new VTextField({ label: t('email'), placeholder: t('notSet'), maxLength: 64, icon: 'mail' });
  const password = new VTextField({ label: t('password'), placeholder: t('notSet'), password: true, maxLength: 64, icon: 'lock' });
  const message = h('div', 'signin__message');
  const create = new VButton({ label: t('createAccount'), variant: 'primary' });
  const signIn = new VButton({ label: t('signIn') });
  const actions = h('div', 'signin__actions');
  actions.append(create.el, signIn.el);
  const fields = h('div', 'signin__fields');
  fields.dataset.focusGroup = '';
  fields.append(email.el, password.el);
  host.replaceChildren(fields, message, actions);
  FocusManager.focus(email, { silent: true });

  const submit = (mode) => {
    const problem = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? t('emailInvalid') : password.value.length < 8 ? t('passwordShort') : null;
    if (problem) {
      message.replaceChildren(new VBanner({ tone: 'error', message: problem }).el);
      animate(message, 'shake');
      Sound.play('error');
      Haptics.play('error');
      return;
    }
    message.replaceChildren(h('div', 'signin__status', `${new VSpinner({ size: 'sm' }).el.outerHTML}<span>${esc(t(mode === 'create' ? 'creatingAccount' : 'signingIn'))}</span>`));
    timers.push(
      setTimeout(() => {
        const account = { email: email.value };
        password.value = ''; // never kept
        onDone(account);
      }, 1300),
    );
  };
  create.on('activate', () => submit('create'));
  signIn.on('activate', () => submit('signin'));
  return () => timers.forEach(clearTimeout);
}
