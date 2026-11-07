import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HPPBreakdown } from '@/types/order';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number into Indonesian Rupiah currency string.
 * Example: 2500000 -> "Rp 2.500.000"
 */
export function formatRp(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  const isNegative = amount < 0;
  const absVal = Math.round(Math.abs(amount));
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(absVal);

  return `${isNegative ? '-Rp ' : 'Rp '}${formatted}`;
}

/**
 * Formats an ISO date string into Indonesian short date.
 * Example: "2026-10-24" -> "24 Okt 2026"
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculates total HPP per pcs and total HPP across given quantity.
 */
export function calculateHPP(
  breakdown: Omit<HPPBreakdown, 'totalHppPerPcs' | 'totalHpp'>,
  qty: number
): HPPBreakdown {
  const safeQty = Math.max(1, qty || 1);
  const bahanBaku = Math.max(0, breakdown.bahanBaku || 0);
  const tintaSablon = Math.max(0, breakdown.tintaSablon || 0);
  const tenagaKerja = Math.max(0, breakdown.tenagaKerja || 0);
  const kemasan = Math.max(0, breakdown.kemasan || 0);
  const overhead = Math.max(0, breakdown.overhead || 0);

  const totalHppPerPcs = bahanBaku + tintaSablon + tenagaKerja + kemasan + overhead;
  const totalHpp = totalHppPerPcs * safeQty;

  return {
    bahanBaku,
    tintaSablon,
    tenagaKerja,
    kemasan,
    overhead,
    totalHppPerPcs,
    totalHpp,
  };
}

/**
 * Computes net profit and profit margin percentage.
 */
export function calculateMargin(
  omzet: number,
  hpp: number
): { profit: number; marginPct: number } {
  const safeOmzet = Math.max(0, omzet || 0);
  const safeHpp = Math.max(0, hpp || 0);
  const profit = safeOmzet - safeHpp;
  const rawPct = safeOmzet > 0 ? (profit / safeOmzet) * 100 : 0;
  const marginPct = Math.round(rawPct * 10) / 10; // e.g. 38.5%

  return {
    profit,
    marginPct,
  };
}
