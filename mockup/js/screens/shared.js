// Builders shared by several screens.

import { VTile } from '../components/VTile.js';
import { systemOf } from '../data.js';

// A game's portrait capsule. A opens the game page. Retro games show their box art whole.
export function gameCapsule(app, g) {
  const sys = systemOf(g);
  const tile = new VTile({
    title: g.title,
    game: g,
    kind: 'capsule',
    fit: sys ? 'box' : 'cover',
    badge: badgeFor(app, g),
  });
  tile.game = g;
  tile.on('activate', () => app.openGame(g, tile));
  return tile;
}

export function badgeFor(app, g) {
  if (app.running === g) return { text: 'Running', tone: 'accent', icon: 'play' };
  const sys = systemOf(g);
  if (sys) return { text: sys.id.toUpperCase() };
  if (!g.installed) return { text: 'Not installed', icon: 'download' };
  return null;
}

export function playtime(g) {
  if (!g.hours) return 'Not played yet';
  return `${g.hours} hour${g.hours === 1 ? '' : 's'} played`;
}
