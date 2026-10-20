// Icons come from Google's Material Symbols (Rounded, filled; Apache 2.0), loaded as a font.
// icon('name') takes our short names so screens don't depend on the icon set.
// QML port: the same font works in Qt (Text with font.family "Material Symbols Rounded").

const NAMES = {
  home: 'home',
  library: 'grid_view',
  sliders: 'tune',
  power: 'power_settings_new',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  bolt: 'bolt',
  sun: 'light_mode',
  volume: 'volume_up',
  vibrate: 'vibration',
  bell: 'notifications',
  palette: 'palette',
  play: 'play_arrow',
  more: 'more_horiz',
  chevron: 'chevron_right',
  gamepad: 'sports_esports',
  disc: 'album',
  trophy: 'emoji_events',
  moon: 'bedtime',
  restart: 'restart_alt',
  desktop: 'desktop_windows',
  download: 'download',
  storage: 'hard_drive',
  info: 'info',
  user: 'person',
  gauge: 'speed',
  check: 'check_circle',
  close: 'close',
  folder: 'folder',
  chip: 'memory',
  update: 'system_update',
  sparkle: 'auto_awesome',
  trash: 'delete',
  search: 'search',
  airplane: 'flight',
  cloud: 'cloud_done',
  exit: 'logout',
  resume: 'play_circle',
  frame: 'speed',
  monitor: 'monitor',
  keyboard: 'keyboard',
  sync: 'sync',
};

export function icon(name, className = '') {
  return `<span class="v-icon ms ${className}" aria-hidden="true">${NAMES[name] || name}</span>`;
}

export function batteryIcon(level) {
  if (level >= 0.95) return 'battery_full';
  return `battery_${Math.max(0, Math.min(6, Math.round(level * 7) - 1))}_bar`;
}
