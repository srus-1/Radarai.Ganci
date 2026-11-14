'use client';

import React from 'react';
import { AlertCircle, FilterX, FolderOpen, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SkeletonKpiStrip({ count = 4 }: { count?: 3 | 4 }) {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat ringkasan metrik"
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] mb-4 overflow-hidden"
    >
      <div
        className={cn(
          'grid divide-y divide-[var(--border)] md:divide-y-0 md:divide-x',
          count === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="px-4 py-3 min-h-[76px] flex flex-col justify-between">
            <div className="h-3 w-20 rounded bg-[var(--surface-muted)]" />
            <div className="h-6 w-28 rounded bg-[var(--surface-muted)] mt-2" />
            <div className="h-3 w-36 rounded bg-[var(--surface-muted)] mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat tabel data"
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
    >
      <div className="h-9 bg-[var(--surface-muted)] border-b border-[var(--border)]" />
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-[58px] px-4 flex items-center gap-4">
            <div className="h-4 w-4 rounded bg-[var(--surface-muted)]" />
            <div className="h-4 w-24 rounded bg-[var(--surface-muted)]" />
            <div className="h-4 w-32 rounded bg-[var(--surface-muted)] flex-1 max-w-[180px]" />
            <div className="h-4 w-40 rounded bg-[var(--surface-muted)] flex-1 hidden sm:block" />
            <div className="h-6 w-20 rounded-full bg-[var(--surface-muted)] ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat grafik"
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 h-[310px] flex flex-col justify-between"
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-52 rounded bg-[var(--surface-muted)]" />
        <div className="h-8 w-28 rounded bg-[var(--surface-muted)]" />
      </div>
      <div className="flex-1 mt-4 rounded bg-[var(--surface-muted)]/60" />
    </div>
  );
}

export interface EmptyStateProps {
  variant: 'empty-data' | 'empty-filter' | 'empty-period';
  title?: string;
  description?: string;
  periodLabel?: string;
  onResetFilter?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  variant,
  title,
  description,
  periodLabel,
  onResetFilter,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const defaultTitle =
    variant === 'empty-filter'
      ? 'Tidak ada yang cocok dengan filter'
      : variant === 'empty-period'
        ? `Belum ada data pada ${periodLabel || 'periode ini'}`
        : 'Belum ada data tercatat';

  const defaultDesc =
    variant === 'empty-filter'
      ? 'Coba ubah kata kunci pencarian atau reset filter aktif.'
      : variant === 'empty-period'
        ? `Tidak ditemukan transaksi untuk periode ${periodLabel || 'yang dipilih'}.`
        : 'Tambahkan entri pertama untuk mulai melacak produksi dan keuangan.';

  const Icon = variant === 'empty-filter' ? FilterX : FolderOpen;

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-10 text-center',
        className
      )}
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-muted)]">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h2 className="text-[15px] font-semibold text-[var(--text)]">
        {title || defaultTitle}
      </h2>
      <p className="mt-1 text-[13px] text-[var(--text-muted)] max-w-md mx-auto">
        {description || defaultDesc}
      </p>

      {(onResetFilter || (actionLabel && onAction)) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {variant === 'empty-filter' && onResetFilter && (
            <button
              type="button"
              onClick={onResetFilter}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
            >
              Reset filter
            </button>
          )}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{actionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Gagal memuat data',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-[var(--status-red-border)] bg-[var(--status-red-bg)] px-5 py-6 text-center',
        className
      )}
    >
      <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 text-[var(--status-red-ink)]">
        <AlertCircle className="w-5 h-5" aria-hidden="true" />
      </div>
      <h2 className="text-[15px] font-semibold text-[var(--status-red-ink)]">{title}</h2>
      <p className="mt-1 text-[13px] text-[var(--status-red-ink)]/90 max-w-md mx-auto">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--status-red-border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--status-red-ink)] hover:bg-[var(--surface-muted)] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Coba lagi</span>
        </button>
      )}
    </div>
  );
}
