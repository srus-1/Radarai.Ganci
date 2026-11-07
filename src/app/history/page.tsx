'use client';

import React, { useState, useMemo } from 'react';
import { useOrders, getOrderMonth } from '@/context/OrderContext';
import { formatRp, formatDateShort } from '@/lib/utils';
import {
  exportOrdersToCSV,
  downloadCSVFile,
  exportOrdersToExcel,
  downloadExcelFile,
  exportOrdersToPDF,
} from '@/lib/csvExport';
import ExportMenuButton from '@/components/shared/ExportMenuButton';
import {
  History,
  Calendar,
  ChevronDown,
  Search,
  FileImage,
  PackageCheck,
  MessageCircle,
  Inbox,
} from 'lucide-react';

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'ALL') return 'Semua Bulan';
  if (!monthKey.includes('-')) return monthKey;
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${INDONESIAN_MONTHS[monthIdx]} ${yearStr}`;
  }
  return monthKey;
}

export default function HistoryPage() {
  const {
    orders,
    setActiveDrawerOrder,
    selectedMonth,
    setSelectedMonth,
    availableMonths = [],
  } = useOrders();

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter for completed orders
  const completedOrders = useMemo(
    () => orders.filter((o) => o.processStatus === 'SELESAI'),
    [orders]
  );

  // Available unique months synced with global availableMonths + completed orders
  const displayMonths: string[] = useMemo(() => {
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

  // Filter by search & month (timezone-safe via getOrderMonth, matching Dashboard)
  const filteredHistory = useMemo(() => {
    return completedOrders.filter((order) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = order.buyerName.toLowerCase().includes(q);
        const matchNumber = order.orderNumber.toLowerCase().includes(q);
        const matchProduct = order.productName.toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchProduct) return false;
      }

      if (selectedMonth && selectedMonth !== 'ALL') {
        const monthKey = getOrderMonth(order);
        if (monthKey !== selectedMonth) return false;
      }

      return true;
    });
  }, [completedOrders, searchTerm, selectedMonth]);

  // Calculate Batch Statistics
  const totalCompletedPcs = filteredHistory.reduce((sum, o) => sum + o.qty, 0);
  const totalCompletedOmzet = filteredHistory.reduce((sum, o) => sum + o.omzet, 0);
  const totalCompletedProfit = filteredHistory.reduce((sum, o) => sum + o.profit, 0);
  const totalCompletedHpp = filteredHistory.reduce(
    (sum, o) => sum + o.hppBreakdown.totalHpp,
    0
  );
  const avgMargin =
    totalCompletedOmzet > 0
      ? Math.round(((totalCompletedProfit / totalCompletedOmzet) * 100) * 10) / 10
      : 0;

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
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Riwayat & Arsip
            </h1>
            <p className="text-xs text-white/85 mt-0.5">
              Daftar pesanan selesai dan terkirim.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Notion-style Month Selector Dropdown (synced with Dashboard) */}
          <div className="relative flex items-center w-full sm:w-auto">
            <label htmlFor="history-month-select" className="sr-only">
              Pilih Bulan Riwayat
            </label>
            <div className="absolute left-2.5 pointer-events-none text-[#5645d4]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              id="history-month-select"
              aria-label="Pilih Bulan Riwayat"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 rounded-lg bg-white border border-[#d6d3cd] text-[#1a1a1a] text-xs font-semibold shadow-xs hover:border-[#5645d4] focus:outline-none focus:ring-2 focus:ring-[#5645d4] cursor-pointer min-h-[36px]"
            >
              <option value="ALL">Semua Bulan</option>
              {displayMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 pointer-events-none text-[#787671]">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1a2a52] border border-[#2a3c6b] text-white text-xs font-medium shadow-xs w-full sm:w-auto">
            <PackageCheck className="w-4 h-4 text-[#1aae39]" />
            <span><strong className="text-white font-semibold">{filteredHistory.length}</strong> Pesanan Selesai</span>
          </div>

          <ExportMenuButton
            label="Unduh Laporan"
            ariaLabel="Unduh CSV, Excel, atau PDF Riwayat Pesanan"
            variant="purple"
            onExportExcel={() => {
              const excelContent = exportOrdersToExcel(
                filteredHistory,
                `Arsip Selesai (${formatMonthLabel(selectedMonth)})`
              );
              downloadExcelFile(`eganci-riwayat-owner-${selectedMonth || 'all'}.xls`, excelContent);
            }}
            onExportPDF={() => {
              exportOrdersToPDF(
                filteredHistory,
                'Laporan Arsip Pesanan Selesai Owner',
                `Periode: ${formatMonthLabel(selectedMonth)}`
              );
            }}
            onExportCSV={() => {
              const csvContent = exportOrdersToCSV(filteredHistory);
              downloadCSVFile(`eganci-history-orders-ml-${selectedMonth || 'all'}.csv`, csvContent);
            }}
          />
        </div>
      </div>

      {/* Summary KPI Cards of Past Completed Batches - Notion Pastel Tints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#dcecfa] animate-fade-in-up card-bounce p-4 rounded-xl border border-black/10">
          <span className="text-xs font-semibold text-[#37352f]">Pesanan Selesai</span>
          <h3 className="text-xl font-bold text-[#1a1a1a] mt-1">
            {filteredHistory.length} <span className="text-xs font-normal text-[#37352f]">Order</span>
          </h3>
          <p className="text-[11px] text-[#37352f] mt-1">Total {totalCompletedPcs.toLocaleString('id-ID')} pcs tercetak.</p>
        </div>

        <div className="bg-[#e6e0f5] animate-fade-in-up delay-75 card-bounce p-4 rounded-xl border border-black/10">
          <span className="text-xs font-semibold text-[#37352f]">Omzet Selesai</span>
          <h3 className="text-xl font-bold text-[#1a1a1a] mt-1">
            {formatRp(totalCompletedOmzet)}
          </h3>
          <p className="text-[11px] text-[#37352f] mt-1">Total HPP: {formatRp(totalCompletedHpp)}</p>
        </div>

        <div className="bg-[#d9f3e1] animate-fade-in-up delay-150 card-bounce p-4 rounded-xl border border-black/10">
          <span className="text-xs font-semibold text-[#37352f]">Laba Terealisasi</span>
          <h3 className="text-xl font-bold text-[#1a1a1a] mt-1">
            {formatRp(totalCompletedProfit)}
          </h3>
          <p className="text-[11px] text-[#0d5220] font-semibold mt-1">
            Rata-rata Margin {avgMargin}%
          </p>
        </div>

        <div className="bg-[#fef7d6] animate-fade-in-up delay-225 card-bounce p-4 rounded-xl border border-black/10">
          <span className="text-xs font-semibold text-[#37352f]">Status Pelunasan</span>
          <h3 className="text-xl font-bold text-[#1a1a1a] mt-1">100% Lunas</h3>
          <p className="text-[11px] text-[#523410] font-semibold mt-1">
            Semua piutang lunas.
          </p>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#d6d3cd] shadow-notion-panel animate-fade-in-up delay-150 flex flex-col gap-4">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#787671]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari riwayat pesanan..."
              className="w-full pl-8 pr-3 py-2 sm:py-1.5 text-xs bg-white focus:bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] min-h-[38px] sm:min-h-0"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 px-2.5 py-1.5 sm:py-1 bg-[#f6f5f4] rounded-md border border-[#e5e3df] text-xs font-medium text-[#5d5b54] shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#787671]" />
              <span>Periode:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 text-xs font-semibold bg-white border border-[#c8c4be] rounded-md text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] min-h-[36px] sm:min-h-0 cursor-pointer"
            >
              <option value="ALL">Semua Bulan</option>
              {displayMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Card Stack View (< 768px) */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-[#787671] bg-[#f6f5f4] rounded-lg border border-[#e5e3df] p-6">
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Inbox className="w-6 h-6 text-[#787671]" />
                <span className="font-semibold text-xs text-[#1a1a1a]">Arsip Masih Kosong</span>
                <span className="text-[11px] text-[#787671]">Belum ada pesanan dengan status selesai.</span>
              </div>
            </div>
          ) : (
            filteredHistory.map((order) => {
              const cleanPhone = order.buyerPhone.replace(/\D/g, '');
              const waNumber = cleanPhone.startsWith('0')
                ? `62${cleanPhone.slice(1)}`
                : cleanPhone;
              const waUrl = `https://wa.me/${waNumber}`;

              return (
                <div
                  key={order.id}
                  className="p-3.5 rounded-xl border border-[#d6d3cd] bg-white card-bounce flex flex-col gap-2.5"
                >
                  {/* Top row: Order Number + Date + Payment Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-[#1a1a1a] text-sm">{order.orderNumber}</span>
                      <div className="text-[11px] text-[#787671] mt-0.5">
                        {formatDateShort(order.orderDate)} • Selesai
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-[#d9f3e1] text-[#0d5220] border border-[#0d5220]/20 shrink-0">
                      {order.paymentStatus}
                    </span>
                  </div>

                  {/* Customer & Product */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#1a1a1a] text-xs">{order.buyerName}</span>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline min-h-[36px] py-1 px-1 -my-1 shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{order.buyerPhone}</span>
                      </a>
                    </div>
                    <div className="text-xs text-[#37352f] font-medium truncate" title={order.productName}>
                      {order.productName}
                    </div>
                    {order.specs && (
                      <div className="text-[11px] text-[#787671] truncate" title={order.specs}>
                        {order.specs}
                      </div>
                    )}
                  </div>

                  {/* 2x2 Financial & Volume Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#f6f5f4] p-2.5 rounded-md">
                    <div>
                      <span className="text-[11px] text-[#787671]">Volume:</span>
                      <p className="font-semibold text-[#1a1a1a]">{order.qty.toLocaleString('id-ID')} pcs</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#787671]">Omzet:</span>
                      <p className="font-medium text-[#1a1a1a]">{formatRp(order.omzet)}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#787671]">Total HPP:</span>
                      <p className="text-[#787671]">{formatRp(order.hppBreakdown.totalHpp)}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#787671]">Laba Bersih:</span>
                      <p className="font-semibold text-[#0d5220]">
                        {formatRp(order.profit)}{' '}
                        <span className="text-[10px] text-[#0d5220] font-medium">
                          ({order.marginPct}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Footer: Berkas button */}
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      onClick={() => setActiveDrawerOrder(order)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-[#e6e0f5]/60 text-[#5645d4] border border-[#e5e3df] text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      <span>Berkas Desain ({order.designFiles?.length || 0})</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (>= 768px) */}
        <div className="hidden md:block overflow-x-auto rounded-md border border-[#e5e3df]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f6f5f4] text-[#787671] font-medium uppercase tracking-wider border-b border-[#e5e3df]">
              <tr>
                <th className="py-2.5 px-3">Pesanan</th>
                <th className="py-2.5 px-3">Pelanggan</th>
                <th className="py-2.5 px-3">Produk</th>
                <th className="py-2.5 px-3 text-center">Volume</th>
                <th className="py-2.5 px-3 text-right">Omzet</th>
                <th className="py-2.5 px-3 text-right">Laba Bersih</th>
                <th className="py-2.5 px-3 text-center">Pembayaran</th>
                <th className="py-2.5 px-3 text-center">Berkas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e3df]">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#787671]">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Inbox className="w-6 h-6 text-[#787671]" />
                      <span className="font-semibold text-xs text-[#1a1a1a]">Arsip Masih Kosong</span>
                      <span className="text-[11px] text-[#787671]">Belum ada pesanan dengan status selesai.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((order) => {
                  const cleanPhone = order.buyerPhone.replace(/\D/g, '');
                  const waNumber = cleanPhone.startsWith('0')
                    ? `62${cleanPhone.slice(1)}`
                    : cleanPhone;
                  const waUrl = `https://wa.me/${waNumber}`;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#f6f5f4] transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#1a1a1a]">{order.orderNumber}</div>
                        <div className="text-[11px] text-[#787671] mt-0.5">
                          {formatDateShort(order.orderDate)} • Selesai
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#1a1a1a]">{order.buyerName}</div>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline mt-0.5 min-h-[36px] py-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{order.buyerPhone}</span>
                        </a>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#37352f] line-clamp-1">
                          {order.productName}
                        </div>
                        <div className="text-[11px] text-[#787671] line-clamp-1 mt-0.5">
                          {order.specs}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-[#1a1a1a]">
                        {order.qty.toLocaleString('id-ID')} pcs
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-[#1a1a1a]">
                        {formatRp(order.omzet)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#0d5220]">
                        {formatRp(order.profit)}{' '}
                        <span className="text-[10px] text-[#0d5220] font-medium">
                          ({order.marginPct}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-sm text-[10px] font-semibold bg-[#d9f3e1] text-[#0d5220] border border-[#0d5220]/20">
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setActiveDrawerOrder(order)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-[#e6e0f5]/60 text-[#5645d4] border border-[#e5e3df] text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
                        >
                          <FileImage className="w-3.5 h-3.5" />
                          <span>({order.designFiles?.length || 0})</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
