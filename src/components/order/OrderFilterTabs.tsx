'use client';

import React from 'react';
import { FilterTab } from '@/types/order';
import { useOrders } from '@/context/OrderContext';
import { Calendar, X } from 'lucide-react';

interface TabItem {
  id: FilterTab;
  label: string;
  count: number;
}

export default function OrderFilterTabs() {
  const { filterTab, setFilterTab, dateFilter, setDateFilter, orders } = useOrders();

  const counts: Record<FilterTab, number> = {
    ALL: orders.length,
    BELUM_LUNAS_DP: orders.filter(
      (o) => o.paymentStatus === 'BELUM_LUNAS' || o.paymentStatus === 'DP'
    ).length,
    PROSES: orders.filter((o) => o.processStatus !== 'SELESAI').length,
    SELESAI: orders.filter((o) => o.processStatus === 'SELESAI').length,
  };

  const tabs: TabItem[] = [
    { id: 'ALL', label: 'Semua Pesanan', count: counts.ALL },
    { id: 'BELUM_LUNAS_DP', label: 'Belum Lunas / DP', count: counts.BELUM_LUNAS_DP },
    { id: 'PROSES', label: 'Dalam Proses', count: counts.PROSES },
    { id: 'SELESAI', label: 'Selesai', count: counts.SELESAI },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-[#e5e3df]">
      {/* Filter Tabs - Notion style segmented */}
      <div
        className="flex items-center gap-1.5 p-1 bg-[#f6f5f4] rounded-md border border-[#e5e3df] overflow-x-auto select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 min-h-[38px] rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#1a1a1a] text-white shadow-xs'
                  : 'text-[#5d5b54] hover:text-[#1a1a1a] hover:bg-[#ede9e4]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#e5e3df] text-[#37352f]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Date Filter & Clear Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:flex-initial flex items-center">
          <div className="absolute left-2.5 text-[#787671] pointer-events-none">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto pl-8 pr-2.5 py-2 sm:py-1.5 text-xs font-medium bg-white border border-[#c8c4be] rounded-md text-[#37352f] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4] min-h-[38px] sm:min-h-0"
            title="Filter Tanggal"
          />
        </div>

        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="flex items-center justify-center gap-1 px-2.5 py-2 sm:py-1.5 text-xs text-[#37352f] bg-[#f6f5f4] hover:bg-[#ede9e4] border border-[#e5e3df] rounded-md transition-colors cursor-pointer min-h-[38px] sm:min-h-0"
            title="Hapus filter tanggal"
          >
            <X className="w-3 h-3" />
            <span>Hapus</span>
          </button>
        )}
      </div>
    </div>
  );
}
