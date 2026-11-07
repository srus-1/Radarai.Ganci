'use client';

import React from 'react';
import { useOrders } from '@/context/OrderContext';
import OrderFilterTabs from '@/components/order/OrderFilterTabs';
import OrderSortableList from '@/components/order/OrderSortableList';
import { Layers, ArrowUpDown, Plus } from 'lucide-react';
import {
  exportOrdersToCSV,
  downloadCSVFile,
  exportOrdersToExcel,
  downloadExcelFile,
  exportOrdersToPDF,
} from '@/lib/csvExport';
import ExportMenuButton from '@/components/shared/ExportMenuButton';

export default function OrderPage() {
  const {
    orders,
    searchQuery,
    filterTab,
    dateFilter,
    openCreateModal,
    loading,
    selectedOrderIds = [],
    selectAllOrders,
    clearSelectedOrders,
  } = useOrders();

  const [sortOrder, setSortOrder] = React.useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Filter and sort orders according to active criteria
  const sortedOrders = React.useMemo(() => {
    const filtered = orders.filter((order) => {
      // 1. Text Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = order.buyerName.toLowerCase().includes(q);
        const matchNumber = order.orderNumber.toLowerCase().includes(q);
        const matchProduct = order.productName.toLowerCase().includes(q);
        const matchSpecs = order.specs.toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchProduct && !matchSpecs) {
          return false;
        }
      }

      // 2. Tab Filter
      if (filterTab === 'BELUM_LUNAS_DP') {
        if (order.paymentStatus !== 'BELUM_LUNAS' && order.paymentStatus !== 'DP') {
          return false;
        }
      } else if (filterTab === 'PROSES') {
        if (order.processStatus === 'SELESAI') {
          return false;
        }
      } else if (filterTab === 'SELESAI') {
        if (order.processStatus !== 'SELESAI') {
          return false;
        }
      }

      // 3. Date Filter
      if (dateFilter) {
        if (order.deadline !== dateFilter && order.orderDate !== dateFilter) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.orderDate).getTime() || 0;
      const timeB = new Date(b.createdAt || b.orderDate).getTime() || 0;
      if (timeA !== timeB) {
        return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
      }
      return sortOrder === 'NEWEST'
        ? b.orderNumber.localeCompare(a.orderNumber)
        : a.orderNumber.localeCompare(b.orderNumber);
    });
  }, [orders, searchQuery, filterTab, dateFilter, sortOrder]);

  // Multi-select helpers for visible sorted orders
  const visibleOrderIds = React.useMemo(
    () => sortedOrders.map((o) => o.id),
    [sortedOrders]
  );

  const selectedInViewCount = React.useMemo(
    () => visibleOrderIds.filter((id) => selectedOrderIds.includes(id)).length,
    [visibleOrderIds, selectedOrderIds]
  );

  const isAllSelected =
    visibleOrderIds.length > 0 && selectedInViewCount === visibleOrderIds.length;
  const isPartiallySelected =
    selectedInViewCount > 0 && selectedInViewCount < visibleOrderIds.length;

  const selectAllRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const remaining = selectedOrderIds.filter((id) => !visibleOrderIds.includes(id));
      if (remaining.length === 0) {
        clearSelectedOrders?.();
      } else {
        selectAllOrders?.(remaining);
      }
    } else {
      const newSelected = Array.from(new Set([...selectedOrderIds, ...visibleOrderIds]));
      selectAllOrders?.(newSelected);
    }
  };

  const getTargetOrdersForExport = () =>
    selectedOrderIds.length > 0
      ? orders.filter((o) => selectedOrderIds.includes(o.id))
      : sortedOrders;

  const handleDownloadOrdersCSV = () => {
    const targetOrders = getTargetOrdersForExport();
    const csvContent = exportOrdersToCSV(targetOrders);
    const suffix = selectedOrderIds.length > 0 ? 'selected' : 'all';
    downloadCSVFile(`eganci-orders-ml-${suffix}.csv`, csvContent);
  };

  const handleDownloadOrdersExcel = () => {
    const targetOrders = getTargetOrdersForExport();
    const label =
      selectedOrderIds.length > 0
        ? `${selectedOrderIds.length} Pesanan Terpilih`
        : `Antrean Pesanan (${filterTab})`;
    const excelContent = exportOrdersToExcel(targetOrders, label);
    const suffix = selectedOrderIds.length > 0 ? 'selected' : 'owner';
    downloadExcelFile(`eganci-laporan-pesanan-${suffix}.xls`, excelContent);
  };

  const handleDownloadOrdersPDF = () => {
    const targetOrders = getTargetOrdersForExport();
    const label =
      selectedOrderIds.length > 0
        ? `${selectedOrderIds.length} Pesanan Terpilih`
        : `Antrean Pesanan (${filterTab})`;
    exportOrdersToPDF(targetOrders, 'Laporan Antrean Pesanan Owner', label);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header Banner - Notion deep navy hero band */}
      <div className="relative z-20 bg-[#0a1530] p-4 sm:p-5 md:p-6 rounded-xl border border-[#1a2a52] shadow-notion-hero animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Subtle decorative Notion sticky-note dots & mesh background */}
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#5645d4]/10 blur-2xl" />
          <div className="absolute top-3 right-28 w-2 h-2 rounded-full bg-[#ffe8d4] opacity-80" />
          <div className="absolute top-6 right-20 w-1.5 h-1.5 rounded-full bg-[#d9f3e1] opacity-70" />
          <div className="absolute bottom-4 right-36 w-2 h-2 rounded-full bg-[#dcecfa] opacity-75" />
          <div className="absolute top-5 right-8 w-2 h-2 rounded-full bg-[#fde0ec] opacity-80" />
          <div className="absolute bottom-3 right-12 w-1.5 h-1.5 rounded-full bg-[#f9e79f] opacity-70" />
        </div>

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#5645d4] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(86,69,212,0.4)] shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Antrean Pesanan
            </h1>
            <p className="text-xs text-white/85 mt-0.5">
              Kelola prioritas cetak dan verifikasi berkas.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === 'NEWEST' ? 'OLDEST' : 'NEWEST'))
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1a2a52] hover:bg-[#233666] active:scale-[0.98] border border-[#2a3c6b] text-xs font-medium text-white/95 shadow-xs transition-all cursor-pointer min-h-[36px]"
            title="Klik untuk mengubah urutan Terbaru / Terlama"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#d6b6f6]" />
            <span>
              {sortOrder === 'NEWEST' ? 'Urutan: Terbaru' : 'Urutan: Terlama'}
            </span>
          </button>

          <ExportMenuButton
            label={
              selectedOrderIds.length > 0
                ? `Unduh Laporan (${selectedOrderIds.length})`
                : 'Unduh Laporan'
            }
            ariaLabel="Unduh CSV, Excel, atau PDF Pesanan"
            variant="navy"
            onExportExcel={handleDownloadOrdersExcel}
            onExportPDF={handleDownloadOrdersPDF}
            onExportCSV={handleDownloadOrdersCSV}
          />

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5645d4] hover:bg-[#4534b3] active:bg-[#3a2a99] text-white text-xs font-semibold rounded-md shadow-[0_4px_12px_rgba(86,69,212,0.4)] btn-bounce cursor-pointer min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Input Pesanan</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Content Section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#d6d3cd] shadow-notion-panel animate-fade-in-up delay-75 flex flex-col gap-4">
        <OrderFilterTabs />

        {/* Orders Selection Toolbar */}
        {!loading && sortedOrders.length > 0 && (
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg border transition-all ${
              selectedOrderIds.length > 0
                ? 'bg-[#fcfbfe] border-[#5645d4]/40 ring-1 ring-[#5645d4]/20'
                : 'bg-[#f6f5f4] border-[#e5e3df]'
            }`}
          >
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-[#c8c4be] text-[#5645d4] accent-[#5645d4] focus:ring-[#5645d4] cursor-pointer"
                  aria-label="Pilih semua pesanan"
                />
                <span className="text-xs font-semibold text-[#1a1a1a]">
                  {selectedOrderIds.length} pesanan dipilih
                </span>
              </label>

              {selectedOrderIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearSelectedOrders?.()}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-[#5645d4] hover:text-[#4534b3] hover:bg-[#e6e0f5]/60 border border-[#d6b6f6]/50 transition-colors cursor-pointer min-h-[32px] sm:min-h-0 touch-manipulation"
                  title="Bersihkan pilihan pesanan"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div className="text-[11px] sm:text-xs text-[#5d5b54]">
              Dashboard otomatis memfilter data pesanan terpilih
            </div>
          </div>
        )}

        {/* Sortable Orders List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#787671]">
            Memuat antrean...
          </div>
        ) : (
          <OrderSortableList orders={sortedOrders} />
        )}
      </div>
    </div>
  );
}
