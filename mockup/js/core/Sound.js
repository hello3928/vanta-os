// Vanta UI sounds. Short, dry and quiet, in the spirit of console menu sounds: soft plastic
// clicks and low "thocks", no melodies, no reverb.
//
// Mockup: synthesized live with WebAudio so there are no files to license.
// Real OS: replace with designed WAV assets (one per name below) played through Qt Multimedia
// SoundEffect over PipeWire. Drop files in assets/sounds/<name>.wav and Sound.useFiles() picks them up.
// Browsers only allow audio after a user gesture, so call Sound.unlock() from an input handler.

let ctx = null;
let master, bus;
let noiseBuf = null;
const files = new Map();

const state = { on: true, uiVol: 0.7, systemVol: 0.7, unlocked: false };

const rand = (a, b) => a + Math.random() * (b - a);

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
  bus = ctx.createGain();
  bus.gain.value = state.uiVol;
  bus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// A filtered noise burst: the "click" part of a button sound.
function click({ t = 0, freq = 3000, q = 2.5, dur = 0.012, g = 0.12, type = 'bandpass' }) {
  const now = ctx.currentTime + t;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(g, now);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f).connect(env).connect(bus);
  src.start(now, Math.random() * 0.4, dur + 0.02);
}

// A short low sine with a pitch drop: the "thock" body of a press.
function thock({ t = 0, from = 420, to = 260, dur = 0.07, g = 0.12 }) {
  const now = ctx.currentTime + t;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(g, now + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(env).connect(bus);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

// Soft air movement for panels sliding in and out.
function swish({ t = 0, dur = 0.16, from = 600, to = 2200, g = 0.035 }) {
  const now = ctx.currentTime + t;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(from, now);
  f.frequency.exponentialRampToValueAtTime(to, now + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(g, now + dur * 0.4);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f).connect(env).connect(bus);
  src.start(now, 0, dur + 0.02);
}

const SOUNDS = {
  move() {
    click({ freq: rand(2800, 3300), dur: 0.01, g: 0.07 });
  },
  tab() {
    click({ freq: 2400, dur: 0.012, g: 0.08 });
    thock({ from: 700, to: 560, dur: 0.03, g: 0.03 });
  },
  select() {
    click({ freq: 2200, dur: 0.012, g: 0.1 });
    thock({ from: 440, to: 290, dur: 0.075, g: 0.14 });
  },
  back() {
    click({ freq: 1600, dur: 0.012, g: 0.08 });
    thock({ from: 330, to: 230, dur: 0.06, g: 0.1 });
  },
  toggleOn() {
    click({ freq: 3200, dur: 0.01, g: 0.09 });
    thock({ t: 0.004, from: 620, to: 520, dur: 0.04, g: 0.06 });
  },
  toggleOff() {
    click({ freq: 2000, dur: 0.01, g: 0.09 });
    thock({ t: 0.004, from: 420, to: 340, dur: 0.04, g: 0.06 });
  },
  // Pitch of the tick follows the value, quietly.
  slider({ t = 0.5 } = {}) {
    click({ freq: 1800 + t * 2600, q: 4, dur: 0.008, g: 0.06 });
  },
  open() {
    swish({ dur: 0.15, from: 500, to: 1800 });
    click({ t: 0.02, freq: 2600, dur: 0.01, g: 0.05 });
  },
  close() {
    swish({ dur: 0.13, from: 1800, to: 500 });
  },
  error() {
    thock({ from: 180, to: 150, dur: 0.07, g: 0.12 });
    thock({ t: 0.09, from: 170, to: 140, dur: 0.08, g: 0.12 });
  },
  notify() {
    thock({ from: 880, to: 870, dur: 0.18, g: 0.04 });
    thock({ t: 0.07, from: 1320, to: 1310, dur: 0.22, g: 0.03 });
  },
  launch() {
    swish({ dur: 0.5, from: 300, to: 3000, g: 0.05 });
    thock({ t: 0.42, from: 160, to: 70, dur: 0.35, g: 0.18 });
  },
  // Boot: a low swell that resolves into one soft hit. No chords.
  boot() {
    swish({ dur: 1.1, from: 200, to: 1600, g: 0.04 });
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(82.4, now + 1.0);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.12, now + 0.9);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    osc.connect(env).connect(bus);
    osc.start(now);
    osc.stop(now + 2.3);
    thock({ t: 1.0, from: 220, to: 110, dur: 0.5, g: 0.16 });
    click({ t: 1.0, freq: 1800, q: 1, dur: 0.03, g: 0.06 });
  },
};

function playFile(name) {
  const buf = files.get(name);
  const src = ctx.createBufferSource();
  src.buffer = buf;
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
        else SOUNDS[name](opts);
      } catch {
        /* never let audio break the UI */
      }
    };
    if (ctx.state === 'running') run();
    else ctx.resume().then(run, () => {});
  },
  // Load designed sound files in place of the synthesized ones, e.g. Sound.useFiles('assets/sounds/').
  async useFiles(base) {
    if (!init()) return;
    await Promise.allSettled(
      Object.keys(SOUNDS).map(async (name) => {
        const res = await fetch(`${base}${name}.wav`);
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
