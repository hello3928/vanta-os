// Writes brand/*.svg from mockup/js/brand.js, the single source of truth for the logos.
// Run from the repo root: node tools/export-logos.mjs
// The wordmarks are drawn from custom letter geometry, so the SVGs need no fonts.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DIRECTIONS, mark, wordmark } from '../mockup/js/brand.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'brand');
mkdirSync(root, { recursive: true });
for (const f of readdirSync(root)) if (f.endsWith('.svg')) rmSync(join(root, f));

Object.keys(DIRECTIONS).forEach((id, i) => {
  const prefix = `${'abc'[i]}-${id}`;
  const files = {
    [`${prefix}-wordmark-white.svg`]: wordmark(id, { height: 120, color: '#ffffff', standalone: true }),
    [`${prefix}-wordmark-black.svg`]: wordmark(id, { height: 120, color: '#0d1117', standalone: true }),
    [`${prefix}-app-icon.svg`]: mark(id, { size: 512, color: '#ffffff', tile: '#0d1117', standalone: true }),
  };
  for (const [name, svg] of Object.entries(files)) {
    writeFileSync(join(root, name), svg.trim() + '\n');
    console.log('wrote brand/' + name);
  }
});
