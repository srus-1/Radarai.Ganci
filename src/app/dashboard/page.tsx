'use client';

import React, { useMemo } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { getOrderMonth, useOrders } from '@/context/OrderContext';
import { orderService } from '@/lib/supabase';
import PageHeader from '@/components/shared/PageHeader';
import PeriodPicker from '@/components/shared/PeriodPicker';
import KpiStrip, { KpiStripItem } from '@/components/shared/KpiStrip';
import MonthlyProfitChart from '@/components/dashboard/MonthlyProfitChart';
import BuyerProfitTable from '@/components/dashboard/BuyerProfitTable';
import {
  EmptyState,
  ErrorState,
  SkeletonChart,
  SkeletonKpiStrip,
} from '@/components/shared/StateViews';
import { getPaymentSettlementSummary } from '@/lib/status';
import { formatMonthLabel, formatPercent, formatRp, formatUnitQty } from '@/lib/utils';

export default function DashboardPage() {
  const {
    orders,
    loading,
    fetchError,
    refreshOrders,
    metrics,
    monthlyProfit,
    buyerSummaries,
    selectedMonth,
    setSelectedMonth,
    availableMonths = [],
    selectedOrderIds = [],
    clearSelectedOrders,
  } = useOrders();

  const displayMonths = useMemo(() => {
    const base = availableMonths.filter((m) => m && m !== 'ALL');
    if (selectedMonth && selectedMonth !== 'ALL' && !base.includes(selectedMonth)) {
      return [selectedMonth, ...base];
    }
    return base;
  }, [availableMonths, selectedMonth]);

  const scopedOrders = useMemo(() => {
    if (selectedOrderIds.length > 0) {
      const selectedSet = new Set(selectedOrderIds);
      return orders.filter((o) => selectedSet.has(o.id));
    }
    return orders.filter((o) => getOrderMonth(o) === selectedMonth);
  }, [orders, selectedOrderIds, selectedMonth]);

  const settlement = useMemo(
    () => getPaymentSettlementSummary(scopedOrders),
    [scopedOrders]
  );

  const kpiItems: KpiStripItem[] = useMemo(() => {
    const hasReceivable = settlement.receivableAmount > 0 || settlement.unpaidOrdersCount > 0;
    return [
      {
        id: 'dashboard-receivables',
        label: 'Piutang',
        primary: true,
        tone: hasReceivable ? 'amber' : 'default',
        value: formatRp(settlement.receivableAmount),
        supportingText:
          settlement.unpaidOrdersCount > 0
            ? `${settlement.unpaidOrdersCount} pesanan belum lunas`
            : 'Semua pesanan periode ini lunas',
        action:
          settlement.unpaidOrdersCount > 0
            ? { label: 'Lihat pesanan', href: '/order?payment=BELUM_LUNAS' }
            : undefined,
      },
      {
        id: 'dashboard-omzet',
        label: 'Omzet',
        value: formatRp(metrics.totalOmzet),
        supportingText: `Terkumpul ${formatRp(settlement.collectedAmount)} (${formatPercent(settlement.collectedPct, 0, { trimTrailingZero: true })})`,
      },
      {
        id: 'dashboard-profit',
        label: 'Laba bersih',
        value: formatRp(metrics.totalProfit),
        supportingText: `Margin gabungan ${formatPercent(metrics.averageMarginPct)}`,
      },
      {
        id: 'dashboard-production',
        label: 'Produksi',
        value: formatUnitQty(metrics.totalPcs, 'pcs'),
        supportingText: `${metrics.completedOrdersCount} pesanan selesai`,
      },
    ];
  }, [settlement, metrics]);

  const headerSummary = loading
    ? 'Memuat rekapan keuangan workshop...'
    : selectedOrderIds.length > 0
      ? `Rekapan khusus ${scopedOrders.length} pesanan terpilih`
      : `${scopedOrders.length} pesanan pada ${formatMonthLabel(selectedMonth)} · Terbayar ${formatPercent(settlement.collectedPct, 0, { trimTrailingZero: true })}`;

  return (
    <div>
      <PageHeader
        title="Rekapan & Omzet"
        summary={headerSummary}
        actions={
          <PeriodPicker
            id="dashboard-month-select"
            label="Periode"
            value={selectedMonth}
            onChange={setSelectedMonth}
            months={displayMonths}
          />
        }
      />

      {loading ? (
        <>
          <SkeletonKpiStrip count={4} />
          <SkeletonChart />
        </>
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={() => void refreshOrders()} />
      ) : (
        <>
          {selectedOrderIds.length > 0 && (
            <div
              role="region"
              aria-label="Filter pilihan pesanan aktif"
              className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-tint)] px-3.5 py-2.5 text-[13px] text-[var(--accent-ink)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  Menampilkan rekapan untuk{' '}
                  <strong className="font-semibold">{scopedOrders.length} pesanan terpilih.</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={clearSelectedOrders}
                className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-md border border-[var(--accent)]/40 bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--accent-ink)] hover:bg-[var(--surface-muted)] cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Kembali ke {formatMonthLabel(selectedMonth)}</span>
              </button>
            </div>
          )}

          {scopedOrders.length === 0 ? (
            <EmptyState
              variant={orders.length === 0 ? 'empty-data' : 'empty-period'}
              periodLabel={formatMonthLabel(selectedMonth)}
              title={orders.length === 0 ? 'Belum ada data pesanan' : undefined}
              description={
                orders.length === 0
                  ? 'Tambahkan pesanan pertama di Antrean Pesanan untuk mulai melihat rekapan laba.'
                  : undefined
              }
            />
          ) : (
            <>
              <KpiStrip items={kpiItems} />
              <MonthlyProfitChart
                data={
                  selectedOrderIds.length > 0
                    ? orderService.getMonthlyProfitData(scopedOrders)
                    : monthlyProfit
                }
                orders={scopedOrders}
                selectedMonth={selectedOrderIds.length > 0 ? undefined : selectedMonth}
              />
              <BuyerProfitTable buyers={buyerSummaries} />
            </>
          )}
        </>
      )}
    </div>
  );
}
