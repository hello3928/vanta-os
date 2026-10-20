// Sample library for the mockup. All games are made up; their art and logos are generated (see js/art).

export const SYSTEMS = [
  { id: 'nes', name: 'NES', emulator: 'RetroArch · Mesen', bios: 'none' },
  { id: 'snes', name: 'SNES', emulator: 'RetroArch · Snes9x', bios: 'none' },
  { id: 'n64', name: 'Nintendo 64', emulator: 'RetroArch · Mupen64Plus-Next', bios: 'none' },
  { id: 'gba', name: 'Game Boy Advance', emulator: 'RetroArch · mGBA', bios: 'optional' },
  { id: 'nds', name: 'Nintendo DS', emulator: 'melonDS', bios: 'optional' },
  { id: '3ds', name: 'Nintendo 3DS', emulator: 'Azahar', bios: 'none' },
  { id: 'ps1', name: 'PlayStation', emulator: 'DuckStation', bios: 'found' },
  { id: 'ps2', name: 'PlayStation 2', emulator: 'PCSX2', bios: 'found' },
  { id: 'psp', name: 'PSP', emulator: 'PPSSPP', bios: 'none' },
  { id: 'ps3', name: 'PlayStation 3', emulator: 'RPCS3', bios: 'missing' },
  { id: 'gc', name: 'GameCube / Wii', emulator: 'Dolphin', bios: 'none' },
  { id: 'wiiu', name: 'Wii U', emulator: 'Cemu', bios: 'missing' },
];

export const BIOS_LABEL = {
  none: { text: 'No BIOS needed', tone: 'muted' },
  optional: { text: 'BIOS optional', tone: 'muted' },
  found: { text: 'BIOS found', tone: 'good' },
  missing: { text: 'BIOS needed', tone: 'warn' },
};

const G = (o) => ({ installed: true, recent: 0, ...o });

export const GAMES = [
  G({
    id: 'neon-drift', title: 'Neon Drift', source: 'steam', genre: 'Arcade racing', hours: 42, last: 'Today', ach: [34, 50], size: '38.4 GB', recent: 1,
    art: { scene: 'city', road: true, night: true, sky: ['#0b0820', '#3a0f4a', '#c2366b'], far: '#2a1238', near: '#07050d', fog: '#ff4f8b', sun: '#ff4f8b', windows: ['#ff6fae', '#5fe1ff', '#ffd36b'], streaks: ['#ff3f8e', '#4fe3ff'] },
    logo: { font: 'Monoton', weight: 400, upper: true, tracking: 0.04, fill: '#ffe9f4', glow: '#ff3f8e' },
  }),
  G({
    id: 'hollow-crown', title: 'Hollow Crown', source: 'steam', genre: 'Action RPG', hours: 118, last: 'Yesterday', ach: [61, 72], size: '96.1 GB', recent: 2,
    art: { scene: 'castle', sky: ['#1c1530', '#7a3a3a', '#f2a65a'], far: '#6b4a5a', near: '#120c14', fog: '#f0b27a', sun: '#ffd89a', sunX: 0.3, sunY: 0.52, cloud: '#f6c38f' },
    logo: { font: 'Cinzel', weight: 700, upper: true, tracking: 0.1, fill: ['#fff4d6', '#e0a94a'], stroke: { w: 0.03, color: '#3a2410' } },
  }),
  G({
    id: 'velvet-shadows', title: 'Velvet Shadows', source: 'emu', system: 'ps1', genre: 'Stealth', hours: 9, last: '2 days ago', recent: 3,
    art: { scene: 'city', rain: true, night: true, moon: '#f1e6d0', pixel: 2, sky: ['#07070d', '#2a0c18', '#5c1426'], far: '#2a1018', near: '#050307', fog: '#8a1c34', sun: '#b3203f', windows: ['#ff5a5a', '#ffe0b0'] },
    logo: { font: 'Abril Fatface', weight: 400, upper: false, tracking: 0.01, fill: '#f6e7e1', stroke: { w: 0.04, color: '#5a0d1d' }, pos: 'bottom' },
  }),
  G({
    id: 'starfall-tactics', title: 'Starfall Tactics', source: 'steam', genre: 'Strategy', hours: 64, last: '3 days ago', ach: [12, 40], size: '12.7 GB', recent: 4,
    art: { scene: 'space', ships: true, sky: ['#02030a', '#080d24', '#120f2e'], nebula: ['#3d5bff', '#8a3dff', '#1fb5ff'], planet: ['#6a8cff', '#0b1030'], rim: '#8fd0ff', planetX: 0.82, planetY: 0.92, planetR: 0.55, moonR: 0.05 },
    logo: { font: 'Oxanium', weight: 800, upper: true, tracking: 0.08, fill: ['#ffffff', '#a9c8ff'], stroke: { w: 0.05, color: '#0b1640' } },
  }),
  G({
    id: 'pixel-knight', title: 'Pixel Knight Saga', source: 'emu', system: 'snes', genre: 'Adventure', hours: 21, last: 'Last week', recent: 5,
    art: { scene: 'castle', pixel: 6, sky: ['#3b7bd8', '#7fb6f0', '#cfe8ff'], far: '#7d9bc9', near: '#1d3b2a', fog: '#e4f2ff', sun: '#fff6c8', sunX: 0.78, sunY: 0.2, cloud: '#ffffff', castleX: 0.45 },
    logo: { font: 'Press Start 2P', weight: 400, upper: true, tracking: 0.02, fill: ['#fff7c2', '#ffb02e'], stroke: { w: 0.12, color: '#3a1d04' }, lineHeight: 1.35 },
  }),
  G({
    id: 'tidebreaker', title: 'Tidebreaker', source: 'steam', genre: 'Survival', hours: 30, last: 'Last week', ach: [18, 45], size: '54.0 GB', recent: 6,
    art: { scene: 'sea', storm: true, lighthouse: true, sky: ['#0b141c', '#1f3442', '#4c6a74'], cloud: '#0e1a22', far: '#36535d', near: '#08121a', crest: '#d8f1ff', beam: '#fff1c4' },
    logo: { font: 'Bebas Neue', weight: 400, upper: true, tracking: 0.08, fill: '#f2f7fa', pos: 'top' },
  }),
  G({
    id: 'ironbloom', title: 'Ironbloom', source: 'steam', genre: 'Metroidvania', hours: 17, last: '2 weeks ago', ach: [22, 38], size: '6.2 GB',
    art: { scene: 'forest', sky: ['#1a0f0b', '#4a2617', '#b8562a'], far: '#7a3c22', near: '#0d0806', fog: '#e07a3f', sun: '#ffb070', sunX: 0.6 },
    logo: { font: 'Bungee', weight: 400, upper: true, tracking: 0.02, fill: ['#ffe2c4', '#ff8a3d'], stroke: { w: 0.05, color: '#2a1006' } },
  }),
  G({
    id: 'paper-lanterns', title: 'Paper Lanterns', source: 'steam', genre: 'Puzzle', hours: 6, last: 'A month ago', ach: [30, 30], size: '2.1 GB',
    art: { scene: 'lanterns', sky: ['#0a0f2a', '#2b2350', '#b85a4a'], far: '#3a2a4a', near: '#0b0a18', fog: '#c76a5a', lantern: '#ffb04a', water: ['#1a1a3a', '#05060f'] },
    logo: { font: 'Playfair Display', weight: 700, style: 'italic', upper: false, tracking: 0, fill: '#fff1d8', lines: 2 },
  }),
  G({
    id: 'circuit-saints', title: 'Circuit Saints', source: 'steam', genre: 'Shooter', hours: 88, last: 'A month ago', ach: [40, 66], size: '71.5 GB',
    art: { scene: 'grid', sky: ['#05030c', '#170a2e', '#3a0f4f'], far: '#140726', near: '#05020a', sun: '#ff2fb0', line: '#2ff3ff' },
    logo: { font: 'Audiowide', weight: 400, upper: true, tracking: 0.06, fill: '#e9fdff', glow: '#2ff3ff', lines: 2 },
  }),
  G({
    id: 'ashen-vale', title: 'Ashen Vale', source: 'steam', genre: 'Soulslike', hours: 0, last: 'Never', ach: [0, 52], size: '44.9 GB', installed: false,
    art: { scene: 'ash', sky: ['#1c1714', '#5a4136', '#a8775a'], cloud: '#3a2e28', far: '#6e5548', near: '#0c0a09', fog: '#9a7560', sun: '#ffe2b8', sunX: 0.62, sunY: 0.32, ember: '#ff7a2a' },
    logo: { font: 'Cormorant Garamond', weight: 700, upper: true, tracking: 0.18, fill: '#f3e9de', pos: 'bottom' },
  }),
  G({
    id: 'glasswing', title: 'Glasswing', source: 'steam', genre: 'Platformer', hours: 12, last: '2 months ago', ach: [19, 24], size: '4.8 GB',
    art: { scene: 'peaks', trees: true, sky: ['#7fc4d8', '#c7e6e4', '#fbe7d0'], far: '#9cc3c8', near: '#1f4a4f', fog: '#f4f1e6', sun: '#fffaf0', sunX: 0.7, sunY: 0.28, cloud: '#ffffff' },
    logo: { font: 'Josefin Sans', weight: 300, upper: true, tracking: 0.32, fill: '#ffffff', stroke: { w: 0.02, color: '#1f4a4f' } },
  }),
  G({
    id: 'orbital-kitchen', title: 'Orbital Kitchen', source: 'steam', genre: 'Co-op party', hours: 14, last: '3 months ago', ach: [9, 35], size: '3.3 GB', installed: false,
    art: { scene: 'space', station: true, sky: ['#071226', '#10234a', '#1b3a6b'], nebula: ['#2f7bff', '#ff7ab8'], planet: ['#4fb3ff', '#0d2a55'], rim: '#bfe6ff', planetX: 0.3, planetY: 1.05, planetR: 0.6 },
    logo: { font: 'Fredoka', weight: 600, upper: false, tracking: 0, fill: ['#fff3c4', '#ffb23d'], stroke: { w: 0.08, color: '#5a2a00' }, lines: 2 },
  }),
  G({
    id: 'blocky-quest', title: 'Blocky Quest', source: 'emu', system: 'nes', genre: 'Platformer', hours: 3, last: 'A month ago',
    art: { scene: 'peaks', pixel: 9, trees: true, sky: ['#5c94fc', '#8fb8ff', '#bcd4ff'], far: '#7aa6e8', near: '#1f6b2a', fog: '#d6e6ff', sun: '#fff1a8', sunX: 0.2, sunY: 0.2, cloud: '#ffffff' },
    logo: { font: 'Silkscreen', weight: 700, upper: true, tracking: 0.04, fill: '#ffffff', stroke: { w: 0.14, color: '#2a0f00' } },
  }),
  G({
    id: 'moonlit-racer', title: 'Moonlit Racer', source: 'emu', system: 'n64', genre: 'Racing', hours: 11, last: '2 weeks ago',
    art: { scene: 'city', road: true, night: true, moon: '#e8f0ff', pixel: 3, sky: ['#030818', '#0d1f45', '#2c4f8a'], far: '#1a2b52', near: '#040812', fog: '#4f7fd0', sun: '#6f9cff', windows: ['#ffd36b', '#9fd0ff'], streaks: ['#ffd36b', '#ff4a4a'] },
    logo: { font: 'Russo One', weight: 400, upper: true, tracking: 0.02, fill: ['#ffffff', '#ffd36b'], skew: -0.25, stroke: { w: 0.06, color: '#0a1530' } },
  }),
  G({
    id: 'crystal-caverns', title: 'Crystal Caverns', source: 'emu', system: 'gba', genre: 'RPG', hours: 26, last: '3 weeks ago',
    art: { scene: 'caverns', pixel: 5, sky: ['#05040c', '#120c26', '#1c0f30'], near: '#06040c', glow: '#6b4cff', crystals: ['#4fe6ff', '#b56bff', '#ff6bd0'] },
    logo: { font: 'Pixelify Sans', weight: 700, upper: true, tracking: 0.03, fill: ['#e6fbff', '#7fdcff'], stroke: { w: 0.09, color: '#160b33' }, lines: 2 },
  }),
  G({
    id: 'twin-stylus', title: 'Twin Stylus', source: 'emu', system: 'nds', genre: 'Puzzle', hours: 4, last: 'A month ago',
    art: { scene: 'peaks', pixel: 4, sky: ['#ffb3c7', '#ffd6c2', '#fff0d9'], far: '#e59bb3', near: '#5a2a4a', fog: '#fff3e8', sun: '#ffffff', sunX: 0.5, sunY: 0.3, cloud: '#ffffff' },
    logo: { font: 'Righteous', weight: 400, upper: false, tracking: 0.01, fill: '#ffffff', stroke: { w: 0.08, color: '#7a1f4f' } },
  }),
  G({
    id: 'lantern-peaks', title: 'Lantern Peaks', source: 'emu', system: '3ds', genre: 'Adventure', hours: 8, last: '2 months ago',
    art: { scene: 'lanterns', mountains: true, pixel: 2, sky: ['#08142e', '#1c2f5c', '#5b4f8a'], far: '#33406a', near: '#0a0f22', fog: '#8a7fc0', lantern: '#ffcf6a', water: ['#16224a', '#05091a'] },
    logo: { font: 'Fredoka', weight: 600, upper: false, tracking: 0, fill: '#fff6dc', stroke: { w: 0.07, color: '#1a2350' } },
  }),
  G({
    id: 'skyline-brawlers', title: 'Skyline Brawlers', source: 'emu', system: 'ps2', genre: 'Fighting', hours: 15, last: '2 weeks ago',
    art: { scene: 'city', pixel: 2, sky: ['#1b2a4a', '#d0603a', '#ffcf7a'], far: '#7a4a52', near: '#120c12', fog: '#ffb070', sun: '#ffd28a', windows: ['#ffe2a0'] },
    logo: { font: 'Black Ops One', weight: 400, upper: true, tracking: 0.02, fill: ['#ffffff', '#ffd28a'], stroke: { w: 0.06, color: '#2a0f0a' }, lines: 2 },
  }),
  G({
    id: 'pocket-odyssey', title: 'Pocket Odyssey', source: 'emu', system: 'psp', genre: 'RPG', hours: 33, last: 'A month ago',
    art: { scene: 'sea', pixel: 2, lighthouse: true, sky: ['#2a3f8a', '#6a7fd0', '#f0b8a0'], cloud: '#ffd8c8', far: '#4a63b0', near: '#101a3a', crest: '#ffffff', beam: '#fff1c4', sun: '#fff0d0', sunX: 0.75, sunY: 0.5 },
    logo: { font: 'Teko', weight: 600, upper: true, tracking: 0.06, fill: '#ffffff', stroke: { w: 0.05, color: '#101a3a' } },
  }),
  G({
    id: 'coral-isle', title: 'Coral Isle', source: 'emu', system: 'gc', genre: 'Life sim', hours: 19, last: '3 weeks ago',
    art: { scene: 'sea', island: true, pixel: 2, sky: ['#3fb6e6', '#8fd8f0', '#e8fbff'], cloud: '#ffffff', far: '#3cc6c2', near: '#0d5a7a', crest: '#ffffff', sun: '#fffbe0', sunX: 0.8, sunY: 0.2 },
    logo: { font: 'Pacifico', weight: 400, upper: false, tracking: 0, fill: '#ffffff', stroke: { w: 0.08, color: '#0b5f86' } },
  }),
];

export const EVENTS = [
  { game: 'neon-drift', kind: 'Major update', title: 'Night Circuit adds 12 tracks and a photo mode', when: 'Today' },
  { game: 'hollow-crown', kind: 'Patch notes', title: 'Patch 2.4: new game plus and performance fixes', when: 'Yesterday' },
  { game: 'starfall-tactics', kind: 'Event', title: 'Weekend operation: double rewards until Monday', when: '2 days ago' },
  { game: 'tidebreaker', kind: 'News', title: 'Four-player co-op is now live', when: 'Last week' },
];

export const systemOf = (g) => SYSTEMS.find((s) => s.id === g.system);
export const gameById = (id) => GAMES.find((g) => g.id === id);

export function sourceLine(g) {
  if (g.source === 'steam') return g.installed ? 'Steam · Proton 10' : 'Steam · not installed';
  const s = systemOf(g);
  return `${s.name} · ${s.emulator}`;
}
