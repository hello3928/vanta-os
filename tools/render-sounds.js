// Renders the mockup's UI sounds (mockup/js/core/Sound.js) to shell/data/sounds/<name>.wav,
// so the shell plays exactly what the mockup plays.
// 1. node tools/sound-sink.mjs          (saves what the page sends, port 4174)
// 2. serve mockup/ on port 4173 and paste this file into the page's console.
// Sounds with a random pitch (move, key) get three takes; the slider gets one per tenth.

const { Sound } = await import('/js/core/Sound.js');
function wav(buf) {
  const d = buf.getChannelData(0);
  let end = d.length;
  const thr = 10 ** (-72 / 20);
  while (end > 0 && Math.abs(d[end - 1]) < thr) end--;
  end = Math.min(d.length, end + 240);
  const n = end;
  const b = new ArrayBuffer(44 + n * 2);
  const v = new DataView(b);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 48000, true);
  v.setUint32(28, 96000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  return b;
}
const jobs = [];
for (const name of Sound.names) {
  if (name === 'slider') for (let k = 0; k <= 10; k++) jobs.push([`slider-${k}`, name, { t: k / 10 }, null]);
  else if (name === 'move' || name === 'key') for (let k = 0; k < 3; k++) jobs.push([`${name}-${k}`, name, undefined, k / 2]);
  else jobs.push([name, name, undefined, null]);
}
const rnd = Math.random;
for (const [file, name, opts, r] of jobs) {
  if (r !== null) Math.random = () => r;
  const buf = await Sound.render(name, opts, name === 'welcome' || name === 'boot' ? 2.2 : 1.2);
  Math.random = rnd;
  await fetch(`http://localhost:4174/${file}`, { method: 'POST', body: wav(buf) });
}
