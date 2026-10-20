// Builders shared by several screens.

import { VTile } from '../components/VTile.js';
import { capsule } from '../art/index.js';
import { systemOf } from '../data.js';

// A game's portrait capsule. A opens the game page.
export function gameCapsule(app, g) {
  const sys = systemOf(g);
  const tile = new VTile({
    title: g.title,
    image: capsule(g),
    badge: sys ? { text: sys.id.toUpperCase() } : g.installed ? null : { text: 'Not installed', icon: 'download' },
  });
  tile.game = g;
  tile.on('activate', () => app.go('game', { id: g.id }));
  return tile;
}

export function playtime(g) {
  if (!g.hours) return 'Not played yet';
  return `${g.hours} hour${g.hours === 1 ? '' : 's'} played`;
}
