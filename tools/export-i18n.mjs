// Writes shell/data/i18n/<lang>.json from the mockup's dictionaries (mockup/js/core/i18n.js),
// plus the wording the mockup gets from the browser's Intl data, worked out here once:
// relative days ("yesterday", "3 weeks ago"), duration units, narrow weekdays and region names.
// Shell-only strings live in tools/i18n-shell.json and are merged in (shell wins).
// Run from the repo root: node tools/export-i18n.mjs

import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'shell', 'data', 'i18n');
mkdirSync(out, { recursive: true });

// The dictionaries aren't exported by i18n.js, so load a copy that exports them.
const src = readFileSync(join(root, 'mockup', 'js', 'core', 'i18n.js'), 'utf8');
const tmp = join(tmpdir(), `vanta-i18n-${process.pid}.mjs`);
writeFileSync(tmp, `${src}\nexport const __DICTS = DICTS;\n`);
const { __DICTS: DICTS, LANGUAGES } = await import(pathToFileURL(tmp).href);
rmSync(tmp);

const shell = JSON.parse(readFileSync(join(root, 'tools', 'i18n-shell.json'), 'utf8'));
const REGIONS = ['US', 'CA', 'MX', 'BR', 'AR', 'GB', 'IE', 'ES', 'PT', 'FR', 'BE', 'DE', 'AT', 'CH', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'JP', 'KR', 'CN', 'TW', 'IN', 'AU', 'NZ', 'ZA'];

for (const { code } of LANGUAGES) {
  const rtf = new Intl.RelativeTimeFormat(code, { numeric: 'auto' });
  const unit = (u) => {
    const nf = (v) => new Intl.NumberFormat(code, { style: 'unit', unit: u, unitDisplay: 'narrow' }).format(v);
    return { one: nf(1).replace('1', '{n}'), other: nf(5).replace('5', '{n}') };
  };
  const narrow = new Intl.DateTimeFormat(code, { weekday: 'narrow', timeZone: 'UTC' });
  const names = new Intl.DisplayNames([code], { type: 'region' });
  const dict = {
    ...DICTS.en,
    ...DICTS[code],
    ...shell.en,
    ...(shell[code] || {}),
    opt: { ...(DICTS[code].opt || {}), ...((shell[code] || {}).opt || {}) },
    intl: {
      days: Array.from({ length: 7 }, (_, d) => rtf.format(-d, 'day')),
      weeks: Array.from({ length: 6 }, (_, w) => rtf.format(-w, 'week')),
      months: Array.from({ length: 37 }, (_, m) => rtf.format(-m, 'month')),
      hour: unit('hour'),
      minute: unit('minute'),
      // Sunday first (1970-01-04 was a Sunday).
      weekdays: Array.from({ length: 7 }, (_, d) => narrow.format(new Date(Date.UTC(1970, 0, 4 + d)))),
      regions: Object.fromEntries(REGIONS.map((r) => [r, names.of(r)])),
    },
  };
  writeFileSync(join(out, `${code}.json`), JSON.stringify(dict, null, 1));
}
writeFileSync(join(out, 'languages.json'), JSON.stringify(LANGUAGES));
console.log(`wrote ${LANGUAGES.length} languages to shell/data/i18n`);
