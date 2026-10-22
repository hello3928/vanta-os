// Writes shell/data/icons/<name>.svg from the mockup's icon set (mockup/js/core/iconData.js),
// so the QML shell and the mockup use the same icons. White fill; QML tints where needed.
// Run from the repo root: node tools/export-icons.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ICON_DATA } from '../mockup/js/core/iconData.js';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'shell', 'data', 'icons');
mkdirSync(out, { recursive: true });
for (const [name, body] of Object.entries(ICON_DATA)) {
  writeFileSync(join(out, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="#ffffff">${body}</svg>\n`);
}
writeFileSync(
  join(out, 'LICENSE.txt'),
  'Icons: Phosphor Icons 2.1.1 (https://phosphoricons.com), MIT licence. See mockup/js/core/iconData.js for the full notice.\n',
);
console.log(`wrote ${Object.keys(ICON_DATA).length} icons to shell/data/icons`);
