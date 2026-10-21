// Vanta OS logo directions, in the Valve manner: a simple drawn mark (like Steam's badge) and a
// bold wordmark. The marks are geometry, not font glyphs, so they stay sharp at any size and
// export as clean SVG. tools/export-logos.mjs writes them to brand/.

export const DIRECTIONS = {
  disc: {
    name: 'Disc',
    summary: 'A solid badge with a V cut out.',
  },
  notch: {
    name: 'Notch',
    summary: 'A rounded tile with a V notched into the top.',
  },
  split: {
    name: 'Split',
    summary: 'Two angled strokes forming a V.',
  },
};

const DEFAULT = 'disc';
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Figtree:wght@800&display=swap';
const pick = (id) => (DIRECTIONS[id] ? id : DEFAULT);

// The mark on a 100×100 grid. `hole` is the colour the cut-outs show (transparent by default).
function markShapes(id, color, uid) {
  switch (pick(id)) {
    case 'notch':
      return `<mask id="m${uid}"><rect width="100" height="100" fill="#fff"/><path d="M31 4h38L50 46z" fill="#000"/></mask>
        <rect x="6" y="6" width="88" height="88" rx="20" fill="${color}" mask="url(#m${uid})"/>`;
    case 'split':
      return `<g stroke="${color}" stroke-width="15" stroke-linecap="round" fill="none"><path d="M24 24 45.5 73"/><path d="M76 24 54.5 73"/></g>`;
    default:
      return `<mask id="m${uid}"><rect width="100" height="100" fill="#fff"/><path d="M26 28h13.5L50 56l10.5-28H74L57 74H43z" fill="#000"/></mask>
        <circle cx="50" cy="50" r="46" fill="${color}" mask="url(#m${uid})"/>`;
  }
}

let uidCounter = 0;

// One mark. `tile` puts it on a rounded square (app icon).
export function mark(id, { size = 64, color = 'currentColor', tile = null } = {}) {
  const uid = `${pick(id)}${uidCounter++}`;
  const inner = tile ? `<rect width="100" height="100" rx="22" fill="${tile}"/><g transform="translate(18 18) scale(0.64)">${markShapes(id, color, uid)}</g>` : markShapes(id, color, uid);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Vanta OS">${inner}</svg>`;
}

// Mark + "VANTA" in Figtree ExtraBold. `height` is the mark's height.
export function wordmark(id, { height = 32, color = 'currentColor', standalone = false } = {}) {
  const uid = `${pick(id)}${uidCounter++}`;
  const size = height * 0.6;
  const gap = height * 0.32;
  const textW = size * 5 * 0.7 + size * 0.06 * 4;
  const width = Math.round(height + gap + textW);
  const style = standalone ? `<style>@import url('${FONT_CSS}');</style>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Vanta">${style}
    <g transform="scale(${height / 100})">${markShapes(id, color, uid)}</g>
    <text x="${height + gap}" y="${(height / 2 + size * 0.36).toFixed(1)}" font-family="Figtree, sans-serif" font-weight="800" font-size="${size.toFixed(1)}" letter-spacing="${(size * 0.06).toFixed(2)}" fill="${color}">VANTA</text></svg>`;
}

export function lockup(id, opts) {
  return wordmark(id, opts);
}
