// Programmatic WCAG 2.1 AA Contrast Verification Test
// Validates mathematical relative luminance and contrast ratios for all foreground/background color combinations.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function sRGBtoLin(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
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
  minRatio: number; // 4.5 for normal text, 3.0 for large text / components
  description: string;
}

export const DESIGN_SYSTEM_COLOR_PAIRS: ColorPairCheck[] = [
  // 1. Dark Navy Hero Bands (#0a1530)
  {
    id: 'T1-CONTRAST-01',
    name: 'Hero Band Primary Headline',
    foreground: '#ffffff',
    background: '#0a1530',
    minRatio: 4.5,
    description: 'Crisp white text on deep navy hero band',
  },
  {
    id: 'T1-CONTRAST-02',
    name: 'Hero Band Subtitle',
    foreground: '#d9dce0', // equivalent of white/85 on #0a1530
    background: '#0a1530',
    minRatio: 4.5,
    description: 'High-contrast light subtitle on deep navy hero band',
  },
  {
    id: 'T1-CONTRAST-03',
    name: 'Signature Purple Primary CTA',
    foreground: '#ffffff',
    background: '#5645d4',
    minRatio: 4.5,
    description: 'Pure white text on Notion purple primary button',
  },
  {
    id: 'T1-CONTRAST-04',
    name: 'Hero Chip Priority Accent',
    foreground: '#d6b6f6',
    background: '#1a2a52',
    minRatio: 4.5,
    description: 'Lavender accent on mid navy chip',
  },

  // 2. Pastel Feature & KPI Cards (Sky, Lavender, Mint, Peach, Yellow, Rose)
  {
    id: 'T1-CONTRAST-05',
    name: 'Sky Card Value',
    foreground: '#1a1a1a',
    background: '#dcecfa',
    minRatio: 4.5,
    description: 'Deep ink value on sky pastel tint',
  },
  {
    id: 'T1-CONTRAST-06',
    name: 'Sky Card Label',
    foreground: '#37352f',
    background: '#dcecfa',
    minRatio: 4.5,
    description: 'Charcoal label on sky pastel tint',
  },
  {
    id: 'T1-CONTRAST-07',
    name: 'Sky Card Badge',
    foreground: '#004480',
    background: '#dcecfa',
    minRatio: 4.5,
    description: 'Deep blue badge text on sky pastel tint',
  },
  {
    id: 'T1-CONTRAST-08',
    name: 'Lavender Card Value',
    foreground: '#1a1a1a',
    background: '#e6e0f5',
    minRatio: 4.5,
    description: 'Deep ink value on lavender pastel tint',
  },
  {
    id: 'T1-CONTRAST-09',
    name: 'Lavender Card Label',
    foreground: '#37352f',
    background: '#e6e0f5',
    minRatio: 4.5,
    description: 'Charcoal label on lavender pastel tint',
  },
  {
    id: 'T1-CONTRAST-10',
    name: 'Lavender Card Badge',
    foreground: '#391c57',
    background: '#e6e0f5',
    minRatio: 4.5,
    description: 'Deep purple badge text on lavender pastel tint',
  },
  {
    id: 'T1-CONTRAST-11',
    name: 'Mint Card Value',
    foreground: '#1a1a1a',
    background: '#d9f3e1',
    minRatio: 4.5,
    description: 'Deep ink value on mint pastel tint',
  },
  {
    id: 'T1-CONTRAST-12',
    name: 'Mint Card Label',
    foreground: '#37352f',
    background: '#d9f3e1',
    minRatio: 4.5,
    description: 'Charcoal label on mint pastel tint',
  },
  {
    id: 'T1-CONTRAST-13',
    name: 'Mint Card Badge',
    foreground: '#0d5220',
    background: '#d9f3e1',
    minRatio: 4.5,
    description: 'Deep green badge text on mint pastel tint (WCAG AA replacement for #1aae39)',
  },
  {
    id: 'T1-CONTRAST-14',
    name: 'Peach Card Value',
    foreground: '#1a1a1a',
    background: '#ffe8d4',
    minRatio: 4.5,
    description: 'Deep ink value on peach pastel tint',
  },
  {
    id: 'T1-CONTRAST-15',
    name: 'Peach Card Label',
    foreground: '#37352f',
    background: '#ffe8d4',
    minRatio: 4.5,
    description: 'Charcoal label on peach pastel tint',
  },
  {
    id: 'T1-CONTRAST-16',
    name: 'Peach Card Badge',
    foreground: '#793400',
    background: '#ffe8d4',
    minRatio: 4.5,
    description: 'Deep rust badge text on peach pastel tint',
  },
  {
    id: 'T1-CONTRAST-17',
    name: 'Yellow Card Value',
    foreground: '#1a1a1a',
    background: '#fef7d6',
    minRatio: 4.5,
    description: 'Deep ink value on yellow pastel tint',
  },
  {
    id: 'T1-CONTRAST-18',
    name: 'Yellow Card Badge',
    foreground: '#793400',
    background: '#fef7d6',
    minRatio: 4.5,
    description: 'Deep brown/rust badge text on yellow pastel tint',
  },
  {
    id: 'T1-CONTRAST-19',
    name: 'Rose Card Value',
    foreground: '#1a1a1a',
    background: '#fde0ec',
    minRatio: 4.5,
    description: 'Deep ink value on rose pastel tint',
  },
  {
    id: 'T1-CONTRAST-20',
    name: 'Rose Card Badge',
    foreground: '#7a1c4b',
    background: '#fde0ec',
    minRatio: 4.5,
    description: 'Deep rose badge text on rose pastel tint',
  },

  // 3. Workspace Containers & Light Surfaces
  {
    id: 'T1-CONTRAST-21',
    name: 'Canvas Primary Ink Text',
    foreground: '#1a1a1a',
    background: '#ffffff',
    minRatio: 4.5,
    description: 'Primary headings and labels on white canvas',
  },
  {
    id: 'T1-CONTRAST-22',
    name: 'Canvas Charcoal Body Text',
    foreground: '#37352f',
    background: '#ffffff',
    minRatio: 4.5,
    description: 'Body text on white canvas',
  },
  {
    id: 'T1-CONTRAST-23',
    name: 'Canvas Secondary Steel Text',
    foreground: '#787671',
    background: '#ffffff',
    minRatio: 4.5,
    description: 'Secondary meta labels on white canvas',
  },
  {
    id: 'T1-CONTRAST-24',
    name: 'Surface Primary Ink Text',
    foreground: '#1a1a1a',
    background: '#f6f5f4',
    minRatio: 4.5,
    description: 'Sidebar and background primary text',
  },
  {
    id: 'T1-CONTRAST-25',
    name: 'Surface Slate Label',
    foreground: '#5d5b54',
    background: '#f6f5f4',
    minRatio: 4.5,
    description: 'Sidebar navigation labels on surface',
  },
];

describe('WCAG 2.1 AA Contrast Verification Suite', () => {
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
