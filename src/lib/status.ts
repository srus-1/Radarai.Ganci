import { Order, PaymentStatus, ProcessStatus } from '@/types/order';
import { formatPercent, formatRp } from './utils';

export type StatusTone = 'green' | 'amber' | 'blue' | 'red' | 'neutral';

export type StatusStyleMode = 'quiet-normal' | 'all-filled';

/**
 * Single-source Chip Policy (Section 3.5):
 * - "quiet-normal" (Default): Normal settled states (Lunas, Selesai) = dark green text + check icon, NO fill, NO border.
 *   Active/Exception states = tinted fill (Belum lunas/DP = amber, Diproses = blue, Terlambat = red, Antre = neutral gray tint).
 * - "all-filled": Tinted fill on all pills while preserving semantic colors.
 */
export const STATUS_STYLE: StatusStyleMode = 'all-filled';

export function isQuietNormalStatus(value: string | undefined | null): boolean {
  return value === 'LUNAS' || value === 'SELESAI';
}

export type StatusIconName =
  | 'check'
  | 'clock'
  | 'alert'
  | 'palette'
  | 'printer'
  | 'sparkles'
  | 'package'
  | 'help';

export interface StatusMeta {
  value: string;
  label: string;
  tone: StatusTone;
  iconName: StatusIconName;
}

export interface ProductionStatusMeta extends StatusMeta {
  step: number;
  totalSteps: number;
}

/**
 * Canonical "Pesanan Aktif" / actionable order rule:
 * An order stays actionable when production is incomplete (`processStatus !== 'SELESAI'`)
 * OR payment is still pending (`paymentStatus !== 'LUNAS'`).
 * Production-in-progress strictly tracks `processStatus !== 'SELESAI'`.
 */
export function isOrderInProgress(order: Pick<Order, 'processStatus'>): boolean {
  return order.processStatus !== 'SELESAI';
}

export function isOrderUnpaid(order: Pick<Order, 'paymentStatus'>): boolean {
  return order.paymentStatus !== 'LUNAS';
}

export function isOrderActionable(order: Pick<Order, 'processStatus' | 'paymentStatus'>): boolean {
  return isOrderInProgress(order) || isOrderUnpaid(order);
}

export function needsBillingAttention(order: Pick<Order, 'processStatus' | 'paymentStatus'>): boolean {
  return order.processStatus === 'SELESAI' && order.paymentStatus !== 'LUNAS';
}

const PAYMENT_STATUS_MAP: Record<PaymentStatus, StatusMeta> = {
  LUNAS: {
    value: 'LUNAS',
    label: 'Lunas',
    tone: 'green',
    iconName: 'check',
  },
  BELUM_LUNAS: {
    value: 'BELUM_LUNAS',
    label: 'Belum lunas',
    tone: 'amber',
    iconName: 'alert',
  },
  DP: {
    value: 'DP',
    label: 'DP',
    tone: 'amber',
    iconName: 'clock',
  },
};

export const PAYMENT_STATUS_OPTIONS: StatusMeta[] = [
  PAYMENT_STATUS_MAP.BELUM_LUNAS,
  PAYMENT_STATUS_MAP.DP,
  PAYMENT_STATUS_MAP.LUNAS,
];

/**
 * Maps database PaymentStatus enums to user-facing Indonesian copy, tone, and icon.
 * Emits a warning and returns a safe neutral fallback for unexpected values so raw enums never leak to UI.
 */
export function paymentStatusMeta(status: string | undefined | null): StatusMeta {
  if (status && status in PAYMENT_STATUS_MAP) {
    return PAYMENT_STATUS_MAP[status as PaymentStatus];
  }
  console.warn(`[status] Unknown payment status encountered: "${String(status)}"`);
  return {
    value: status || 'UNKNOWN',
    label: 'Perlu cek status',
    tone: 'neutral',
    iconName: 'help',
  };
}

const PRODUCTION_STATUS_MAP: Record<ProcessStatus, ProductionStatusMeta> = {
  ANTREAN: {
    value: 'ANTREAN',
    label: 'Antrean',
    tone: 'neutral',
    iconName: 'clock',
    step: 1,
    totalSteps: 6,
  },
  SETTING_DESAIN: {
    value: 'SETTING_DESAIN',
    label: 'Setting desain',
    tone: 'blue',
    iconName: 'palette',
    step: 2,
    totalSteps: 6,
  },
  PROSES_CETAK: {
    value: 'PROSES_CETAK',
    label: 'Proses cetak',
    tone: 'blue',
    iconName: 'printer',
    step: 3,
    totalSteps: 6,
  },
  FINISHING: {
    value: 'FINISHING',
    label: 'Finishing',
    tone: 'blue',
    iconName: 'sparkles',
    step: 4,
    totalSteps: 6,
  },
  SIAP_KIRIM: {
    value: 'SIAP_KIRIM',
    label: 'Siap kirim',
    tone: 'amber',
    iconName: 'package',
    step: 5,
    totalSteps: 6,
  },
  SELESAI: {
    value: 'SELESAI',
    label: 'Selesai',
    tone: 'green',
    iconName: 'check',
    step: 6,
    totalSteps: 6,
  },
};

export const PRODUCTION_STATUS_OPTIONS: ProductionStatusMeta[] = [
  PRODUCTION_STATUS_MAP.ANTREAN,
  PRODUCTION_STATUS_MAP.SETTING_DESAIN,
  PRODUCTION_STATUS_MAP.PROSES_CETAK,
  PRODUCTION_STATUS_MAP.FINISHING,
  PRODUCTION_STATUS_MAP.SIAP_KIRIM,
  PRODUCTION_STATUS_MAP.SELESAI,
];

export function productionStatusMeta(status: string | undefined | null): ProductionStatusMeta {
  if (status && status in PRODUCTION_STATUS_MAP) {
    return PRODUCTION_STATUS_MAP[status as ProcessStatus];
  }
  console.warn(`[status] Unknown production status encountered: "${String(status)}"`);
  return {
    value: status || 'UNKNOWN',
    label: 'Tahap tidak dikenal',
    tone: 'neutral',
    iconName: 'help',
    step: 0,
    totalSteps: 6,
  };
}

export const processStatusMeta = productionStatusMeta;

export interface PaymentSettlementSummary {
  totalOmzet: number;
  collectedAmount: number;
  receivableAmount: number;
  collectedPct: number;
  unpaidOrdersCount: number;
  headline: string;
  subline: string;
}

/**
 * Computes settlement metrics from actual order rows instead of hardcoded copy.
 */
export function getPaymentSettlementSummary(orders: Order[]): PaymentSettlementSummary {
  let totalOmzet = 0;
  let receivableAmount = 0;
  let unpaidOrdersCount = 0;

  for (const order of orders) {
    const omzet = order.omzet || 0;
    totalOmzet += omzet;

    const remaining =
      order.paymentStatus === 'LUNAS'
        ? 0
        : order.remainingPayment > 0
          ? order.remainingPayment
          : Math.max(0, omzet - (order.dpAmount || 0));

    if (order.paymentStatus !== 'LUNAS' || remaining > 0) {
      unpaidOrdersCount += 1;
      receivableAmount += remaining;
    }
  }

  const collectedAmount = Math.max(0, totalOmzet - receivableAmount);
  const collectedPct =
    totalOmzet > 0
      ? Math.round((collectedAmount / totalOmzet) * 100)
      : orders.length > 0
        ? 100
        : 0;

  if (orders.length === 0) {
    return {
      totalOmzet: 0,
      collectedAmount: 0,
      receivableAmount: 0,
      collectedPct: 0,
      unpaidOrdersCount: 0,
      headline: 'Terbayar 0%',
      subline: 'Belum ada pesanan pada periode ini',
    };
  }

  const pctText = formatPercent(collectedPct, 0, { trimTrailingZero: true });
  if (unpaidOrdersCount === 0 && receivableAmount === 0) {
    return {
      totalOmzet,
      collectedAmount,
      receivableAmount: 0,
      collectedPct: 100,
      unpaidOrdersCount: 0,
      headline: `Terbayar ${pctText}`,
      subline: `Semua lunas (${formatRp(collectedAmount)})`,
    };
  }

  return {
    totalOmzet,
    collectedAmount,
    receivableAmount,
    collectedPct,
    unpaidOrdersCount,
    headline: `Terbayar ${pctText}`,
    subline: `Piutang ${formatRp(receivableAmount)} (${unpaidOrdersCount} pesanan)`,
  };
}
