// Controller haptics. Each pattern is a list of [durationMs, weak, strong] pulses and gap numbers (ms).
// Mockup: Gamepad API dual-rumble (Chrome/Edge), WebHID for PlayStation controllers (SonyHaptics.js),
// Firefox hapticActuators, or phone vibration.
// Real OS: SDL3 SDL_RumbleGamepad / SDL_RumbleGamepadTriggers, with InputPlumber passing force-feedback through on handhelds.

const PATTERNS = {
  tick: [[14, 0.28, 0]],
  slider: [[9, 0.22, 0]],
  select: [[32, 0.55, 0.2]],
  back: [[22, 0.35, 0.05]],
  toggle: [[20, 0.45, 0.12]],
  error: [[45, 0.1, 0.7], 60, [45, 0.1, 0.7]],
  notify: [[40, 0.4, 0.1], 70, [60, 0.5, 0.2]],
  launch: [[140, 0.2, 0.1], [260, 0.5, 0.55]],
  boot: [[160, 0.12, 0], [200, 0.3, 0.15], [360, 0.55, 0.45]],
  test: [[120, 1, 0], 120, [120, 0, 1], 120, [220, 0.8, 0.8]],
};

import { SonyHaptics } from './SonyHaptics.js';

// Rumble motors can't render very short or very light pulses, so menu ticks are lifted to
// what a controller can actually play.
const MIN_MS = 35;
const MIN_LEVEL = 0.3;
const floor = (v) => (v > 0 ? Math.max(MIN_LEVEL, v) : 0);

const MENU_PATTERNS = new Set(['tick', 'slider', 'select', 'back', 'toggle']);
const LEVELS = { Off: 0, Low: 0.45, High: 1 };

function pads() {
  try {
    return [...(navigator.getGamepads?.() || [])].filter(Boolean);
  } catch {
    return []; // Gamepad API blocked (some embedded frames)
  }
}

export const Haptics = {
  level: 'High',
  menus: true,

  play(name, { force = false } = {}) {
    const m = LEVELS[this.level] ?? 1;
    if (!m && !force) return;
    if (!force && !this.menus && MENU_PATTERNS.has(name)) return;
    const pattern = PATTERNS[name];
    if (!pattern) return;
    const mult = m || 1;

    const segs = [];
    let at = 0;
    for (const p of pattern) {
      if (typeof p === 'number') {
        at += p;
        continue;
      }
      segs.push({ at, d: Math.max(MIN_MS, p[0]), weak: floor(Math.min(1, p[1] * mult)), strong: floor(Math.min(1, p[2] * mult)) });
      at += Math.max(MIN_MS, p[0]);
    }

    let rumbled = false;
    if (SonyHaptics.connected) {
      segs.forEach((s) => setTimeout(() => SonyHaptics.rumble(s.weak, s.strong, s.d), s.at));
      rumbled = true;
    }
    for (const pad of pads()) {
      // A PlayStation controller connected over WebHID is already handled above.
      if (SonyHaptics.connected && /054c|playstation|dualsense|dualshock|wireless controller/i.test(pad.id)) continue;
      const act = pad.vibrationActuator;
      if (act?.playEffect) {
        // A new effect preempts the current one, so pulses are scheduled one after another.
        segs.forEach((s) =>
          setTimeout(() => {
            act.playEffect('dual-rumble', { duration: s.d, weakMagnitude: s.weak, strongMagnitude: s.strong }).catch(() => {});
          }, s.at),
        );
        rumbled = true;
      } else if (pad.hapticActuators?.[0]?.pulse) {
        segs.forEach((s) => setTimeout(() => pad.hapticActuators[0].pulse(Math.max(s.weak, s.strong), s.d), s.at));
        rumbled = true;
      }
    }

    if (!rumbled && navigator.vibrate && matchMedia('(pointer: coarse)').matches) {
      const seq = [];
      let end = 0;
      segs.forEach((s) => {
        if (seq.length) seq.push(Math.max(0, s.at - end));
        seq.push(Math.round(s.d * (0.5 + 0.5 * mult)));
        end = s.at + s.d;
      });
      try {
        navigator.vibrate(seq);
      } catch {
        /* blocked */
      }
    }
    window.dispatchEvent(new CustomEvent('vanta:haptic', { detail: { name, rumbled } }));
  },

  // Plain-language status for the Controllers settings page.
  describe() {
    const list = pads();
    if (!list.length) return 'No controller detected. Press a button on a connected controller.';
    return list
      .map((p) => {
        const name = p.id.replace(/\(.*?\)/g, '').trim() || 'Controller';
        const rumble = p.vibrationActuator || p.hapticActuators?.length ? 'rumble supported' : 'no rumble in this browser';
        return `${name}: ${rumble}`;
      })
      .join(' · ');
  },
};
