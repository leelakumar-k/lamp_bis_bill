import type { OrderWithTable } from '@/db/pos-types';
import type { I18n } from '@/i18n';

type Labelled = Pick<OrderWithTable, 'type' | 'table_name' | 'party' | 'token'>;

export function orderLabel(order: Labelled, t: I18n['t']) {
  if (order.type === 'takeaway') return t('pos.token', { token: order.token ?? '–' });
  return t('pos.tableParty', { name: order.table_name ?? '?', party: order.party ?? 'A' });
}
