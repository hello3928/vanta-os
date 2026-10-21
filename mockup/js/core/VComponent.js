// Base class for every Vanta UI component.
// It owns one DOM element and, when focusable, handles focus, activation, sound and haptics
// the same way everywhere. Subclasses only build their markup and override what differs.
//
// Events (component.on(name, fn)): focus, blur, activate, options (X button), edge (no neighbor), change.
// QML port: VComponent.qml (a FocusScope with the same signals).

import { Sound } from './Sound.js';
import { Haptics } from './Haptics.js';
import { FocusManager } from './FocusManager.js';
import { Settings } from './Settings.js';
import { Input } from './Input.js';
import { whileConnected } from './util.js';

export class VComponent {
  constructor({
    tag = 'div',
    className = '',
    focusable = false,
    label = '',
    focusSound = 'move',
    activateSound = 'select',
    activateHaptic = 'select',
    tapToFocusFirst = false,
  } = {}) {
    this.el = document.createElement(tag);
    this.el.className = className;
    this.el.__v = this;
    this.focusable = focusable;
    this.focusSound = focusSound;
    this.activateSound = activateSound;
    this.activateHaptic = activateHaptic;
    this.tapToFocusFirst = tapToFocusFirst;
    this.disabled = false;
    this.handlers = new Map();

    if (focusable) {
      this.el.classList.add('v-focusable');
      this.el.tabIndex = -1;
      if (label) this.el.setAttribute('aria-label', label);
      this.el.addEventListener('click', (e) => this.onClick(e));
      this.el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || Input.device !== 'pointer') return;
        if (FocusManager.current !== this && FocusManager.inScope(this)) FocusManager.focus(this);
      });
    }
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
    return this;
  }

  emit(type, detail) {
    (this.handlers.get(type) || []).forEach((fn) => fn(detail, this));
  }

  mount(parent) {
    (parent.el || parent).append(this.el);
    return this;
  }

  add(...children) {
    for (const c of children.flat()) if (c) this.el.append(c.el || c);
    return this;
  }

  setDisabled(v) {
    this.disabled = v;
    this.el.classList.toggle('is-disabled', v);
    this.el.setAttribute('aria-disabled', String(v));
    return this;
  }

  // Shown but not usable on this device or for this game, with the reason on the second line.
  setUnsupported(reason) {
    if (!reason) return this;
    this.setDisabled(true);
    this.el.classList.add('is-unsupported');
    let detail = this.el.querySelector('.v-control__detail');
    if (!detail) {
      detail = document.createElement('span');
      detail.className = 'v-control__detail';
      this.el.append(detail);
    }
    detail.textContent = reason;
    return this;
  }

  // Keeps this component in sync with a setting, wherever else it gets changed.
  bind(key, apply) {
    apply(Settings.get(key));
    whileConnected(this.el, (fn) => Settings.on(key, fn), apply);
    return this;
  }

  // ---- called by FocusManager ----
  onFocus({ silent = false } = {}) {
    this.el.classList.add('is-focused');
    if (!silent) {
      Sound.play(this.focusSound);
      Haptics.play('tick');
    }
    this.emit('focus');
  }

  onBlur() {
    this.el.classList.remove('is-focused');
    this.emit('blur');
  }

  activate(meta) {
    if (this.disabled) {
      Sound.play('error');
      Haptics.play('error');
      return;
    }
    if (this.activateSound) Sound.play(this.activateSound);
    if (this.activateHaptic) Haptics.play(this.activateHaptic);
    this.press();
    this.emit('activate', meta);
  }

  // Quick squash so every press has physical feedback, from any input.
  press() {
    this.el.classList.remove('is-pressed');
    void this.el.offsetWidth;
    this.el.classList.add('is-pressed');
    clearTimeout(this.pressTimer);
    this.pressTimer = setTimeout(() => this.el.classList.remove('is-pressed'), 130);
  }

  options() {
    this.emit('options');
  }

  // Return true to consume a direction (sliders and choices use left/right).
  handleDirection() {
    return false;
  }

  onClick(e) {
    if (!FocusManager.inScope(this)) return;
    if (this.tapToFocusFirst && FocusManager.current !== this) {
      FocusManager.focus(this);
      return;
    }
    if (FocusManager.current !== this) FocusManager.focus(this, { silent: true });
    this.activate({ pointer: e });
  }
}
