// Power menu (P, or Power in the main menu).

import { VDialog } from '../components/VDialog.js';
import { VToast } from '../components/VToast.js';
import { t } from '../core/i18n.js';

export function openPowerMenu(app) {
  return new VDialog({
    title: t('power'),
    stack: true,
    actions: [
      { label: t('sleep'), icon: 'moon', onActivate: () => app.sleep() },
      { label: t('switchUser'), icon: 'user', onActivate: () => app.switchUser() },
      { label: t('restart'), icon: 'restart', onActivate: () => app.restart() },
      { label: t('switchDesktop'), icon: 'desktop', onActivate: () => VToast.show(t('notAvailable'), { icon: 'desktop' }) },
      { label: t('shutDown'), icon: 'power', onActivate: () => app.restart() },
      { label: t('cancel'), variant: 'ghost' },
    ],
  }).open();
}
