// Vanta UI sounds: dry, tactile clicks in the spirit of the Steam Deck. No reverb, no melodies.
//
// Each click is a tiny physical model of a plastic button: a sub-millisecond noise "strike"
// excites two tuned resonators that ring for a few milliseconds (the pitched tick), with a short
// low thump underneath for weight. Confirm, back and toggles are two-part press/release clicks.
//
// Real OS: render these to WAV once (Sound.render(name) gives the buffer) and play them through
// Qt Multimedia SoundEffect over PipeWire. Designed files can replace any of them:
// Sound.useFiles('assets/sounds/') loads <name>.wav where present.
// Browsers only allow audio after a user gesture, so call Sound.unlock() from an input handler.

let ctx = null;
let master, bus;
let noiseBuf = null;
const files = new Map();

const state = { on: true, uiVol: 0.7, systemVol: 0.7, unlocked: false };

const rand = (a, b) => a + Math.random() * (b - a);

// Seeded noise, so every click sounds the same each time (random strikes vary in level, which
// makes clicks feel cheap).
function makeNoise(c) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.25), c.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 22695477;
  for (let i = 0; i < d.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (seed / 0x3fffffff) - 1;
  }
  return buf;
}

// Dry chain: a high-pass keeps it clean and tight, a gentle low-pass takes the edge off.
function chain(c, out) {
  const input = c.createGain();
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 110;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 9500;
  lp.Q.value = 0.4;
  input.connect(hp).connect(lp).connect(out);
  return input;
}

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = state.systemVol;
  master.connect(ctx.destination);
  bus = ctx.createGain();
  bus.gain.value = state.uiVol;
  bus.connect(chain(ctx, master));
  noiseBuf = makeNoise(ctx);
  return ctx;
}

// The tactile tick: a strike into two resonators (the second an inharmonic partial, like a
// small plastic part), plus an optional low thump.
// pitch: main resonance (Hz). ring: how long it rings (s). body: thump frequency (0 = none).
function tick(c, out, noise, { t = 0, pitch = 1800, ring = 0.014, g = 0.5, body = 0, bodyG = 0.06, bright = 0.35 }) {
  const now = c.currentTime + t;
  const strike = c.createBufferSource();
  strike.buffer = noise;
  const hit = c.createGain();
  hit.gain.setValueAtTime(g, now);
  hit.gain.exponentialRampToValueAtTime(0.0001, now + 0.0012);
  strike.connect(hit);
  [
    [pitch, 1],
    [pitch * 2.76, bright],
  ].forEach(([f, level]) => {
    const res = c.createBiquadFilter();
    res.type = 'bandpass';
    res.frequency.value = f;
    // Q sets the ring time: the resonator rings for about Q / (pi * f) seconds.
    res.Q.value = Math.max(2, Math.PI * f * ring);
    const amp = c.createGain();
    amp.gain.value = level * Math.sqrt(res.Q.value) * 0.9;
    hit.connect(res).connect(amp).connect(out);
  });
  strike.start(now, 0, 0.01);
  if (body) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(body * 1.6, now);
    osc.frequency.exponentialRampToValueAtTime(body, now + 0.012);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(bodyG, now + 0.0015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(env).connect(out);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// A short, low breath of air for panels, kept quiet and well under the clicks.
function air(c, out, noise, { t = 0, dur = 0.09, from = 500, to = 1100, g = 0.018 }) {
  const now = c.currentTime + t;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(from, now);
  f.frequency.exponentialRampToValueAtTime(to, now + dur);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(g, now + dur * 0.3);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f).connect(env).connect(out);
  src.start(now, 0, dur + 0.02);
}

function tone(c, out, { t = 0, f = 880, dur = 0.12, g = 0.03 }) {
  const now = c.currentTime + t;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = f;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(g, now + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(env).connect(out);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

// Each sound: (c, out, noise, opts). Levels are set so navigation is quietest.
const SOUNDS = {
  move: (c, o, n) => tick(c, o, n, { pitch: rand(1850, 1950), ring: 0.011, g: 0.35, body: 320, bodyG: 0.02 }),
  tab: (c, o, n) => tick(c, o, n, { pitch: 2300, ring: 0.013, g: 0.4, body: 420, bodyG: 0.025 }),
  select: (c, o, n) => {
    tick(c, o, n, { pitch: 1450, ring: 0.02, g: 0.55, body: 170, bodyG: 0.07 });
    tick(c, o, n, { t: 0.042, pitch: 2150, ring: 0.011, g: 0.28 });
  },
  back: (c, o, n) => {
    tick(c, o, n, { pitch: 1150, ring: 0.02, g: 0.5, body: 140, bodyG: 0.06 });
    tick(c, o, n, { t: 0.038, pitch: 880, ring: 0.012, g: 0.24 });
  },
  toggleOn: (c, o, n) => {
    tick(c, o, n, { pitch: 1600, ring: 0.012, g: 0.4, body: 260, bodyG: 0.03 });
    tick(c, o, n, { t: 0.03, pitch: 2500, ring: 0.012, g: 0.32 });
  },
  toggleOff: (c, o, n) => {
    tick(c, o, n, { pitch: 2200, ring: 0.012, g: 0.36, body: 220, bodyG: 0.03 });
    tick(c, o, n, { t: 0.03, pitch: 1350, ring: 0.012, g: 0.32 });
  },
  // The tick rises in pitch with the value.
  slider: (c, o, n, { t = 0.5 } = {}) => tick(c, o, n, { pitch: 1400 + t * 1500, ring: 0.007, g: 0.28 }),
  key: (c, o, n) => tick(c, o, n, { pitch: rand(2500, 2700), ring: 0.008, g: 0.32, body: 520, bodyG: 0.018 }),
  keyDelete: (c, o, n) => tick(c, o, n, { pitch: 1350, ring: 0.01, g: 0.34, body: 260, bodyG: 0.02 }),
  open: (c, o, n) => {
    tick(c, o, n, { pitch: 1250, ring: 0.016, g: 0.38, body: 200, bodyG: 0.04 });
    air(c, o, n, { t: 0.008, from: 450, to: 1200 });
  },
  close: (c, o, n) => {
    tick(c, o, n, { pitch: 1000, ring: 0.016, g: 0.34, body: 170, bodyG: 0.04 });
    air(c, o, n, { t: 0.004, from: 1100, to: 420, dur: 0.07 });
  },
  error: (c, o, n) => {
    tick(c, o, n, { pitch: 420, ring: 0.03, g: 0.55, body: 120, bodyG: 0.09, bright: 0.15 });
    tick(c, o, n, { t: 0.11, pitch: 380, ring: 0.03, g: 0.55, body: 110, bodyG: 0.09, bright: 0.15 });
  },
  notify: (c, o, n) => {
    tick(c, o, n, { pitch: 1700, ring: 0.012, g: 0.3 });
    tone(c, o, { t: 0.01, f: 1046.5, dur: 0.16, g: 0.022 });
    tone(c, o, { t: 0.09, f: 1568, dur: 0.2, g: 0.016 });
  },
  launch: (c, o, n) => {
    tick(c, o, n, { pitch: 1450, ring: 0.02, g: 0.55, body: 160, bodyG: 0.08 });
    air(c, o, n, { t: 0.05, dur: 0.45, from: 300, to: 2400, g: 0.03 });
    tick(c, o, n, { t: 0.46, pitch: 300, ring: 0.05, g: 0.5, body: 80, bodyG: 0.12, bright: 0.1 });
  },
  boot: (c, o, n) => {
    air(c, o, n, { dur: 1.1, from: 200, to: 1400, g: 0.03 });
    tick(c, o, n, { t: 1.0, pitch: 260, ring: 0.06, g: 0.55, body: 70, bodyG: 0.14, bright: 0.1 });
  },
};

// Gain per sound (dB), measured with Sound.render(): navigation peaks near -16 dBFS,
// confirm, back and error near -10 dBFS, before the volume settings.
const LEVEL_DB = {
  move: 16, tab: 17, select: 13, back: 14, toggleOn: 16, toggleOff: 15.5, slider: 25, key: 18.5, keyDelete: 18,
  open: 16, close: 15.5, error: 12.5, notify: 18, launch: 12, boot: 9,
};
function leveled(c, out, name) {
  const g = c.createGain();
  g.gain.value = 10 ** ((LEVEL_DB[name] || 0) / 20);
  g.connect(out);
  return g;
}

function playFile(name) {
  const src = ctx.createBufferSource();
  src.buffer = files.get(name);
  src.connect(bus);
  src.start();
}

export const Sound = {
  unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    state.unlocked = true;
  },
  play(name, opts) {
    if (!state.on || !name || !SOUNDS[name]) return;
    if (!init() || !state.unlocked) return;
    const run = () => {
      try {
        if (files.has(name)) playFile(name);
        else SOUNDS[name](ctx, leveled(ctx, bus, name), noiseBuf, opts);
      } catch {
        /* never let audio break the UI */
      }
    };
    if (ctx.state === 'running') run();
    else ctx.resume().then(run, () => {});
  },
  // Render one sound offline (for measuring levels, or exporting WAVs for the real OS).
  async render(name, opts, seconds = 1.2) {
    const c = new OfflineAudioContext(1, Math.ceil(48000 * seconds), 48000);
    const out = leveled(c, chain(c, c.destination), name);
    SOUNDS[name](c, out, makeNoise(c), opts);
    return c.startRendering();
  },
  names: Object.keys(SOUNDS),
  // Designed sound files can replace any synthesized sound: assets/sounds/<name>.wav.
  async useFiles(base, names = Object.keys(SOUNDS), ext = 'wav') {
    if (!init()) return;
    await Promise.allSettled(
      names.map(async (name) => {
        const res = await fetch(`${base}${name}.${ext}`);
        if (res.ok) files.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
      }),
    );
  },
  setEnabled(on) {
    state.on = on;
  },
  setUiVolume(v) {
    state.uiVol = v;
    if (bus) bus.gain.value = v;
  },
  setSystemVolume(v) {
    state.systemVol = v;
    if (master) master.gain.value = v;
  },
};
