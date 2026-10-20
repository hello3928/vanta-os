// Power menu (P, or Power in the main menu).

import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';

export function openPowerMenu(app) {
  return new VDialog({
    title: 'Power',
    stack: true,
    actions: [
      { label: 'Sleep', icon: 'moon', onActivate: () => app.sleep() },
      { label: 'Restart', icon: 'restart', onActivate: () => app.restart() },
      { label: 'Switch to desktop', icon: 'desktop', onActivate: () => VToast.show('Desktop mode is not available in this preview', { icon: 'desktop' }) },
      { label: 'Shut down', icon: 'power', onActivate: () => app.restart() },
      { label: 'Cancel', variant: 'ghost' },
    ],
  }).open();
}
