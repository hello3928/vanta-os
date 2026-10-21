// "Who's playing?": the first screen after start-up. Pick a profile, play as a guest, or add one.
// X on a profile edits it. Choosing is also the first button press, which browsers need before
// they allow sound.

import { VComponent } from '../core/VComponent.js';
import { VPanel } from '../components/VPanel.js';
import { VButton } from '../components/VButton.js';
import { avatarEl } from '../components/avatar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Profiles } from '../core/Profiles.js';
import { Motion } from '../core/motion.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { nameField, pictureChooser, openProfileEditor } from './ProfileEditor.js';

export { avatarEl };

class ProfileCard extends VComponent {
  constructor({ name, profile, glyph }) {
    super({ className: 'profile', focusable: true, label: name });
    this.el.setAttribute('role', 'button');
    this.profile = profile;
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
      c.on('options', () => openProfileEditor(app, p));
      return c;
    });
    const guest = new ProfileCard({ name: t('guest'), glyph: 'user' });
    guest.on('activate', () => this.choose(guest, () => Profiles.guest()));
    const add = new ProfileCard({ name: t('addUser'), glyph: 'add' });
    add.on('activate', () => this.addUser());
    [...this.cards, guest, add].forEach((c) => this.row.append(c.el));
    wrap.append(this.row);
    this.el.append(wrap);
    this.shell = { topbar: false, hints: [
          ['accept', t('select')],
          ['options', t('editProfile')],
        ] };
  }

  enter() {
    const current = this.cards.find((c) => c.profile.id === Profiles.current?.id);
    FocusManager.focus(current || this.cards[0] || this.row.firstChild.__v, { silent: true });
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
    const draft = { name: '', color: Profiles.nextColor(), photo: null };
    const preview = h('div', 'editor__preview');
    const paint = () => preview.replaceChildren(avatarEl({ ...draft, name: draft.name || t('defaultName') }, 'avatar avatar--lg'), h('div', 'editor__name', esc(draft.name || t('defaultName'))));
    paint();
    const panel = new VPanel({ title: t('newUser'), header: preview });
    const name = nameField('');
    name.on('change', (v) => {
      draft.name = v;
      paint();
    });
    const chooser = pictureChooser(draft, paint);
    const create = new VButton({ label: t('create'), variant: 'primary', block: true });
    create.on('activate', () => {
      const p = Profiles.add({ ...draft, name: draft.name || t('defaultName') });
      panel.close({ silent: true });
      this.app.refresh();
      const card = this.app.screen.cards?.find((c) => c.profile.id === p.id);
      if (card) FocusManager.focus(card);
    });
    panel.addItems(name, h('div', 'v-panel__section', esc(t('picture'))), chooser, create).open({ initial: name });
  }
}
