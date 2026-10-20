// VTopBar: page title on the left; on the right, status (notifications, Wi-Fi, battery, clock),
// your profile picture (opens the main menu) and the quick access button. Not part of controller
// navigation: controllers use the Guide/View and Start buttons, mouse and touch users click these.

import { VComponent } from '../core/VComponent.js';
import { Profiles } from '../core/Profiles.js';
import { icon, batteryIcon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { avatarEl } from './avatar.js';

export class VTopBar extends VComponent {
  constructor({ app, title = '' } = {}) {
    super({ tag: 'header', className: 'v-topbar' });
    const titleEl = h('div', 'v-topbar__title', esc(title));

    const status = h('div', 'v-topbar__status');
    const bell = h('span', 'v-topbar__bell', icon('bell'));
    const wifi = h('span', 'v-wifi', icon('wifi'));
    this.bind('wifi', (on) => (wifi.style.opacity = on ? 1 : 0.3));
    this.battery = h('span', 'v-battery');
    this.clock = h('span', 'v-topbar__clock');
    const me = h('button', 'v-topbar__me');
    me.type = 'button';
    me.setAttribute('aria-label', t('menu'));
    me.append(avatarEl(Profiles.current, 'avatar avatar--xs'));
    me.addEventListener('click', () => app.toggleMainMenu());
    const qam = h('button', 'v-topbar__qam', icon('more'));
    qam.type = 'button';
    qam.setAttribute('aria-label', t('quickAccess'));
    qam.addEventListener('click', () => app.toggleQuickAccess());
    status.append(bell, wifi, this.battery, this.clock, me, qam);

    this.el.append(titleEl, h('div', 'v-topbar__spacer'), status);
    this.tick();
    this.timer = setInterval(() => this.tick(), 15000);
    this.readBattery();
  }

  tick() {
    if (this.started && !this.el.isConnected) return clearInterval(this.timer);
    this.started = true;
    this.clock.textContent = new Date().toLocaleTimeString(document.documentElement.lang || [], { hour: 'numeric', minute: '2-digit' });
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
