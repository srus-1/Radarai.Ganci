'use client';

import React, { useId, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolbarTab {
  id: string;
  label: string;
  count?: number;
}

export interface ToolbarProps {
  tabs?: ToolbarTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabListLabel?: string;
  collapseTabsOnMobile?: boolean;
  filterChips?: React.ReactNode;
  activeFilterRow?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  rightSlot?: React.ReactNode;
  bulkSlot?: React.ReactNode;
  isBulkActive?: boolean;
  embeddedInCard?: boolean;
  className?: string;
}

export default function Toolbar({
  tabs,
  activeTab,
  onTabChange,
  tabListLabel = 'Filter daftar',
  collapseTabsOnMobile = false,
  filterChips,
  activeFilterRow,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  searchLabel = 'Cari data',
  searchInputRef,
  rightSlot,
  bulkSlot,
  isBulkActive = false,
  embeddedInCard = false,
  className,
}: ToolbarProps) {
  const searchId = useId();
  const mobileSelectId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!tabs || tabs.length === 0 || !onTabChange) return;
    const currentIdx = Math.max(
      0,
      tabs.findIndex((t) => t.id === activeTab)
    );
    let nextIdx = -1;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = tabs.length - 1;
    }
    if (nextIdx >= 0) {
      onTabChange(tabs[nextIdx].id);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  if (isBulkActive && bulkSlot) {
    return (
      <div
        role="region"
        aria-label="Aksi pilihan massal"
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 min-h-[60px] px-5 sm:px-6 py-3',
          embeddedInCard
            ? 'rounded-t-2xl border-b border-[var(--border)] bg-[var(--accent-tint)]'
            : 'rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-tint)] mb-3',
          className
        )}
      >
        {bulkSlot}
      </div>
    );
  }

  return (
    <div
      className={cn(
        embeddedInCard
          ? 'rounded-t-2xl border-b border-[var(--border)] bg-[var(--surface)]'
          : 'mb-3',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-wrap md:flex-nowrap items-center justify-between gap-2 min-w-0',
          embeddedInCard ? 'min-h-[64px] px-5 sm:px-6 py-3' : 'min-h-[44px]'
        )}
      >
        {/* Left: single-dimension stage tabs (or mobile "Tahap" dropdown) */}
        <div className="flex items-center gap-2 min-w-0">
          {tabs && tabs.length > 0 && onTabChange && (
            <>
              {collapseTabsOnMobile && (
                <div className="md:hidden inline-flex items-center gap-1.5 min-w-0">
                  <label
                    htmlFor={mobileSelectId}
                    className="text-[12px] font-medium text-[var(--text-muted)] shrink-0"
                  >
                    Tahap
                  </label>
                  <select
                    id={mobileSelectId}
                    aria-label={tabListLabel}
                    value={activeTab}
                    onChange={(e) => onTabChange(e.target.value)}
                    className="h-9 rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--text)] cursor-pointer"
                  >
                    {tabs.map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}
                        {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                role="tablist"
                aria-label={tabListLabel}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  'items-center rounded-xl border border-[var(--border)] bg-[#f1f5f9] p-1 min-w-0 max-w-full',
                  collapseTabsOnMobile ? 'hidden md:inline-flex' : 'inline-flex flex-wrap'
                )}
              >
                {tabs.map((tab, idx) => {
                  const selected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        tabRefs.current[idx] = el;
                      }}
                      type="button"
                      role="tab"
                      tabIndex={selected ? 0 : -1}
                      aria-selected={selected}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        'inline-flex shrink min-w-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 ease-out cursor-pointer min-h-[34px]',
                        selected
                          ? 'bg-[var(--accent)] text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      )}
                    >
                      <span className="truncate">{tab.label}</span>
                      {typeof tab.count === 'number' && (
                        <span
                          className={cn(
                            'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                            selected
                              ? 'bg-white/20 text-white'
                              : 'bg-white text-[var(--text-muted)] border border-[var(--border)]'
                          )}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {filterChips}
        </div>

        {/* Right: search (max 280px) & Filter popover */}
        {(onSearchChange || rightSlot) && (
          <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial justify-end">
            {onSearchChange && (
              <div className="relative flex-1 md:w-[240px] lg:w-[260px] max-w-[280px] min-w-[140px]">
                <label htmlFor={searchId} className="visually-hidden">
                  {searchLabel}
                </label>
                <Search
                  className="w-4 h-4 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  id={searchId}
                  type="search"
                  value={searchValue ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[#f8fafc] focus:bg-[var(--surface)] pl-8 pr-7 text-[13px] font-medium text-[var(--text)] placeholder:text-[var(--text-muted)] control-shadow transition-colors"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {rightSlot}
          </div>
        )}
      </div>

      {/* Active Filter Chips Row: rendered ONLY when active */}
      {activeFilterRow && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5 py-2.5 border-t border-[var(--border)] bg-[var(--surface-muted)]/60',
            embeddedInCard ? 'px-5 sm:px-6' : 'px-3 sm:px-4'
          )}
        >
          {activeFilterRow}
        </div>
      )}
    </div>
  );
}
