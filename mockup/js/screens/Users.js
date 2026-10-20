// "Who's playing?": the first screen after start-up. Pick a profile, play as a guest, or add one.
// Choosing is also the first button press, which browsers need before they allow sound.

import { VComponent } from '../core/VComponent.js';
import { VPanel } from '../components/VPanel.js';
import { VTextField } from '../components/VTextField.js';
import { VButton } from '../components/VButton.js';
import { VHintBar, promptGlyph } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Profiles, AVATARS } from '../core/Profiles.js';
import { Motion } from '../core/motion.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { gameById } from '../data.js';
import { avatarEl } from '../components/avatar.js';

export { avatarEl };

class ProfileCard extends VComponent {
  constructor({ name, profile, glyph }) {
    super({ className: 'profile', focusable: true, label: name });
    this.el.setAttribute('role', 'button');
    const pic = profile ? avatarEl(profile, 'avatar avatar--xl') : h('span', 'avatar avatar--xl avatar--empty', icon(glyph, 'avatar__icon'));
    this.el.append(pic, h('span', 'profile__name', esc(name)));
  }
}

export class UsersScreen {
  constructor(app) {
    this.app = app;
    this.el = h('div', 'screen screen--users');
    const wrap = h('div', 'users');
    wrap.append(h('h1', 'users__title', esc(t('whosPlaying'))));
    this.row = h('div', 'users__row');
    this.row.dataset.focusGroup = '';
    this.cards = Profiles.list.map((p) => {
      const c = new ProfileCard({ name: p.name, profile: p });
      c.on('activate', () => this.choose(c, () => Profiles.use(p.id)));
      return c;
    });
    const guest = new ProfileCard({ name: t('guest'), glyph: 'user' });
    guest.on('activate', () => this.choose(guest, () => Profiles.guest()));
    const add = new ProfileCard({ name: t('addUser'), glyph: 'add' });
    add.on('activate', () => this.addUser());
    [...this.cards, guest, add].forEach((c) => this.row.append(c.el));
    wrap.append(this.row);
    this.el.append(
      wrap,
      new VHintBar({
        hints: [['accept', t('select')]],
      }).el,
    );
  }

  enter() {
    const current = this.cards.find((c) => c.el.getAttribute('aria-label') === Profiles.current?.name);
    FocusManager.focus(current || this.cards[0] || this.row.firstChild.__v, { silent: true });
    Motion.stagger(this.row.children, { from: 'translateY(16px)', step: 50, delay: 120 });
  }

  // The chosen picture grows a little and the screen fades into Home.
  choose(card, commit) {
    if (this.leaving) return;
    this.leaving = true;
    commit();
    Motion.play(card.el, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], { duration: 380, fill: 'forwards' });
    [...this.row.children].filter((c) => c !== card.el).forEach((c) => Motion.play(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));
    setTimeout(() => this.app.go('home', {}, { replace: true }), 420);
  }

  addUser() {
    const panel = new VPanel({ title: t('newUser') });
    const name = new VTextField({ label: t('name'), value: '', placeholder: t('defaultName'), hint: t('typeName', { glyph: '' }).replace('  ', ' ') });
    name.el.querySelector('.v-control__detail').innerHTML = esc(t('typeName', { glyph: '§' })).replace('§', promptGlyph('accept'));
    let avatar = AVATARS[0];
    const pics = h('div', 'avatar-picker');
    pics.dataset.focusGroup = '';
    AVATARS.forEach((id) => {
      const c = new VComponent({ className: 'avatar-pick', focusable: true, label: gameById(id).title });
      c.el.append(avatarEl({ avatar: id }, 'avatar avatar--md'));
      c.on('activate', () => {
        avatar = id;
        pics.querySelectorAll('.is-chosen').forEach((n) => n.classList.remove('is-chosen'));
        c.el.classList.add('is-chosen');
      });
      if (id === avatar) c.el.classList.add('is-chosen');
      pics.append(c.el);
    });
    const create = new VButton({ label: t('create'), variant: 'primary', block: true });
    create.on('activate', () => {
      const p = Profiles.add({ name: name.value || t('defaultName'), avatar });
      panel.close({ silent: true });
      this.app.refresh();
      setTimeout(() => {
        const card = this.app.screen.cards?.find((c) => c.el.getAttribute('aria-label') === p.name);
        if (card) FocusManager.focus(card);
      }, 50);
    });
    panel.addItems(name, h('div', 'v-panel__section', esc(t('picture'))), pics, create).open({ initial: name });
  }
}
