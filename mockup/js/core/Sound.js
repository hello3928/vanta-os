// Vanta UI sounds. Short, soft and quiet, no melodies.
//
// Mockup: designed sound files from Kenney's Interface Sounds (CC0, assets/sounds/), loaded at
// start with Sound.useFiles(). The synthesized versions below are the fallback if a file can't
// load. A generated 0.4 s room impulse gives every sound the same small space.
// Real OS: replace with designed WAV assets (one per name below) played through Qt Multimedia
// SoundEffect over PipeWire. Drop files in assets/sounds/<name>.wav and Sound.useFiles() picks them up.
// Browsers only allow audio after a user gesture, so call Sound.unlock() from an input handler.

let ctx = null;
let master, bus;
let noiseBuf = null;
const files = new Map();

const state = { on: true, uiVol: 0.7, systemVol: 0.7, unlocked: false };

const rand = (a, b) => a + Math.random() * (b - a);

// Decaying, darkening noise: a short room rather than a hall.
function roomImpulse(seconds = 0.4) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const k = i / len;
      lp += (Math.random() * 2 - 1 - lp) * (0.55 - 0.45 * k);
      d[i] = lp * Math.pow(1 - k, 3.2);
    }
  }
  return buf;
}

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = state.systemVol;
  master.connect(ctx.destination);

  // Everything goes through one gentle low-pass, then splits into dry and a little room.
  bus = ctx.createGain();
  bus.gain.value = state.uiVol;
  const soften = ctx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 7000;
  soften.Q.value = 0.5;
  const room = ctx.createConvolver();
  room.buffer = roomImpulse();
  const wet = ctx.createGain();
  wet.gain.value = 0.14;
  bus.connect(soften);
  soften.connect(master);
  soften.connect(room).connect(wet).connect(master);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// A filtered noise burst: the "tick" part of a button sound.
function click({ t = 0, freq = 3000, q = 2, dur = 0.012, g = 0.1 }) {
  const now = ctx.currentTime + t;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(g, now + 0.0015);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f).connect(env).connect(bus);
  src.start(now, Math.random() * 0.4, dur + 0.02);
}

// A short sine with a pitch drop: the rounded "tap" body of a press.
function tap({ t = 0, from = 420, to = 280, dur = 0.07, g = 0.1, type = 'sine' }) {
  const now = ctx.currentTime + t;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(g, now + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(env).connect(bus);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

// Soft air for panels sliding in and out.
function air({ t = 0, dur = 0.16, from = 600, to = 2200, g = 0.03 }) {
  const now = ctx.currentTime + t;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.7;
  f.frequency.setValueAtTime(from, now);
  f.frequency.exponentialRampToValueAtTime(to, now + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(g, now + dur * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f).connect(env).connect(bus);
  src.start(now, 0, dur + 0.02);
}

const SOUNDS = {
  move() {
    click({ freq: rand(2500, 2900), q: 1.6, dur: 0.009, g: 0.06 });
    tap({ from: rand(1500, 1600), to: 1300, dur: 0.018, g: 0.012 });
  },
  tab() {
    click({ freq: 2200, dur: 0.012, g: 0.07 });
    tap({ from: 760, to: 620, dur: 0.035, g: 0.03 });
  },
  select() {
    click({ freq: 2000, dur: 0.012, g: 0.08 });
    tap({ from: 520, to: 330, dur: 0.08, g: 0.12 });
    tap({ t: 0.002, from: 1040, to: 1000, dur: 0.06, g: 0.015 });
  },
  back() {
    click({ freq: 1500, dur: 0.012, g: 0.07 });
    tap({ from: 360, to: 250, dur: 0.065, g: 0.09 });
  },
  toggleOn() {
    click({ freq: 3000, dur: 0.01, g: 0.08 });
    tap({ t: 0.004, from: 640, to: 560, dur: 0.045, g: 0.05 });
  },
  toggleOff() {
    click({ freq: 1900, dur: 0.01, g: 0.08 });
    tap({ t: 0.004, from: 440, to: 360, dur: 0.045, g: 0.05 });
  },
  // Pitch of the tick follows the value, quietly.
  slider({ t = 0.5 } = {}) {
    click({ freq: 1700 + t * 2400, q: 3.5, dur: 0.008, g: 0.05 });
  },
  // On-screen keyboard: a light key tap, and a lower one for delete.
  key() {
    click({ freq: rand(2700, 3100), q: 1.4, dur: 0.008, g: 0.06 });
    tap({ from: rand(560, 600), to: 470, dur: 0.025, g: 0.03 });
  },
  keyDelete() {
    click({ freq: 1600, q: 1.4, dur: 0.009, g: 0.06 });
    tap({ from: 380, to: 320, dur: 0.03, g: 0.035 });
  },
  open() {
    air({ dur: 0.16, from: 500, to: 1700 });
    click({ t: 0.02, freq: 2400, dur: 0.01, g: 0.04 });
  },
  close() {
    air({ dur: 0.13, from: 1700, to: 500 });
  },
  error() {
    tap({ from: 200, to: 165, dur: 0.075, g: 0.12, type: 'triangle' });
    tap({ t: 0.1, from: 185, to: 150, dur: 0.09, g: 0.12, type: 'triangle' });
  },
  notify() {
    tap({ from: 880, to: 875, dur: 0.2, g: 0.035 });
    tap({ t: 0.08, from: 1320, to: 1315, dur: 0.24, g: 0.025 });
  },
  launch() {
    air({ dur: 0.5, from: 300, to: 2800, g: 0.045 });
    tap({ t: 0.42, from: 160, to: 70, dur: 0.35, g: 0.16 });
  },
  // Boot: a low swell that resolves into one soft hit. No chords.
  boot() {
    air({ dur: 1.1, from: 200, to: 1600, g: 0.035 });
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(82.4, now + 1.0);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.11, now + 0.9);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    osc.connect(env).connect(bus);
    osc.start(now);
    osc.stop(now + 2.3);
    tap({ t: 1.0, from: 220, to: 110, dur: 0.5, g: 0.14 });
    click({ t: 1.0, freq: 1800, q: 1, dur: 0.03, g: 0.05 });
  },
};

// The pack is normalised loud; these levels balance it for menus (navigation quietest).
const FILE_GAIN = {
  move: 0.32, tab: 0.4, select: 0.42, back: 0.4, toggleOn: 0.5, toggleOff: 0.5, slider: 0.3,
  key: 0.35, keyDelete: 0.35, open: 0.45, close: 0.4, error: 0.5, notify: 0.45, launch: 0.55,
};

function playFile(name, opts = {}) {
  const src = ctx.createBufferSource();
  src.buffer = files.get(name);
  // The slider tick rises in pitch with the value; navigation varies very slightly.
  if (name === 'slider') src.playbackRate.value = 0.85 + (opts.t ?? 0.5) * 0.35;
  else if (name === 'move' || name === 'key') src.playbackRate.value = rand(0.97, 1.03);
  const g = ctx.createGain();
  g.gain.value = FILE_GAIN[name] ?? 0.45;
  src.connect(g).connect(bus);
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
        if (files.has(name)) playFile(name, opts);
        else SOUNDS[name](opts);
      } catch {
        /* never let audio break the UI */
      }
    };
    if (ctx.state === 'running') run();
    else ctx.resume().then(run, () => {});
  },
  // Load designed sound files in place of the synthesized ones, e.g. Sound.useFiles('assets/sounds/').
  async useFiles(base, ext = 'wav') {
    if (!init()) return;
    await Promise.allSettled(
      Object.keys(FILE_GAIN).map(async (name) => {
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
