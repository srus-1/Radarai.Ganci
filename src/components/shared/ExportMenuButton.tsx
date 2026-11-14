'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Cpu, Download, FileSpreadsheet, FileText, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExportMenuButtonProps {
  label?: string;
  ariaLabel?: string;
  iconOnly?: boolean;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  className?: string;
}

export default function ExportMenuButton({
  label = 'Unduh laporan',
  ariaLabel,
  iconOnly = false,
  onExportExcel,
  onExportPDF,
  onExportCSV,
  className,
}: ExportMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel || label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={ariaLabel || label}
        className={cn(
          'inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)] control-shadow transition-all cursor-pointer',
          iconOnly ? 'h-10 w-10' : 'h-10 px-3.5 gap-1.5'
        )}
      >
        {iconOnly ? (
          <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
            <span>{label}</span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-150',
                open && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Pilih format unduhan laporan"
          className="absolute right-0 mt-1.5 w-64 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] popover-shadow p-1.5 z-50 text-left"
        >
          <div className="px-2.5 py-1.5 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              Unduh laporan
            </span>
            <span className="text-[12px] font-medium text-[var(--accent-ink)]">
              PDF / XLS / CSV
            </span>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportPDF();
            }}
            className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--surface-muted)] transition-colors cursor-pointer text-left mt-1"
          >
            <FileText className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--text)]">Unduh PDF (.pdf)</div>
              <p className="text-[12px] text-[var(--text-muted)] leading-snug">
                Laporan owner siap cetak.
              </p>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportExcel();
            }}
            className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--surface-muted)] transition-colors cursor-pointer text-left"
          >
            <FileSpreadsheet className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--text)]">Unduh Excel (.xls)</div>
              <p className="text-[12px] text-[var(--text-muted)] leading-snug">
                Tabel lengkap beserta ringkasan.
              </p>
            </div>
          </button>

          <div role="separator" className="my-1 h-px bg-[var(--border)]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportCSV();
            }}
            className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--surface-muted)] transition-colors cursor-pointer text-left"
          >
            <Cpu className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--text)]">Unduh CSV (.csv)</div>
              <p className="text-[12px] text-[var(--text-muted)] leading-snug">
                Dataset numerik terstruktur.
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
