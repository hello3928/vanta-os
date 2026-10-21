// VTopBar: page title on the left; on the right, buttons for notifications, Wi-Fi, battery, the
// clock, your profile and quick access. Each opens the matching panel.
// Controller: Up from the top of a page moves into the bar; Down or B returns to the page.
// The app keeps one bar for every page (the shell in app.js).

import { VComponent } from '../core/VComponent.js';
import { FocusManager } from '../core/FocusManager.js';
import { Profiles } from '../core/Profiles.js';
import { bellIcon, wifiIcon, batteryIcon, moreIcon } from '../core/statusIcons.js';
import { t } from '../core/i18n.js';
import { esc, h } from '../core/util.js';
import { animate } from '../core/motion.js';
import { avatarEl } from './avatar.js';
import { Device } from '../core/Device.js';

class BarButton extends VComponent {
  constructor({ className, label, onActivate }) {
    super({ tag: 'button', className: `v-topbar__btn ${className}`, focusable: true, label });
    this.el.type = 'button';
    this.el.title = label;
    this.on('activate', onActivate);
  }

  // B leaves the bar and goes back to where you were on the page.
  handleBack() {
    return FocusManager.leaveChrome();
  }
}

export class VTopBar extends VComponent {
  constructor({ app, title = '' } = {}) {
    super({ tag: 'header', className: 'v-topbar' });
    const titleEl = (this.titleEl = h('div', 'v-topbar__title', esc(title)));
    this.title = title;

    const status = h('div', 'v-topbar__status');
    status.dataset.focusGroup = '';
    const btn = (className, label, onActivate) => new BarButton({ className, label, onActivate });

    const bell = btn('v-topbar__bell is-unread', t('notifications'), () => app.openQuickAccess('notifications'));
    bell.el.innerHTML = bellIcon();
    const wifi = btn('v-wifi', t('wifi'), () => app.openQuickAccess('quick'));
    this.bind('wifi', (on) => (wifi.el.innerHTML = wifiIcon({ strength: 3, off: !on })));
    this.battery = btn('v-battery', t('performance'), () => app.openQuickAccess('performance'));
    this.battery.el.hidden = !Device.current.battery; // desktops have no battery to show
    this.clock = btn('v-topbar__clock', t('quickSettings'), () => app.openQuickAccess('quick'));
    const me = btn('v-topbar__me', t('menu'), () => app.toggleMainMenu());
    me.el.append(avatarEl(Profiles.current, 'avatar avatar--xs'));
    // The bar outlives pages, so it follows profile changes itself.
    Profiles.onChange(() => me.el.replaceChildren(avatarEl(Profiles.current, 'avatar avatar--xs')));
    const qam = btn('v-topbar__qam', t('quickAccess'), () => app.toggleQuickAccess());
    qam.el.innerHTML = moreIcon();
    status.append(bell.el, wifi.el, this.battery.el, this.clock.el, me.el, qam.el);

    this.el.append(titleEl, h('div', 'v-topbar__spacer'), status);
    this.tick();
    this.timer = setInterval(() => this.tick(), 15000);
    this.readBattery();
  }

  // Page titles cross-fade; the status buttons on the right never move.
  setTitle(title) {
    if (title === this.title) return;
    this.title = title;
    this.titleEl.textContent = title;
    animate(this.titleEl, 'fade-in');
  }

  tick() {
    if (this.started && !this.el.isConnected) return clearInterval(this.timer);
    this.started = true;
    this.clock.el.textContent = new Date().toLocaleTimeString(document.documentElement.lang || [], { hour: 'numeric', minute: '2-digit' });
  }

  async readBattery() {
    let level = 0.72; // sample value where the browser can't say
    let charging = false;
    try {
      const b = await navigator.getBattery?.();
      if (b) ({ level, charging } = b);
    } catch {
      /* not available */
    }
    this.battery.el.innerHTML = `<span class="v-battery__pct">${Math.round(level * 100)}%</span>${batteryIcon({ level, charging })}`;
  }
}
