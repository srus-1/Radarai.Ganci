import { Order } from '@/types/order';
import { parseLocalDate } from './utils';

export type OrderSortField = 'pesanan' | 'customer' | 'qty' | 'orderDate' | 'omzet';

export type OrderDatePreset = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | null;

export const ORDER_DATE_PRESET_LABELS: Record<Exclude<OrderDatePreset, null>, string> = {
  TODAY: 'Hari ini',
  YESTERDAY: 'Kemarin',
  LAST_7_DAYS: '7 hari terakhir',
  THIS_MONTH: 'Bulan ini',
};

/**
 * Checks whether an order's entry date (orderDate) falls within a quick preset relative to referenceDate.
 */
export function matchesOrderDatePreset(
  order: Pick<Order, 'orderDate'>,
  preset: OrderDatePreset,
  referenceDate: Date = new Date()
): boolean {
  if (!preset) return true;
  const target = parseLocalDate(order.orderDate);
  if (!target) return false;

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const entryDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((entryDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (preset === 'TODAY') {
    return diffDays === 0;
  }
  if (preset === 'YESTERDAY') {
    return diffDays === -1;
  }
  if (preset === 'LAST_7_DAYS') {
    return diffDays >= -6 && diffDays <= 0;
  }
  if (preset === 'THIS_MONTH') {
    return (
      target.getFullYear() === today.getFullYear() &&
      target.getMonth() === today.getMonth()
    );
  }
  return true;
}

/**
 * Sorts production orders either by an explicit column, manual queue order, or default priority
 * (completed unpaid first, active orders newest entry first, settled orders at the bottom).
 */
export function sortOrders(
  list: Order[],
  sortField: OrderSortField | null,
  sortDirection: 'asc' | 'desc',
  useQueueOrder: boolean
): Order[] {
  return [...list].sort((a, b) => {
    if (sortField === 'customer') {
      const cmp = (a.buyerName || '').localeCompare(b.buyerName || '', 'id-ID');
      if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp;
      return (a.orderNumber || '').localeCompare(b.orderNumber || '', 'id-ID', { numeric: true });
    }

    if (sortField === 'pesanan') {
      const cmp = (a.orderNumber || '').localeCompare(b.orderNumber || '', 'id-ID', {
        numeric: true,
      });
      return sortDirection === 'asc' ? cmp : -cmp;
    }

    if (sortField === 'qty') {
      const cmp = (a.qty || 0) - (b.qty || 0);
      if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp;
      return (a.orderNumber || '').localeCompare(b.orderNumber || '', 'id-ID', { numeric: true });
    }

    if (sortField === 'orderDate') {
      const dateA = a.orderDate || '';
      const dateB = b.orderDate || '';
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp;
      const createdCmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      if (createdCmp !== 0) return sortDirection === 'asc' ? createdCmp : -createdCmp;
      return (a.orderNumber || '').localeCompare(b.orderNumber || '', 'id-ID', { numeric: true });
    }

    if (sortField === 'omzet') {
      const cmp = (a.omzet || 0) - (b.omzet || 0);
      if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp;
      return (a.orderNumber || '').localeCompare(b.orderNumber || '');
    }

    if (useQueueOrder) {
      return (a.queueOrder || 0) - (b.queueOrder || 0);
    }

    // Default priority sort: completed unpaid -> active newest entry first -> settled at bottom
    const aDoneUnpaid = a.processStatus === 'SELESAI' && a.paymentStatus !== 'LUNAS';
    const bDoneUnpaid = b.processStatus === 'SELESAI' && b.paymentStatus !== 'LUNAS';
    if (aDoneUnpaid !== bDoneUnpaid) {
      return aDoneUnpaid ? -1 : 1;
    }

    const aDonePaid = a.processStatus === 'SELESAI' && a.paymentStatus === 'LUNAS';
    const bDonePaid = b.processStatus === 'SELESAI' && b.paymentStatus === 'LUNAS';
    if (aDonePaid !== bDonePaid) {
      return aDonePaid ? 1 : -1;
    }

    const ordDateA = a.orderDate || '';
    const ordDateB = b.orderDate || '';
    if (ordDateA !== ordDateB) return ordDateB.localeCompare(ordDateA);

    const createdA = a.createdAt || '';
    const createdB = b.createdAt || '';
    if (createdA !== createdB) return createdB.localeCompare(createdA);

    return (a.queueOrder || 0) - (b.queueOrder || 0);
  });
}
