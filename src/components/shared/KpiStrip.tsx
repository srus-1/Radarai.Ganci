'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiStripItem {
  id: string;
  label: string;
  value: string;
  supportingText: string;
  primary?: boolean;
  tone?: 'default' | 'accent' | 'amber' | 'red';
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface KpiStripProps {
  items: KpiStripItem[];
  className?: string;
}

export default function KpiStrip({ items, className }: KpiStripProps) {
  const colsClass =
    items.length === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : items.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 md:grid-cols-4';

  return (
    <section
      aria-label="Ringkasan metrik utama"
      className={cn(
        'rounded-lg border border-[var(--border)] bg-[var(--surface)] mb-4 overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'grid divide-y divide-[var(--border)] md:divide-y-0 md:divide-x',
          colsClass
        )}
      >
        {items.map((item, idx) => {
          const isThreeItemSpan = items.length === 3 && idx === 2 ? 'col-span-2 md:col-span-1' : '';
          const valueColor =
            item.tone === 'accent'
              ? 'text-[var(--accent-ink)]'
              : item.tone === 'amber'
                ? 'text-[var(--status-amber-ink)]'
                : item.tone === 'red'
                  ? 'text-[var(--status-red-ink)]'
                  : 'text-[var(--text)]';

          return (
            <div
              key={item.id}
              className={cn(
                'px-3 py-2 sm:px-4 md:py-3 flex flex-col justify-between min-h-[58px] md:min-h-[76px]',
                idx % 2 === 1 && 'border-l border-[var(--border)] md:border-l-0',
                isThreeItemSpan
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                  {item.label}
                </span>
                {item.action && item.action.href ? (
                  <Link
                    href={item.action.href}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent-ink)] hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>{item.action.label}</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                ) : item.action && item.action.onClick ? (
                  <button
                    type="button"
                    onClick={item.action.onClick}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent-ink)] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{item.action.label}</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div
                className={cn(
                  'mt-1 font-semibold tabular-nums tracking-tight leading-none',
                  item.primary ? 'text-[22px] sm:text-[24px]' : 'text-[20px]',
                  valueColor
                )}
              >
                {item.value}
              </div>

              <p className="mt-1.5 text-[12px] text-[var(--text-muted)] tabular-nums leading-snug">
                {item.supportingText}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
