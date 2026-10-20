// VTopBar: page title on the left, status on the right (notifications, Wi-Fi, battery, clock)
// and the quick access button. Not part of controller navigation: controllers use the
// Guide/View and Start buttons; mouse and touch users click these.

import { VComponent } from '../core/VComponent.js';
import { icon, batteryIcon } from '../core/icons.js';
import { esc, h } from '../core/util.js';

export class VTopBar extends VComponent {
  constructor({ app, title = '' } = {}) {
    super({ tag: 'header', className: 'v-topbar' });
    const menu = h('button', 'v-topbar__menu', `${icon('search')}${title ? `<span class="v-topbar__title">${esc(title)}</span>` : ''}`);
    menu.type = 'button';
    menu.setAttribute('aria-label', 'Main menu');
    menu.addEventListener('click', () => app.toggleMainMenu());

    const status = h('div', 'v-topbar__status');
    const bell = h('span', 'v-topbar__bell', icon('bell'));
    const wifi = h('span', 'v-wifi', icon('wifi'));
    this.bind('wifi', (on) => (wifi.style.opacity = on ? 1 : 0.3));
    this.battery = h('span', 'v-battery');
    this.clock = h('span', 'v-topbar__clock');
    const qam = h('button', 'v-topbar__qam', icon('more'));
    qam.type = 'button';
    qam.setAttribute('aria-label', 'Quick access menu');
    qam.addEventListener('click', () => app.toggleQuickAccess());
    status.append(bell, wifi, this.battery, this.clock, qam);

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
    this.battery.innerHTML = `${icon(batteryIcon(level), 'v-battery__icon')}<span class="v-battery__pct">${Math.round(level * 100)}%</span>`;
  }
}
