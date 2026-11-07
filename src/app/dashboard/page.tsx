'use client';

import React from 'react';
import { useOrders } from '@/context/OrderContext';
import MetricCards from '@/components/dashboard/MetricCards';
import MonthlyProfitChart from '@/components/dashboard/MonthlyProfitChart';
import BuyerProfitTable from '@/components/dashboard/BuyerProfitTable';
import {
  BarChart3,
  CheckCircle2,
  Calendar,
  ChevronDown,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { formatRp } from '@/lib/utils';

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
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${INDONESIAN_MONTHS[monthIdx]} ${yearStr}`;
  }
  return monthKey;
}

export default function DashboardPage() {
  const {
    metrics,
    monthlyProfit,
    buyerSummaries,
    selectedMonth,
    setSelectedMonth,
    availableMonths = [],
    selectedOrderIds = [],
    clearSelectedOrders,
  } = useOrders();

  const totalCollected = Math.max(0, metrics.totalOmzet - metrics.totalPiutangDp);
  const collectionRate =
    metrics.totalOmzet > 0
      ? Math.round((totalCollected / metrics.totalOmzet) * 100)
      : 100;

  const displayMonths = availableMonths.includes(selectedMonth)
    ? availableMonths
    : selectedMonth
    ? [selectedMonth, ...availableMonths]
    : availableMonths;

  return (
    <div className="flex flex-col gap-5">
      {/* Header Banner - Notion deep navy hero band */}
      <div className="relative overflow-hidden bg-[#0a1530] p-4 sm:p-5 md:p-6 rounded-xl border border-[#1a2a52] shadow-notion-hero animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Subtle decorative Notion sticky-note dots & mesh background */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#5645d4]/10 blur-2xl pointer-events-none" />
        <div className="absolute top-3 right-28 w-2 h-2 rounded-full bg-[#ffe8d4] opacity-80" />
        <div className="absolute top-6 right-20 w-1.5 h-1.5 rounded-full bg-[#d9f3e1] opacity-70" />
        <div className="absolute bottom-4 right-36 w-2 h-2 rounded-full bg-[#dcecfa] opacity-75" />
        <div className="absolute top-5 right-8 w-2 h-2 rounded-full bg-[#fde0ec] opacity-80" />
        <div className="absolute bottom-3 right-12 w-1.5 h-1.5 rounded-full bg-[#f9e79f] opacity-70" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#5645d4] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(86,69,212,0.4)] shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Rekapan & Omzet
            </h1>
            <p className="text-xs text-white/85 mt-0.5">
              Pantau omzet, laba bersih, dan pelanggan terbaik.
            </p>
          </div>
        </div>

        {/* Right side controls: Month Selector + Cash Flow Quick Status */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Notion-style Month Selector Dropdown */}
          <div className="relative flex items-center w-full sm:w-auto">
            <label htmlFor="dashboard-month-select" className="sr-only">
              Pilih Bulan Analitik
            </label>
            <div className="absolute left-2.5 pointer-events-none text-[#5645d4]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              id="dashboard-month-select"
              aria-label="Pilih Bulan Analitik"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 rounded-lg bg-white border border-[#d6d3cd] text-[#1a1a1a] text-xs font-semibold shadow-xs hover:border-[#5645d4] focus:outline-none focus:ring-2 focus:ring-[#5645d4] cursor-pointer min-h-[36px]"
            >
              {displayMonths.map((m) => (
                <option key={m} value={m} className="bg-white text-[#1a1a1a]">
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 pointer-events-none text-[#787671]">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Cash Flow Quick Status - Dark navy chip with crisp contrast */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1a2a52] border border-[#2a3c6b] text-white text-xs font-medium shadow-xs w-full sm:w-auto min-h-[36px]">
            <CheckCircle2 className="w-4 h-4 text-[#1aae39]" />
            <span>
              Kas Terkumpul: <strong className="text-white font-semibold">{formatRp(totalCollected)}</strong> ({collectionRate}%)
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Override Alert Banner */}
      {selectedOrderIds.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-[#e6e0f5] border border-[#d6d0e8] text-[#391c57] rounded-xl p-3 sm:p-4 shadow-xs animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/90 text-[#391c57] flex items-center justify-center shrink-0 border border-[#d6d0e8] shadow-xs">
              <Filter className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm font-medium leading-relaxed">
              <span>Menampilkan analitik khusus untuk </span>
              <strong className="font-bold">{selectedOrderIds.length} pesanan terpilih.</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={clearSelectedOrders}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#5645d4] hover:bg-[#4534b3] text-white rounded-md shadow-xs transition-colors shrink-0 cursor-pointer min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembali ke Filter Bulanan ({selectedMonth})</span>
          </button>
        </div>
      )}

      {/* 4 KPI Metric Cards */}
      <MetricCards metrics={metrics} />

      {/* Monthly Profit Pure SVG Chart */}
      <MonthlyProfitChart data={monthlyProfit} />

      {/* Customer Profitability Table */}
      <BuyerProfitTable buyers={buyerSummaries} />
    </div>
  );
}
