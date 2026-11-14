'use client';

import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  ChevronDown,
  ChevronRight,
  FileImage,
  MessageCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Order, PaymentStatus, ProcessStatus } from '@/types/order';
import DataTable, { DataTableColumn } from '@/components/shared/DataTable';
import StatusChip from '@/components/shared/StatusChip';
import RowMenu, { RowMenuItem } from '@/components/shared/RowMenu';
import {
  PAYMENT_STATUS_OPTIONS,
  PRODUCTION_STATUS_OPTIONS,
  needsBillingAttention,
  paymentStatusMeta,
  productionStatusMeta,
} from '@/lib/status';
import {
  buildWhatsAppUrl,
  cn,
  formatDateShort,
  formatPercent,
  formatRp,
  formatUnitQty,
} from '@/lib/utils';
import { OrderSortField } from '@/lib/orderFilters';

export type { OrderSortField };

const AVATAR_PALETTES = [
  'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]',
  'bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]',
  'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]',
  'bg-[#ffedd5] text-[#c2410c] border-[#fed7aa]',
  'bg-[#f3e8ff] text-[#6d28d9] border-[#e9d5ff]',
  'bg-[#e0e7ff] text-[#3730a3] border-[#c7d2fe]',
];

function getCustomerAvatarClasses(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getCustomerInitials(name: string): string {
  const parts = (name || 'P').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'P').toUpperCase();
}

export interface OrdersDataViewProps {
  caption: string;
  orders: Order[];
  settledOrders?: Order[];
  showSettledGroup?: boolean;
  onToggleSettledGroup?: () => void;
  allQueueOrders: Order[];
  selectedOrderIds: string[];
  expandedOrderIds: string[];
  sortField?: OrderSortField | null;
  sortDirection?: 'asc' | 'desc';
  onSortColumn?: (field: OrderSortField) => void;
  cardHeaderSlot?: React.ReactNode;
  cardFooterSlot?: React.ReactNode;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onToggleExpand: (id: string) => void;
  onEdit: (order: Order) => void;
  onOpenDesign: (order: Order) => void;
  onPaymentChange: (order: Order, nextStatus: PaymentStatus) => void;
  onProcessChange: (order: Order, nextStatus: ProcessStatus) => void;
  onMovePriority: (orderId: string, action: 'top' | 'up' | 'down') => void;
  onSoftDelete: (order: Order) => void;
  emptySlot?: React.ReactNode;
}

export default function OrdersDataView({
  caption,
  orders,
  settledOrders = [],
  showSettledGroup = false,
  onToggleSettledGroup,
  allQueueOrders,
  selectedOrderIds,
  expandedOrderIds,
  sortField = null,
  sortDirection = 'asc',
  onSortColumn,
  cardHeaderSlot,
  cardFooterSlot,
  onToggleSelect,
  onToggleSelectAll,
  onToggleExpand,
  onEdit,
  onOpenDesign,
  onPaymentChange,
  onProcessChange,
  onMovePriority,
  onSoftDelete,
  emptySlot,
}: OrdersDataViewProps) {
  const buildRowMenuItems = (order: Order): RowMenuItem[] => {
    const idx = allQueueOrders.findIndex((o) => o.id === order.id);
    const waBillingUrl = needsBillingAttention(order)
      ? buildWhatsAppUrl(
          order.buyerPhone,
          `Halo ${order.buyerName}, pesanan ${order.orderNumber} (${order.productName}) sudah selesai. Sisa tagihan ${formatRp(
            order.remainingPayment > 0 ? order.remainingPayment : order.omzet
          )}. Terima kasih.`
        )
      : buildWhatsAppUrl(order.buyerPhone);

    const items: RowMenuItem[] = [
      {
        id: 'edit',
        label: 'Edit pesanan',
        icon: <Pencil className="w-3.5 h-3.5" aria-hidden="true" />,
        onSelect: () => onEdit(order),
      },
      {
        id: 'design',
        label: `Buka desain (${order.designFiles?.length ?? 0})`,
        icon: <FileImage className="w-3.5 h-3.5" aria-hidden="true" />,
        onSelect: () => onOpenDesign(order),
      },
    ];

    if (waBillingUrl) {
      items.push({
        id: 'whatsapp',
        label:
          order.paymentStatus !== 'LUNAS'
            ? 'Tagih via WhatsApp'
            : 'Hubungi via WhatsApp',
        icon: <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />,
        onSelect: () => {
          window.open(waBillingUrl, '_blank', 'noopener,noreferrer');
        },
      });
    }

    if (idx > 0) {
      items.push({
        id: 'priority-top',
        label: 'Prioritas paling atas',
        icon: <ArrowUpToLine className="w-3.5 h-3.5" aria-hidden="true" />,
        onSelect: () => onMovePriority(order.id, 'top'),
      });
      items.push({
        id: 'priority-up',
        label: 'Naikkan urutan',
        icon: <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />,
        onSelect: () => onMovePriority(order.id, 'up'),
      });
    }

    if (idx >= 0 && idx < allQueueOrders.length - 1) {
      items.push({
        id: 'priority-down',
        label: 'Turunkan urutan',
        icon: <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />,
        onSelect: () => onMovePriority(order.id, 'down'),
      });
    }

    items.push({
      id: 'delete',
      label: 'Hapus pesanan',
      tone: 'danger',
      icon: <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />,
      onSelect: () => onSoftDelete(order),
    });

    return items;
  };

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'customer',
      header: 'Pemesan',
      colWidth: 'auto',
      sortable: Boolean(onSortColumn),
      sortDirection: sortField === 'customer' ? sortDirection : null,
      onSort: onSortColumn ? () => onSortColumn('customer') : undefined,
      cellClassName: 'min-w-0',
      renderCell: (order) => {
        const waUrl = buildWhatsAppUrl(order.buyerPhone);
        const avatarTone = getCustomerAvatarClasses(order.buyerName || '');
        const initials = getCustomerInitials(order.buyerName || '');
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11.5px] font-bold tracking-tight shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
                avatarTone
              )}
            >
              {initials}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-[13.5px] font-bold text-[var(--text)] truncate"
                title={`${order.buyerName}${order.buyerPhone ? ` (${order.buyerPhone})` : ''}`}
              >
                {order.buyerName}
              </span>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Hubungi ${order.buyerName} via WhatsApp`}
                  title={`WhatsApp: ${order.buyerPhone}`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--status-green-bg)] text-[var(--status-green-ink)] border border-[var(--status-green-border)] hover:brightness-95 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'pesanan',
      header: 'ID Pesanan',
      colWidth: '102px',
      sortable: Boolean(onSortColumn),
      sortDirection: sortField === 'pesanan' ? sortDirection : null,
      onSort: onSortColumn ? () => onSortColumn('pesanan') : undefined,
      cellClassName: 'whitespace-nowrap',
      renderCell: (order) => (
        <div className="min-w-0 leading-tight">
          <div className="text-[13px] font-semibold text-[#334155] tabular-nums truncate">
            #{order.orderNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'item',
      header: 'Item & Spesifikasi',
      colWidth: 'auto',
      cellClassName: 'min-w-0',
      renderCell: (order) => (
        <div
          className="min-w-0 leading-tight"
          title={`${order.productName} · ${formatUnitQty(order.qty, 'pcs')}${order.specs ? ` — ${order.specs}` : ''}`}
        >
          <div className="text-[13px] font-semibold text-[var(--text)] truncate">
            {order.productName}
          </div>
          <div className="text-[11.5px] text-[var(--text-muted)] truncate mt-0.5">
            {order.specs || 'Standar produksi'}
          </div>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Jumlah',
      colWidth: '80px',
      sortable: Boolean(onSortColumn),
      sortDirection: sortField === 'qty' ? sortDirection : null,
      onSort: onSortColumn ? () => onSortColumn('qty') : undefined,
      cellClassName: 'whitespace-nowrap',
      renderCell: (order) => (
        <span className="inline-flex items-center rounded-lg bg-[#f1f5f9] border border-[var(--border)] px-2.5 py-1 text-[12.5px] font-semibold text-[#334155] tabular-nums">
          {formatUnitQty(order.qty, 'pcs')}
        </span>
      ),
    },
    {
      key: 'omzet',
      header: 'Harga / Omzet',
      colWidth: '114px',
      align: 'right',
      sortable: Boolean(onSortColumn),
      sortDirection: sortField === 'omzet' ? sortDirection : null,
      onSort: onSortColumn ? () => onSortColumn('omzet') : undefined,
      cellClassName: 'whitespace-nowrap',
      renderCell: (order) => (
        <div
          className="leading-tight"
          title={`Laba bersih: ${formatRp(order.profit)} (${formatPercent(order.marginPct, 1)})`}
        >
          <div className="text-[13.5px] font-bold text-[var(--text)] tabular-nums">
            {formatRp(order.omzet)}
          </div>
          <div className="text-[11px] font-semibold text-[var(--status-green-ink)] tabular-nums mt-0.5">
            Laba {formatPercent(order.marginPct, 1)}
          </div>
        </div>
      ),
    },
    {
      key: 'orderDate',
      header: 'Tanggal Masuk',
      colWidth: '126px',
      sortable: Boolean(onSortColumn),
      sortDirection: sortField === 'orderDate' ? sortDirection : null,
      onSort: onSortColumn ? () => onSortColumn('orderDate') : undefined,
      cellClassName: 'whitespace-nowrap',
      renderCell: (order) => {
        const formattedDate = formatDateShort(order.orderDate);
        return (
          <span
            className="text-[13px] font-medium text-[var(--text)] tabular-nums truncate"
            title={`Tanggal pesanan masuk: ${formattedDate}`}
          >
            {formattedDate}
          </span>
        );
      },
    },
    {
      key: 'pembayaran',
      header: 'Pembayaran',
      colWidth: '132px',
      cellClassName: 'whitespace-nowrap',
      renderCell: (order) => {
        const meta = paymentStatusMeta(order.paymentStatus);
        return (
          <StatusChip
            meta={meta}
            options={PAYMENT_STATUS_OPTIONS}
            listboxLabel={`Ubah status pembayaran ${order.orderNumber}`}
            ariaLabel={`Status pembayaran ${order.orderNumber}: ${meta.label}. Klik untuk ubah`}
            onSelect={(val) => onPaymentChange(order, val as PaymentStatus)}
          />
        );
      },
    },
    {
      key: 'produksi',
      header: 'Produksi',
      colWidth: '148px',
      cellClassName: 'whitespace-nowrap',
      renderCell: (order) => {
        const meta = productionStatusMeta(order.processStatus);
        const showStep = order.processStatus !== 'SELESAI';
        return (
          <StatusChip
            meta={meta}
            suffix={showStep ? `${meta.step}/${meta.totalSteps}` : undefined}
            options={PRODUCTION_STATUS_OPTIONS}
            listboxLabel={`Ubah tahap produksi ${order.orderNumber}`}
            ariaLabel={`Status produksi ${order.orderNumber}: ${meta.label}. Klik untuk ubah`}
            onSelect={(val) => onProcessChange(order, val as ProcessStatus)}
          />
        );
      },
    },
    {
      key: 'aksi',
      header: 'Aksi',
      colWidth: '118px',
      align: 'right',
      stickyRight: true,
      cellClassName: 'whitespace-nowrap',
      renderCell: (order) => {
        const fileCount = order.designFiles?.length ?? 0;
        return (
          <div className="inline-flex items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={() => onOpenDesign(order)}
              aria-label={`Buka desain ${order.orderNumber} (${fileCount} berkas)`}
              title={`Buka desain (${fileCount})`}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-medium hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer',
                fileCount === 0 ? 'text-[var(--text-muted)]/55' : 'text-[var(--accent)]'
              )}
            >
              <FileImage className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onEdit(order)}
              aria-label={`Edit pesanan ${order.orderNumber}`}
              title={`Edit pesanan ${order.orderNumber}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </button>

            <RowMenu
              items={buildRowMenuItems(order)}
              ariaLabel={`Lainnya untuk pesanan ${order.orderNumber}`}
            />
          </div>
        );
      },
    },
  ];

  const renderExpanded = (order: Order) => {
    const waUrl = buildWhatsAppUrl(order.buyerPhone);
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-[var(--text-muted)]">
            Detail customer & spesifikasi
          </div>
          <p className="text-[13px] text-[var(--text)]">
            <span className="font-medium">No. WhatsApp:</span>{' '}
            <span className="tabular-nums">{order.buyerPhone || 'Tidak diisi'}</span>
            {waUrl && (
              <>
                {' · '}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-ink)] font-medium hover:underline"
                >
                  Chat WA
                </a>
              </>
            )}
          </p>
          <p className="text-[13px] text-[var(--text)] break-words">
            <span className="font-medium">Spesifikasi:</span> {order.specs || '-'}
          </p>
          {order.notes && (
            <p className="text-[13px] text-[var(--text)] break-words">
              <span className="font-medium">Catatan:</span> {order.notes}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-[var(--text-muted)]">
            Rincian HPP produksi
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] tabular-nums">
            <span className="text-[var(--text-muted)]">Bahan baku/pcs</span>
            <span className="text-right font-medium">{formatRp(order.hppBreakdown.bahanBaku)}</span>
            <span className="text-[var(--text-muted)]">Tinta sablon/pcs</span>
            <span className="text-right font-medium">{formatRp(order.hppBreakdown.tintaSablon)}</span>
            <span className="text-[var(--text-muted)]">Tenaga kerja/pcs</span>
            <span className="text-right font-medium">{formatRp(order.hppBreakdown.tenagaKerja)}</span>
            <span className="text-[var(--text-muted)]">Kemasan & overhead/pcs</span>
            <span className="text-right font-medium">
              {formatRp((order.hppBreakdown.kemasan || 0) + (order.hppBreakdown.overhead || 0))}
            </span>
            <span className="font-medium text-[var(--text)] border-t border-[var(--border)] pt-1">
              Total HPP ({formatUnitQty(order.qty, 'pcs')})
            </span>
            <span className="text-right font-semibold border-t border-[var(--border)] pt-1">
              {formatRp(order.hppBreakdown.totalHpp)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-[var(--text-muted)]">
            Berkas desain ({order.designFiles?.length ?? 0})
          </div>
          {order.designFiles && order.designFiles.length > 0 ? (
            <ul className="space-y-1 text-[12px]">
              {order.designFiles.slice(0, 3).map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{file.fileName}</span>
                  <span className="text-[var(--text-muted)] shrink-0">
                    {file.isReadyToPrint ? 'Siap cetak' : 'Setting'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-[var(--text-muted)]">Belum ada berkas terlampir.</p>
          )}
          <button
            type="button"
            onClick={() => onOpenDesign(order)}
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            <FileImage className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Kelola berkas desain</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <DataTable
      caption={caption}
      primaryGroupLabel={
        settledOrders.length > 0 && onToggleSettledGroup ? 'Pesanan Belum Selesai' : undefined
      }
      primaryGroupSubtitle={
        settledOrders.length > 0 && onToggleSettledGroup
          ? 'Produksi berjalan atau menunggu pelunasan'
          : undefined
      }
      rows={orders}
      getRowId={(o) => o.id}
      columns={columns}
      fixedLayout
      secondaryGroup={
        settledOrders.length > 0 && onToggleSettledGroup
          ? {
              label: 'Pesanan Sudah Selesai',
              subtitle: 'Produksi selesai dan pembayaran lunas',
              count: settledOrders.length,
              rows: settledOrders,
              isOpen: showSettledGroup,
              onToggle: onToggleSettledGroup,
              separateContainer: true,
            }
          : undefined
      }
      cardHeaderSlot={cardHeaderSlot}
      cardFooterSlot={cardFooterSlot}
      selectedIds={selectedOrderIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      getSelectLabel={(o) => `Pilih pesanan ${o.orderNumber}`}
      expandedIds={expandedOrderIds}
      onToggleExpand={onToggleExpand}
      renderExpandedRow={renderExpanded}
      emptySlot={emptySlot}
      renderMobileCard={(order, { isSelected, isExpanded }) => {
        const payMeta = paymentStatusMeta(order.paymentStatus);
        const prodMeta = productionStatusMeta(order.processStatus);
        const showStep = order.processStatus !== 'SELESAI';

        return (
          <div
            className={cn(
              'rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 control-shadow transition-colors',
              isSelected && 'border-[var(--accent)] bg-[var(--accent-tint)]/75 shadow-[inset_3px_0_0_0_var(--accent)]'
            )}
          >
            {/* Row 1: Checkbox + Customer Bold · ID + Tanggal Masuk */}
            <div className="flex items-center justify-between gap-2 leading-tight">
              <div className="flex items-center gap-1.5 min-w-0">
                <label className="touch-target-44 inline-flex items-center justify-center shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(order.id)}
                    aria-label={`Pilih pesanan ${order.orderNumber}`}
                    className="h-4 w-4 rounded border-[var(--control-border)] accent-[var(--accent)] cursor-pointer"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onToggleExpand(order.id)}
                  aria-expanded={isExpanded}
                  className="touch-target-44 inline-flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-[13.5px] font-bold text-[var(--text)] truncate">
                    {order.buyerName}
                  </span>
                  <span className="text-[12px] font-medium text-[var(--text-muted)] tabular-nums shrink-0">
                    · #{order.orderNumber}
                  </span>
                </button>
              </div>

              <span className="text-[12px] font-medium text-[var(--text-muted)] tabular-nums shrink-0">
                {formatDateShort(order.orderDate)}
              </span>
            </div>

            {/* Row 2: Product · qty + Omzet */}
            <div className="mt-1 flex items-center justify-between gap-2 text-[13px] leading-tight">
              <span className="text-[var(--text)] truncate min-w-0">
                {order.productName}{' '}
                <span className="text-[var(--text-muted)] tabular-nums">
                  · {formatUnitQty(order.qty, 'pcs')}
                </span>
              </span>
              <span className="font-semibold text-[var(--text)] tabular-nums shrink-0">
                {formatRp(order.omzet)}
              </span>
            </div>

            {/* Row 3: Status chips + Overflow */}
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <StatusChip
                  meta={payMeta}
                  options={PAYMENT_STATUS_OPTIONS}
                  ariaLabel={`Status pembayaran ${order.orderNumber}: ${payMeta.label}`}
                  onSelect={(val) => onPaymentChange(order, val as PaymentStatus)}
                />
                <StatusChip
                  meta={prodMeta}
                  suffix={showStep ? `${prodMeta.step}/${prodMeta.totalSteps}` : undefined}
                  options={PRODUCTION_STATUS_OPTIONS}
                  ariaLabel={`Status produksi ${order.orderNumber}: ${prodMeta.label}`}
                  onSelect={(val) => onProcessChange(order, val as ProcessStatus)}
                />
              </div>

              <RowMenu
                items={buildRowMenuItems(order)}
                ariaLabel={`Lainnya untuk pesanan ${order.orderNumber}`}
              />
            </div>

            {isExpanded && (
              <div className="mt-2.5 pt-2.5 border-t border-[var(--border)]">
                {renderExpanded(order)}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
