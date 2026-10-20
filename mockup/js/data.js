// Sample library for the mockup: real games, so the screens look like they will on a real device.
// Steam art loads live from Steam's CDN (the same images Steam itself shows) and retro box art from
// the libretro-thumbnails project (what RetroArch uses). Nothing is stored in this repo. Where those
// images can't load (offline, or the published preview), generated stand-in art is used instead.
// Play time, achievements and dates are sample values.

export const SYSTEMS = [
  { id: 'nes', name: 'NES', emulator: 'RetroArch · Mesen', bios: 'none', thumbs: 'Nintendo_-_Nintendo_Entertainment_System' },
  { id: 'snes', name: 'SNES', emulator: 'RetroArch · Snes9x', bios: 'none', thumbs: 'Nintendo_-_Super_Nintendo_Entertainment_System' },
  { id: 'n64', name: 'Nintendo 64', emulator: 'RetroArch · Mupen64Plus-Next', bios: 'none', thumbs: 'Nintendo_-_Nintendo_64' },
  { id: 'gba', name: 'Game Boy Advance', emulator: 'RetroArch · mGBA', bios: 'optional', thumbs: 'Nintendo_-_Game_Boy_Advance' },
  { id: 'nds', name: 'Nintendo DS', emulator: 'melonDS', bios: 'optional', thumbs: 'Nintendo_-_Nintendo_DS' },
  { id: '3ds', name: 'Nintendo 3DS', emulator: 'Azahar', bios: 'none', thumbs: 'Nintendo_-_Nintendo_3DS' },
  { id: 'ps1', name: 'PlayStation', emulator: 'DuckStation', bios: 'found', thumbs: 'Sony_-_PlayStation' },
  { id: 'ps2', name: 'PlayStation 2', emulator: 'PCSX2', bios: 'found', thumbs: 'Sony_-_PlayStation_2' },
  { id: 'psp', name: 'PSP', emulator: 'PPSSPP', bios: 'none', thumbs: 'Sony_-_PlayStation_Portable' },
  { id: 'ps3', name: 'PlayStation 3', emulator: 'RPCS3', bios: 'missing', thumbs: 'Sony_-_PlayStation_3' },
  { id: 'gc', name: 'GameCube / Wii', emulator: 'Dolphin', bios: 'none', thumbs: 'Nintendo_-_GameCube' },
  { id: 'wiiu', name: 'Wii U', emulator: 'Cemu', bios: 'missing', thumbs: 'Nintendo_-_Wii_U' },
];

export const BIOS_LABEL = {
  none: { text: 'No BIOS needed', tone: 'muted' },
  optional: { text: 'BIOS optional', tone: 'muted' },
  found: { text: 'BIOS found', tone: 'good' },
  missing: { text: 'BIOS needed', tone: 'warn' },
};

// Looks for the generated fallback art (see js/art/paint.js).
const LOOK = {
  gold: { scene: 'castle', sky: ['#1c1530', '#7a3a3a', '#f2a65a'], far: '#6b4a5a', near: '#120c14', fog: '#f0b27a', sun: '#ffd89a', sunX: 0.3, sunY: 0.52, cloud: '#f6c38f' },
  neon: { scene: 'city', road: true, night: true, sky: ['#0b0820', '#3a0f4a', '#c2366b'], far: '#2a1238', near: '#07050d', fog: '#ff4f8b', sun: '#ff4f8b', windows: ['#ff6fae', '#5fe1ff', '#ffd36b'], streaks: ['#ff3f8e', '#4fe3ff'] },
  ember: { scene: 'ash', sky: ['#1c1714', '#5a4136', '#a8775a'], cloud: '#3a2e28', far: '#6e5548', near: '#0c0a09', fog: '#9a7560', sun: '#ffe2b8', sunX: 0.62, sunY: 0.32, ember: '#ff7a2a' },
  space: { scene: 'space', ships: true, sky: ['#02030a', '#080d24', '#120f2e'], nebula: ['#3d5bff', '#8a3dff', '#1fb5ff'], planet: ['#6a8cff', '#0b1030'], rim: '#8fd0ff', planetX: 0.82, planetY: 0.92, planetR: 0.55, moonR: 0.05 },
  storm: { scene: 'sea', storm: true, lighthouse: true, sky: ['#0b141c', '#1f3442', '#4c6a74'], cloud: '#0e1a22', far: '#36535d', near: '#08121a', crest: '#d8f1ff', beam: '#fff1c4' },
  forest: { scene: 'forest', sky: ['#1a0f0b', '#4a2617', '#b8562a'], far: '#7a3c22', near: '#0d0806', fog: '#e07a3f', sun: '#ffb070', sunX: 0.6 },
  pastel: { scene: 'peaks', trees: true, sky: ['#7fc4d8', '#c7e6e4', '#fbe7d0'], far: '#9cc3c8', near: '#1f4a4f', fog: '#f4f1e6', sun: '#fffaf0', sunX: 0.7, sunY: 0.28, cloud: '#ffffff' },
  night: { scene: 'peaks', night: true, sky: ['#060a1a', '#16234a', '#3a3f7a'], far: '#2a3460', near: '#070a16', fog: '#5a63a0', sun: '#f2f4ff', sunX: 0.75, sunY: 0.2 },
  synth: { scene: 'grid', sky: ['#05030c', '#170a2e', '#3a0f4f'], far: '#140726', near: '#05020a', sun: '#ff2fb0', line: '#2ff3ff' },
  cave: { scene: 'caverns', sky: ['#05040c', '#120c26', '#1c0f30'], near: '#06040c', glow: '#6b4cff', crystals: ['#4fe6ff', '#b56bff', '#ff6bd0'] },
  lantern: { scene: 'lanterns', mountains: true, sky: ['#08142e', '#1c2f5c', '#5b4f8a'], far: '#33406a', near: '#0a0f22', fog: '#8a7fc0', lantern: '#ffcf6a', water: ['#16224a', '#05091a'] },
  day: { scene: 'peaks', trees: true, sky: ['#5c94fc', '#8fb8ff', '#bcd4ff'], far: '#7aa6e8', near: '#1f6b2a', fog: '#d6e6ff', sun: '#fff1a8', sunX: 0.2, sunY: 0.2, cloud: '#ffffff' },
  sea: { scene: 'sea', island: true, sky: ['#3fb6e6', '#8fd8f0', '#e8fbff'], cloud: '#ffffff', far: '#3cc6c2', near: '#0d5a7a', crest: '#ffffff', sun: '#fffbe0', sunX: 0.8, sunY: 0.2 },
};

const FALLBACK_LOGO = { font: 'Albert Sans', weight: 800, upper: true, tracking: 0.04, fill: '#ffffff' };

const steam = (o) => ({ source: 'steam', installed: true, recent: 0, logo: FALLBACK_LOGO, ...o, art: { ...LOOK[o.look] } });
const retro = (o) => ({ source: 'emu', installed: true, recent: 0, logo: FALLBACK_LOGO, ...o, art: { ...LOOK[o.look], pixel: o.pixel ?? 3 } });

export const GAMES = [
  steam({ id: 'elden-ring', appid: 1245620, title: 'Elden Ring', genre: 'Action RPG', hours: 142, last: 'Today', ach: [38, 42], size: '49.0 GB', recent: 1, look: 'gold', added: 'Feb 2022' }),
  steam({ id: 'bg3', appid: 1086940, title: "Baldur's Gate 3", genre: 'RPG', hours: 96, last: 'Yesterday', ach: [31, 54], size: '122 GB', recent: 2, look: 'ember', added: 'Aug 2023' }),
  steam({ id: 'hades-2', appid: 1145350, title: 'Hades II', genre: 'Roguelike', hours: 37, last: '2 days ago', ach: [21, 49], size: '10.4 GB', recent: 3, look: 'ember', added: 'May 2024' }),
  steam({ id: 'cyberpunk', appid: 1091500, title: 'Cyberpunk 2077', genre: 'Action RPG', hours: 88, last: '3 days ago', ach: [29, 57], size: '70.2 GB', recent: 4, look: 'neon', added: 'Dec 2020' }),
  retro({ id: 'super-metroid', system: 'snes', rom: 'Super Metroid (Japan, USA) (En,Ja)', title: 'Super Metroid', genre: 'Action adventure', hours: 9, last: 'Last week', recent: 5, look: 'cave', pixel: 5 }),
  steam({ id: 'hollow-knight', appid: 367520, title: 'Hollow Knight', genre: 'Metroidvania', hours: 54, last: 'Last week', ach: [40, 63], size: '9.1 GB', recent: 6, look: 'cave' }),
  steam({ id: 'balatro', appid: 2379780, title: 'Balatro', genre: 'Deckbuilder', hours: 61, last: 'Last week', ach: [24, 30], size: '0.2 GB', recent: 7, look: 'synth' }),
  steam({ id: 'helldivers-2', appid: 553850, title: 'Helldivers 2', genre: 'Co-op shooter', hours: 73, last: '2 weeks ago', ach: [19, 38], size: '86.0 GB', look: 'space', added: 'Feb 2024' }),
  steam({ id: 'rdr2', appid: 1174180, title: 'Red Dead Redemption 2', genre: 'Open world', hours: 110, last: '3 weeks ago', ach: [33, 51], size: '119 GB', look: 'gold' }),
  steam({ id: 'witcher-3', appid: 292030, title: 'The Witcher 3: Wild Hunt', genre: 'RPG', hours: 165, last: 'A month ago', ach: [48, 78], size: '58.1 GB', look: 'storm' }),
  steam({ id: 'stardew', appid: 413150, title: 'Stardew Valley', genre: 'Farming sim', hours: 204, last: 'A month ago', ach: [36, 49], size: '0.6 GB', look: 'pastel' }),
  steam({ id: 'forza-5', appid: 1551360, title: 'Forza Horizon 5', genre: 'Racing', hours: 41, last: '2 months ago', ach: [77, 136], size: '133 GB', look: 'neon' }),
  steam({ id: 'celeste', appid: 504230, title: 'Celeste', genre: 'Platformer', hours: 23, last: '2 months ago', ach: [24, 32], size: '1.2 GB', look: 'night' }),
  steam({ id: 'sekiro', appid: 814380, title: 'Sekiro: Shadows Die Twice', genre: 'Action', hours: 0, last: 'Never', ach: [0, 34], size: '25.0 GB', installed: false, look: 'lantern', added: '3 days ago' }),
  steam({ id: 'wukong', appid: 2358720, title: 'Black Myth: Wukong', genre: 'Action RPG', hours: 0, last: 'Never', ach: [0, 81], size: '130 GB', installed: false, look: 'forest', added: '1 week ago' }),
  steam({ id: 'disco', appid: 632470, title: 'Disco Elysium', genre: 'RPG', hours: 31, last: '3 months ago', ach: [22, 45], size: '20.4 GB', look: 'storm', added: '2 weeks ago' }),
  steam({ id: 'portal-2', appid: 620, title: 'Portal 2', genre: 'Puzzle', hours: 18, last: '4 months ago', ach: [33, 51], size: '12.8 GB', look: 'pastel' }),
  retro({ id: 'link-to-the-past', system: 'snes', rom: 'Legend of Zelda, The - A Link to the Past (USA)', title: 'The Legend of Zelda: A Link to the Past', genre: 'Adventure', hours: 14, last: '2 weeks ago', look: 'day', pixel: 6 }),
  retro({ id: 'chrono-trigger', system: 'snes', rom: 'Chrono Trigger (USA)', title: 'Chrono Trigger', genre: 'RPG', hours: 31, last: 'A month ago', look: 'gold', pixel: 6 }),
  retro({ id: 'smb3', system: 'nes', rom: 'Super Mario Bros. 3 (USA)', title: 'Super Mario Bros. 3', genre: 'Platformer', hours: 6, last: 'A month ago', look: 'day', pixel: 9 }),
  retro({ id: 'sm64', system: 'n64', rom: 'Super Mario 64 (USA)', title: 'Super Mario 64', genre: 'Platformer', hours: 12, last: '3 weeks ago', look: 'day' }),
  retro({ id: 'ocarina', system: 'n64', rom: 'Legend of Zelda, The - Ocarina of Time (USA)', title: 'The Legend of Zelda: Ocarina of Time', genre: 'Adventure', hours: 22, last: 'A month ago', look: 'night' }),
  retro({ id: 'mk64', system: 'n64', rom: 'Mario Kart 64 (USA)', title: 'Mario Kart 64', genre: 'Racing', hours: 8, last: '2 months ago', look: 'neon' }),
  retro({ id: 'metroid-fusion', system: 'gba', rom: 'Metroid Fusion (USA)', title: 'Metroid Fusion', genre: 'Action adventure', hours: 7, last: '2 months ago', look: 'cave', pixel: 5 }),
  retro({ id: 'pokemon-emerald', system: 'gba', rom: 'Pokemon - Emerald Version (USA, Europe)', title: 'Pokémon Emerald', genre: 'RPG', hours: 48, last: '3 months ago', look: 'sea', pixel: 5 }),
  retro({ id: 'crash', system: 'ps1', rom: 'Crash Bandicoot (USA)', title: 'Crash Bandicoot', genre: 'Platformer', hours: 5, last: '2 weeks ago', look: 'forest', pixel: 2 }),
  retro({ id: 'spyro', system: 'ps1', rom: 'Spyro the Dragon (USA)', title: 'Spyro the Dragon', genre: 'Platformer', hours: 9, last: 'A month ago', look: 'pastel', pixel: 2 }),
  retro({ id: 'sotc', system: 'ps2', rom: 'Shadow of the Colossus (USA)', title: 'Shadow of the Colossus', genre: 'Action adventure', hours: 11, last: '2 months ago', look: 'storm', pixel: 2 }),
  retro({ id: 'wind-waker', system: 'gc', rom: 'Legend of Zelda, The - The Wind Waker (USA)', title: 'The Legend of Zelda: The Wind Waker', genre: 'Adventure', hours: 19, last: '3 months ago', look: 'sea', pixel: 2 }),
  retro({ id: 'gow-chains', system: 'psp', rom: 'God of War - Chains of Olympus (USA)', title: 'God of War: Chains of Olympus', genre: 'Action', hours: 6, last: '4 months ago', look: 'ember', pixel: 2 }),
  retro({ id: 'nsmb', system: 'nds', rom: 'New Super Mario Bros. (USA)', title: 'New Super Mario Bros.', genre: 'Platformer', hours: 4, last: '4 months ago', look: 'day', pixel: 3 }),
];

export const systemOf = (g) => SYSTEMS.find((s) => s.id === g.system);
export const gameById = (id) => GAMES.find((g) => g.id === id);

export function sourceLine(g) {
  if (g.source === 'steam') return g.installed ? 'Steam · Proton 10' : 'Steam · Not installed';
  const s = systemOf(g);
  return `${s.name} · ${s.emulator}`;
}
