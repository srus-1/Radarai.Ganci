'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layers,
  BarChart3,
  History,
  Sparkles,
  Printer,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Receipt,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  resolveSidebarDrag,
  detectSwipeGesture,
} from '@/lib/sidebar';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navItems: NavItem[] = [
  {
    label: 'Antrean Pesanan',
    href: '/order',
    icon: Layers,
    description: 'Kelola alur sablon & ganci.',
  },
  {
    label: 'Rekapan & Omzet',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Analisis laba dan performa.',
  },
  {
    label: 'Riwayat & Arsip',
    href: '/history',
    icon: History,
    description: 'Arsip pesanan selesai.',
  },
  {
    label: 'Capex & Bahan',
    href: '/capex',
    icon: Receipt,
    description: 'Biaya modal & bahan baku.',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const {
    width,
    isCollapsed,
    isDragging,
    isMobileOpen,
    setWidth,
    setIsCollapsed,
    toggleCollapsed,
    closeMobile,
    setIsDragging,
  } = useSidebar();

  // Mobile swipe-to-close touch coordinates
  const mobileTouchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMobileTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 1) {
      mobileTouchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleMobileTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const gesture = detectSwipeGesture(mobileTouchStartRef.current, { x: endX, y: endY });
      if (gesture === 'CLOSE_MOBILE') {
        closeMobile();
      }
    }
  };

  // Desktop drag handle resize logic
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const newWidth = moveEvent.clientX;
      const resolved = resolveSidebarDrag(newWidth);
      if (resolved.isCollapsed) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
        setWidth(resolved.width);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const desktopWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : width;

  return (
    <>
      {/* =========================================================================
          1. DESKTOP SIDEBAR VIEW (hidden on md:, zero footprint on small screens)
          ========================================================================= */}
      <aside
        style={{ width: desktopWidth }}
        className={`hidden md:flex flex-col justify-between shrink-0 min-h-screen bg-[#f6f5f4] border-r border-[#e5e3df] text-[#37352f] relative z-20 select-none ${
          isDragging ? 'transition-none' : 'transition-[width] duration-200 ease-in-out'
        }`}
      >
        {/* Brand Header & Navigation */}
        <div>
          {/* Brand Header */}
          {isCollapsed ? (
            <div className="pt-6 pb-5 px-2 border-b border-[#e5e3df] flex flex-col items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#5645d4] flex items-center justify-center text-white shadow-xs">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-md text-[#5d5b54] hover:text-[#1a1a1a] hover:bg-[#ede9e4] transition-colors cursor-pointer"
                aria-label="Perluas sidebar"
                title="Perluas sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 text-[#5d5b54]" />
              </button>
            </div>
          ) : (
            <div className="pt-6 pb-5 px-5 border-b border-[#e5e3df] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-[#5645d4] flex items-center justify-center text-white shadow-xs shrink-0">
                  <Printer className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold tracking-tight text-[#1a1a1a] truncate">
                      Mafrend.Order
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-md text-[#5d5b54] hover:text-[#1a1a1a] hover:bg-[#ede9e4] transition-colors cursor-pointer shrink-0"
                aria-label="Ciutkan sidebar"
                title="Ciutkan sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-[#5d5b54]" />
              </button>
            </div>
          )}

          {/* Navigation List */}
          <nav className={`mt-4 flex flex-col gap-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/order' && pathname?.startsWith(item.href)) ||
                (item.href === '/order' && (pathname === '/' || pathname === '/order'));
              const Icon = item.icon;

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={`nav-item rounded-md flex items-center text-xs font-medium transition-all ${
                      isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'
                    } ${
                      isActive
                        ? 'active bg-[#e6e0f5] text-[#391c57] font-semibold'
                        : 'text-[#5d5b54] hover:bg-[#ede9e4] hover:text-[#1a1a1a]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-[#5645d4] text-white'
                          : 'bg-white border border-[#e5e3df] text-[#787671]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0">
                        <span className="leading-tight truncate">{item.label}</span>
                        <span
                          className={`text-[10px] leading-tight mt-0.5 truncate ${
                            isActive ? 'text-[#391c57]' : 'text-[#787671]'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Accessible Hover Tooltip in Rail Mode (WCAG AA 17.5:1 contrast) */}
                  {isCollapsed && (
                    <div
                      role="tooltip"
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md bg-[#0a1530] text-white text-xs whitespace-nowrap shadow-lg z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-[#0a1530]"
                    >
                      <div className="font-semibold text-white">{item.label}</div>
                      <div className="text-[10px] text-white/80">{item.description}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Workshop Status */}
        {isCollapsed ? (
          <div className="p-2 mb-4 mx-auto flex flex-col items-center group relative">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#e5e3df] shadow-xs flex items-center justify-center">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1aae39] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1aae39]"></span>
              </span>
            </div>
            {/* Tooltip for collapsed status */}
            <div
              role="tooltip"
              className="absolute left-full ml-3 bottom-2 px-3 py-1.5 rounded-md bg-[#0a1530] text-white text-xs whitespace-nowrap shadow-lg z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-[#0a1530]"
            >
              <div className="font-semibold text-white">Status Workshop: Aktif</div>
              <div className="text-[10px] text-white/80">Shift produksi 08:00 - 17:00</div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 m-3 rounded-xl bg-white border border-[#d6d3cd] card-bounce">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-[#1a1a1a]">
              <Sparkles className="w-3.5 h-3.5 text-[#5645d4]" />
              <span>Status Workshop</span>
            </div>
            <p className="text-[11px] text-[#787671] leading-relaxed">
              Shift produksi sablon & ganci aktif.
            </p>
            <div className="mt-2.5 pt-2 border-t border-[#e5e3df] flex items-center justify-between text-[10px] text-[#787671]">
              <span>v1.0 Produksi</span>
              <span className="flex items-center gap-1 font-semibold text-[#0d5220]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1aae39]"></span>
                Aktif
              </span>
            </div>
          </div>
        )}

        {/* Desktop Drag Handle along Right Border */}
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-0 right-0 w-2.5 h-full cursor-col-resize z-30 touch-none select-none group"
          title="Tarik untuk mengubah ukuran sidebar"
        >
          <div
            className={`w-[3px] h-full ml-auto transition-colors duration-150 ${
              isDragging
                ? 'bg-[#5645d4] shadow-[0_0_8px_rgba(86,69,212,0.6)]'
                : 'group-hover:bg-[#5645d4]/40'
            }`}
          />
        </div>
      </aside>

      {/* =========================================================================
          2. MOBILE OFF-CANVAS SIDEBAR DRAWER (md:hidden, 0px normal document flow)
          ========================================================================= */}
      {/* Dimmed Backdrop Overlay with fade transition */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer Container */}
      <aside
        id="mobile-sidebar"
        aria-label="Navigasi Menu Mobile"
        onTouchStart={handleMobileTouchStart}
        onTouchEnd={handleMobileTouchEnd}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#f6f5f4] border-r border-[#e5e3df] shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header with Close Button (min 44px tap target) */}
          <div className="pt-5 pb-4 px-5 border-b border-[#e5e3df] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#5645d4] flex items-center justify-center text-white shadow-xs">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-[#1a1a1a]">
                    Mafrend.Order
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeMobile}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 rounded-md text-[#5d5b54] hover:text-[#1a1a1a] hover:bg-[#ede9e4] transition-colors cursor-pointer"
              aria-label="Tutup menu navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links with min 44px touch height */}
          <nav className="mt-4 px-3 flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/order' && pathname?.startsWith(item.href)) ||
                (item.href === '/order' && (pathname === '/' || pathname === '/order'));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={`nav-item px-3 min-h-[44px] rounded-md flex items-center gap-3 text-xs font-medium transition-all ${
                    isActive
                      ? 'active bg-[#e6e0f5] text-[#391c57] font-semibold'
                      : 'text-[#5d5b54] hover:bg-[#ede9e4] hover:text-[#1a1a1a]'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-[#5645d4] text-white'
                        : 'bg-white border border-[#e5e3df] text-[#787671]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="leading-tight font-medium text-sm sm:text-xs truncate">
                      {item.label}
                    </span>
                    <span
                      className={`text-[11px] sm:text-[10px] leading-tight mt-0.5 truncate ${
                        isActive ? 'text-[#391c57]' : 'text-[#787671]'
                      }`}
                    >
                      {item.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Footer Status */}
        <div className="p-3.5 m-3 rounded-lg bg-white border border-[#e5e3df] shadow-[0_4px_12px_rgba(15,15,15,0.06)]">
          <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-[#1a1a1a]">
            <Sparkles className="w-3.5 h-3.5 text-[#5645d4]" />
            <span>Status Workshop</span>
          </div>
          <p className="text-[11px] text-[#787671] leading-relaxed">
            Shift produksi sablon & ganci aktif.
          </p>
          <div className="mt-2.5 pt-2 border-t border-[#e5e3df] flex items-center justify-between text-[10px] text-[#787671]">
            <span>v1.0 Produksi</span>
            <span className="flex items-center gap-1 font-semibold text-[#0d5220]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1aae39]"></span>
              Aktif
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
