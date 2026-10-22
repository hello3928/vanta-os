// Writes shell/data/sample-library.json from the mockup's sample library (mockup/js/data.js).
// The shell shows it only when there is no Steam install (development), so screens can be
// checked against the mockup with the same games.
// tools/trailer-starts.json holds each trailer's start point from the mockup's TrailerScan.
// Run from the repo root: node tools/export-sample-library.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GAMES, SYSTEMS, BIOS_LABEL } from '../mockup/js/data.js';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'shell', 'data');
mkdirSync(out, { recursive: true });

// Trailer start points from the mockup's TrailerScan, run once in the browser.
const starts = JSON.parse(readFileSync(join(out, '..', '..', 'tools', 'trailer-starts.json'), 'utf8'));
// Generated-art settings (look, art, logo) are mockup-only.
const games = GAMES.map(({ look, art, logo, pixel, ...g }) => ({ ...g, ...(starts[g.id] ? { trailerStart: starts[g.id].start } : {}) }));
writeFileSync(join(out, 'sample-library.json'), JSON.stringify({ systems: SYSTEMS, bios: BIOS_LABEL, games }, null, 1));
console.log(`wrote ${games.length} games and ${SYSTEMS.length} systems to shell/data/sample-library.json`);
