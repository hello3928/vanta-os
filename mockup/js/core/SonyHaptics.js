// Rumble for PlayStation controllers over WebHID. Browsers on Windows often don't pass rumble to
// Sony controllers through the Gamepad API, so this talks to the controller directly with the
// output reports the Linux hid-playstation driver documents.
//
// DualSense:     USB report 0x02, Bluetooth report 0x31 (with CRC32)
// DualShock 4:   USB report 0x05, Bluetooth report 0x11 (with CRC32)
// Byte layout of the motor fields: valid flags, then right (light, high-frequency) motor and
// left (heavy) motor, 0–255.
//
// Chrome asks for permission once (Settings > Controllers > Connect); after that the
// controller reconnects on its own. Real OS: SDL3 handles all of this natively.

const SONY = 0x054c;
const DUALSENSE = new Set([0x0ce6, 0x0df2]); // DualSense, DualSense Edge

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Bluetooth reports end with a CRC32 over 0xA2 (output seed), the report id and the data.
function withCrc(reportId, data) {
  const crc = crc32([0xa2, reportId, ...data.subarray(0, data.length - 4)]);
  data[data.length - 4] = crc & 0xff;
  data[data.length - 3] = (crc >>> 8) & 0xff;
  data[data.length - 2] = (crc >>> 16) & 0xff;
  data[data.length - 1] = (crc >>> 24) & 0xff;
  return data;
}

function hasReport(device, id) {
  return device.collections.some((c) => c.outputReports?.some((r) => r.reportId === id));
}

export const SonyHaptics = {
  device: null,
  seq: 0,
  stopTimer: null,
  listeners: [],

  get supported() {
    return 'hid' in navigator;
  },
  get connected() {
    return !!this.device?.opened;
  },

  onChange(fn) {
    this.listeners.push(fn);
  },
  changed() {
    this.listeners.forEach((fn) => fn(this.connected));
  },

  // Reopen a controller the user already allowed.
  async restore() {
    if (!this.supported) return;
    try {
      const devices = await navigator.hid.getDevices();
      const d = devices.find((x) => x.vendorId === SONY);
      if (d) await this.open(d);
    } catch {
      /* blocked in this frame */
    }
    navigator.hid?.addEventListener?.('disconnect', (e) => {
      if (e.device === this.device) {
        this.device = null;
        this.changed();
      }
    });
  },

  // Must run from a button press: Chrome shows its device picker.
  async request() {
    if (!this.supported) return false;
    try {
      const [d] = await navigator.hid.requestDevice({ filters: [{ vendorId: SONY }] });
      if (d) await this.open(d);
    } catch {
      return false;
    }
    return this.connected;
  },

  async open(d) {
    if (!d.opened) await d.open();
    this.device = d;
    this.dualsense = DUALSENSE.has(d.productId);
    this.bluetooth = this.dualsense ? hasReport(d, 0x31) : hasReport(d, 0x11);
    this.changed();
  },

  // weak, strong: 0–1. Holds for `ms`, then stops (a newer call replaces an older one).
  rumble(weak, strong, ms) {
    if (!this.connected) return;
    clearTimeout(this.stopTimer);
    this.send(weak, strong);
    this.stopTimer = setTimeout(() => this.send(0, 0), ms);
  },

  send(weak, strong) {
    const right = Math.round(Math.min(1, weak) * 255);
    const left = Math.round(Math.min(1, strong) * 255);
    let id;
    let data;
    if (this.dualsense && !this.bluetooth) {
      id = 0x02;
      data = new Uint8Array(62);
      data[0] = 0x03; // compatible vibration + haptics select
      data[2] = right;
      data[3] = left;
    } else if (this.dualsense) {
      id = 0x31;
      data = new Uint8Array(77);
      data[0] = (this.seq = (this.seq + 1) & 0x0f) << 4;
      data[1] = 0x10;
      data[2] = 0x03;
      data[4] = right;
      data[5] = left;
      withCrc(id, data);
    } else if (!this.bluetooth) {
      id = 0x05;
      data = new Uint8Array(31);
      data[0] = 0x01; // motors only, leave the light bar alone
      data[3] = right;
      data[4] = left;
    } else {
      id = 0x11;
      data = new Uint8Array(77);
      data[0] = 0xc0; // HID + CRC
      data[2] = 0x01;
      data[5] = right;
      data[6] = left;
      withCrc(id, data);
    }
    this.device.sendReport(id, data).catch(() => {});
  },
};
