// Receives WAVs rendered by tools/render-sounds.js and saves them to shell/data/sounds.
// Run from the repo root: node tools/sound-sink.mjs (port 4174)
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../shell/data/sounds/', import.meta.url));
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method !== 'POST') return res.end('ok');
  const name = req.url.slice(1).replace(/[^a-zA-Z0-9-]/g, '');
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    writeFileSync(dir + name + '.wav', Buffer.concat(chunks));
    console.log('saved', name);
    res.end('saved');
  });
}).listen(4174, () => console.log('listening on 4174'));
