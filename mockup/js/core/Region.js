// Region, time zone and clock format. Names come from the browser's Intl data, so regions and
// zones read correctly in every interface language.
// Real OS: systemd-timedated (time zone, NTP sync via systemd-timesyncd) and the locale set by vantad.

import { Settings } from './Settings.js';
import { i18n } from './i18n.js';

export const DETECTED_ZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

export const DETECTED_REGION = (navigator.language || 'en-US').split('-')[1]?.toUpperCase() || 'US';

const ZONES = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Madrid', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Perth', 'Australia/Sydney', 'Pacific/Auckland',
];
const REGIONS = ['US', 'CA', 'BR', 'GB', 'ES', 'FR', 'DE', 'JP', 'AU', 'NZ'];

function offsetMinutes(zone) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '';
    const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part);
    return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
  } catch {
    return 0;
  }
}

// "UTC+10:00  Sydney"
export function zoneLabel(zone) {
  const m = offsetMinutes(zone);
  const sign = m < 0 ? '−' : '+';
  const a = Math.abs(m);
  const off = `UTC${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
  const city = zone.split('/').pop().replace(/_/g, ' ');
  return `${off}  ${city}`;
}

export function timeZones() {
  const list = ZONES.includes(DETECTED_ZONE) ? ZONES : [...ZONES, DETECTED_ZONE];
  return list.map((z) => ({ value: z, label: zoneLabel(z), offset: offsetMinutes(z) })).sort((a, b) => a.offset - b.offset);
}

export function regions() {
  let names;
  try {
    names = new Intl.DisplayNames([i18n.lang], { type: 'region' });
  } catch {
    names = { of: (c) => c };
  }
  const list = REGIONS.includes(DETECTED_REGION) ? REGIONS : [...REGIONS, DETECTED_REGION];
  return list.map((c) => ({ value: c, label: names.of(c) })).sort((a, b) => a.label.localeCompare(b.label, i18n.lang));
}

export const Region = {
  get zone() {
    return Settings.get('tzAuto') ? DETECTED_ZONE : Settings.get('timeZone') || DETECTED_ZONE;
  },
  // Interface language with the region's conventions, e.g. en-AU.
  get locale() {
    return `${i18n.lang.split('-')[0]}-${Settings.get('region') || DETECTED_REGION}`;
  },
  time(date = new Date()) {
    return date.toLocaleTimeString(this.locale, { hour: 'numeric', minute: '2-digit', hourCycle: Settings.get('clock24') ? 'h23' : 'h12', timeZone: this.zone });
  },
  date(date = new Date()) {
    return date.toLocaleDateString(this.locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: this.zone });
  },
};
