// Error popups and other alerts, built on VDialog.
//
//   await VAlert.error({ title, message, code, actions: [{ id: 'retry', label: 'Try again' }] })
//   await VAlert.warning({ ... })   await VAlert.info({ ... })   await VAlert.success({ ... })
//
// Each resolves with the id of the chosen action ('ok' for the default button, null if closed
// with B). Errors shake once and play the error sound; the first action is focused.

import { VDialog } from './VDialog.js';
import { t } from '../core/i18n.js';

const ICONS = { error: 'error', warning: 'warning', info: 'info', success: 'check_circle' };

function show(tone, { title, message = '', code = '', actions } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (id) => {
      if (done) return;
      done = true;
      resolve(id);
    };
    const list = (actions?.length ? actions : [{ id: 'ok', label: t('ok') }]).map((a, i) => ({
      label: a.label,
      variant: a.variant || (i === 0 ? 'primary' : 'secondary'),
      onActivate: () => finish(a.id ?? a.label),
    }));
    const dlg = new VDialog({ title, body: message, code, actions: list, icon: ICONS[tone], tone });
    dlg.on('close', () => setTimeout(() => finish(null), 0));
    dlg.open({ initialIndex: 0 });
  });
}

export const VAlert = {
  error: (o) => show('error', o),
  warning: (o) => show('warning', o),
  info: (o) => show('info', o),
  success: (o) => show('success', o),
};
