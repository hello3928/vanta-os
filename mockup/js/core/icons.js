// Icons: Phosphor (MIT), inlined as SVG from iconData.js. Solid glyphs for objects (home,
// controller, bell), bold strokes for small marks (carets, check, close), the closest open set to
// SteamOS's own icons. Inline SVG needs no font download and maps directly to QML (PathSvg).
// Top-bar status icons with live state are separate: statusIcons.js.

import { ICON_DATA } from './iconData.js';

export function icon(name, className = '') {
  const body = ICON_DATA[name];
  if (!body) return '';
  return `<svg class="v-icon ms ${className}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
}
