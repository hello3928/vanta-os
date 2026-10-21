// Finds where each trailer should start playing as game music.
//
// Steam publishes a sheet of thumbnails next to every trailer (one frame every 3 seconds). We
// score each frame for "real footage": contrast, detail and colour, with very dark or flat frames
// (rating cards, publisher logos, fades to black) scoring zero. The start is the earliest
// 9-second stretch that scores close to the trailer's best, within its first 70%, so the music
// starts on gameplay and still has most of the trailer left to play.
//
// Nothing but the thumbnails is downloaded (about 100 KB per 90 seconds of trailer). Results are
// remembered in this browser. Real OS: vantad runs the same scoring once per trailer (on the
// thumbnails, or on frames from ffmpeg) and caches it with the trailer.

const TILE_SECONDS = 3;
const SHEET = { cols: 5, rows: 6 }; // Steam's tile layout ("5x6")
const WINDOW = 3; // frames in a row that must all look like footage (9 s)
const NEAR_BEST = 0.65; // take the first stretch scoring at least this share of the best
const SEARCH_SHARE = 0.7; // only start within the first 70%
const MIN_START = 6; // studio logos often sit over the first footage after the rating card
const CACHE_KEY = 'vanta.trailerStart.v2';

let cache = {};
try {
  cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
} catch {
  /* storage blocked: scan each time */
}
const pending = new Map();

const baseOf = (url) => url.slice(0, url.lastIndexOf('/') + 1);

// One frame → a footage score. Works on a 64×36 copy, which is plenty for these measures.
function scoreFrame(ctx) {
  const { data } = ctx.getImageData(0, 0, 64, 36);
  const n = 64 * 36;
  const lum = new Float32Array(n);
  let sum = 0;
  let sum2 = 0;
  let sat = 0;
  for (let p = 0; p < n; p++) {
    const r = data[p * 4] / 255;
    const g = data[p * 4 + 1] / 255;
    const b = data[p * 4 + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum[p] = l;
    sum += l;
    sum2 += l * l;
    const max = Math.max(r, g, b);
    sat += max ? (max - Math.min(r, g, b)) / max : 0;
  }
  let edges = 0;
  for (let y = 0; y < 36; y++) for (let x = 1; x < 64; x++) if (Math.abs(lum[y * 64 + x] - lum[y * 64 + x - 1]) > 0.06) edges++;
  const mean = sum / n;
  const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  const edge = edges / (36 * 63);
  sat /= n;
  // Cards and fades: too dark, too bright, too flat or too plain to be gameplay.
  if (mean < 0.1 || mean > 0.88 || std < 0.1 || edge < 0.12) return 0;
  return std * edge * (0.5 + sat);
}

async function scan(url) {
  const base = baseOf(url);
  const mpd = await (await fetch(`${base}dash_av1.mpd`)).text();
  const m = /mediaPresentationDuration="PT(?:(\d+)M)?([\d.]+)S"/.exec(mpd);
  if (!m || !mpd.includes('dash_thumbnails')) return null;
  const duration = (+m[1] || 0) * 60 + +m[2];
  const perSheet = SHEET.cols * SHEET.rows;
  const frames = Math.floor(duration / TILE_SECONDS);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 36;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const scores = [];
  for (let sheet = 0; sheet * perSheet < frames; sheet++) {
    const res = await fetch(`${base}dash_thumbnails/thumbnails-${String(sheet + 1).padStart(5, '0')}.avif`);
    if (!res.ok) break;
    const bmp = await createImageBitmap(await res.blob());
    const tw = bmp.width / SHEET.cols;
    const th = bmp.height / SHEET.rows;
    for (let i = 0; i < perSheet && scores.length < frames; i++) {
      ctx.drawImage(bmp, (i % SHEET.cols) * tw, Math.floor(i / SHEET.cols) * th, tw, th, 0, 0, 64, 36);
      scores.push(scoreFrame(ctx));
    }
    bmp.close?.();
  }
  // Average each run of WINDOW frames; a run with any card or fade in it doesn't count.
  const last = Math.floor((duration * SEARCH_SHARE) / TILE_SECONDS);
  const runs = [];
  for (let i = MIN_START / TILE_SECONDS; i + WINDOW <= Math.min(scores.length, last + WINDOW); i++) {
    const w = scores.slice(i, i + WINDOW);
    runs.push({ i, avg: w.includes(0) ? 0 : w.reduce((a, b) => a + b, 0) / WINDOW });
  }
  const best = Math.max(0, ...runs.map((r) => r.avg));
  if (!best) return null;
  const pick = runs.find((r) => r.avg >= best * NEAR_BEST);
  return { start: pick.i * TILE_SECONDS, duration };
}

export const TrailerScan = {
  // Resolves to { start, duration } in seconds, or null when the trailer has no thumbnails.
  bestStart(url) {
    if (!url) return Promise.resolve(null);
    if (url in cache) return Promise.resolve(cache[url]);
    if (!pending.has(url)) {
      pending.set(
        url,
        scan(url)
          .catch(() => null)
          .then((result) => {
            cache[url] = result;
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            } catch {
              /* storage blocked */
            }
            pending.delete(url);
            return result;
          }),
      );
    }
    return pending.get(url);
  },
};
