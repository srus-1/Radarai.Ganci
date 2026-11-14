import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HPPBreakdown } from '@/types/order';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const ID_MONTHS_SHORT = [
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
] as const;

const ID_MONTHS_FULL = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

/**
 * Formats a Date into YYYY-MM-DD using local calendar fields to avoid UTC drift.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD as a local calendar date so timezone offsets do not shift the day.
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const local = new Date(year, month, day);
    return isNaN(local.getTime()) ? null : local;
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a number into Indonesian Rupiah currency string ("Rp 6.000").
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
 * Formats plain numeric counts with Indonesian dot thousands separator.
 */
export function formatNumberId(value: number, maxDecimals = 0): string {
  if (isNaN(value) || value === null || value === undefined) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Formats percentage using Indonesian comma decimal separator ("76,7%").
 */
export function formatPercent(
  value: number,
  decimals = 1,
  options: { trimTrailingZero?: boolean } = {}
): string {
  if (isNaN(value) || value === null || value === undefined) return '0%';
  const { trimTrailingZero = false } = options;
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: trimTrailingZero ? 0 : decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${formatted}%`;
}

/**
 * Formats quantity and lowercase unit ("12 pcs", "50 gram").
 */
export function formatUnitQty(qty: number, unit = 'pcs'): string {
  const safeQty = isNaN(qty) || qty === null || qty === undefined ? 0 : qty;
  const safeUnit = (unit || 'pcs').trim().toLowerCase();
  return `${formatNumberId(safeQty)} ${safeUnit}`;
}

/**
 * Formats an ISO date string into Indonesian short date ("24 Okt 2026").
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return `${d.getDate()} ${ID_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Formats "YYYY-MM" into Indonesian month and year ("November 2026").
 */
export function formatMonthLabel(monthKey: string, short = false): string {
  if (!monthKey || monthKey === 'ALL') return 'Semua periode';
  const [y, m] = monthKey.split('-');
  const idx = parseInt(m, 10) - 1;
  if (!y || isNaN(idx) || idx < 0 || idx > 11) return monthKey;
  const list = short ? ID_MONTHS_SHORT : ID_MONTHS_FULL;
  return `${list[idx]} ${y}`;
}

/**
 * Validates and normalizes an Indonesian phone number for wa.me links.
 * Returns null when phone is empty, placeholder, or too short.
 */
export function normalizePhoneToWa(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  if (digits.startsWith('62') && digits.length >= 10) {
    return digits;
  }
  return digits.length >= 10 ? digits : null;
}

export function buildWhatsAppUrl(phone: string | undefined | null, message?: string): string | null {
  const waNumber = normalizePhoneToWa(phone);
  if (!waNumber) return null;
  if (!message) return `https://wa.me/${waNumber}`;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Normalizes raw material names when comparing unit prices without a separate material_id column.
 */
export function normalizeMaterialKey(name: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
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
  const marginPct = Math.round(rawPct * 10) / 10;

  return {
    profit,
    marginPct,
  };
}
