// Top bar status icons. Same Phosphor fill set as the rest of the UI, picked by live state:
// Wi-Fi signal strength, battery level and charging.

import { icon } from './icons.js';

export function bellIcon() {
  return icon('statusBell', 'v-status');
}

// strength: 1–3 bars; off shows the slashed icon.
export function wifiIcon({ strength = 3, off = false } = {}) {
  return icon(off ? 'wifiOff' : `wifi${Math.max(1, Math.min(3, strength))}`, 'v-status');
}

export function batteryIcon({ level = 1, charging = false } = {}) {
  if (charging) return icon('batteryCharging', 'v-status');
  const name = level >= 0.9 ? 'batteryFull' : level >= 0.6 ? 'batteryHigh' : level >= 0.35 ? 'batteryMedium' : level >= 0.15 ? 'batteryLow' : 'batteryWarning';
  return icon(name, `v-status${level < 0.15 ? ' v-status--low' : ''}`);
}

export function moreIcon() {
  return icon('statusMore', 'v-status');
}
