'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileImage, MessageCircle } from 'lucide-react';
import { getOrderMonth, useOrders } from '@/context/OrderContext';
import { Order, PaymentStatus } from '@/types/order';
import PageHeader from '@/components/shared/PageHeader';
import PeriodPicker from '@/components/shared/PeriodPicker';
import KpiStrip, { KpiStripItem } from '@/components/shared/KpiStrip';
import Toolbar from '@/components/shared/Toolbar';
import DataTable, { DataTableColumn } from '@/components/shared/DataTable';
import StatusChip from '@/components/shared/StatusChip';
import ExportMenuButton from '@/components/shared/ExportMenuButton';
import {
  EmptyState,
  ErrorState,
  SkeletonKpiStrip,
  SkeletonTable,
} from '@/components/shared/StateViews';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PAYMENT_STATUS_OPTIONS,
  getPaymentSettlementSummary,
  isOrderUnpaid,
  paymentStatusMeta,
} from '@/lib/status';
import {
  buildWhatsAppUrl,
  cn,
  formatDateShort,
  formatMonthLabel,
  formatNumberId,
  formatPercent,
  formatRp,
  formatUnitQty,
} from '@/lib/utils';
import {
  downloadCSVFile,
  downloadExcelFile,
  exportOrdersToCSV,
  exportOrdersToExcel,
  exportOrdersToPDF,
} from '@/lib/csvExport';

export default function HistoryPage() {
  const {
    orders,
    loading,
    fetchError,
    refreshOrders,
    setActiveDrawerOrder,
    updatePaymentStatus,
    selectedMonth,
    setSelectedMonth,
    availableMonths = [],
  } = useOrders();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [onlyUnpaid, setOnlyUnpaid] = useState<boolean>(false);
  // Allow viewing "ALL" months in History without clobbering shared Dashboard month selection.
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  const effectivePeriod = showAllMonths ? 'ALL' : selectedMonth;

  const completedOrders = useMemo(
    () => orders.filter((o) => o.processStatus === 'SELESAI'),
    [orders]
  );

  const displayMonths = useMemo(() => {
    const set = new Set<string>();
    if (selectedMonth && selectedMonth !== 'ALL') set.add(selectedMonth);
    availableMonths.forEach((m) => {
      if (m && m !== 'ALL') set.add(m);
    });
    completedOrders.forEach((o) => {
      const m = getOrderMonth(o);
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [availableMonths, completedOrders, selectedMonth]);

  const handlePeriodChange = (nextMonth: string) => {
    if (nextMonth === 'ALL') {
      setShowAllMonths(true);
    } else {
      setShowAllMonths(false);
      setSelectedMonth(nextMonth);
    }
  };

  // Period-scoped completed orders drive header counts and KPI metrics consistently.
  const periodCompletedOrders = useMemo(() => {
    if (!effectivePeriod || effectivePeriod === 'ALL') return completedOrders;
    return completedOrders.filter((o) => getOrderMonth(o) === effectivePeriod);
  }, [completedOrders, effectivePeriod]);

  const unpaidInPeriodCount = useMemo(
    () => periodCompletedOrders.filter((o) => isOrderUnpaid(o)).length,
    [periodCompletedOrders]
  );

  const filteredHistory = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return periodCompletedOrders.filter((order) => {
      if (onlyUnpaid && !isOrderUnpaid(order)) return false;

      if (q) {
        const match = `${order.orderNumber} ${order.buyerName} ${order.buyerPhone} ${order.productName} ${order.specs}`
          .toLowerCase()
          .includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [periodCompletedOrders, onlyUnpaid, searchTerm]);

  const totals = useMemo(() => {
    const pcs = periodCompletedOrders.reduce((sum, o) => sum + o.qty, 0);
    const omzet = periodCompletedOrders.reduce((sum, o) => sum + o.omzet, 0);
    const profit = periodCompletedOrders.reduce((sum, o) => sum + o.profit, 0);
    const hpp = periodCompletedOrders.reduce((sum, o) => sum + o.hppBreakdown.totalHpp, 0);
    const blendedMarginPct =
      omzet > 0 ? Math.round(((profit / omzet) * 100) * 10) / 10 : 0;
    const settlement = getPaymentSettlementSummary(periodCompletedOrders);

    return { pcs, omzet, profit, hpp, blendedMarginPct, settlement };
  }, [periodCompletedOrders]);

  const kpiItems: KpiStripItem[] = useMemo(() => {
    const { pcs, omzet, profit, hpp, blendedMarginPct, settlement } = totals;
    return [
      {
        id: 'history-completed-count',
        label: 'Pesanan selesai',
        value: formatNumberId(periodCompletedOrders.length),
        supportingText: `${formatUnitQty(pcs, 'pcs')} terkirim`,
      },
      {
        id: 'history-omzet',
        label: 'Omzet selesai',
        value: formatRp(omzet),
        supportingText: `Total HPP ${formatRp(hpp)}`,
      },
      {
        id: 'history-profit',
        label: 'Laba terealisasi',
        value: formatRp(profit),
        supportingText: `Margin gabungan ${formatPercent(blendedMarginPct)}`,
      },
      {
        id: 'history-settlement',
        label: 'Pelunasan',
        primary: settlement.unpaidOrdersCount > 0,
        tone: settlement.unpaidOrdersCount > 0 ? 'amber' : 'default',
        value: `Terbayar ${formatPercent(settlement.collectedPct, 0)}`,
        supportingText:
          settlement.unpaidOrdersCount > 0
            ? `Piutang ${formatRp(settlement.receivableAmount)} (${settlement.unpaidOrdersCount} pesanan)`
            : 'Semua pesanan periode ini lunas',
      },
    ];
  }, [totals, periodCompletedOrders.length]);

  const handlePaymentChange = async (order: Order, nextStatus: PaymentStatus) => {
    const prevStatus = order.paymentStatus;
    if (prevStatus === nextStatus) return;

    try {
      await updatePaymentStatus(order.id, nextStatus);
      const nextLabel = paymentStatusMeta(nextStatus).label;
      showToast({
        message: `Pembayaran ${order.orderNumber} diubah menjadi ${nextLabel}`,
        tone: 'success',
        onUndo: async () => {
          await updatePaymentStatus(order.id, prevStatus);
        },
      });
    } catch {
      showToast({
        message: `Gagal memperbarui status pembayaran ${order.orderNumber}`,
        tone: 'error',
      });
    }
  };

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'customer',
      header: 'Pemesan',
      colWidth: 'auto',
      cellClassName: 'min-w-0',
      renderCell: (order) => {
        const waUrl = buildWhatsAppUrl(order.buyerPhone);
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="font-bold text-[13.5px] text-[var(--text)] truncate"
              title={order.buyerName}
            >
              {order.buyerName}
            </span>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={order.buyerPhone}
                aria-label={`Hubungi ${order.buyerName} via WhatsApp`}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--status-green-bg)] text-[var(--status-green-ink)] border border-[var(--status-green-border)] hover:brightness-95 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'order',
      header: 'ID Pesanan',
      colWidth: '112px',
      cellClassName: 'min-w-0',
      renderCell: (order) => (
        <div>
          <div className="font-semibold text-[13px] text-[#334155] tabular-nums">
            #{order.orderNumber}
          </div>
          <div className="text-[11.5px] text-[var(--text-muted)] tabular-nums mt-0.5">
            {formatDateShort(order.orderDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Item & Spesifikasi',
      colWidth: 'auto',
      cellClassName: 'min-w-0',
      renderCell: (order) => {
        const combined = order.specs ? `${order.productName} · ${order.specs}` : order.productName;
        return (
          <div className="min-w-0 leading-tight" title={combined}>
            <div className="font-semibold text-[13px] text-[var(--text)] truncate">
              {order.productName}
            </div>
            <div className="text-[11.5px] text-[var(--text-muted)] truncate mt-0.5">
              {order.specs || 'Standar produksi'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'qty',
      header: 'Jumlah',
      colWidth: '88px',
      renderCell: (order) => (
        <span className="inline-flex items-center rounded-lg bg-[#f1f5f9] border border-[var(--border)] px-2.5 py-1 font-semibold text-[12.5px] text-[#334155] whitespace-nowrap tabular-nums">
          {formatUnitQty(order.qty, 'pcs')}
        </span>
      ),
    },
    {
      key: 'omzet',
      header: 'Omzet',
      colWidth: '120px',
      align: 'right',
      renderCell: (order) => (
        <span className="font-bold text-[13.5px] text-[var(--text)] whitespace-nowrap tabular-nums">
          {formatRp(order.omzet)}
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Laba',
      colWidth: '120px',
      align: 'right',
      renderCell: (order) => (
        <div className="leading-tight">
          <div className="font-bold text-[13px] text-[var(--text)] whitespace-nowrap tabular-nums">
            {formatRp(order.profit)}
          </div>
          <div className="text-[11px] font-semibold text-[var(--status-green-ink)] tabular-nums mt-0.5">
            {formatPercent(order.marginPct)}
          </div>
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Pembayaran',
      cellClassName: 'whitespace-nowrap',
      renderCell: (order) => {
        const meta = paymentStatusMeta(order.paymentStatus);
        const unpaid = isOrderUnpaid(order);
        const tagihUrl = unpaid
          ? buildWhatsAppUrl(
              order.buyerPhone,
              `Halo ${order.buyerName}, berikut pengingat pembayaran pesanan ${order.orderNumber} (${order.productName}) sebesar ${formatRp(order.remainingPayment > 0 ? order.remainingPayment : order.omzet)}. Terima kasih.`
            )
          : null;

        return (
          <div className="inline-flex items-center gap-1.5">
            <StatusChip
              meta={meta}
              options={PAYMENT_STATUS_OPTIONS}
              listboxLabel={`Ubah pembayaran ${order.orderNumber}`}
              ariaLabel={`Status pembayaran ${order.orderNumber}: ${meta.label}`}
              onSelect={(val) => void handlePaymentChange(order, val as PaymentStatus)}
            />
            {unpaid && tagihUrl && (
              <a
                href={tagihUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Tagih pembayaran ${order.orderNumber} kepada ${order.buyerName} via WhatsApp`}
                title="Buka draf pesan tagihan WhatsApp"
                className="inline-flex min-h-[26px] items-center rounded-md border border-[var(--status-amber-border)] bg-[var(--status-amber-bg)] px-2 text-[12px] font-medium text-[var(--status-amber-ink)] hover:underline whitespace-nowrap"
              >
                Tagih
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'files',
      header: 'Berkas',
      align: 'center',
      renderCell: (order) => {
        const count = order.designFiles?.length || 0;
        if (count === 0) {
          return <span className="text-[12px] text-[var(--text-muted)]">—</span>;
        }
        return (
          <button
            type="button"
            onClick={() => setActiveDrawerOrder(order)}
            aria-label={`Buka berkas desain ${order.orderNumber} (${count} berkas)`}
            title={`Lihat ${count} berkas desain`}
            className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] tabular-nums cursor-pointer"
          >
            <FileImage className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
            <span>{count}</span>
          </button>
        );
      },
    },
  ];

  const headerSummary = loading
    ? 'Memuat arsip pesanan selesai...'
    : `${periodCompletedOrders.length} pesanan selesai · ${unpaidInPeriodCount} belum lunas`;

  return (
    <div>
      <PageHeader
        title="Riwayat & Arsip"
        summary={headerSummary}
        actions={
          <>
            <PeriodPicker
              id="history-month-select"
              label="Periode"
              value={effectivePeriod}
              onChange={handlePeriodChange}
              months={displayMonths}
              includeAllOption
              allLabel="Semua bulan"
            />
            <ExportMenuButton
              label="Unduh laporan"
              ariaLabel="Unduh CSV, Excel, atau PDF Riwayat Pesanan"
              onExportExcel={() => {
                const excelContent = exportOrdersToExcel(
                  filteredHistory,
                  `Arsip Selesai (${formatMonthLabel(effectivePeriod)})`
                );
                downloadExcelFile(
                  `eganci-riwayat-owner-${effectivePeriod || 'all'}.xls`,
                  excelContent
                );
              }}
              onExportPDF={() => {
                exportOrdersToPDF(
                  filteredHistory,
                  'Laporan Arsip Pesanan Selesai Owner',
                  `Periode: ${formatMonthLabel(effectivePeriod)}`
                );
              }}
              onExportCSV={() => {
                const csvContent = exportOrdersToCSV(filteredHistory);
                downloadCSVFile(
                  `eganci-history-orders-ml-${effectivePeriod || 'all'}.csv`,
                  csvContent
                );
              }}
            />
          </>
        }
      />

      {loading ? (
        <>
          <SkeletonKpiStrip count={4} />
          <SkeletonTable rows={6} />
        </>
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={() => void refreshOrders()} />
      ) : (
        <>
          <KpiStrip items={kpiItems} />

          <Toolbar
            filterChips={
              <button
                type="button"
                aria-pressed={onlyUnpaid}
                onClick={() => setOnlyUnpaid((prev) => !prev)}
                className={cn(
                  'inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors cursor-pointer',
                  onlyUnpaid
                    ? 'border-[var(--status-amber-border)] bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)]'
                    : 'border-[var(--control-border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]'
                )}
              >
                <span>Belum lunas</span>
                <span
                  className={cn(
                    'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[12px] tabular-nums',
                    onlyUnpaid
                      ? 'bg-white/80 text-[var(--status-amber-ink)] font-semibold'
                      : unpaidInPeriodCount > 0
                        ? 'bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)] font-semibold'
                        : 'bg-[var(--surface-muted)] text-[var(--text-muted)]'
                  )}
                >
                  {unpaidInPeriodCount}
                </span>
              </button>
            }
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchLabel="Cari arsip pesanan"
            searchPlaceholder="Cari ID, pelanggan, atau produk..."
          />

          {completedOrders.length === 0 ? (
            <EmptyState
              variant="empty-data"
              title="Belum ada pesanan selesai"
              description="Pesanan yang sudah ditandai selesai di antrean produksi akan tercatat otomatis di sini."
            />
          ) : periodCompletedOrders.length === 0 ? (
            <EmptyState
              variant="empty-period"
              periodLabel={formatMonthLabel(effectivePeriod)}
            />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              variant="empty-filter"
              onResetFilter={() => {
                setSearchTerm('');
                setOnlyUnpaid(false);
              }}
            />
          ) : (
            <DataTable
              caption="Daftar pesanan selesai dan status pelunasannya"
              rows={filteredHistory}
              getRowId={(order) => order.id}
              columns={columns}
              getRowClassName={(order) =>
                isOrderUnpaid(order) ? 'bg-[var(--status-amber-bg)]/25' : ''
              }
              renderMobileCard={(order) => {
                const payMeta = paymentStatusMeta(order.paymentStatus);
                const unpaid = isOrderUnpaid(order);
                const fileCount = order.designFiles?.length || 0;
                const waUrl = buildWhatsAppUrl(order.buyerPhone);
                const tagihUrl = unpaid
                  ? buildWhatsAppUrl(
                      order.buyerPhone,
                      `Halo ${order.buyerName}, berikut pengingat pembayaran pesanan ${order.orderNumber} (${order.productName}) sebesar ${formatRp(order.remainingPayment > 0 ? order.remainingPayment : order.omzet)}. Terima kasih.`
                    )
                  : null;

                return (
                  <article
                    className={cn(
                      'rounded-lg border px-3 py-2.5 bg-[var(--surface)] space-y-1',
                      unpaid ? 'border-[var(--status-amber-border)]' : 'border-[var(--border)]'
                    )}
                  >
                    {/* Line 1 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate text-[13px]">
                        <span className="font-semibold text-[var(--text)] tabular-nums">
                          {order.orderNumber}
                        </span>
                        <span className="text-[var(--text-muted)]"> · </span>
                        <span className="font-medium text-[var(--text)]">{order.buyerName}</span>
                      </div>
                      <StatusChip
                        meta={payMeta}
                        options={PAYMENT_STATUS_OPTIONS}
                        ariaLabel={`Status pembayaran ${order.orderNumber}: ${payMeta.label}`}
                        onSelect={(val) => void handlePaymentChange(order, val as PaymentStatus)}
                      />
                    </div>

                    {/* Line 2 */}
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-[var(--text-muted)] truncate">
                        {order.productName} · {formatUnitQty(order.qty, 'pcs')}
                      </span>
                      <span className="font-semibold text-[var(--text)] tabular-nums shrink-0">
                        {formatRp(order.omzet)}
                      </span>
                    </div>

                    {/* Line 3 */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 text-[12px] text-[var(--text-muted)]">
                      <span className="tabular-nums truncate">
                        {formatDateShort(order.orderDate)} · Laba {formatRp(order.profit)} (
                        {formatPercent(order.marginPct)})
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {unpaid && tagihUrl ? (
                          <a
                            href={tagihUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Tagih pembayaran ${order.orderNumber} via WhatsApp`}
                            className="touch-target-44 inline-flex min-h-[26px] items-center rounded border border-[var(--status-amber-border)] bg-[var(--status-amber-bg)] px-2 text-[12px] font-medium text-[var(--status-amber-ink)]"
                          >
                            Tagih
                          </a>
                        ) : waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Hubungi ${order.buyerName} via WhatsApp`}
                            className="touch-target-44 inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          </a>
                        ) : null}

                        {fileCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveDrawerOrder(order)}
                            aria-label={`Buka berkas desain ${order.orderNumber} (${fileCount} berkas)`}
                            className="touch-target-44 inline-flex h-7 items-center gap-1 rounded border border-[var(--border)] px-2 text-[12px] font-medium text-[var(--text)] tabular-nums cursor-pointer"
                          >
                            <FileImage className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{fileCount}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }}
            />
          )}

          {completedOrders.length === 0 && !loading && (
            <div className="mt-3 text-center">
              <Link
                href="/order"
                className="text-[13px] font-medium text-[var(--accent-ink)] hover:underline"
              >
                Buka Antrean Pesanan
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
