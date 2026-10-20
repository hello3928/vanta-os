// Writes brand/*.svg from mockup/js/brand.js, the single source of truth for the logos.
// Run from the repo root: node tools/export-logos.mjs

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DIRECTIONS, mark, wordmark, lockup } from '../mockup/js/brand.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'brand');
mkdirSync(root, { recursive: true });
for (const f of readdirSync(root)) if (f.endsWith('.svg')) rmSync(join(root, f));

Object.keys(DIRECTIONS).forEach((id, i) => {
  const prefix = `${'abc'[i]}-${id}`;
  const files = {
    [`${prefix}-mark-white.svg`]: mark(id, { size: 512, color: '#ffffff' }),
    [`${prefix}-mark-black.svg`]: mark(id, { size: 512, color: '#0d1117' }),
    [`${prefix}-app-icon.svg`]: mark(id, { size: 512, color: '#ffffff', tile: '#0d1117' }),
    [`${prefix}-lockup-white.svg`]: lockup(id, { height: 160, color: '#ffffff' }),
    [`${prefix}-lockup-black.svg`]: lockup(id, { height: 160, color: '#0d1117' }),
    [`${prefix}-wordmark-white.svg`]: wordmark(id, { height: 120, color: '#ffffff' }),
  };
  for (const [name, svg] of Object.entries(files)) {
    writeFileSync(join(root, name), svg.trim() + '\n');
    console.log('wrote brand/' + name);
  }
});
