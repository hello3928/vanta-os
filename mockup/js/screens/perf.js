// Performance controls shared by Quick access, Settings and the game page. Each one checks the
// device and (where given) the game first, so a control only works where it can apply.

import { VDropdown } from '../components/VDropdown.js';
import { VSlider } from '../components/VSlider.js';
import { VToggle } from '../components/VToggle.js';
import { VListItem } from '../components/VListItem.js';
import { Device, runtimeOf } from '../core/Device.js';
import { t } from '../core/i18n.js';
import { systemOf } from '../data.js';

const PROTON = ['Proton 10', 'Proton Experimental', 'GE-Proton'];

export function frameLimit({ icon, bind = 'fpsLimit', value } = {}) {
  return new VDropdown({ label: t('frameLimit'), icon, options: Device.frameOptions(), bind: value === undefined ? bind : undefined, value });
}

export function tdpToggle({ icon } = {}) {
  return new VToggle({ label: t('limitTdp'), icon, bind: 'tdpLimit' }).setUnsupported(Device.unsupported('tdp'));
}

export function tdpSlider({ label = t('tdpLimit'), icon, bind = 'tdp', value } = {}) {
  const range = Device.current.tdp || { min: 3, max: 30 };
  const slider = new VSlider({
    label,
    icon,
    min: range.min,
    max: range.max,
    step: 1,
    bind: value === undefined ? bind : undefined,
    value: value === undefined ? undefined : Math.min(range.max, Math.max(range.min, value)),
    format: (v) => `${v} W`,
  });
  return slider.setUnsupported(Device.unsupported('tdp'));
}

export function vrrToggle({ icon } = {}) {
  return new VToggle({ label: t('vrr'), icon, bind: 'vrr' }).setUnsupported(Device.unsupported('vrr'));
}

export function hdrToggle({ icon } = {}) {
  return new VToggle({ label: t('hdr'), icon, bind: 'hdr' }).setUnsupported(Device.unsupported('hdr'));
}

// System upscaling (FSR through gamescope). The second line shows the resolution the game
// renders at. Emulated games scale with the emulator's internal resolution instead.
export function upscaling({ icon, game, bind = 'upscaling', value } = {}) {
  const dd = new VDropdown({ label: t('upscaling'), icon, options: ['Off', 'Quality', 'Balanced', 'Performance'], bind: value === undefined ? bind : undefined, value });
  if (game && runtimeOf(game) === 'emulator') return dd.setUnsupported(t('capEmuUpscale'));
  const detail = dd.el.querySelector('.v-control__detail');
  const show = (mode) => (detail.textContent = mode === 'Off' ? '' : t('upscaleRenders', { res: Device.renderSize(mode) }));
  if (value === undefined) dd.bind(bind, show);
  else {
    show(dd.value);
    dd.on('change', show);
  }
  return dd;
}

// How the game runs: Proton version for Windows games, the emulator for retro games, and a
// plain line for native Linux games (there's nothing to choose).
export function runtimeControl(g, { icon } = {}) {
  const runtime = runtimeOf(g);
  if (runtime === 'emulator') {
    const sys = systemOf(g);
    return new VDropdown({ label: t('emulator'), icon, options: [sys.emulator, ...(sys.emulator.startsWith('RetroArch') ? [] : ['RetroArch'])] });
  }
  if (runtime === 'native') return new VListItem({ label: t('compatTool'), icon, trail: t('runtimeNative') });
  return new VDropdown({ label: t('compatTool'), icon, options: PROTON });
}
