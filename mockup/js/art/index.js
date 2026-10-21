// Game art. Real art first: Steam's library assets (capsule, hero, logo, header) and
// libretro-thumbnails box art and screenshots for emulated games. If an image can't load
// (offline, or inside the published preview, which blocks outside images), a generated
// stand-in is painted instead. Real OS: the same sources, cached on disk by vantad.

import { paintScene } from './paint.js';
import { drawLogo, fontString } from './logo.js';
import { systemOf } from '../data.js';

const STEAM = 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps';
const THUMBS = 'https://raw.githubusercontent.com/libretro-thumbnails';

// kind: 'capsule' (2:3) | 'hero' (wide) | 'logo' (transparent) | 'header' (landscape card) | 'box' (retro box art)
export function realUrl(g, kind) {
  if (g.appid) {
    const file = { capsule: 'library_600x900_2x.jpg', hero: 'library_hero.jpg', logo: 'logo.png', header: 'header.jpg' }[kind];
    return file && `${STEAM}/${g.appid}/${file}`;
  }
  const sys = systemOf(g);
  if (!sys || !g.rom) return null;
  const name = encodeURIComponent(g.rom);
  if (kind === 'capsule' || kind === 'box') return `${THUMBS}/${sys.thumbs}/master/Named_Boxarts/${name}.png`;
  if (kind === 'hero' || kind === 'header') return `${THUMBS}/${sys.thumbs}/master/Named_Snaps/${name}.png`;
  return null;
}

// Official Steam screenshots: full size for the viewer, 600×338 for shelves.
export function screenshots(g, size = 'full') {
  if (!g.appid || !g.shots) return [];
  return g.shots.map((f) => `${STEAM}/${g.appid}/${size === 'full' ? f : f.replace('.1920x1080.', '.600x338.')}`);
}

const cache = new Map();
const memo = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

function generated(g, kind) {
  return memo(`${kind}:${g.id}`, () => {
    if (kind === 'logo') {
      const c = canvas(900, 300);
      drawLogo(c.getContext('2d'), { ...g.logo, scale: 0.9 }, g.title, { x: 10, y: 10, w: 880, h: 280 }, 'left', { lines: g.title.length > 22 ? 2 : 1 });
      return c.toDataURL('image/png');
    }
    if (kind === 'capsule' || kind === 'box') {
      const c = canvas(400, 600);
      paintScene(c, g.art, g.id);
      const ctx = c.getContext('2d');
      const shade = ctx.createLinearGradient(0, 0, 0, 260);
      shade.addColorStop(0, 'rgb(0 0 0 / 0.55)');
      shade.addColorStop(1, 'rgb(0 0 0 / 0)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 400, 600);
      drawLogo(ctx, g.logo, g.title, { x: 32, y: 36, w: 336, h: 170 }, 'center', { lines: 2 });
      return c.toDataURL('image/jpeg', 0.9);
    }
    const c = kind === 'hero' ? canvas(1600, 620) : canvas(640, 300);
    paintScene(c, g.art, `${g.id}-${kind}`);
    return c.toDataURL('image/jpeg', 0.88);
  });
}

// Remember hosts that keep failing (blocked by the page, or offline), so later images
// skip straight to the stand-in.
const failures = new Map();
const blocked = { has: (h) => (failures.get(h) || 0) >= 3, add: (h) => failures.set(h, (failures.get(h) || 0) + 1) };
const hostOf = (u) => {
  try {
    return new URL(u).host;
  } catch {
    return '';
  }
};

// Points an <img> at the real art, falling back to generated art on error.
export function setArt(img, g, kind) {
  const url = realUrl(g, kind);
  const useFallback = () => {
    img.onerror = null;
    img.dataset.generated = '';
    img.src = generated(g, kind === 'box' ? 'capsule' : kind);
  };
  delete img.dataset.generated;
  // Fade in once loaded instead of popping in.
  img.classList.add('art-loading');
  img.onload = () => img.classList.remove('art-loading');
  if (!url || blocked.has(hostOf(url))) return useFallback();
  img.onerror = () => {
    blocked.add(hostOf(url));
    useFallback();
  };
  img.src = url;
}

export function artImg(g, kind, className = '') {
  const img = document.createElement('img');
  img.className = className;
  img.alt = '';
  img.decoding = 'async';
  setArt(img, g, kind);
  return img;
}

// Canvas text for stand-in logos needs its fonts loaded first.
export function loadFonts(games, timeout = 4000) {
  const specs = [...new Set(games.map((g) => fontString(g.logo, 40)))];
  const all = Promise.allSettled(specs.map((f) => document.fonts.load(f)));
  return Promise.race([all, new Promise((r) => setTimeout(r, timeout))]);
}

// Warm the browser cache so shelves fill in instantly.
export function preload(games, kinds = ['capsule']) {
  games.forEach((g) =>
    kinds.forEach((k) => {
      const u = realUrl(g, k);
      if (u) new Image().src = u;
    }),
  );
}
