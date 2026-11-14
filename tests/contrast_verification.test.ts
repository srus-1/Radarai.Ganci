// Programmatic WCAG 2.2 AA Contrast Verification Test (v2 Neutral + Indigo Design Tokens)
// Validates mathematical relative luminance and contrast ratios for all v2 foreground/background tokens.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function sRGBtoLin(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export interface ColorPairCheck {
  id: string;
  name: string;
  foreground: string;
  background: string;
  minRatio: number; // 4.5 for normal text, 3.0 for UI components & focus rings
  description: string;
}

export const DESIGN_SYSTEM_COLOR_PAIRS: ColorPairCheck[] = [
  {
    id: 'V2-CONTRAST-01',
    name: 'Primary Text on Surface',
    foreground: '#0f172a',
    background: '#ffffff',
    minRatio: 4.5,
    description: '--text on --surface',
  },
  {
    id: 'V2-CONTRAST-02',
    name: 'Primary Text on Page Canvas',
    foreground: '#0f172a',
    background: '#eef2f6',
    minRatio: 4.5,
    description: '--text on --canvas',
  },
  {
    id: 'V2-CONTRAST-03',
    name: 'Muted Label on Surface',
    foreground: '#475569',
    background: '#ffffff',
    minRatio: 4.5,
    description: '--text-muted on --surface (table headers, metadata)',
  },
  {
    id: 'V2-CONTRAST-04',
    name: 'Muted Label on Page Canvas',
    foreground: '#475569',
    background: '#eef2f6',
    minRatio: 4.5,
    description: '--text-muted on --canvas (sidebar & header subtext)',
  },
  {
    id: 'V2-CONTRAST-05',
    name: 'Muted Label on Muted Surface',
    foreground: '#475569',
    background: '#f8fafc',
    minRatio: 4.5,
    description: '--text-muted on --surface-muted (table header cells)',
  },
  {
    id: 'V2-CONTRAST-06',
    name: 'Primary Royal Blue CTA Button & Active Sidebar Nav',
    foreground: '#ffffff',
    background: '#2563eb',
    minRatio: 4.5,
    description: '--accent-fg (#FFFFFF) on --accent (#2563EB)',
  },
  {
    id: 'V2-CONTRAST-07',
    name: 'Active Blue Nav & Tint Badge',
    foreground: '#1e40af',
    background: '#eff6ff',
    minRatio: 4.5,
    description: '--accent-ink on --accent-tint',
  },
  {
    id: 'V2-CONTRAST-08',
    name: 'Status Green Chip (Lunas / Selesai Pill)',
    foreground: '#15803d',
    background: '#dcfce7',
    minRatio: 4.5,
    description: '--status-green-ink on --status-green-bg',
  },
  {
    id: 'V2-CONTRAST-09',
    name: 'Status Amber Chip (Belum lunas / DP / Pending)',
    foreground: '#c2410c',
    background: '#ffedd5',
    minRatio: 4.5,
    description: '--status-amber-ink on --status-amber-bg',
  },
  {
    id: 'V2-CONTRAST-10',
    name: 'Status Blue Chip (Produksi berjalan)',
    foreground: '#1d4ed8',
    background: '#dbeafe',
    minRatio: 4.5,
    description: '--status-blue-ink on --status-blue-bg',
  },
  {
    id: 'V2-CONTRAST-11',
    name: 'Status Red Chip (Terlambat / Error)',
    foreground: '#be123c',
    background: '#ffe4e6',
    minRatio: 4.5,
    description: '--status-red-ink on --status-red-bg',
  },
  {
    id: 'V2-CONTRAST-12',
    name: 'Status Neutral / Indigo Chip (Antrean)',
    foreground: '#3730a3',
    background: '#e0e7ff',
    minRatio: 4.5,
    description: '--status-neutral-ink on --status-neutral-bg',
  },
  {
    id: 'V2-CONTRAST-13',
    name: 'Focus Ring on Surface',
    foreground: '#2563eb',
    background: '#ffffff',
    minRatio: 3.0,
    description: '2px --accent focus indicator on white surface',
  },
  {
    id: 'V2-CONTRAST-14',
    name: 'Focus Ring on Canvas',
    foreground: '#2563eb',
    background: '#eef2f6',
    minRatio: 3.0,
    description: '2px --accent focus indicator on canvas bg',
  },
  {
    id: 'V2-CONTRAST-15',
    name: 'Interactive Control Border & Muted Icons',
    foreground: '#64748b',
    background: '#ffffff',
    minRatio: 3.0,
    description: '--control-border non-text UI contrast on white',
  },
];

describe('WCAG 2.2 AA Contrast Verification Suite (v2 Tokens)', () => {
  for (const pair of DESIGN_SYSTEM_COLOR_PAIRS) {
    test(`${pair.id}: ${pair.name} (${pair.foreground} on ${pair.background}) >= ${pair.minRatio}:1`, () => {
      const ratio = contrastRatio(pair.foreground, pair.background);
      assert.ok(
        ratio >= pair.minRatio,
        `Expected ${pair.foreground} on ${pair.background} (${pair.description}) to have contrast >= ${pair.minRatio}:1, got ${ratio}:1`
      );
    });
  }
});
