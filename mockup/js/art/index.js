// Art cache: capsules (2:3 with logo), heroes (wide, no logo), cards (16:9), and transparent logos.
// Real OS: these come from Steam's library assets or SteamGridDB / IGDB for emulated games.

import { paintScene } from './paint.js';
import { drawLogo, fontString } from './logo.js';

const cache = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function capsule(g) {
  return memo(`cap:${g.id}`, () => {
    const c = canvas(400, 600);
    paintScene(c, { ...g.art, ...(g.art.capsule || {}) }, g.id);
    const ctx = c.getContext('2d');
    const top = g.logo.pos !== 'bottom';
    const shade = ctx.createLinearGradient(0, top ? 0 : 600, 0, top ? 260 : 340);
    shade.addColorStop(0, 'rgb(0 0 0 / 0.55)');
    shade.addColorStop(1, 'rgb(0 0 0 / 0)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 400, 600);
    drawLogo(ctx, g.logo, g.title, top ? { x: 32, y: 36, w: 336, h: 170 } : { x: 32, y: 400, w: 336, h: 160 }, 'center', { lines: 2 });
    return c.toDataURL('image/jpeg', 0.9);
  });
}

export function hero(g) {
  return memo(`hero:${g.id}`, () => {
    const c = canvas(1600, 720);
    paintScene(c, g.art, g.id);
    return c.toDataURL('image/jpeg', 0.88);
  });
}

export function card(g, variant = 0) {
  return memo(`card:${g.id}:${variant}`, () => {
    const c = canvas(640, 360);
    paintScene(c, g.art, `${g.id}-${variant}`);
    return c.toDataURL('image/jpeg', 0.88);
  });
}

export function logo(g) {
  return memo(`logo:${g.id}`, () => {
    const c = canvas(900, 300);
    drawLogo(c.getContext('2d'), { ...g.logo, scale: 0.9 }, g.title, { x: 10, y: 10, w: 880, h: 280 }, 'left', { lines: 1 });
    return c.toDataURL('image/png');
  });
}

// Canvas text needs the fonts loaded first. Resolves when ready (or after a timeout).
export function loadFonts(games, timeout = 4000) {
  const specs = [...new Map(games.map((g) => [fontString(g.logo, 40), g.logo])).keys()];
  const all = Promise.allSettled(specs.map((f) => document.fonts.load(f)));
  return Promise.race([all, new Promise((r) => setTimeout(r, timeout))]);
}
