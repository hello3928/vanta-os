// The Vanta OS logo: Orbit. A symbol with no wordmark: three arcs of falling radius around a
// centre point, the middle one a shade dimmer. Pure geometry on a 100×100 grid, so it stays
// sharp at any size and maps straight to QML (PathSvg). tools/export-logos.mjs writes brand/.

export const DIRECTIONS = {
  orbit: { name: 'Orbit', summary: 'Three arcs of falling radius around a centre point.' },
};

// An arc on the 100 grid from angle a to b (degrees, 0 = up, clockwise).
function arc(r, a, b) {
  const p = (deg) => [50 + r * Math.sin((deg * Math.PI) / 180), 50 - r * Math.cos((deg * Math.PI) / 180)];
  const [x1, y1] = p(a);
  const [x2, y2] = p(b);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// Radius, start and end angle, opacity. pathLength 100 lets the arcs be drawn in (see .logo-draw).
export const ORBIT = [
  [42, 0, 240, 1],
  [28, 68, 343, 0.6],
  [14, 180, 300, 1],
];

function shapes(color) {
  return `<g fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round">${ORBIT.map(
    ([r, a, b, o], i) => `<path class="logo__arc logo__arc--${i + 1}" d="${arc(r, a, b)}" pathLength="100"${o < 1 ? ` stroke-opacity="${o}"` : ''}/>`,
  ).join('')}</g><circle class="logo__core" cx="50" cy="50" r="4.5" fill="${color}"/>`;
}

// The logo. `tile` puts it on a rounded square (app icon).
export function mark(id, { size = 64, color = 'currentColor', tile = null, className = '' } = {}) {
  const inner = tile ? `<rect width="100" height="100" rx="22" fill="${tile}"/><g transform="translate(17 17) scale(0.66)">${shapes(color)}</g>` : shapes(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="logo ${className}" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Vanta OS">${inner}</svg>`;
}

// There is no wordmark; anything asking for one gets the symbol.
export function wordmark(id, { height = 32, color = 'currentColor' } = {}) {
  return mark(id, { size: height, color });
}

export const lockup = wordmark;
