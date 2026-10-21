// Interface components: every reusable class on one page, for design review and testing.
// Opened from Settings → System. Developer page, so the sample text is English only.

import { VButton } from '../components/VButton.js';
import { VToggle } from '../components/VToggle.js';
import { VSlider } from '../components/VSlider.js';
import { VDropdown } from '../components/VDropdown.js';
import { VChoice } from '../components/VChoice.js';
import { VTextField } from '../components/VTextField.js';
import { VListItem } from '../components/VListItem.js';
import { VBadge } from '../components/VBadge.js';
import { VProgress } from '../components/VProgress.js';
import { VSpinner } from '../components/VSpinner.js';
import { VBanner } from '../components/VBanner.js';
import { VAlert } from '../components/VAlert.js';
import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';
import { FocusManager } from '../core/FocusManager.js';
import { animate } from '../core/motion.js';
import { t } from '../core/i18n.js';
import { esc, h } from '../core/util.js';

const ANIMATIONS = ['fade-in', 'slide-up', 'slide-left', 'scale-in', 'rise', 'press', 'shake', 'nudge'];

function section(title, ...children) {
  const el = h('section', 'kit__section');
  el.append(h('h2', 'kit__title text-eyebrow', esc(title)), ...children);
  return el;
}

function row(...items) {
  const el = h('div', 'kit__row');
  el.dataset.focusGroup = '';
  items.forEach((i) => el.append(i.el || i));
  return el;
}

function list(...items) {
  const el = h('div', 'kit__list');
  el.dataset.focusGroup = '';
  items.forEach((i) => el.append(i.el || i));
  return el;
}

export class KitScreen {
  constructor(app) {
    this.app = app;
    this.timers = [];
    this.el = h('div', 'screen screen--kit');
    const scroll = h('div', 'screen__scroll');
    const page = h('div', 'kit');

    // Type
    const type = h(
      'div',
      'kit__type',
      `<div class="text-display">Display</div>
       <div class="text-title">Title</div>
       <div class="text-heading">Heading</div>
       <div class="text-body">Body text for descriptions and dialog messages.</div>
       <div class="text-label">Label</div>
       <div class="text-caption text-muted">Caption</div>
       <div class="text-eyebrow">Eyebrow</div>
       <div class="text-mono text-muted">Error code: NET-0x1F</div>`,
    );

    // Buttons
    const b = (o) => new VButton(o);
    const buttons = row(
      b({ label: 'Play', variant: 'play', size: 'lg', icon: 'play' }),
      b({ label: 'Primary', variant: 'primary' }),
      b({ label: 'Secondary' }),
      b({ label: 'Ghost', variant: 'ghost' }),
      b({ label: 'Delete', variant: 'danger', icon: 'trash' }),
      b({ ariaLabel: 'More', icon: 'more' }),
    );
    const small = b({ label: 'Small', size: 'sm' });
    const disabled = b({ label: 'Disabled' });
    disabled.setDisabled(true);
    const buttons2 = row(small, b({ label: 'Small primary', size: 'sm', variant: 'primary' }), disabled);

    // Inputs
    const inputs = list(
      new VToggle({ label: 'Toggle', detail: 'Optional second line', value: true }),
      new VSlider({ label: 'Slider', value: 60 }),
      new VDropdown({ label: 'Dropdown', options: ['Off', 'Low', 'High'], value: 'Low' }),
      new VChoice({ label: 'Stepper', options: ['30', '40', '60', '90', '120'], value: '60' }),
      new VTextField({ label: 'Text field', placeholder: 'Not set' }),
      new VTextField({ label: 'Password', password: true, placeholder: 'Not set', maxLength: 63 }),
      new VListItem({ label: 'List item', detail: 'With a chevron', chevron: true }),
      new VListItem({ label: 'List item', badge: { text: 'Badge', tone: 'good' } }),
    );

    // Badges
    const badges = row(
      new VBadge({ text: 'Default' }),
      new VBadge({ text: 'Accent', tone: 'accent' }),
      new VBadge({ text: 'Verified', tone: 'good', icon: 'check' }),
      new VBadge({ text: 'BIOS needed', tone: 'warn' }),
      new VBadge({ text: 'Failed', tone: 'bad' }),
      new VBadge({ text: 'Muted', tone: 'muted' }),
    );
    badges.removeAttribute('data-focus-group');

    // Loading
    const determinate = new VProgress({ label: 'Downloading Hades II', value: 0.42 });
    const indeterminate = new VProgress({ label: 'Checking for updates', indeterminate: true });
    const small2 = new VProgress({ value: 0.75, size: 'sm', showValue: false });
    const spinners = h('div', 'kit__spinners');
    spinners.append(new VSpinner({ size: 'sm' }).el, new VSpinner().el, new VSpinner({ size: 'lg' }).el, new VSpinner({ tone: 'light' }).el, new VSpinner({ tone: 'muted' }).el);
    const loading = h('div', 'kit__stack');
    loading.append(determinate.el, indeterminate.el, small2.el, spinners);
    let p = 0.42;
    const step = () => {
      p = p >= 1 ? 0 : Math.min(1, p + 0.05 + Math.random() * 0.06);
      determinate.set(p);
      this.timers.push(setTimeout(step, p >= 1 ? 1400 : 420));
    };
    this.timers.push(setTimeout(step, 600));

    // Banners
    const banners = h('div', 'kit__stack');
    banners.append(
      new VBanner({ tone: 'error', title: "Couldn't connect to Home-5G", message: 'Check the password and try again.', action: 'Try again' }).el,
      new VBanner({ tone: 'warning', title: 'Battery low', message: '12% remaining. Connect the charger.' }).el,
      new VBanner({ tone: 'info', title: 'Update available', message: 'Vanta OS 0.1.1 will install the next time you restart.' }).el,
      new VBanner({ tone: 'success', title: 'Backup complete', message: 'Saves for 14 games were uploaded.' }).el,
    );
    banners.dataset.focusGroup = '';

    // Popups
    const popups = row(
      b({
        label: 'Error',
        onActivate: () =>
          VAlert.error({
            title: "Couldn't start the game",
            message: 'Proton closed before the game opened. Try another compatibility tool in Properties.',
            code: 'Error code: PRT-0x41',
            actions: [
              { id: 'retry', label: t('tryAgain') },
              { id: 'close', label: t('close') },
            ],
          }),
      }),
      b({ label: 'Warning', onActivate: () => VAlert.warning({ title: 'Storage almost full', message: '12 GB free. Some updates will not download until you free up space.' }) }),
      b({ label: 'Info', onActivate: () => VAlert.info({ title: 'Restart required', message: 'The new display settings apply after a restart.' }) }),
      b({ label: 'Success', onActivate: () => VAlert.success({ title: 'Update installed', message: 'Vanta OS 0.1.1 is ready.' }) }),
      b({ label: 'Confirm', onActivate: () => VDialog.confirm({ title: 'Delete save data?', body: 'This removes local saves for this game. Cloud saves are not affected.', confirmLabel: 'Delete', cancelLabel: t('cancel'), danger: true }) }),
      b({ label: 'Toast', onActivate: () => VToast.show('Controller connected', { icon: 'gamepad' }) }),
    );

    // Animations
    const sample = h('div', 'kit__sample', '<span class="text-label">Sample</span>');
    const anims = row(...ANIMATIONS.map((name) => b({ label: name, size: 'sm', onActivate: () => animate(sample, name) })));
    const animWrap = h('div', 'kit__anim');
    animWrap.append(sample, anims);

    page.append(
      h('p', 'kit__intro text-body text-muted', esc(t('componentGallerySub'))),
      section('Typography', type),
      section('Buttons', buttons, buttons2),
      section('Controls', inputs),
      section('Badges', badges),
      section('Loading', loading),
      section('Banners', banners),
      section('Popups', popups),
      section('Animation classes', animWrap),
    );
    scroll.append(h('div', 'shell-gap'), page);
    this.el.append(scroll);
    this.shell = { title: t('componentGallery'), hints: [
          ['accept', t('select')],
          ['back', t('back')],
        ] };
    this.first = buttons.firstChild.__v;
  }

  enter() {
    FocusManager.focus(this.first, { silent: true });
  }

  destroy() {
    this.timers.forEach(clearTimeout);
  }
}
