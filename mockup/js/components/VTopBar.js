// VTopBar: page title on the left; on the right, status (notifications, Wi-Fi, battery, clock),
// your profile picture (opens the main menu) and the quick access button. Not part of controller
// navigation: controllers use the Guide/View and Start buttons, mouse and touch users click these.

import { VComponent } from '../core/VComponent.js';
import { Profiles } from '../core/Profiles.js';
import { bellIcon, wifiIcon, batteryIcon, moreIcon } from '../core/statusIcons.js';
import { t } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { animate } from '../core/motion.js';
import { avatarEl } from './avatar.js';
import { Device } from '../core/Device.js';

export class VTopBar extends VComponent {
  constructor({ app, title = '' } = {}) {
    super({ tag: 'header', className: 'v-topbar' });
    const titleEl = (this.titleEl = h('div', 'v-topbar__title', esc(title)));
    this.title = title;

    const status = h('div', 'v-topbar__status');
    const bell = h('span', 'v-topbar__icon v-topbar__bell', bellIcon({ unread: true }));
    const wifi = h('span', 'v-topbar__icon v-wifi');
    this.bind('wifi', (on) => (wifi.innerHTML = wifiIcon({ strength: 3, off: !on })));
    this.battery = h('span', 'v-battery');
    this.battery.hidden = !Device.current.battery; // desktops have no battery to show
    this.clock = h('span', 'v-topbar__clock');
    const me = h('button', 'v-topbar__me');
    me.type = 'button';
    me.setAttribute('aria-label', t('menu'));
    me.append(avatarEl(Profiles.current, 'avatar avatar--xs'));
    // The bar outlives pages, so it follows profile changes itself.
    Profiles.onChange(() => me.replaceChildren(avatarEl(Profiles.current, 'avatar avatar--xs')));
    me.addEventListener('click', () => app.toggleMainMenu());
    const qam = h('button', 'v-topbar__qam', moreIcon());
    qam.type = 'button';
    qam.setAttribute('aria-label', t('quickAccess'));
    qam.addEventListener('click', () => app.toggleQuickAccess());
    status.append(bell, wifi, this.battery, this.clock, me, qam);

    this.el.append(titleEl, h('div', 'v-topbar__spacer'), status);
    this.tick();
    this.timer = setInterval(() => this.tick(), 15000);
    this.readBattery();
  }

  // Page titles cross-fade; the status icons on the right never move.
  setTitle(title) {
    if (title === this.title) return;
    this.title = title;
    this.titleEl.textContent = title;
    animate(this.titleEl, 'fade-in');
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
    let charging = false;
    try {
      charging = !!(await navigator.getBattery?.())?.charging;
    } catch {
      /* not available */
    }
    this.battery.innerHTML = `<span class="v-battery__pct">${Math.round(level * 100)}%</span>${batteryIcon({ level, charging })}`;
  }
}
