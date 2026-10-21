// Status icons for the top bar, drawn as one set: 20×20 grid, 1.6 px strokes, round caps.
// Unlike the Material Symbols font used elsewhere, these show live state (signal strength,
// battery level, charging) and stay pixel-sharp at the small size the bar uses.
// QML port: the same paths in Shape/PathSvg items.

const svg = (body, label = '') =>
  `<svg class="v-status" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}>${body}</svg>`;

export function bellIcon({ unread = false } = {}) {
  return svg(
    `<path d="M10 3.25a4.6 4.6 0 0 0-4.6 4.6c0 3.4-1.4 5.2-1.9 5.9h13c-.5-.7-1.9-2.5-1.9-5.9A4.6 4.6 0 0 0 10 3.25z"/><path d="M8.4 16.25a1.75 1.75 0 0 0 3.2 0"/>${unread ? '<circle cx="15" cy="5" r="2.25" fill="var(--accent)" stroke="var(--bg)" stroke-width="1.5"/>' : ''}`,
  );
}

// strength: 0–3 arcs lit; off draws a slash.
export function wifiIcon({ strength = 3, off = false } = {}) {
  const arc = (d, lit) => `<path d="${d}" opacity="${lit ? 1 : 0.3}"/>`;
  return svg(
    off
      ? '<path d="M3 7.5a10 10 0 0 1 14 0M5.75 10.5a6 6 0 0 1 8.5 0" opacity="0.3"/><circle cx="10" cy="14.5" r="1.1" fill="currentColor" stroke="none" opacity="0.3"/><path d="M4 3.5l12 13"/>'
      : `${arc('M2.75 7.25a10.25 10.25 0 0 1 14.5 0', strength >= 3)}${arc('M5.5 10.25a6.4 6.4 0 0 1 9 0', strength >= 2)}${arc('M8 13a2.8 2.8 0 0 1 4 0', strength >= 1)}<circle cx="10" cy="15.75" r="1.1" fill="currentColor" stroke="none"/>`,
  );
}

// level 0–1. Low battery turns the fill red; charging adds a bolt.
export function batteryIcon({ level = 1, charging = false } = {}) {
  const w = Math.max(1, Math.round(11 * Math.min(1, Math.max(0, level)) * 10) / 10);
  const low = level <= 0.15 && !charging;
  return `<svg class="v-status v-status--battery" viewBox="0 0 26 20" width="26" height="20" aria-hidden="true">
    <rect x="1.8" y="5.3" width="19.4" height="9.4" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.55"/>
    <path d="M23.2 8.4v3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>
    <rect x="4" y="7.5" width="${w * (15 / 11)}" height="5" rx="1.2" fill="${low ? 'var(--bad)' : 'currentColor'}"/>
    ${charging ? `<path d="M12.4 6.4 9.6 10.5h2.6l-.9 3.1 3.1-4.3h-2.6z" fill="${level > 0.55 ? 'var(--bg)' : 'currentColor'}"/>` : ''}
  </svg>`;
}

// Quick access: SteamOS uses three dots for this button.
export function moreIcon() {
  return svg('<circle cx="4.5" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10" r="1.5" fill="currentColor" stroke="none"/>');
}
