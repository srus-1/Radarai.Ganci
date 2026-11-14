'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Database,
  History,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/context/SidebarContext';
import { useOrders } from '@/context/OrderContext';
import { SIDEBAR_DEFAULT_WIDTH } from '@/lib/sidebar';

const NAV_ITEMS = [
  {
    href: '/order',
    label: 'Antrean Pesanan',
    shortLabel: 'Antrean',
    icon: ClipboardList,
  },
  {
    href: '/dashboard',
    label: 'Rekapan & Omzet',
    shortLabel: 'Rekapan',
    icon: BarChart3,
  },
  {
    href: '/history',
    label: 'Riwayat & Arsip',
    shortLabel: 'Riwayat',
    icon: History,
  },
  {
    href: '/capex',
    label: 'Capex & Bahan',
    shortLabel: 'Capex',
    icon: Receipt,
  },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { width, isCollapsed, toggleCollapsed } = useSidebar();
  const { isConfigured, configReason } = useOrders();
  const [copiedEnv, setCopiedEnv] = useState(false);

  const handleCopyEnv = () => {
    navigator.clipboard?.writeText(
      'NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
    );
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  // Clamp expanded width to 232px target (>= 1440px) or 64px rail when collapsed
  const desktopWidth = isCollapsed ? 64 : width >= 200 && width !== SIDEBAR_DEFAULT_WIDTH ? width : 232;

  const isRouteActive = (href: string) =>
    pathname === href || (href === '/order' && pathname === '/');

  return (
    <>
      {/* Tablet & Compact Desktop Icon Rail (768px - 1439px): fixed 64px wide */}
      <aside
        aria-label="Navigasi sidebar ringkas"
        className="hidden md:flex min-[1440px]:hidden flex-col w-16 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] shadow-[4px_0_24px_-4px_rgba(15,23,42,0.05)] sticky top-0 h-screen py-3 items-center justify-between z-20"
      >
        <div className="flex flex-col items-center gap-4 w-full px-2">
          <Link
            href="/order"
            prefetch={true}
            aria-label="Radarai.Ganci — Beranda antrean pesanan"
            title="Radarai.Ganci"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white text-[14px] font-bold tracking-tight accent-shadow"
          >
            R
          </Link>

          <nav aria-label="Navigasi utama" className="flex flex-col items-center gap-1.5 w-full">
            {NAV_ITEMS.map((item) => {
              const active = isRouteActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150 ease-out',
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] accent-shadow'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]'
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2 px-2 pb-10">
          {!isConfigured && (
            <button
              type="button"
              onClick={handleCopyEnv}
              title={
                configReason ||
                'Mode standby: klik untuk salin template .env.local Supabase'
              }
              aria-label="Mode standby Supabase, klik untuk salin contoh konfigurasi"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)] border border-[var(--status-amber-border)] cursor-pointer"
            >
              {copiedEnv ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Database className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
          <span
            className="text-[11px] font-medium text-[var(--text-muted)] tabular-nums"
            title="Shift kerja workshop 08:00 - 17:00"
          >
            08–17
          </span>
        </div>
      </aside>

      {/* Desktop Sidebar (>= 1440px): 232px expanded or 64px collapsed */}
      <aside
        aria-label="Sidebar navigasi aplikasi"
        style={{ width: `${desktopWidth}px` }}
        className="hidden min-[1440px]:flex flex-col shrink-0 border-r border-[var(--border)] bg-[var(--surface)] shadow-[4px_0_24px_-4px_rgba(15,23,42,0.05)] sticky top-0 h-screen transition-[width] duration-150 ease-out z-20"
      >
        {/* Top brand bar + collapse control */}
        <div
          className={cn(
            'flex items-center h-16 border-b border-[var(--border)] px-4',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!isCollapsed && (
            <Link
              href="/order"
              prefetch={true}
              className="flex items-center gap-2.5 min-w-0 rounded-lg py-1 px-1"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white text-[14px] font-bold accent-shadow">
                R
              </span>
              <span className="text-[15px] font-bold tracking-tight text-[var(--text)] truncate">
                Radarai.Ganci
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Luaskan sidebar' : 'Ciutkan sidebar'}
            title={isCollapsed ? 'Luaskan sidebar' : 'Ciutkan sidebar'}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Primary nav items: single icon + 1-line label only */}
        <nav aria-label="Navigasi utama" className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={active ? 'page' : undefined}
                aria-label={isCollapsed ? item.label : undefined}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-xl min-h-[42px] transition-all duration-150 ease-out',
                  isCollapsed ? 'justify-center px-2' : 'gap-3 px-3.5 py-2.5',
                  active
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold accent-shadow'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] font-medium'
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                {!isCollapsed && (
                  <span className="text-[13.5px] truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: plain shift hours text clear of bottom-left dev indicator + unobtrusive standby copy helper */}
        <div className="border-t border-[var(--border)] px-3 py-2.5 space-y-2">
          {!isConfigured && !isCollapsed && (
            <div className="rounded-lg border border-[var(--status-amber-border)] bg-[var(--status-amber-bg)] px-2.5 py-2 text-[12px] text-[var(--status-amber-ink)]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Database className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Mode standby
                </span>
                <button
                  type="button"
                  onClick={handleCopyEnv}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--status-amber-border)] text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                >
                  {copiedEnv ? (
                    <Check className="w-3 h-3 text-[var(--status-green-ink)]" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3 h-3 text-[var(--text-muted)]" aria-hidden="true" />
                  )}
                  <span>{copiedEnv ? 'Tersalin' : 'Env'}</span>
                </button>
              </div>
              <p className="mt-1 text-[12px] leading-snug opacity-90">
                {configReason || 'Supabase belum terhubung. Gunakan data demo lokal.'}
              </p>
            </div>
          )}

          {!isConfigured && isCollapsed && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCopyEnv}
                title="Mode standby Supabase, klik untuk salin template .env.local"
                aria-label="Mode standby Supabase, klik untuk salin contoh env"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)] border border-[var(--status-amber-border)] cursor-pointer"
              >
                {copiedEnv ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Database className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}

          <p
            className={cn(
              'text-[12px] text-[var(--text-muted)] tabular-nums leading-none',
              isCollapsed ? 'text-center pb-8' : 'text-right pr-1'
            )}
          >
            {isCollapsed ? '08–17' : 'Shift 08:00 - 17:00'}
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar (< 768px): 56px height, 4 items, >= 44px touch targets */}
      <nav
        aria-label="Navigasi utama mobile"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4 h-14">
          {NAV_ITEMS.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 text-[12px] font-medium transition-colors',
                  active
                    ? 'text-[var(--accent-ink)] bg-[var(--accent-tint)]/50 font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                <span className="leading-none truncate max-w-full">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
