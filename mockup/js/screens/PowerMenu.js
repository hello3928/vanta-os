// Power menu (P, or Power in the main menu).

import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';

export function openPowerMenu(app) {
  return new VDialog({
    title: 'Power',
    stack: true,
    actions: [
      { label: 'Sleep', icon: 'moon', onActivate: () => VToast.show('Mockup: the device would sleep now', { icon: 'moon' }) },
      { label: 'Restart', icon: 'restart', onActivate: () => app.go('boot', {}, { replace: true }) },
      { label: 'Switch to desktop', icon: 'desktop', onActivate: () => VToast.show('Mockup: this would open the KDE Plasma desktop session', { icon: 'desktop' }) },
      { label: 'Shut down', icon: 'power', onActivate: () => app.go('boot', {}, { replace: true }) },
      { label: 'Cancel', variant: 'ghost' },
    ],
  }).open();
}
