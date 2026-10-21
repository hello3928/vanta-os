// VDialog: centered modal with a title, message and action buttons.
// Options: icon + tone ('error' | 'warning' | 'info' | 'success') draw a status badge above the
// title; code adds a small reference line (for error codes). Opens with a scale-in; error dialogs
// also shake once and play the error sound.
// VDialog.confirm({...}) resolves true/false, for "are you sure?" steps. Error popups: VAlert.js.

import { VComponent } from '../core/VComponent.js';
import { VButton } from './VButton.js';
import { FocusManager } from '../core/FocusManager.js';
import { Overlays } from '../core/Overlays.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { esc, h, afterLayout } from '../core/util.js';
import { icon as iconHtml } from '../core/icons.js';
import { animate } from '../core/motion.js';

export class VDialog extends VComponent {
  constructor({ title, body = '', actions = [], stack = false, icon, tone, code } = {}) {
    super({ className: 'v-layer' });
    this.tone = tone;
    const backdrop = h('div', 'v-backdrop');
    backdrop.addEventListener('click', () => this.close());
    this.box = h('div', `v-dialog${tone ? ` v-dialog--${tone}` : ''}`);
    this.box.setAttribute('role', 'dialog');
    this.box.setAttribute('aria-modal', 'true');
    this.box.setAttribute('aria-label', title);
    if (icon) this.box.append(h('span', 'v-dialog__icon', iconHtml(icon)));
    this.box.append(h('h2', 'v-dialog__title', esc(title)));
    if (body) this.box.append(h('p', 'v-dialog__body', esc(body)));
    if (code) this.box.append(h('p', 'v-dialog__code text-mono', esc(code)));
    this.actionsEl = h('div', `v-dialog__actions${stack ? ' v-dialog__actions--stack' : ''}`);
    this.buttons = actions.map((a) => {
      const b = new VButton({ block: stack, ...a, onActivate: undefined });
      b.on('activate', () => {
        this.close({ silent: true });
        a.onActivate?.();
      });
      this.actionsEl.append(b.el);
      return b;
    });
    this.box.append(this.actionsEl);
    this.el.append(backdrop, this.box);
  }

  open({ initialIndex = 0 } = {}) {
    Overlays.add(this);
    Sound.play(this.tone === 'error' ? 'error' : 'open');
    Haptics.play(this.tone === 'error' ? 'error' : 'select');
    afterLayout(this.el, () => this.el.classList.add('is-open'));
    if (this.tone === 'error') setTimeout(() => animate(this.box, 'shake'), 220);
    FocusManager.pushScope(this.box, { onBack: () => this.close({ silent: true }), initial: this.buttons[initialIndex] });
    this.isOpen = true;
    return this;
  }

  close({ silent = false } = {}) {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (!silent) {
      Sound.play('back');
      Haptics.play('back');
    }
    Overlays.remove(this);
    FocusManager.popScope(this.box);
    this.el.classList.remove('is-open');
    setTimeout(() => this.el.remove(), 260);
    this.emit('close');
  }

  static confirm({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => {
        if (!done) {
          done = true;
          resolve(v);
        }
      };
      const dlg = new VDialog({
        title,
        body,
        actions: [
          { label: cancelLabel, variant: 'secondary', onActivate: () => finish(false) },
          { label: confirmLabel, variant: danger ? 'danger' : 'primary', onActivate: () => finish(true) },
        ],
      });
      dlg.on('close', () => setTimeout(() => finish(false), 0));
      dlg.open({ initialIndex: 0 });
    });
  }
}
