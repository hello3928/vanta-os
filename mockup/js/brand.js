// Vanta OS wordmarks. Custom letter geometry (no font), in the manner of PlayStation's lettering:
// each letter is a set of strokes on a 100-unit cap height, so the logo is the same everywhere
// and exports as clean SVG (tools/export-logos.mjs writes brand/).
//
// line:  thin even strokes, wide spacing, A without a crossbar (VΛNTΛ), points cut flat
// round: lowercase "vanta" in one rounded monoline stroke
// cut:   heavy capitals with a thin horizontal slice through every letter

export const DIRECTIONS = {
  line: { name: 'Line', summary: 'Thin even strokes, A without a crossbar, points cut flat.' },
  round: { name: 'Round', summary: 'Lowercase in one rounded stroke.' },
  cut: { name: 'Cut', summary: 'Heavy capitals with a slice through every letter.' },
};

const DEFAULT = 'line';
const pick = (id) => (DIRECTIONS[id] ? id : DEFAULT);

// Capitals as polylines on a 0–100 grid (y down). Strokes that end on the top or bottom edge
// are extended past it and clipped, so they finish flat exactly on the cap height and baseline.
const CAPS = {
  V: { w: 76, lines: [[[0, 0], [38, 100], [76, 0]]] },
  A: { w: 76, lines: [[[0, 100], [38, 0], [76, 100]]] },
  N: { w: 70, lines: [[[0, 100], [0, 0], [70, 100], [70, 0]]] },
  T: { w: 70, lines: [[[0, 'top'], [70, 'top']], [[35, 'top'], [35, 100]]] },
};

function extend(pts) {
  // Push end points that sit on an edge 30 units further along their segment.
  const out = pts.map((p) => [...p]);
  const push = (i, j) => {
    const [x, y] = out[i];
    const [px, py] = out[j];
    if (y !== 0 && y !== 100) return;
    const dx = x - px;
    const dy = y - py;
    const len = Math.hypot(dx, dy) || 1;
    out[i] = [x + (dx / len) * 30, y + (dy / len) * 30];
  };
  push(0, 1);
  push(out.length - 1, out.length - 2);
  return out;
}

function capsWord(text, { stroke, track }) {
  let x = stroke / 2;
  let d = '';
  for (const ch of text) {
    const g = CAPS[ch];
    for (const line of g.lines) {
      const pts = extend(line.map(([px, py]) => [px + x, py === 'top' ? stroke / 2 : py]));
      d += `M${pts.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join('L')}`;
    }
    x += g.w + stroke + track;
  }
  return { d, width: x - track - stroke / 2 };
}

// Lowercase "vanta": x-height from y 38 to 100, one rounded stroke.
function roundWord(stroke) {
  const parts = [];
  let x = stroke / 2;
  const add = (w, make) => {
    parts.push(make(x));
    x += w + stroke + 14;
  };
  const a = (o) => `M${o + 54} 38V100M${o + 54} 69A24.5 24.5 0 1 1 ${o + 5} 69A24.5 24.5 0 1 1 ${o + 54} 69`;
  add(60, (o) => `M${o} 38L${o + 30} 100L${o + 60} 38`);
  add(54, a);
  add(48, (o) => `M${o} 100V38M${o} 64A24 24 0 0 1 ${o + 48} 64V100`);
  add(30, (o) => `M${o + 10} 16V84A16 16 0 0 0 ${o + 26} 100H${o + 32}M${o} 38H${o + 30}`);
  add(54, a);
  return { d: parts.join(''), width: x - 14 - stroke / 2 };
}

let uid = 0;

function word(id, color) {
  const n = uid++;
  switch (pick(id)) {
    case 'round': {
      const s = 13;
      const { d, width } = roundWord(s);
      return { width, body: `<path d="${d}" fill="none" stroke="${color}" stroke-width="${s}" stroke-linecap="round" stroke-linejoin="round"/>` };
    }
    case 'cut': {
      const s = 24;
      const { d, width } = capsWord('VANTA', { stroke: s, track: 12 });
      return {
        width,
        body: `<clipPath id="c${n}"><rect x="-20" y="0" width="${width + 40}" height="100"/></clipPath>
          <mask id="m${n}"><rect x="-20" y="-20" width="${width + 40}" height="140" fill="#fff"/><rect x="-20" y="57" width="${width + 40}" height="5" fill="#000"/></mask>
          <g clip-path="url(#c${n})" mask="url(#m${n})"><path d="${d}" fill="none" stroke="${color}" stroke-width="${s}" stroke-linejoin="miter" stroke-miterlimit="8"/></g>`,
      };
    }
    default: {
      const s = 9;
      const { d, width } = capsWord('VANTA', { stroke: s, track: 34 });
      return {
        width,
        body: `<clipPath id="c${n}"><rect x="-20" y="0" width="${width + 40}" height="100"/></clipPath>
          <g clip-path="url(#c${n})"><path d="${d}" fill="none" stroke="${color}" stroke-width="${s}" stroke-linejoin="miter" stroke-miterlimit="8"/></g>`,
      };
    }
  }
}

// The wordmark at a given height (cap height for capitals, ascender height for lowercase).
export function wordmark(id, { height = 32, color = 'currentColor' } = {}) {
  const { width, body } = word(id, color);
  const pad = 2;
  const w = Math.round((width + pad * 2) * (height / 100));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} 0 ${(width + pad * 2).toFixed(1)} 100" width="${w}" height="${height}" role="img" aria-label="Vanta">${body}</svg>`;
}

// App icon: the wordmark centred on a tile (the brand is a wordmark, so the icon is too).
export function mark(id, { size = 64, color = 'currentColor', tile = null } = {}) {
  const { width, body } = word(id, color);
  const scale = 76 / width;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Vanta OS">${tile ? `<rect width="100" height="100" rx="22" fill="${tile}"/>` : ''}<g transform="translate(12 ${50 - 50 * scale}) scale(${scale.toFixed(4)})">${body}</g></svg>`;
}

export function lockup(id, opts) {
  return wordmark(id, opts);
}
