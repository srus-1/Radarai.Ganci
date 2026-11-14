'use client';

import React, { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { Order, PaymentStatus, ProcessStatus } from '@/types/order';
import PageHeader from '@/components/shared/PageHeader';
import Toolbar, { ToolbarTab } from '@/components/shared/Toolbar';
import ExportMenuButton from '@/components/shared/ExportMenuButton';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import OrdersDataView, { OrderSortField } from '@/components/order/OrdersDataView';
import { EmptyState, ErrorState, SkeletonTable } from '@/components/shared/StateViews';
import { useToast } from '@/components/shared/ToastProvider';
import {
  ORDER_DATE_PRESET_LABELS,
  OrderDatePreset,
  matchesOrderDatePreset,
  sortOrders,
} from '@/lib/orderFilters';
import {
  isOrderActionable,
  isOrderUnpaid,
  paymentStatusMeta,
  productionStatusMeta,
} from '@/lib/status';
import {
  cn,
  formatDateShort,
} from '@/lib/utils';
import {
  downloadCSVFile,
  exportOrdersToCSV,
  exportOrdersToExcel,
  exportOrdersToPDF,
} from '@/lib/csvExport';

type StageTab = 'ALL' | 'ANTREAN' | 'IN_PROGRESS' | 'SELESAI';

function SearchParamsPaymentSync({
  onDetectUnpaidFilter,
}: {
  onDetectUnpaidFilter: () => void;
}) {
  const searchParams = useSearchParams();
  const paymentParam = searchParams.get('payment');

  useEffect(() => {
    if (paymentParam === 'BELUM_LUNAS') {
      onDetectUnpaidFilter();
    }
  }, [paymentParam, onDetectUnpaidFilter]);

  return null;
}

function OrdersPageContent() {
  const {
    orders,
    loading,
    fetchError,
    refreshOrders,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    openCreateModal,
    openEditModal,
    setActiveDrawerOrder,
    updatePaymentStatus,
    updateProcessStatus,
    reorderQueue,
    softDeleteOrder,
    bulkDeleteOrders,
    selectedOrderIds,
    toggleSelectOrder,
    selectAllOrders,
    clearSelectedOrders,
  } = useOrders();
  const { showToast } = useToast();

  const [stageTab, setStageTab] = useState<StageTab>('ALL');
  const [onlyUnpaid, setOnlyUnpaid] = useState<boolean>(false);
  const [orderDatePreset, setOrderDatePreset] = useState<OrderDatePreset>(null);
  const [orderDateFrom, setOrderDateFrom] = useState<string>('');
  const [orderDateTo, setOrderDateTo] = useState<string>('');
  const [filterPopoverOpen, setFilterPopoverOpen] = useState<boolean>(false);
  const [filterCoords, setFilterCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placeAbove: boolean;
  }>({ top: 0, left: 0, width: 312, placeAbove: false });
  const [sortField, setSortField] = useState<OrderSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [useQueueOrder, setUseQueueOrder] = useState<boolean>(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [showSettledGroup, setShowSettledGroup] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState<boolean>(false);
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPopoverId = useId();
  const fromDateId = useId();
  const toDateId = useId();
  const pageSizeSelectId = useId();

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);

      if (isEditable || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateModal();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [openCreateModal]);

  const computeFilterCoords = useCallback(() => {
    if (!filterButtonRef.current || typeof window === 'undefined') return;
    const rect = filterButtonRef.current.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const panelWidth = Math.min(312, Math.max(260, viewportWidth - 24));
    const estHeight = 330;
    const spaceBelow = viewportHeight - rect.bottom;
    const placeAbove = spaceBelow < estHeight + 12 && rect.top > estHeight + 12;
    const rawLeft = rect.right - panelWidth;
    const left = Math.min(Math.max(12, rawLeft), Math.max(12, viewportWidth - panelWidth - 12));
    const top = placeAbove ? rect.top - 6 : rect.bottom + 6;
    setFilterCoords({ top, left, width: panelWidth, placeAbove });
  }, []);

  useEffect(() => {
    if (!filterPopoverOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !filterPopoverRef.current?.contains(target) &&
        !filterButtonRef.current?.contains(target)
      ) {
        setFilterPopoverOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFilterPopoverOpen(false);
        filterButtonRef.current?.focus();
      }
    };
    const handleReposition = () => computeFilterCoords();

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [filterPopoverOpen, computeFilterCoords]);

  // Sync URL query ?payment=BELUM_LUNAS smoothly
  const handleEnableUnpaidFromQuery = React.useCallback(() => {
    setOnlyUnpaid(true);
    setStageTab('ALL');
  }, []);

  // Clean up any stale selected IDs when orders list changes
  const activeSelectedIds = useMemo(() => {
    const idSet = new Set(orders.map((o) => o.id));
    return selectedOrderIds.filter((id) => idSet.has(id));
  }, [orders, selectedOrderIds]);

  const tabCounts = useMemo(() => {
    let antrean = 0;
    let inProgress = 0;
    let selesai = 0;
    let unpaid = 0;
    let actionable = 0;

    for (const o of orders) {
      if (o.processStatus === 'ANTREAN') {
        antrean += 1;
      } else if (o.processStatus === 'SELESAI') {
        selesai += 1;
      } else {
        inProgress += 1;
      }
      if (isOrderUnpaid(o)) unpaid += 1;
      if (isOrderActionable(o)) actionable += 1;
    }

    return { antrean, inProgress, selesai, unpaid, actionable };
  }, [orders]);

  const tabs: ToolbarTab[] = useMemo(
    () => [
      { id: 'ALL', label: 'Semua', count: orders.length },
      { id: 'ANTREAN', label: 'Antre', count: tabCounts.antrean },
      { id: 'IN_PROGRESS', label: 'Diproses', count: tabCounts.inProgress },
      { id: 'SELESAI', label: 'Selesai', count: tabCounts.selesai },
    ],
    [orders.length, tabCounts.antrean, tabCounts.inProgress, tabCounts.selesai]
  );

  const effectiveFrom = orderDateFrom || dateFilter;
  const effectiveTo = orderDateTo || dateFilter;

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return orders.filter((o) => {
      if (stageTab === 'ANTREAN' && o.processStatus !== 'ANTREAN') return false;
      if (
        stageTab === 'IN_PROGRESS' &&
        (o.processStatus === 'ANTREAN' || o.processStatus === 'SELESAI')
      ) {
        return false;
      }
      if (stageTab === 'SELESAI' && o.processStatus !== 'SELESAI') return false;

      if (onlyUnpaid && o.paymentStatus === 'LUNAS') return false;

      if (orderDatePreset && !matchesOrderDatePreset(o, orderDatePreset)) return false;

      if (effectiveFrom && (o.orderDate || '') < effectiveFrom) return false;
      if (effectiveTo && (o.orderDate || '') > effectiveTo) return false;

      if (q) {
        const hay = `${o.orderNumber} ${o.buyerName} ${o.buyerPhone} ${o.productName} ${o.specs} ${o.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    orders,
    stageTab,
    onlyUnpaid,
    orderDatePreset,
    effectiveFrom,
    effectiveTo,
    searchQuery,
  ]);

  const sortedOrders = useMemo(
    () => sortOrders(filteredOrders, sortField, sortDirection, useQueueOrder),
    [filteredOrders, sortField, sortDirection, useQueueOrder]
  );

  const totalFilteredCount = sortedOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStartIdx = (safePage - 1) * pageSize;
  const pagedOrders = useMemo(
    () => sortedOrders.slice(pageStartIdx, pageStartIdx + pageSize),
    [sortedOrders, pageStartIdx, pageSize]
  );

  const hasPopoverFilter =
    onlyUnpaid ||
    Boolean(orderDatePreset) ||
    Boolean(orderDateFrom) ||
    Boolean(orderDateTo) ||
    Boolean(dateFilter);

  const activeFilterCount =
    (onlyUnpaid ? 1 : 0) +
    (orderDatePreset ? 1 : 0) +
    (orderDateFrom || orderDateTo || dateFilter ? 1 : 0);

  // Separate active + unpaid-completed orders at the top and group completed+paid orders
  // into a collapsed tbody section below when on "Semua" tab with no active filter/search.
  const shouldGroupSettled =
    stageTab === 'ALL' && !hasPopoverFilter && !searchQuery.trim();

  const activeTopOrders = useMemo(() => {
    if (!shouldGroupSettled) return pagedOrders;
    return pagedOrders.filter((o) => isOrderActionable(o));
  }, [pagedOrders, shouldGroupSettled]);

  const settledBottomOrders = useMemo(() => {
    if (!shouldGroupSettled) return [];
    return pagedOrders.filter((o) => !isOrderActionable(o));
  }, [pagedOrders, shouldGroupSettled]);

  const queueSortedOrders = useMemo(
    () => [...orders].sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0)),
    [orders]
  );

  const handleSortColumn = (field: OrderSortField) => {
    setUseQueueOrder(false);
    setCurrentPage(1);
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortField(null);
      setSortDirection('asc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllVisible = (visibleIds: string[]) => {
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => activeSelectedIds.includes(id));
    if (allSelected) {
      const visibleSet = new Set(visibleIds);
      selectAllOrders(activeSelectedIds.filter((id) => !visibleSet.has(id)));
    } else {
      selectAllOrders(Array.from(new Set([...activeSelectedIds, ...visibleIds])));
    }
  };

  const handlePaymentUpdate = async (order: Order, nextStatus: PaymentStatus) => {
    const previousStatus = order.paymentStatus;
    try {
      await updatePaymentStatus(order.id, nextStatus);
      const nextLabel = paymentStatusMeta(nextStatus).label;
      showToast({
        message: `Pembayaran ${order.orderNumber} diubah menjadi ${nextLabel}`,
        tone: 'success',
        onUndo: async () => {
          await updatePaymentStatus(order.id, previousStatus);
        },
      });
    } catch {
      showToast({
        message: `Gagal memperbarui status pembayaran ${order.orderNumber}`,
        tone: 'error',
      });
    }
  };

  const handleProcessUpdate = async (order: Order, nextStatus: ProcessStatus) => {
    const previousStatus = order.processStatus;
    try {
      await updateProcessStatus(order.id, nextStatus);
      const nextLabel = productionStatusMeta(nextStatus).label;
      showToast({
        message: `Produksi ${order.orderNumber} diubah ke ${nextLabel}`,
        tone: 'success',
        onUndo: async () => {
          await updateProcessStatus(order.id, previousStatus);
        },
      });
    } catch {
      showToast({
        message: `Gagal memperbarui tahap produksi ${order.orderNumber}`,
        tone: 'error',
      });
    }
  };

  const handleMovePriority = async (orderId: string, action: 'top' | 'up' | 'down') => {
    const ids = queueSortedOrders.map((o) => o.id);
    const idx = ids.indexOf(orderId);
    if (idx === -1) return;

    const nextIds = [...ids];
    if (action === 'top' && idx > 0) {
      const [moved] = nextIds.splice(idx, 1);
      nextIds.unshift(moved);
    } else if (action === 'up' && idx > 0) {
      [nextIds[idx - 1], nextIds[idx]] = [nextIds[idx], nextIds[idx - 1]];
    } else if (action === 'down' && idx < nextIds.length - 1) {
      [nextIds[idx], nextIds[idx + 1]] = [nextIds[idx + 1], nextIds[idx]];
    } else {
      return;
    }

    setSortField(null);
    setUseQueueOrder(true);
    try {
      await reorderQueue(nextIds);
      showToast({ message: 'Urutan antrean diperbarui', tone: 'success' });
    } catch {
      showToast({ message: 'Gagal mengubah urutan antrean', tone: 'error' });
    }
  };

  const handleSoftDelete = (order: Order) => {
    const undo = softDeleteOrder(order, 8000);
    showToast({
      message: `Pesanan ${order.orderNumber} (${order.buyerName}) dihapus`,
      tone: 'warning',
      durationMs: 8000,
      undoLabel: 'Urungkan',
      onUndo: () => {
        undo();
        showToast({ message: `Pesanan ${order.orderNumber} dipulihkan`, tone: 'success' });
      },
    });
  };

  const handleConfirmBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const count = activeSelectedIds.length;
      await bulkDeleteOrders(activeSelectedIds);
      setConfirmBulkOpen(false);
      showToast({ message: `${count} pesanan dihapus`, tone: 'success' });
    } catch {
      showToast({ message: 'Sebagian pesanan gagal dihapus', tone: 'error' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const clearDateRange = () => {
    setOrderDateFrom('');
    setOrderDateTo('');
    setDateFilter('');
  };

  const resetFilters = () => {
    setStageTab('ALL');
    setOnlyUnpaid(false);
    setOrderDatePreset(null);
    clearDateRange();
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    stageTab !== 'ALL' || hasPopoverFilter || Boolean(searchQuery.trim());

  const handleExportOrdersCSV = () => {
    const csv = exportOrdersToCSV(sortedOrders);
    downloadCSVFile('antrean-pesanan-eganci.csv', csv);
    showToast({ message: 'Dataset CSV antrean pesanan diunduh', tone: 'success' });
  };

  const handleExportOrdersExcel = () => {
    exportOrdersToExcel(
      sortedOrders,
      effectiveFrom ? `Tgl masuk ${effectiveFrom}` : 'Antrean Pesanan Aktif'
    );
  };

  const handleExportOrdersPDF = () => {
    exportOrdersToPDF(
      sortedOrders,
      'Laporan Antrean Pesanan',
      effectiveFrom ? `Tgl masuk ${effectiveFrom}` : 'Antrean Aktif'
    );
  };

  const inWorkCount = tabCounts.antrean + tabCounts.inProgress;
  const summaryCopy = useMemo(() => {
    if (orders.length === 0) return '0 pesanan';
    const parts = [`${orders.length} pesanan`];
    if (inWorkCount > 0) {
      parts.push(`${inWorkCount} dikerjakan`);
    }
    parts.push(`${tabCounts.unpaid} belum lunas`);
    return parts.join(' · ');
  }, [orders.length, inWorkCount, tabCounts.unpaid]);

  const dateRangeChipLabel = useMemo(() => {
    if (!effectiveFrom && !effectiveTo) return null;
    if (effectiveFrom && effectiveTo && effectiveFrom !== effectiveTo) {
      return `Tgl masuk: ${formatDateShort(effectiveFrom)} – ${formatDateShort(effectiveTo)}`;
    }
    return `Tgl masuk: ${formatDateShort(effectiveFrom || effectiveTo)}`;
  }, [effectiveFrom, effectiveTo]);

  const cardToolbarNode = (
    <Toolbar
      embeddedInCard
      collapseTabsOnMobile
      tabs={tabs}
      activeTab={stageTab}
      onTabChange={(tab) => {
        setStageTab(tab as StageTab);
        setCurrentPage(1);
      }}
      tabListLabel="Filter tahap produksi"
      searchValue={searchQuery}
      onSearchChange={(val) => {
        setSearchQuery(val);
        setCurrentPage(1);
      }}
      searchPlaceholder="Cari ID, pemesan, item... (/)"
      searchLabel="Cari pesanan berdasarkan ID, customer, atau item"
      searchInputRef={searchInputRef}
      rightSlot={
        <div className="relative">
          <button
            ref={filterButtonRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={filterPopoverOpen}
            aria-controls={filterPopoverOpen ? filterPopoverId : undefined}
            onClick={() => {
              if (!filterPopoverOpen) {
                computeFilterCoords();
              }
              setFilterPopoverOpen((prev) => !prev);
            }}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-semibold control-shadow transition-all cursor-pointer whitespace-nowrap',
              activeFilterCount > 0
                ? 'border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent-ink)]'
                : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]'
            )}
          >
            <Filter className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-semibold text-white tabular-nums">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-150',
                filterPopoverOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>

          {filterPopoverOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={filterPopoverRef}
                id={filterPopoverId}
                role="dialog"
                aria-label="Filter antrean pesanan"
                style={{
                  position: 'fixed',
                  top: filterCoords.placeAbove ? undefined : `${filterCoords.top}px`,
                  bottom: filterCoords.placeAbove
                    ? `${window.innerHeight - filterCoords.top}px`
                    : undefined,
                  left: `${filterCoords.left}px`,
                  width: `${filterCoords.width}px`,
                }}
                className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3.5 popover-shadow z-[100] space-y-3"
              >
              {/* Toggle: Belum lunas */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                  Status Pembayaran
                </div>
                <button
                  type="button"
                  aria-pressed={onlyUnpaid}
                  onClick={() => {
                    setOnlyUnpaid((prev) => !prev);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer',
                    onlyUnpaid
                      ? 'border-[var(--status-amber-ink)] bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]'
                  )}
                >
                  <span>Belum lunas / DP</span>
                  <span className="tabular-nums font-semibold">({tabCounts.unpaid})</span>
                </button>
              </div>

              {/* Preset Cepat Tanggal Masuk */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                  Preset Tanggal Masuk
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'THIS_MONTH'] as Exclude<
                      OrderDatePreset,
                      null
                    >[]
                  ).map((presetKey) => {
                    const active = orderDatePreset === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setOrderDatePreset(active ? null : presetKey);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          'h-8 rounded-md border px-2 text-[12px] font-medium transition-colors cursor-pointer text-left truncate',
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent-ink)] font-semibold'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]'
                        )}
                      >
                        {ORDER_DATE_PRESET_LABELS[presetKey]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rentang Tanggal Masuk (Dari - Sampai) */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Rentang Tanggal Masuk
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor={fromDateId}
                      className="block text-[11px] text-[var(--text-muted)] mb-0.5"
                    >
                      Dari
                    </label>
                    <input
                      id={fromDateId}
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => {
                        setOrderDateFrom(e.target.value);
                        setDateFilter('');
                        setCurrentPage(1);
                      }}
                      className="h-8 w-full rounded-md border border-[var(--control-border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text)] tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={toDateId}
                      className="block text-[11px] text-[var(--text-muted)] mb-0.5"
                    >
                      Sampai
                    </label>
                    <input
                      id={toDateId}
                      type="date"
                      value={effectiveTo}
                      onChange={(e) => {
                        setOrderDateTo(e.target.value);
                        setDateFilter('');
                        setCurrentPage(1);
                      }}
                      className="h-8 w-full rounded-md border border-[var(--control-border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text)] tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOnlyUnpaid(false);
                    setOrderDatePreset(null);
                    clearDateRange();
                    setCurrentPage(1);
                  }}
                  className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  Reset filter
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPopoverOpen(false)}
                  className="inline-flex h-8 items-center rounded-md bg-[var(--accent)] px-3 text-[12px] font-medium text-white hover:bg-[var(--accent-hover)] cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            </div>,
            document.body
          )}
        </div>
      }
      activeFilterRow={
        hasPopoverFilter ? (
          <>
            <span className="text-[12px] text-[var(--text-muted)] mr-1">Filter aktif:</span>
            {onlyUnpaid && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full border border-[var(--status-amber-border)] bg-[var(--status-amber-bg)] pl-2.5 pr-1.5 text-[12px] font-medium text-[var(--status-amber-ink)]">
                <span>Belum lunas</span>
                <button
                  type="button"
                  onClick={() => {
                    setOnlyUnpaid(false);
                    setCurrentPage(1);
                  }}
                  aria-label="Hapus filter Belum lunas"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {orderDatePreset && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-2.5 pr-1.5 text-[12px] font-medium text-[var(--text)]">
                <span>Tgl masuk: {ORDER_DATE_PRESET_LABELS[orderDatePreset]}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOrderDatePreset(null);
                    setCurrentPage(1);
                  }}
                  aria-label={`Hapus filter ${ORDER_DATE_PRESET_LABELS[orderDatePreset]}`}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--surface-muted)] cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {dateRangeChipLabel && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-2.5 pr-1.5 text-[12px] font-medium text-[var(--text)] tabular-nums">
                <span>{dateRangeChipLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    clearDateRange();
                    setCurrentPage(1);
                  }}
                  aria-label="Hapus filter tanggal masuk"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--surface-muted)] cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-[12px] font-medium text-[var(--accent-ink)] hover:underline cursor-pointer"
            >
              Reset semua
            </button>
          </>
        ) : undefined
      }
      isBulkActive={activeSelectedIds.length > 0}
      bulkSlot={
        <>
          <span className="text-[13px] font-semibold text-[var(--accent-ink)] tabular-nums">
            {activeSelectedIds.length} pesanan dipilih
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-3 text-[12px] font-medium text-white"
            >
              <span>Lihat di Rekapan</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={clearSelectedOrders}
              className="inline-flex min-h-[32px] items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
            >
              Bersihkan
            </button>
            <button
              type="button"
              onClick={() => setConfirmBulkOpen(true)}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[var(--status-red-border)] bg-[var(--status-red-bg)] px-2.5 text-[12px] font-medium text-[var(--status-red-ink)] hover:opacity-90 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hapus ({activeSelectedIds.length})</span>
            </button>
          </div>
        </>
      }
    />
  );

  const rangeStart = totalFilteredCount === 0 ? 0 : pageStartIdx + 1;
  const rangeEnd = Math.min(totalFilteredCount, pageStartIdx + pagedOrders.length);

  const cardFooterNode =
    totalFilteredCount > 0 ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-5 sm:px-6 py-4 text-[12.5px] text-[var(--text-muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label="Halaman sebelumnya"
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[12.5px] font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Sebelumnya</span>
          </button>

          <span className="tabular-nums text-[12px]">
            Menampilkan <strong className="font-bold text-[var(--text)]">{rangeStart}–{rangeEnd}</strong> dari{' '}
            <strong className="font-bold text-[var(--text)]">{totalFilteredCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5" role="navigation" aria-label="Paginasi tabel pesanan">
          {Array.from({ length: totalPages }, (_, idx) => {
            const pageNum = idx + 1;
            const active = pageNum === safePage;
            return (
              <button
                key={pageNum}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  'inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-[12px] font-bold tabular-nums transition-all cursor-pointer',
                  active
                    ? 'bg-[var(--accent)] text-white accent-shadow'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]'
                )}
              >
                {String(pageNum).padStart(2, '0')}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5">
            <label htmlFor={pageSizeSelectId} className="text-[12px] font-medium text-[var(--text-muted)]">
              Tampilkan
            </label>
            <select
              id={pageSizeSelectId}
              aria-label="Jumlah baris per halaman"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 rounded-xl border border-[var(--border-strong)] bg-[var(--accent-tint)] px-2.5 text-[12px] font-bold text-[var(--accent-ink)] tabular-nums cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Halaman berikutnya"
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[12.5px] font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <span>Berikutnya</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div>
      <Suspense fallback={null}>
        <SearchParamsPaymentSync onDetectUnpaidFilter={handleEnableUnpaidFromQuery} />
      </Suspense>

      <PageHeader
        title="Antrean Pesanan"
        summary={summaryCopy}
        actions={
          <>
            <ExportMenuButton
              label="Export"
              ariaLabel="Export laporan pesanan (PDF, Excel, CSV)"
              onExportPDF={handleExportOrdersPDF}
              onExportExcel={handleExportOrdersExcel}
              onExportCSV={handleExportOrdersCSV}
            />

            <button
              type="button"
              onClick={openCreateModal}
              className="hidden md:inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-4 text-[13px] font-semibold text-[var(--accent-fg)] accent-shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Input pesanan</span>
            </button>
          </>
        }
      />

      {loading ? (
        <SkeletonTable rows={6} />
      ) : fetchError ? (
        <ErrorState
          title="Gagal memuat antrean pesanan"
          message={fetchError}
          onRetry={() => void refreshOrders()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          variant="empty-data"
          title="Belum ada pesanan."
          description="Catat pesanan sablon atau gantungan kunci pertama untuk mulai melacak produksi dan penagihan."
          actionLabel="Input pesanan"
          onAction={openCreateModal}
        />
      ) : (
        <OrdersDataView
          caption="Daftar antrean pesanan"
          orders={activeTopOrders}
          settledOrders={settledBottomOrders}
          showSettledGroup={showSettledGroup}
          onToggleSettledGroup={() => setShowSettledGroup((prev) => !prev)}
          allQueueOrders={queueSortedOrders}
          selectedOrderIds={activeSelectedIds}
          expandedOrderIds={expandedOrderIds}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortColumn={handleSortColumn}
          cardHeaderSlot={cardToolbarNode}
          cardFooterSlot={cardFooterNode}
          onToggleSelect={toggleSelectOrder}
          onToggleSelectAll={handleToggleSelectAllVisible}
          onToggleExpand={toggleExpand}
          onEdit={openEditModal}
          onOpenDesign={(o) => setActiveDrawerOrder(o)}
          onPaymentChange={(o, s) => void handlePaymentUpdate(o, s)}
          onProcessChange={(o, s) => void handleProcessUpdate(o, s)}
          onMovePriority={(id, act) => void handleMovePriority(id, act)}
          onSoftDelete={handleSoftDelete}
          emptySlot={
            <EmptyState
              variant="empty-filter"
              title="Tidak ada pesanan yang cocok."
              description="Coba ubah kata kunci pencarian atau reset filter aktif."
              onResetFilter={hasActiveFilters ? resetFilters : undefined}
            />
          }
        />
      )}

      {/* Mobile Primary FAB (< 768px) */}
      <button
        type="button"
        onClick={openCreateModal}
        aria-label="Input pesanan"
        title="Input pesanan"
        className={cn(
          'md:hidden fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] popover-shadow cursor-pointer',
          activeSelectedIds.length > 0 ? 'bottom-32' : 'bottom-20'
        )}
      >
        <Plus className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Mobile Sticky Bulk Bar sits directly above 56px bottom nav */}
      {activeSelectedIds.length > 0 && (
        <div className="md:hidden fixed inset-x-0 bottom-[56px] z-30 border-t border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 flex items-center justify-between gap-2 popover-shadow">
          <span className="text-[12px] font-semibold text-[var(--accent-ink)] tabular-nums">
            {activeSelectedIds.length} dipilih
          </span>
          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--accent)] px-3 text-[12px] font-medium text-white"
            >
              Lihat di Rekapan
            </Link>
            <button
              type="button"
              onClick={clearSelectedOrders}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--text)] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => setConfirmBulkOpen(true)}
              aria-label={`Hapus ${activeSelectedIds.length} pesanan terpilih`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--status-red-bg)] text-[var(--status-red-ink)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmBulkOpen}
        title={`Hapus ${activeSelectedIds.length} pesanan terpilih?`}
        description="Semua pesanan terpilih beserta berkas desain terlampir akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        confirmLabel={`Hapus ${activeSelectedIds.length} pesanan`}
        isPending={bulkDeleting}
        onCancel={() => setConfirmBulkOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}

export default function OrdersPage() {
  return <OrdersPageContent />;
}
