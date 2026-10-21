// What this device and each game can actually do. Settings only offer what applies:
// - controls that can't apply to a game are left out (no Proton options for a native Linux game)
// - controls the device can't support stay visible but disabled, with the reason underneath
//   (power limits on a desktop, HDR on a panel without it)
//
// Real OS: vantad reports the device (PowerStation for TDP ranges, DRM/KMS properties for VRR,
// HDR and refresh rates) and each game's runtime comes from Steam's app info (native Linux
// depots vs. Windows depots run through Proton). The mockup can preview three real devices from
// Settings → System.

import { Settings } from './Settings.js';
import { t } from './i18n.js';

export const DEVICES = {
  'ally-x': {
    name: 'ROG Ally X',
    chip: 'AMD Ryzen Z1 Extreme',
    memory: '24 GB',
    gpu: 'amd',
    display: { w: 1920, h: 1080, hz: 120, vrr: true, hdr: false },
    frameLimits: ['30', '40', '60', '120'],
    tdp: { min: 5, max: 30 },
    battery: true,
  },
  'deck-oled': {
    name: 'Steam Deck OLED',
    chip: 'AMD Custom APU 0932',
    memory: '16 GB',
    gpu: 'amd',
    display: { w: 1280, h: 800, hz: 90, vrr: false, hdr: true },
    frameLimits: ['30', '45', '90'],
    tdp: { min: 3, max: 15 },
    battery: true,
  },
  desktop: {
    name: 'Desktop PC',
    chip: 'AMD Ryzen 7 7800X3D · NVIDIA GeForce RTX 4070',
    memory: '32 GB',
    gpu: 'nvidia',
    display: { w: 2560, h: 1440, hz: 144, vrr: true, hdr: true },
    frameLimits: ['30', '60', '72', '144'],
    tdp: null, // desktop CPUs and discrete GPUs have no APU power limit to set
    battery: false,
  },
};

// FSR 1 render scales (AMD's published ratios), applied by gamescope.
const UPSCALE = { Quality: 1.5, Balanced: 1.7, Performance: 2 };

export const Device = {
  get id() {
    return DEVICES[Settings.get('device')] ? Settings.get('device') : 'ally-x';
  },
  get current() {
    return DEVICES[this.id];
  },

  frameOptions() {
    return ['Off', ...this.current.frameLimits];
  },

  // Why a device-level control is unavailable, or null when it works.
  unsupported(feature) {
    const d = this.current;
    switch (feature) {
      case 'tdp':
        return d.tdp ? null : t('capNoTdp');
      case 'vrr':
        return d.display.vrr ? null : t('capNoVrr');
      case 'hdr':
        return d.display.hdr ? null : t('capNoHdr');
      default:
        return null;
    }
  },

  // "Renders at 1280×720" for an upscaling mode on this display.
  renderSize(mode) {
    const s = UPSCALE[mode];
    if (!s) return '';
    const { w, h } = this.current.display;
    return `${Math.round(w / s)}×${Math.round(h / s)}`;
  },
};

// How a game runs: 'native' (Linux build), 'proton' (Windows build) or 'emulator'.
export function runtimeOf(g) {
  if (g.source === 'emu') return 'emulator';
  return g.native ? 'native' : 'proton';
}

// The game's own upscalers. DLSS needs an NVIDIA GPU; FSR and XeSS run on any GPU.
export function gameUpscalers(g) {
  return (g.upscalers || []).map((name) => ({ name, works: !name.startsWith('DLSS') || Device.current.gpu === 'nvidia' }));
}

// Keep saved values valid for the current device (a 120 fps limit means nothing on a 90 Hz panel).
export function normalizeForDevice() {
  const d = Device.current;
  if (!Device.frameOptions().includes(Settings.get('fpsLimit'))) Settings.set('fpsLimit', 'Off');
  if (d.tdp) Settings.set('tdp', Math.min(d.tdp.max, Math.max(d.tdp.min, Settings.get('tdp'))));
  else if (Settings.get('tdpLimit')) Settings.set('tdpLimit', false);
}
