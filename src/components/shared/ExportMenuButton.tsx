'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, Cpu } from 'lucide-react';

export interface ExportMenuButtonProps {
  label: string;
  ariaLabel?: string;
  variant?: 'navy' | 'purple' | 'light-lavender' | 'light-mint' | 'light-neutral';
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
}

export default function ExportMenuButton({
  label,
  ariaLabel,
  variant = 'navy',
  onExportExcel,
  onExportPDF,
  onExportCSV,
}: ExportMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const buttonStyles: Record<NonNullable<ExportMenuButtonProps['variant']>, string> = {
    navy: 'bg-[#1a2a52] hover:bg-[#233666] border-[#2a3c6b] text-white/95',
    purple:
      'bg-[#5645d4] hover:bg-[#4534b3] active:bg-[#3a2a99] border-[#5645d4] text-white shadow-[0_4px_12px_rgba(86,69,212,0.4)]',
    'light-lavender':
      'bg-white hover:bg-[#e6e0f5]/60 text-[#391c57] border-[#d6d3cd]',
    'light-mint':
      'bg-white hover:bg-[#d9f3e1]/60 text-[#0d5220] border-[#d6d3cd]',
    'light-neutral':
      'bg-white hover:bg-[#f6f5f4] text-[#1a1a1a] border-[#c8c4be]',
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel || label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all cursor-pointer min-h-[36px] ${buttonStyles[variant]}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Pilih format unduhan PDF, Excel, atau CSV"
          className="absolute right-0 mt-1.5 w-68 rounded-xl bg-white border border-[#d6d3cd] shadow-[0_12px_32px_rgba(10,21,48,0.22)] p-1.5 z-50 animate-fade-in-up text-left"
        >
          <div className="px-2.5 py-1.5 border-b border-[#f0eee9] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#787671]">
              Pilih Format Unduhan
            </span>
            <span className="text-[10px] font-semibold text-[#5645d4]">
              PDF • Excel • CSV
            </span>
          </div>

          {/* Option 1: PDF for Owner */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportPDF();
            }}
            className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ffe8d4]/60 transition-colors cursor-pointer text-left mt-0.5"
          >
            <div className="w-7 h-7 rounded-md bg-[#ffe8d4] text-[#793400] flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#1a1a1a]">Unduh PDF (.pdf)</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#ffe8d4] text-[#793400]">
                  Untuk Owner
                </span>
              </div>
              <p className="text-[10px] text-[#5d5b54] leading-snug mt-0.5">
                Dokumen laporan eksekutif siap cetak / simpan PDF.
              </p>
            </div>
          </button>

          {/* Option 2: Excel for Owner */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportExcel();
            }}
            className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#d9f3e1]/50 transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-md bg-[#d9f3e1] text-[#0d5220] flex items-center justify-center shrink-0 mt-0.5">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#1a1a1a]">Unduh Excel (.xls)</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#d9f3e1] text-[#0d5220]">
                  Untuk Owner
                </span>
              </div>
              <p className="text-[10px] text-[#5d5b54] leading-snug mt-0.5">
                Tabel lengkap beserta spesifikasi, catatan & ringkasan total.
              </p>
            </div>
          </button>

          <div className="my-1 border-t border-[#f0eee9]" />

          {/* Option 3: CSV for AI / ML Training */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportCSV();
            }}
            className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#e6e0f5]/60 transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-md bg-[#e6e0f5] text-[#391c57] flex items-center justify-center shrink-0 mt-0.5">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#1a1a1a]">Unduh CSV (.csv)</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#e6e0f5] text-[#391c57]">
                  Pelatihan AI
                </span>
              </div>
              <p className="text-[10px] text-[#5d5b54] leading-snug mt-0.5">
                Dataset Machine Learning (numerik murni, tanpa teks panjang).
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
