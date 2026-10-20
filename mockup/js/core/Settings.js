// Tiny reactive settings store. Quick access, the Settings screen and game pages all read and
// write here, so a change in one place shows up everywhere.
// Saved in this browser only (a viewer convenience); the mockup works fine without it.

const KEY = 'vanta.mockup.settings.v3';

const DEFAULTS = {
  accent: 'ion',
  brand: 'extended',
  brightness: 85,
  volume: 70,
  sfx: true,
  sfxVolume: 70,
  haptics: 'High',
  menuHaptics: true,
  tdp: 15,
  tdpLimit: false,
  fpsLimit: 'Off',
  upscaling: 'Off',
  overlay: 'Off',
  vrr: true,
  hdr: false,
  wifi: true,
  bluetooth: true,
  airplane: false,
  epp: 'Balanced',
  scheduler: 'scx_lavd',
  gamemode: true,
  channel: 'Stable',
};

const data = { ...DEFAULTS };
try {
  Object.assign(data, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch {
  /* storage blocked: defaults are fine */
}

const subs = new Map();

export const Settings = {
  get(key) {
    return data[key];
  },
  set(key, value) {
    if (data[key] === value) return;
    data[key] = value;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
    (subs.get(key) || []).forEach((fn) => fn(value));
  },
  on(key, fn) {
    if (!subs.has(key)) subs.set(key, []);
    subs.get(key).push(fn);
    return () => subs.set(key, subs.get(key).filter((f) => f !== fn));
  },
};
