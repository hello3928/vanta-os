// VTopBar: the Vanta button with the page title on the left (opens the main menu), status on the
// right (Wi-Fi, battery, clock) and the quick access button. Not part of controller navigation:
// controllers use the Guide/View and Start buttons, mouse and touch users click these.

import { VComponent } from '../core/VComponent.js';
import { Settings } from '../core/Settings.js';
import { icon } from '../core/icons.js';
import { esc, h } from '../core/util.js';
import { mark } from '../brand.js';

export class VTopBar extends VComponent {
  constructor({ app, title = '' } = {}) {
    super({ tag: 'header', className: 'v-topbar' });
    const menu = h('button', 'v-topbar__menu');
    menu.type = 'button';
    menu.setAttribute('aria-label', 'Main menu');
    const markHost = h('span', 'v-topbar__mark');
    menu.append(markHost, h('span', 'v-topbar__title', esc(title)));
    menu.addEventListener('click', () => app.toggleMainMenu());
    this.bind('brand', (b) => (markHost.innerHTML = mark(b, { size: 24 })));

    const status = h('div', 'v-topbar__status');
    const wifi = h('span', 'v-wifi', icon('wifi'));
    this.bind('wifi', (on) => (wifi.style.opacity = on ? 1 : 0.3));
    this.battery = h('span', 'v-battery', '<span class="v-battery__cell"><span class="v-battery__level"></span></span><span class="v-battery__pct"></span>');
    this.clock = h('span', 'v-topbar__clock');
    const qam = h('button', 'v-topbar__qam', icon('more'));
    qam.type = 'button';
    qam.setAttribute('aria-label', 'Quick access menu');
    qam.addEventListener('click', () => app.toggleQuickAccess());
    status.append(wifi, this.battery, this.clock, qam);

    this.el.append(menu, h('div', 'v-topbar__spacer'), status);
    this.tick();
    this.timer = setInterval(() => this.tick(), 15000);
    this.readBattery();
  }

  tick() {
    if (this.started && !this.el.isConnected) return clearInterval(this.timer);
    this.started = true;
    this.clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  async readBattery(level = 0.72) {
    try {
      const b = await navigator.getBattery?.();
      if (b) level = b.level;
    } catch {
      /* not available: keep the sample value */
    }
    const pct = Math.round(level * 100);
    this.battery.querySelector('.v-battery__level').style.width = `calc(${pct}% - 3px)`;
    this.battery.querySelector('.v-battery__pct').textContent = `${pct}%`;
  }
}
