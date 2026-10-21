// On-screen keyboard (Steam Deck style). Slides up from the bottom with a preview of the text.
//
//   Keyboard.open({ label, value, password, maxLength, onInput(text), onDone(text) })
//
// Controller: D-pad/stick moves between keys, A types, B deletes, X adds a space,
//             ☰ (Start) finishes, LB/RB move the cursor.
// Physical keyboard: typing goes straight into the field; Enter finishes, Esc closes.
// Real OS: the same layout in QML, shown by vantad whenever a text field gets focus.

import { VComponent } from '../core/VComponent.js';
import { FocusManager } from '../core/FocusManager.js';
import { Overlays } from '../core/Overlays.js';
import { Sound } from '../core/Sound.js';
import { Haptics } from '../core/Haptics.js';
import { Input } from '../core/Input.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { esc, h, afterLayout } from '../core/util.js';
import { promptGlyph, onPromptChange } from './VHintBar.js';
import { glyph } from '../core/glyphs.js';

const LAYOUTS = {
  letters: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', 'backspace'],
    ['symbols', 'left', 'space', 'right', 'done'],
  ],
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '&', '*', '(', ')', '-'],
    ['_', '=', '+', '[', ']', '{', '}', ';', ':', "'"],
    ['"', ',', '.', '/', '?', '<', '>', '\\', '|', 'backspace'],
    ['letters', 'left', 'space', 'right', 'done'],
  ],
};

class Key extends VComponent {
  constructor(id, kb) {
    super({ tag: 'button', className: `v-key v-key--${id.length === 1 ? 'char' : id}`, focusable: true, label: id, focusSound: 'move', activateSound: null, activateHaptic: null });
    this.el.type = 'button';
    this.id = id;
    this.kb = kb;
    this.paint();
  }
  paint() {
    const kb = this.kb;
    const up = kb.shift || kb.caps;
    const labels = {
      shift: icon(kb.caps ? 'keyboard_capslock' : 'shift'),
      backspace: icon('backspace'),
      space: `<span>${esc(t('space'))}</span>`,
      left: icon('chevron_left'),
      right: icon('chevron_right'),
      symbols: '<span>&amp;123</span>',
      letters: '<span>ABC</span>',
      done: `<span>${esc(t('done'))}</span>`,
    };
    this.el.innerHTML = labels[this.id] ?? esc(up ? this.id.toUpperCase() : this.id);
    this.el.classList.toggle('is-on', this.id === 'shift' && (kb.shift || kb.caps));
    this.el.setAttribute('aria-label', this.id.length === 1 ? (up ? this.id.toUpperCase() : this.id) : this.id);
  }
  activate() {
    this.press();
    this.kb.press(this.id);
  }
}

export const Keyboard = {
  isOpen: false,

  open({ label = '', value = '', password = false, maxLength = 64, onInput, onDone } = {}) {
    if (this.isOpen) this.close();
    Object.assign(this, { label, text: value, caret: value.length, password, maxLength, onInput, onDone, shift: !value && !password, caps: false, page: 'letters' });
    this.isOpen = true;

    const layer = h('div', 'v-layer v-layer--keyboard');
    const backdrop = h('div', 'v-backdrop');
    backdrop.addEventListener('click', () => this.finish());
    const sheet = h('div', 'v-keyboard');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', label || t('keyboard'));
    this.preview = h('div', 'v-keyboard__preview');
    this.keysEl = h('div', 'v-keyboard__keys');
    this.hints = h('div', 'v-keyboard__hints');
    sheet.append(this.preview, this.keysEl, this.hints);
    layer.append(backdrop, sheet);
    this.layer = layer;
    this.sheet = sheet;
    this.view = { el: layer, close: () => this.close() };

    Overlays.root.append(layer);
    Overlays.open.push(this.view);
    this.renderKeys();
    this.renderPreview();
    this.renderHints();
    onPromptChange(() => this.renderHints(), this.hints);
    Sound.play('open');
    Haptics.play('tick');
    afterLayout(layer, () => layer.classList.add('is-open'));
    FocusManager.pushScope(this.keysEl, { onBack: () => this.backspace(), initial: this.keys.find((k) => k.id === 'q') });
    // Physical keyboard: type straight into the field while the on-screen keyboard is up.
    Input.capture = (e) => this.capture(e);
  },

  renderKeys() {
    const focusedId = FocusManager.current?.kb === this ? FocusManager.current.id : null;
    this.keysEl.replaceChildren();
    this.keys = [];
    LAYOUTS[this.page].forEach((row) => {
      const r = h('div', 'v-keyboard__row');
      row.forEach((id) => {
        const k = new Key(id, this);
        this.keys.push(k);
        r.append(k.el);
      });
      this.keysEl.append(r);
    });
    if (focusedId) {
      const again = this.keys.find((k) => k.id === focusedId) || this.keys.find((k) => k.id === (this.page === 'letters' ? 'letters' : 'symbols'));
      if (again) FocusManager.focus(again, { silent: true });
    }
  },

  repaint() {
    this.keys.forEach((k) => k.paint());
  },

  renderPreview() {
    const shown = this.password ? '•'.repeat(this.text.length) : this.text;
    const before = esc(shown.slice(0, this.caret));
    const after = esc(shown.slice(this.caret));
    this.preview.innerHTML = `<span class="v-keyboard__label">${esc(this.label)}</span><span class="v-keyboard__text">${before}<span class="v-keyboard__caret"></span>${after}${shown ? '' : `<span class="v-keyboard__placeholder">${esc(t('startTyping'))}</span>`}</span>`;
  },

  // Controller: B delete, X space, LB/RB cursor, Start done. Keyboard: the matching keys.
  renderHints() {
    const pad = promptGlyph('accept') !== glyph('accept', 'keyboard');
    const g = (action, key) => (pad ? promptGlyph(action) : glyph(key, 'keyboard'));
    const item = (glyphs, label) => `<span class="v-hint"><span class="v-hint__glyphs">${glyphs}</span>${esc(label)}</span>`;
    this.hints.innerHTML = [
      item(g('back', 'Backspace'), t('delete')),
      item(g('options', 'Space'), t('space')),
      item(pad ? promptGlyph('tabs') : glyph('←', 'keyboard') + glyph('→', 'keyboard'), t('moveCursor')),
      item(g('qam', 'Enter'), t('done')),
    ].join('');
  },

  insert(ch) {
    if (this.text.length >= this.maxLength) {
      Sound.play('error');
      Haptics.play('error');
      return;
    }
    const c = this.shift || this.caps ? ch.toUpperCase() : ch;
    this.text = this.text.slice(0, this.caret) + c + this.text.slice(this.caret);
    this.caret += c.length;
    if (this.shift && !this.caps) {
      this.shift = false;
      this.repaint();
    }
    Sound.play('key');
    Haptics.play('slider');
    this.changed();
  },

  backspace() {
    if (!this.caret) {
      Sound.play('error');
      return;
    }
    this.text = this.text.slice(0, this.caret - 1) + this.text.slice(this.caret);
    this.caret -= 1;
    Sound.play('keyDelete');
    Haptics.play('slider');
    this.changed();
  },

  moveCaret(d) {
    this.caret = Math.max(0, Math.min(this.text.length, this.caret + d));
    Sound.play('key');
    this.renderPreview();
  },

  changed() {
    this.renderPreview();
    this.onInput?.(this.text);
  },

  press(id) {
    if (id.length === 1) return this.insert(id);
    switch (id) {
      case 'space':
        return this.insert(' ');
      case 'backspace':
        return this.backspace();
      case 'left':
        return this.moveCaret(-1);
      case 'right':
        return this.moveCaret(1);
      case 'shift':
        // Tap: one capital. Tap again while on: caps lock. Tap again: off.
        if (this.caps) this.caps = this.shift = false;
        else if (this.shift) this.caps = true;
        else this.shift = true;
        Sound.play('toggleOn');
        return this.repaint();
      case 'symbols':
      case 'letters':
        this.page = id;
        Sound.play('tab');
        return this.renderKeys();
      case 'done':
        return this.finish();
    }
  },

  // Controller shortcuts while the keyboard is open. Returns true when handled.
  handleAction(action) {
    if (!this.isOpen) return false;
    switch (action) {
      case 'back':
        this.backspace();
        return true;
      case 'options':
        this.insert(' ');
        return true;
      case 'qam':
        this.finish();
        return true;
      case 'prevTab':
        this.moveCaret(-1);
        return true;
      case 'nextTab':
        this.moveCaret(1);
        return true;
      case 'mainMenu':
        return true;
      default:
        return false;
    }
  },

  capture(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === 'Enter') return this.finish(), true;
    if (e.key === 'Escape') return this.finish(), true;
    if (e.key === 'Backspace') return this.backspace(), true;
    if (e.key.length === 1) {
      const wasShift = this.shift;
      this.shift = false;
      this.insert(e.key);
      this.shift = wasShift && !this.caps ? false : this.shift;
      this.repaint();
      return true;
    }
    return false;
  },

  finish() {
    if (!this.isOpen) return;
    const text = this.text;
    Sound.play('select');
    Haptics.play('select');
    this.close();
    this.onDone?.(text);
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    Input.capture = null;
    Overlays.remove(this.view);
    FocusManager.popScope(this.keysEl);
    const layer = this.layer;
    layer.classList.remove('is-open');
    setTimeout(() => layer.remove(), 240);
  },
};
