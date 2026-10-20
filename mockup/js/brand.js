// Vanta OS logo directions. Single source of truth for the marks and the wordmark:
// the mockup draws them from here, and tools/export-logos.mjs writes brand/*.svg from here.
// All marks are solid, single-color shapes so they hold up at 16px and on any background.

export const DIRECTIONS = {
  notch: {
    name: 'Notch',
    summary: 'A rounded square with a V cut out of the top. Reads like an app icon or a console button, and stays clear at 16px.',
    weight: 17,
  },
  pixel: {
    name: 'Pixel',
    summary: 'A heavy V with a single square pixel above it. The pixel is the player: a quiet nod to games without a controller cliché.',
    weight: 21,
  },
  disc: {
    name: 'Disc',
    summary: 'A solid circle with a V bitten out of the top, like a face button seen from above. The most compact of the three.',
    weight: 13,
  },
};

const MARKS = {
  notch: 'M36 8 L50 46 L64 8 H72 A20 20 0 0 1 92 28 V72 A20 20 0 0 1 72 92 H28 A20 20 0 0 1 8 72 V28 A20 20 0 0 1 28 8 Z',
  pixel: 'M8 26 H31 L50 68 L69 26 H92 L60 92 H40 Z M43 6 H57 V20 H43 Z',
  disc: 'M37.2 10 L50 47 L62.8 10 A42 42 0 1 1 37.2 10 Z',
};

// The icon mark in a 100x100 box. `tile` puts it on a rounded square (app icon).
export function mark(id, { size = 64, color = 'currentColor', tile = null, title = 'Vanta OS' } = {}) {
  const body = tile
    ? `<rect width="100" height="100" rx="22" fill="${tile}"/><g transform="translate(20 20) scale(.6)"><path d="${MARKS[id]}" fill="${color}" fill-rule="evenodd"/></g>`
    : `<path d="${MARKS[id]}" fill="${color}" fill-rule="evenodd"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${title}">${body}</svg>`;
}

// ---------- wordmark: geometric capitals drawn as filled shapes ----------

const H = 100;
const f = (n) => +n.toFixed(2);
const poly = (pts, dx) => `M${pts.map(([x, y]) => `${f(x + dx)} ${f(y)}`).join(' L')} Z`;

function letterV(W, w, dx) {
  const a = w * 1.2;
  const c = w * 0.55;
  const yi = (H * (W / 2 - a)) / (W / 2 - c);
  return poly([[0, 0], [a, 0], [W / 2, yi], [W - a, 0], [W, 0], [W / 2 + c, H], [W / 2 - c, H]], dx);
}

function letterA(W, w, dx) {
  const a = w * 1.2;
  const c = w * 0.55;
  const yi = (H * (W / 2 - a)) / (W / 2 - c);
  const outer = poly([[0, H], [a, H], [W / 2, H - yi], [W - a, H], [W, H], [W / 2 + c, 0], [W / 2 - c, 0]], dx);
  const barTop = H * 0.6;
  const barBot = barTop + w * 0.8;
  const xIn = a + ((W / 2 - a) * (H - barBot)) / yi;
  return outer + poly([[xIn - 1, barTop], [W - xIn + 1, barTop], [W - xIn + 1, barBot], [xIn - 1, barBot]], dx);
}

function letterN(W, w, dx) {
  const d = w * 1.25;
  return poly([[0, 0], [w, 0], [w, H], [0, H]], dx) + poly([[W - w, 0], [W, 0], [W, H], [W - w, H]], dx) + poly([[0, 0], [d, 0], [W, H], [W - d, H]], dx);
}

function letterT(W, w, dx) {
  return poly([[0, 0], [W, 0], [W, w], [0, w]], dx) + poly([[W / 2 - w / 2, 0], [W / 2 + w / 2, 0], [W / 2 + w / 2, H], [W / 2 - w / 2, H]], dx);
}

const GLYPHS = { V: [letterV, 88], A: [letterA, 88], N: [letterN, 76], T: [letterT, 72] };
const KERN = { VA: -12, TA: -9 };

export function wordmark(id, { height = 32, color = 'currentColor' } = {}) {
  const w = DIRECTIONS[id].weight;
  const tracking = 20 + w * 0.4;
  let x = 0;
  let d = '';
  const word = 'VANTA';
  [...word].forEach((ch, i) => {
    const [draw, W] = GLYPHS[ch];
    d += draw(W, w, x);
    x += W + tracking + (KERN[ch + (word[i + 1] || '')] || 0);
  });
  const width = x - tracking;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(width)} ${H}" width="${Math.round((width / H) * height)}" height="${height}" role="img" aria-label="Vanta"><path d="${d}" fill="${color}"/></svg>`;
}

// Mark + wordmark side by side, as one SVG.
export function lockup(id, { height = 48, color = 'currentColor' } = {}) {
  const w = wordmark(id, { height: Math.round(height * 0.46), color });
  const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const wordW = Number(/width="(\d+)"/.exec(w)[1]);
  const wordH = Math.round(height * 0.46);
  const gap = Math.round(height * 0.38);
  const total = height + gap + wordW;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${height}" width="${total}" height="${height}" role="img" aria-label="Vanta OS">
  <svg x="0" y="0" width="${height}" height="${height}" viewBox="0 0 100 100"><path d="${MARKS[id]}" fill="${color}" fill-rule="evenodd"/></svg>
  <svg x="${height + gap}" y="${Math.round((height - wordH) / 2)}" width="${wordW}" height="${wordH}" viewBox="${/viewBox="([^"]+)"/.exec(w)[1]}">${inner(w)}</svg>
</svg>`;
}
