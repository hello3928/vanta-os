// Profile picture choices and the Edit profile panel, shared by setup, "Who's playing?",
// Settings and the main menu.

import { VComponent } from '../core/VComponent.js';
import { FocusManager } from '../core/FocusManager.js';
import { VPanel } from '../components/VPanel.js';
import { VTextField } from '../components/VTextField.js';
import { VListItem } from '../components/VListItem.js';
import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';
import { avatarEl } from '../components/avatar.js';
import { Profiles, COLORS } from '../core/Profiles.js';
import { t } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { pickPhoto, cropPhoto } from './PhotoCrop.js';

// Name field with the controller hint ("Press A to type").
export function nameField(value) {
  return new VTextField({ label: t('name'), value, placeholder: t('defaultName') });
}

// Color swatches plus "Upload a photo" / "Remove photo". `draft` is { name, color, photo };
// onChange is called with the updated draft after every change.
export function pictureChooser(draft, onChange) {
  const wrap = h('div', 'picture-chooser');
  // Rebuilds after each change and puts the selection back where it was.
  const render = (focusKey) => {
    wrap.replaceChildren();
    let refocus = null;
    const swatches = h('div', 'avatar-picker');
    swatches.dataset.focusGroup = '';
    COLORS.forEach((color) => {
      const c = new VComponent({ className: 'avatar-pick', focusable: true, label: t('color') });
      c.el.append(avatarEl({ name: draft.name || t('defaultName'), color }, 'avatar avatar--md'));
      if (!draft.photo && draft.color === color) c.el.classList.add('is-chosen');
      if (focusKey === color) refocus = c;
      c.on('activate', () => {
        draft.color = color;
        draft.photo = null;
        onChange(draft);
        render(color);
      });
      swatches.append(c.el);
    });
    const list = h('div', 'picture-chooser__actions');
    list.dataset.highlight = '';
    const upload = new VListItem({ label: t('uploadPhoto'), icon: 'add_photo_alternate', chevron: true });
    upload.on('activate', async () => {
      const file = await pickPhoto();
      if (!file) return;
      const photo = await cropPhoto(file);
      if (!photo) return;
      draft.photo = photo;
      onChange(draft);
      render('upload');
    });
    if (focusKey === 'upload') refocus = upload;
    list.append(upload.el);
    if (draft.photo) {
      const remove = new VListItem({ label: t('removePhoto'), icon: 'hide_image' });
      remove.on('activate', () => {
        draft.photo = null;
        onChange(draft);
        render('upload');
      });
      list.append(remove.el);
    }
    wrap.append(swatches, list);
    if (refocus) FocusManager.focus(refocus, { silent: true });
  };
  render();
  return wrap;
}

// Edit an existing profile: name, picture, delete. Changes save as you make them.
export function openProfileEditor(app, profile) {
  const draft = { name: profile.name, color: profile.color, photo: profile.photo };
  const preview = h('div', 'editor__preview');
  const paint = () => preview.replaceChildren(avatarEl(draft, 'avatar avatar--lg'), h('div', 'editor__name', esc(draft.name || t('defaultName'))));
  paint();
  const panel = new VPanel({ title: t('editProfile'), header: preview });
  const name = nameField(profile.name);
  name.on('change', (v) => {
    draft.name = v;
    Profiles.update(profile.id, { name: v });
    paint();
  });
  const chooser = pictureChooser(draft, (d) => {
    Profiles.update(profile.id, { color: d.color, photo: d.photo });
    paint();
  });
  const del = new VListItem({ label: t('deleteProfile'), icon: 'delete' });
  del.el.classList.add('is-danger');
  del.on('activate', async () => {
    const ok = await VDialog.confirm({ title: t('deleteQ', { name: profile.name }), body: t('deleteBody'), confirmLabel: t('deleteProfile'), cancelLabel: t('cancel'), danger: true });
    if (!ok) return;
    const wasCurrent = Profiles.current?.id === profile.id;
    Profiles.remove(profile.id);
    panel.close({ silent: true });
    VToast.show(t('deleted', { name: profile.name }), { icon: 'delete' });
    if (wasCurrent || app.screen?.name === 'users') app.go('users', {}, { replace: true });
  });
  panel.addItems(name, h('div', 'v-panel__section', esc(t('picture'))), chooser, h('div', 'menu__rule'), del);
  panel.on('close', () => app.refresh());
  panel.open({ initial: name });
  return panel;
}
