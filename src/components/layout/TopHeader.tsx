'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Search, Plus, Clock, Menu } from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { useSidebar } from '@/context/SidebarContext';

export default function TopHeader() {
  const pathname = usePathname();
  const { searchQuery, setSearchQuery, openCreateModal, metrics } = useOrders();
  const { isMobileOpen, toggleMobile } = useSidebar();

  // Navbar hanya ditampilkan khusus di halaman Antrean Pesanan (/order)
  const isOrderPage = pathname === '/' || pathname === '/order' || pathname?.startsWith('/order/');
  if (!isOrderPage) {
    return null;
  }

  const activeOrdersCount = metrics.activeOrdersCount;

  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-[#e5e3df] shadow-notion-xs px-4 sm:px-6 py-2.5 sm:py-3 transition-all">
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Navigation triggers & Search */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-md min-w-0">
          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={toggleMobile}
            className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1.5 rounded-md text-[#5d5b54] hover:text-[#1a1a1a] hover:bg-[#f6f5f4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5645d4] shrink-0 cursor-pointer"
            aria-label="Buka menu navigasi"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search Bar (Notion search-pill) */}
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#787671]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pesanan atau pembeli..."
              className="w-full pl-9 pr-8 py-1.5 bg-[#f6f5f4] hover:bg-[#f0eeec] focus:bg-white text-[#1a1a1a] placeholder-[#787671] text-xs rounded-md border border-[#e5e3df] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-[#787671] hover:text-[#1a1a1a] cursor-pointer"
              >
                Hapus
              </button>
            )}
          </div>
        </div>

        {/* Center / Right Control Info & CTAs */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Workshop Activity Chip */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#e6e0f5]/60 border border-[#e5e3df] text-[#391c57] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#5645d4]"></span>
            <span>
              <strong className="font-semibold">{activeOrdersCount}</strong> Pesanan Aktif
            </span>
          </div>

          {/* Shift indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#5d5b54] bg-[#f6f5f4] px-2.5 py-1 rounded-md border border-[#e5e3df]">
            <Clock className="w-3.5 h-3.5 text-[#787671]" />
            <span>Shift 08:00 - 17:00</span>
          </div>

          {/* Primary CTA: Input Pesanan (Notion button-primary) */}
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5645d4] hover:bg-[#4534b3] active:bg-[#3a2a99] text-white text-xs font-medium rounded-md shadow-notion-xs btn-bounce cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span className="whitespace-nowrap">Input Pesanan</span>
          </button>
        </div>
      </div>
    </header>
  );
}
