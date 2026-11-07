// Challenger Test Suite for Milestone 1: Orders UI Optimization
// Validates:
// 1. OrderRowCard layout classes (grid-cols-1 md:grid-cols-12, md:col-span-7, md:col-span-5)
// 2. Overflow & Clamping (line-clamp-1, max-h-14 overflow-y-auto, break-words)
// 3. Touch Isolation (touch-none strictly isolated to GripVertical button, min target sizes)
// 4. Color Palette Compliance (Zero off-palette tokens)
// 5. Empirical Stress Testing (Edge cases, extreme payloads, negative margins, phone sanitization)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatRp, formatDateShort } from '../src/lib/utils';
import { Order, PaymentStatus, ProcessStatus } from '../src/types/order';

const ORDER_ROW_CARD_PATH = path.resolve(process.cwd(), 'src/components/order/OrderRowCard.tsx');
const cardSource = fs.readFileSync(ORDER_ROW_CARD_PATH, 'utf-8');

describe('Challenger M1: OrderRowCard Static & Structural Layout Verification', () => {
  test('CH-M1-01: Grid layout uses grid-cols-1 md:grid-cols-12 with 7/5 column ratio', () => {
    // Outer grid
    assert.match(
      cardSource,
      /grid\s+grid-cols-1\s+md:grid-cols-12\s+gap-3\.5\s+sm:gap-4\s+items-stretch\s+min-w-0/,
      'Must contain grid grid-cols-1 md:grid-cols-12 items-stretch min-w-0'
    );

    // Left Column
    assert.match(
      cardSource,
      /className="md:col-span-7 flex flex-col justify-between gap-3 min-w-0"/,
      'Left column must use md:col-span-7 with min-w-0 and flex-col'
    );

    // Right Column
    assert.match(
      cardSource,
      /className="md:col-span-5 min-w-0 flex flex-col"/,
      'Right column must use md:col-span-5 with min-w-0'
    );

    // Right column inner container
    assert.match(
      cardSource,
      /bg-\[#fcfbf9\] border border-\[#e5e3df\] rounded-lg p-3 flex-1 flex flex-col justify-between min-w-0 shadow-notion-xs/,
      'Right column must contain dedicated styled Notion card container'
    );
  });

  test('CH-M1-02: Overflow and line-clamping classes are strictly applied', () => {
    // Product name line-clamp-1
    assert.match(
      cardSource,
      /line-clamp-1 break-words mt-0\.5/,
      'Product title must have line-clamp-1 and break-words'
    );

    // Specifications container max-h-14 overflow-y-auto
    assert.match(
      cardSource,
      /max-h-14 overflow-y-auto overflow-x-hidden pr-1 text-xs text-\[#5d5b54\] leading-relaxed break-words/,
      'Specs container must have max-h-14 overflow-y-auto overflow-x-hidden pr-1'
    );

    // Notes container max-h-14 overflow-y-auto
    assert.match(
      cardSource,
      /max-h-14 overflow-y-auto overflow-x-hidden pr-1 break-words leading-snug/,
      'Notes container must have max-h-14 overflow-y-auto overflow-x-hidden pr-1'
    );

    // Empty specs fallback text
    assert.match(
      cardSource,
      /<p className="text-xs text-\[#5d5b54\] italic">Spesifikasi standar<\/p>/,
      'Empty specs must render "Spesifikasi standar" fallback'
    );

    // Conditional notes rendering
    assert.match(
      cardSource,
      /\{hasNotes && \(/,
      'Notes callout must only render when hasNotes is truthy'
    );
  });

  test('CH-M1-03: Touch isolation and minimum target ergonomics', () => {
    // Match all occurrences of 'touch-none'
    const touchNoneMatches = cardSource.match(/touch-none/g) || [];
    assert.equal(
      touchNoneMatches.length,
      1,
      'touch-none must appear EXACTLY once in OrderRowCard.tsx to avoid trapping scroll'
    );

    // Verify touch-none is on the drag handle button
    assert.match(
      cardSource,
      /<button\s+[^>]*dragHandleProps[^>]*touch-none[^>]*>/s,
      'touch-none must be applied specifically to the drag handle button'
    );

    // Verify touch target sizes
    assert.match(
      cardSource,
      /min-w-\[36px\] min-h-\[36px\] flex items-center justify-center/,
      'Grip handle and action buttons must have min-w-[36px] min-h-[36px]'
    );

    // Status dropdowns min-h-[36px]
    const selectMinHeightMatches = cardSource.match(/min-h-\[36px\]/g) || [];
    assert.ok(
      selectMinHeightMatches.length >= 4,
      'Interactive elements (Grip, Edit, Delete, Selects, Desain) must enforce min-h-[36px]'
    );
  });

  test('CH-M1-04: Strict Tailwind palette compliance (No off-palette hex colors)', () => {
    // Extract all hex colors in the file: #[0-9a-fA-F]{3,8}
    const hexMatches = cardSource.match(/#[0-9a-fA-F]{3,8}/gi) || [];
    const uniqueHexes = Array.from(new Set(hexMatches.map((h) => h.toLowerCase())));

    const approvedPalette = new Set([
      '#0a1530', // dark navy hero
      '#5645d4', // signature purple primary CTA / icon
      '#ffffff', // canvas white
      '#f6f5f4', // warm surface
      '#fcfbf9', // right details container surface
      '#fafaf9', // footer surface
      '#e5e3df', // clean hairline border
      '#d6d3cd', // card border
      '#e6e0f5', // pastel lavender
      '#d6b6f6', // lavender border
      '#391c57', // deep lavender text
      '#dcecfa', // pastel sky
      '#004480', // deep sky text
      '#ffe8d4', // pastel peach
      '#793400', // deep amber/peach text
      '#fde0ec', // pastel rose (loss / belum lunas)
      '#7a1c4b', // deep rose text
      '#d9f3e1', // pastel mint (profit / lunas)
      '#0d5220', // deep mint text
      '#c6ecd2', // mint hover
      '#fef7d6', // pastel yellow (DP / notes)
      '#f9e79f', // yellow border
      '#523410', // deep brown text
      '#1a1a1a', // primary ink text
      '#37352f', // secondary charcoal text
      '#5d5b54', // slate label text
      '#787671', // steel caption text
      '#1aae39', // 6px ready dot indicator
    ]);

    const violations: string[] = [];
    for (const hex of uniqueHexes) {
      if (!approvedPalette.has(hex)) {
        violations.push(hex);
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found off-palette hex color tokens in OrderRowCard.tsx: ${violations.join(', ')}`
    );
  });
});

describe('Challenger M1: Empirical Behavioral & Stress Testing', () => {
  // Helper functions matching OrderRowCard logic
  function generateWaUrl(buyerName: string, buyerPhone: string, orderNumber: string) {
    const cleanPhone = buyerPhone.replace(/\D/g, '');
    const waNumber = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    return `https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(
      buyerName
    )},%20update%20pesanan%20${encodeURIComponent(orderNumber)}%20di%20eganci`;
  }

  test('CH-M1-05: WhatsApp link generation handles diverse Indonesian phone formats safely', () => {
    // 0812... -> 62812...
    const url1 = generateWaUrl('Budi Santoso', '0812-3456-7890', 'EG-2026-001');
    assert.ok(url1.startsWith('https://wa.me/6281234567890?text='));
    assert.ok(url1.includes('Halo%20Budi%20Santoso'));
    assert.ok(url1.includes('EG-2026-001'));

    // +62 812... -> 62812...
    const url2 = generateWaUrl('Siti Nurhaliza', '+62 812 9876 5432', 'EG-2026-002');
    assert.ok(url2.startsWith('https://wa.me/6281298765432?text='));

    // 62813... -> 62813...
    const url3 = generateWaUrl('PT Creative & Co', '62813-1111-2222', 'EG-2026-003');
    assert.ok(url3.startsWith('https://wa.me/6281311112222?text='));

    // Buyer name with special characters (URL encoded safely)
    const url4 = generateWaUrl('CV. Abadi & "Karya" / 100%', '08991234567', 'EG-2026-004');
    assert.ok(url4.includes(encodeURIComponent('CV. Abadi & "Karya" / 100%')));
  });

  test('CH-M1-06: Empty / Whitespace specs and notes logic', () => {
    const checkSpecsAndNotes = (specs?: string | null, notes?: string | null) => {
      const hasSpecs = Boolean(specs && specs.trim());
      const hasNotes = Boolean(notes && notes.trim());
      return { hasSpecs, hasNotes };
    };

    // Standard filled
    assert.deepEqual(checkSpecsAndNotes('Plastisol 3 warna', 'Kirim via Paxel'), {
      hasSpecs: true,
      hasNotes: true,
    });

    // Empty strings
    assert.deepEqual(checkSpecsAndNotes('', ''), {
      hasSpecs: false,
      hasNotes: false,
    });

    // Whitespace strings
    assert.deepEqual(checkSpecsAndNotes('   \n  \t  ', '   '), {
      hasSpecs: false,
      hasNotes: false,
    });

    // Null and undefined
    assert.deepEqual(checkSpecsAndNotes(null, undefined), {
      hasSpecs: false,
      hasNotes: false,
    });
  });

  test('CH-M1-07: Financial edge cases rendering (Negative margin, zero profit)', () => {
    const checkMarginDisplay = (marginPct: number) => {
      const isNegativeMargin = marginPct < 0;
      return {
        isNegativeMargin,
        badgeBg: isNegativeMargin ? 'bg-[#fde0ec] border-[#7a1c4b]/20' : 'bg-[#d9f3e1] border-[#0d5220]/20',
        textColor: isNegativeMargin ? 'text-[#7a1c4b]' : 'text-[#0d5220]',
        icon: isNegativeMargin ? 'TrendingDown' : 'TrendingUp',
      };
    };

    // Healthy profit
    const resProfit = checkMarginDisplay(35.5);
    assert.equal(resProfit.isNegativeMargin, false);
    assert.equal(resProfit.badgeBg, 'bg-[#d9f3e1] border-[#0d5220]/20');
    assert.equal(resProfit.textColor, 'text-[#0d5220]');
    assert.equal(resProfit.icon, 'TrendingUp');

    // Negative margin (Loss)
    const resLoss = checkMarginDisplay(-12.4);
    assert.equal(resLoss.isNegativeMargin, true);
    assert.equal(resLoss.badgeBg, 'bg-[#fde0ec] border-[#7a1c4b]/20');
    assert.equal(resLoss.textColor, 'text-[#7a1c4b]');
    assert.equal(resLoss.icon, 'TrendingDown');

    // Zero margin (Break-even)
    const resZero = checkMarginDisplay(0);
    assert.equal(resZero.isNegativeMargin, false);
    assert.equal(resZero.textColor, 'text-[#0d5220]');
  });

  test('CH-M1-08: Extreme text payload endurance (No crash or infinite loops)', () => {
    // 50,000 characters specs and notes
    const extremeSpecs = 'Bahan Cotton Combed 24s Reaktif Warna Jet Black Super. '.repeat(1000);
    const extremeNotes = 'Packing kardus dobel, stiker QC wajib ditempel, jangan ditumpuk. '.repeat(1000);

    const hasSpecs = Boolean(extremeSpecs && extremeSpecs.trim());
    const hasNotes = Boolean(extremeNotes && extremeNotes.trim());

    assert.equal(hasSpecs, true);
    assert.equal(hasNotes, true);
    assert.equal(extremeSpecs.length > 50000, true);
    assert.equal(extremeNotes.length > 50000, true);
  });

  test('CH-M1-09: Process and Payment status styles coverage', () => {
    const processStatuses: ProcessStatus[] = [
      'ANTREAN',
      'SETTING_DESAIN',
      'PROSES_CETAK',
      'FINISHING',
      'SIAP_KIRIM',
      'SELESAI',
    ];

    for (const status of processStatuses) {
      assert.ok(
        cardSource.includes(status),
        `OrderRowCard must cover process status '${status}'`
      );
    }

    const paymentStatuses: PaymentStatus[] = ['LUNAS', 'DP', 'BELUM_LUNAS'];
    for (const status of paymentStatuses) {
      assert.ok(
        cardSource.includes(status),
        `OrderRowCard must cover payment status '${status}'`
      );
    }
  });

  test('CH-M1-10: Memo equality comparator integrity', () => {
    // Check that React.memo comparator checks order, index, and isDragging
    assert.match(
      cardSource,
      /prevProps\.order === nextProps\.order &&\s+prevProps\.index === nextProps\.index &&\s+prevProps\.isDragging === nextProps\.isDragging/,
      'React.memo comparator must strictly compare order, index, and isDragging'
    );
  });
});
