// Vanta OS logo directions. Consoles brand themselves with wordmarks (PlayStation, Xbox, Steam),
// so each direction is a wordmark plus a one-letter monogram for small spaces (app icon, boot, tray).
// Drawn as SVG text in typefaces loaded from Google Fonts. Once a direction is chosen, a designer
// should outline and hand-kern it; tools/export-logos.mjs writes SVGs that load the font.

export const DIRECTIONS = {
  extended: {
    name: 'Extended',
    summary: 'Wide, spaced capitals. Calm and premium, in the family of console hardware branding.',
    font: 'Michroma',
    weight: 400,
    style: 'normal',
    text: 'VANTA',
    tracking: 0.32,
    monogram: 'V',
  },
  sport: {
    name: 'Sport',
    summary: 'Heavy italic capitals that lean forward. Fast and loud, closest to a gaming peripheral brand.',
    font: 'Saira',
    weight: 800,
    style: 'italic',
    text: 'VANTA',
    tracking: 0.02,
    monogram: 'V',
  },
  soft: {
    name: 'Soft',
    summary: 'Rounded lowercase with tight spacing. Friendly and approachable, like a living-room device.',
    font: 'Outfit',
    weight: 700,
    style: 'normal',
    text: 'vanta',
    tracking: -0.03,
    monogram: 'v',
  },
};

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Michroma&family=Outfit:wght@700&family=Saira:ital,wght@1,800&display=swap';

// Approximate advance widths (em) so the SVG box fits the text without measuring.
const WIDTH = { extended: 0.98, sport: 0.62, soft: 0.6 };

function textEl(d, size, color, x, anchor = 'start') {
  return `<text x="${x}" y="${(size * 0.86).toFixed(1)}" font-family="'${d.font}', sans-serif" font-weight="${d.weight}" font-style="${d.style}" font-size="${size}" letter-spacing="${(d.tracking * size).toFixed(2)}" fill="${color}" text-anchor="${anchor}">`;
}

export function wordmark(id, { height = 32, color = 'currentColor', standalone = false } = {}) {
  const d = DIRECTIONS[id];
  const size = height;
  const width = Math.round(d.text.length * size * (WIDTH[id] + d.tracking) + size * 0.2);
  const style = standalone ? `<style>@import url('${FONT_CSS}');</style>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${Math.round(size * 1.1)}" width="${width}" height="${Math.round(size * 1.1)}" role="img" aria-label="Vanta">${style}${textEl(d, size, color, size * 0.04)}${d.text}</text></svg>`;
}

// One-letter monogram. `tile` puts it on a rounded square (app icon).
export function mark(id, { size = 64, color = 'currentColor', tile = null, standalone = false } = {}) {
  const d = DIRECTIONS[id];
  const fontSize = id === 'soft' ? 92 : 74;
  const y = id === 'soft' ? 73 : 78;
  const style = standalone ? `<style>@import url('${FONT_CSS}');</style>` : '';
  const bg = tile ? `<rect width="100" height="100" rx="22" fill="${tile}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Vanta OS">${style}${bg}<text x="50" y="${y}" text-anchor="middle" font-family="'${d.font}', sans-serif" font-weight="${d.weight}" font-style="${d.style}" font-size="${tile ? fontSize * 0.72 : fontSize}" fill="${color}"${tile ? ' transform="translate(0 -6)"' : ''}>${d.monogram}</text></svg>`;
}

export function lockup(id, { height = 48, color = 'currentColor', standalone = false } = {}) {
  return wordmark(id, { height, color, standalone });
}
