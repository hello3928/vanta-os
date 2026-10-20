// Turns keyboard and gamepad input into console actions:
// up/down/left/right, accept (A), back (B), options (X), qam (Start = quick access menu),
// mainMenu (Guide or View = the Vanta button), prevTab/nextTab (LB/RB), home, power.
// Real OS: SDL3 gamepad events in the Qt app, with InputPlumber mapping handheld buttons.

import { familyFromId } from './glyphs.js';

const KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'accept',
  ' ': 'accept',
  Escape: 'back',
  Backspace: 'back',
  x: 'options',
  q: 'qam',
  m: 'mainMenu',
  '[': 'prevTab',
  ']': 'nextTab',
  PageUp: 'prevTab',
  PageDown: 'nextTab',
  h: 'home',
  p: 'power',
};

// Standard gamepad mapping (https://w3c.github.io/gamepad/#remapping)
const BUTTONS = { 0: 'accept', 1: 'back', 2: 'options', 4: 'prevTab', 5: 'nextTab', 8: 'mainMenu', 9: 'qam', 16: 'mainMenu' };
const DPAD = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const REPEAT_DELAY = 360;
const REPEAT_RATE = 105;

export const Input = {
  device: 'keyboard',
  family: 'xbox',
  handler: null,
  deviceListeners: [],

  init(handler) {
    this.handler = handler;
    window.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      // While typing in a text field, keys type. Enter or Esc finishes, up/down leave the field.
      if (e.target.matches?.('input, textarea')) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          e.target.blur();
          return;
        }
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.target.blur();
      }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const action = KEYS[key] ?? KEYS[e.key];
      if (!action) return;
      e.preventDefault();
      this.setDevice('keyboard');
      this.fire(action, { repeat: e.repeat });
    });
    window.addEventListener('pointerdown', (e) => {
      this.setDevice(e.pointerType === 'touch' ? 'touch' : 'pointer');
      this.fire('pointer');
    });
    // Hovering only moves focus after the mouse really moves, so a resting cursor
    // never steals focus from the controller or keyboard.
    let travel = 0;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || this.device === 'pointer') return;
      travel += Math.abs(e.movementX) + Math.abs(e.movementY);
      if (travel > 40) {
        travel = 0;
        this.setDevice('pointer');
      }
    });
    window.addEventListener('gamepadconnected', (e) => {
      this.fire('padConnected', { pad: e.gamepad });
      this.startPolling();
    });
    window.addEventListener('gamepaddisconnected', (e) => this.fire('padDisconnected', { pad: e.gamepad }));
    this.startPolling();
  },

  fire(action, meta = {}) {
    this.handler?.(action, meta);
  },

  setDevice(d, family = this.family) {
    if (this.device === d && this.family === family) return;
    this.device = d;
    this.family = family;
    this.deviceListeners.forEach((fn) => fn(d));
  },

  onDevice(fn) {
    this.deviceListeners.push(fn);
  },

  // Gamepad polling with D-pad / stick auto-repeat.
  polling: false,
  prev: new Map(),
  held: null,
  nextRepeat: 0,

  startPolling() {
    if (this.polling) return;
    let pads;
    try {
      pads = navigator.getGamepads?.();
    } catch {
      return; // blocked by the embedding frame
    }
    if (!pads) return;
    this.polling = true;
    const loop = (now) => {
      this.poll(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  poll(now) {
    let pads;
    try {
      pads = [...navigator.getGamepads()].filter(Boolean);
    } catch {
      return;
    }
    let dir = null;
    for (const pad of pads) {
      const prev = this.prev.get(pad.index) || [];
      const pressed = pad.buttons.map((b) => b.pressed || b.value > 0.5);
      pressed.forEach((down, i) => {
        if (down && !prev[i]) {
          this.setDevice('gamepad', familyFromId(pad.id));
          if (BUTTONS[i]) this.fire(BUTTONS[i]);
        }
      });
      this.prev.set(pad.index, pressed);

      for (const [i, d] of Object.entries(DPAD)) if (pressed[i]) dir = d;
      const [ax = 0, ay = 0] = pad.axes;
      if (!dir && Math.hypot(ax, ay) > 0.55) {
        dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : ay > 0 ? 'down' : 'up';
      }
    }
    if (dir !== this.held) {
      this.held = dir;
      if (dir) {
        this.setDevice('gamepad', familyFromId(pads[0]?.id));
        this.fire(dir);
        this.nextRepeat = now + REPEAT_DELAY;
      }
    } else if (dir && now >= this.nextRepeat) {
      this.fire(dir, { repeat: true });
      this.nextRepeat = now + REPEAT_RATE;
    }
  },
};
