// Writes brand/*.svg from mockup/js/brand.js, the single source of truth for the logos.
// Run from the repo root: node tools/export-logos.mjs
// The wordmarks are drawn from custom letter geometry, so the SVGs need no fonts.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DIRECTIONS, mark } from '../mockup/js/brand.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'brand');
mkdirSync(root, { recursive: true });
for (const f of readdirSync(root)) if (f.endsWith('.svg')) rmSync(join(root, f));

Object.keys(DIRECTIONS).forEach((id) => {
  const files = {
    [`vanta-${id}-white.svg`]: mark(id, { size: 512, color: '#ffffff' }),
    [`vanta-${id}-black.svg`]: mark(id, { size: 512, color: '#1a1d23' }),
    [`vanta-${id}-app-icon.svg`]: mark(id, { size: 512, color: '#ffffff', tile: '#1a1d23' }),
  };
  for (const [name, svg] of Object.entries(files)) {
    writeFileSync(join(root, name), svg.trim() + '\n');
    console.log('wrote brand/' + name);
  }
});
