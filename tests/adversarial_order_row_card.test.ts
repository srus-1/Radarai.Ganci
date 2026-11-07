// Adversarial Stress Harness for OrderRowCard Component
// Tests extreme boundary inputs, text overflow, HTML injection, emojis, and layout integrity
// Executable via: npx tsx --test tests/adversarial_order_row_card.test.ts

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import OrderRowCard from '../src/components/order/OrderRowCard';
import { Order } from '../src/types/order';
import { OrderProvider } from '../src/context/OrderContext';

function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-adv-1',
    orderNumber: 'EG-2026-999',
    orderDate: '2026-10-24',
    deadline: '2026-10-31',
    buyerName: 'Adversarial Buyer',
    buyerPhone: '081234567890',
    productName: 'Gantungan Kunci Akrilik 5cm',
    specs: 'Akrilik bening 3mm, ring O tebal, gantungan putar',
    qty: 100,
    pricePerPcs: 15000,
    omzet: 1500000,
    hppBreakdown: {
      bahanBaku: 5000,
      tintaSablon: 1000,
      tenagaKerja: 1500,
      kemasan: 500,
      overhead: 500,
      totalHppPerPcs: 8500,
      totalHpp: 850000,
    },
    profit: 650000,
    marginPct: 43.3,
    paymentStatus: 'DP',
    dpAmount: 500000,
    remainingPayment: 1000000,
    processStatus: 'PROSES_CETAK',
    queueOrder: 1,
    designFiles: [
      {
        id: 'df-1',
        orderId: 'ord-adv-1',
        fileName: 'design_logo.cdr',
        fileSize: 2048576,
        fileType: 'CDR',
        fileUrl: 'https://storage/df-1.cdr',
        isReadyToPrint: true,
        uploadedAt: '2026-10-24T10:00:00Z',
      },
    ],
    notes: 'Pastikan warna Pantone 286 C akurat.',
    createdAt: '2026-10-24T08:00:00Z',
    updatedAt: '2026-10-24T08:00:00Z',
    ...overrides,
  };
}

function renderCard(order: Order, dragProps?: Record<string, unknown>): string {
  const element = React.createElement(
    OrderProvider,
    null,
    React.createElement(OrderRowCard, {
      order,
      index: 0,
      dragHandleProps: dragProps,
    })
  );
  return renderToStaticMarkup(element);
}

describe('OrderRowCard Adversarial Stress Testing', () => {
  // ==========================================================================
  // 1. SUPER-LONG SPECS (1000+ characters, multiple paragraphs, unspaced text)
  // ==========================================================================
  describe('Challenge 1: Super-Long Specifications', () => {
    test('ADV-SPEC-01: Handles 1500+ char specs with multiple paragraphs without blowout', () => {
      const longSpecs = Array.from({ length: 15 }, (_, i) =>
        `Paragraf ${i + 1}: Bahan Akrilik Grade A 3.5mm, potong laser CO2 presisi tinggi dengan toleransi 0.05mm, sablon UV direct-to-substrate 8 pass CMYK + White + Varnish finishing kilap tahan gores.`
      ).join('\n\n');

      assert.ok(longSpecs.length > 1500, `Specs length should exceed 1500, got ${longSpecs.length}`);

      const html = renderCard(createMockOrder({ specs: longSpecs }));

      // Must have vertical scroll constraint classes
      assert.ok(html.includes('max-h-14'), 'Specs container must enforce max-h-14 (56px)');
      assert.ok(html.includes('overflow-y-auto'), 'Specs container must allow vertical scrolling');
      assert.ok(html.includes('overflow-x-hidden'), 'Specs container must strictly hide horizontal overflow');
      assert.ok(html.includes('break-words'), 'Specs container must wrap long words');
      assert.ok(html.includes('pr-1'), 'Specs container must include right padding for scrollbar');

      // Full text must be preserved in title attribute for tooltip accessibility
      assert.ok(html.includes('title="Paragraf 1:'), 'Title attribute should preserve full specs text for accessibility');
    });

    test('ADV-SPEC-02: Handles unbroken 1000-char string without spaces (anti-blowout test)', () => {
      const unbrokenText = 'SPECS_' + 'X'.repeat(1000) + '_END';
      const html = renderCard(createMockOrder({ specs: unbrokenText }));

      // break-words and min-w-0 on parent containers prevent flex/grid blowouts
      assert.ok(html.includes('break-words'), 'Must contain break-words class');
      assert.ok(html.includes('overflow-x-hidden'), 'Must contain overflow-x-hidden');
      assert.ok(html.includes('min-w-0'), 'Must contain min-w-0');
      assert.ok(html.includes(unbrokenText), 'Content must be present in DOM');
    });
  });

  // ==========================================================================
  // 2. SUPER-LONG NOTES (500+ characters, complex remarks)
  // ==========================================================================
  describe('Challenge 2: Super-Long Notes', () => {
    test('ADV-NOTE-01: Handles 800+ char notes with vertical scroll constraint and Notion callout', () => {
      const longNotes =
        'INSTRUKSI KHUSUS WORKSHOP: ' +
        'Harap diperhatikan bahwa pemesan meminta approval fisik 1 pcs sebelum dilanjutkan produksi massal 500 pcs. ' +
        'Pengiriman wajib menggunakan packing bubble wrap 3 lapis per box kayu untuk menghindari lecet selama ekspedisi udara ke Makassar. ' +
        'Hubungi PIC Pak Bambang di nomor darurat jika ada kendala setting desain pada spot white atau gradasi warna logo kiri atas. ' +
        'Deadline pengiriman tidak boleh mundur karena akan digunakan untuk acara serah terima jabatan pada hari Senin pagi jam 08:00 WITA.';

      assert.ok(longNotes.length > 500, `Notes length should exceed 500, got ${longNotes.length}`);

      const html = renderCard(createMockOrder({ notes: longNotes }));

      // Yellow callout styling
      assert.ok(html.includes('bg-[#fef7d6]'), 'Must render yellow callout background');
      assert.ok(html.includes('border-[#f9e79f]'), 'Must render yellow callout border');
      assert.ok(html.includes('text-[#523410]'), 'Must use high-contrast dark brown text (WCAG AA)');
      assert.ok(html.includes('text-[#793400]'), 'Must use dark rust bold label for "Catatan:"');

      // Scroll and wrap constraints
      assert.ok(html.includes('max-h-14'), 'Notes container must enforce max-h-14 (56px)');
      assert.ok(html.includes('overflow-y-auto'), 'Notes container must allow vertical scrolling');
      assert.ok(html.includes('overflow-x-hidden'), 'Notes container must strictly prevent horizontal scroll');
      assert.ok(html.includes('break-words'), 'Notes container must break long words');
      assert.ok(html.includes('Catatan: '), 'Must render Catatan: label');
    });

    test('ADV-NOTE-02: Handles unbroken 600-char string in notes', () => {
      const unbrokenNotes = 'CATATAN_' + 'W'.repeat(600) + '_SELESAI';
      const html = renderCard(createMockOrder({ notes: unbrokenNotes }));

      assert.ok(html.includes('break-words'), 'Must contain break-words in notes container');
      assert.ok(html.includes('overflow-x-hidden'), 'Must contain overflow-x-hidden in notes container');
    });
  });

  // ==========================================================================
  // 3. EMPTY SPECS (" ", whitespace, undefined)
  // ==========================================================================
  describe('Challenge 3: Empty Specs Fallback Handling', () => {
    test('ADV-EMPTY-SPEC-01: Empty string "" renders "Spesifikasi standar" fallback', () => {
      const html = renderCard(createMockOrder({ specs: '' }));
      assert.ok(html.includes('Spesifikasi standar'), 'Must render fallback "Spesifikasi standar"');
      assert.ok(html.includes('italic'), 'Fallback must have italic styling');
      assert.ok(html.includes('text-[#5d5b54]'), 'Fallback must use Notion slate text color');
    });

    test('ADV-EMPTY-SPEC-02: Whitespace-only specs "   \\n\\t  " renders fallback', () => {
      const html = renderCard(createMockOrder({ specs: '   \n\t   ' }));
      assert.ok(html.includes('Spesifikasi standar'), 'Whitespace-only specs must trigger fallback');
    });

    test('ADV-EMPTY-SPEC-03: Undefined specs renders fallback cleanly without runtime crash', () => {
      const html = renderCard(createMockOrder({ specs: undefined as any }));
      assert.ok(html.includes('Spesifikasi standar'), 'Undefined specs must trigger fallback');
    });
  });

  // ==========================================================================
  // 4. EMPTY NOTES (" ", whitespace, undefined, null)
  // ==========================================================================
  describe('Challenge 4: Empty Notes Handling', () => {
    test('ADV-EMPTY-NOTE-01: Empty string "" completely omits notes callout box', () => {
      // Use paymentStatus LUNAS so payment dropdown does not introduce bg-[#fef7d6]
      const html = renderCard(createMockOrder({ notes: '', paymentStatus: 'LUNAS' }));
      assert.ok(!html.includes('Catatan:'), 'Must not render "Catatan:" banner when notes is empty string');
      assert.ok(!html.includes('bg-[#fef7d6]'), 'Must not render yellow callout container');
      assert.ok(!html.includes('text-[#523410]'), 'Must not render notes text style');
    });

    test('ADV-EMPTY-NOTE-02: Whitespace-only notes "   \\t  " omits notes callout box', () => {
      const html = renderCard(createMockOrder({ notes: '   \t  ', paymentStatus: 'LUNAS' }));
      assert.ok(!html.includes('Catatan:'), 'Must not render "Catatan:" banner for whitespace notes');
      assert.ok(!html.includes('bg-[#fef7d6]'), 'Must not render yellow callout container');
      assert.ok(!html.includes('text-[#523410]'), 'Must not render notes text style');
    });

    test('ADV-EMPTY-NOTE-03: Undefined notes omits notes callout box without crash', () => {
      const html = renderCard(createMockOrder({ notes: undefined, paymentStatus: 'LUNAS' }));
      assert.ok(!html.includes('Catatan:'), 'Must not render "Catatan:" banner when notes is undefined');
      assert.ok(!html.includes('bg-[#fef7d6]'), 'Must not render yellow callout container');
      assert.ok(!html.includes('text-[#523410]'), 'Must not render notes text style');
    });

    test('ADV-EMPTY-NOTE-04: Null notes omits notes callout box without crash', () => {
      const html = renderCard(createMockOrder({ notes: null as any, paymentStatus: 'LUNAS' }));
      assert.ok(!html.includes('Catatan:'), 'Must not render "Catatan:" banner when notes is null');
      assert.ok(!html.includes('bg-[#fef7d6]'), 'Must not render yellow callout container');
      assert.ok(!html.includes('text-[#523410]'), 'Must not render notes text style');
    });
  });

  // ==========================================================================
  // 5. EXTREME CURRENCY & QUANTITY VALUES
  // ==========================================================================
  describe('Challenge 5: Extreme Values & Edge Financial Numbers', () => {
    test('ADV-VAL-01: Handles massive batch (qty: 100,000, omzet: Rp 2,500,000,000)', () => {
      const html = renderCard(
        createMockOrder({
          qty: 100000,
          pricePerPcs: 25000,
          omzet: 2500000000,
          hppBreakdown: {
            bahanBaku: 10000,
            tintaSablon: 2000,
            tenagaKerja: 3000,
            kemasan: 1000,
            overhead: 1000,
            totalHppPerPcs: 17000,
            totalHpp: 1700000000,
          },
          profit: 800000000,
          marginPct: 32.0,
        })
      );

      // Verify Indonesian locale thousand separators
      assert.ok(html.includes('100.000'), 'Must format 100,000 as 100.000');
      assert.ok(html.includes('pcs'), 'Must include pcs unit');
      assert.ok(html.includes('@Rp 25.000'), 'Must format unit price @Rp 25.000');
      assert.ok(html.includes('Rp 2.500.000.000'), 'Must format omzet in billions IDR');
      assert.ok(html.includes('Rp 1.700.000.000'), 'Must format total HPP in billions IDR');
      assert.ok(html.includes('Rp 800.000.000'), 'Must format profit in millions IDR');
      assert.ok(html.includes('Laba · 32%'), 'Must format margin % cleanly');

      // Verify truncate and min-w-0 exist on stat containers to prevent horizontal blowouts
      assert.ok(html.includes('min-w-0'), 'Stat containers must have min-w-0');
      assert.ok(html.includes('truncate'), 'Numeric text elements must have truncate class');
    });

    test('ADV-VAL-02: Handles severe loss / negative margin (omzet 100k, HPP 1M, profit -900k)', () => {
      const html = renderCard(
        createMockOrder({
          qty: 10,
          pricePerPcs: 10000,
          omzet: 100000,
          hppBreakdown: {
            bahanBaku: 50000,
            tintaSablon: 10000,
            tenagaKerja: 20000,
            kemasan: 10000,
            overhead: 10000,
            totalHppPerPcs: 100000,
            totalHpp: 1000000,
          },
          profit: -900000,
          marginPct: -900.0,
        })
      );

      // Negative margin styling
      assert.ok(html.includes('bg-[#fde0ec]'), 'Negative margin tile must use Rose pastel tint');
      assert.ok(html.includes('text-[#7a1c4b]'), 'Negative margin tile must use deep rose text for WCAG AA contrast');
      assert.ok(html.includes('-Rp 900.000'), 'Must format negative profit correctly with leading minus');
      assert.ok(html.includes('-900%'), 'Must display -900% margin');
      assert.ok(html.includes('lucide-trending-down'), 'Must render TrendingDown icon on negative margin');
    });

    test('ADV-VAL-03: Handles break-even order (profit = 0, marginPct = 0)', () => {
      const html = renderCard(
        createMockOrder({
          omzet: 500000,
          profit: 0,
          marginPct: 0.0,
        })
      );

      assert.ok(html.includes('Rp 0'), 'Must format profit 0 as Rp 0');
      assert.ok(html.includes('Laba · 0%'), 'Must display 0% margin');
      assert.ok(html.includes('lucide-trending-up'), 'Non-negative margin must render TrendingUp icon');
    });
  });

  // ==========================================================================
  // 6. SPECIAL CHARACTERS, EMOJIS, AND HTML INJECTION
  // ==========================================================================
  describe('Challenge 6: Special Characters, Emojis, and HTML Sanitization', () => {
    test('ADV-SEC-01: Escapes HTML tags in buyerName, specs, notes without executable script tags', () => {
      const maliciousBuyer = "<script>alert('pwned-buyer')</script><b>Bold Buyer</b>";
      const maliciousSpecs = "<img src=x onerror=alert('pwned-specs')><svg onload=alert(1)>";
      const maliciousNotes = "<iframe src='javascript:alert(1)'></iframe><script>eval('bad')</script>";

      const html = renderCard(
        createMockOrder({
          buyerName: maliciousBuyer,
          specs: maliciousSpecs,
          notes: maliciousNotes,
        })
      );

      // React SSR must escape HTML entities
      assert.ok(!html.includes('<script>alert'), 'Must NOT contain raw executable script tag in buyerName');
      assert.ok(!html.includes('<img src=x onerror'), 'Must NOT contain raw executable img tag in specs');
      assert.ok(!html.includes('<iframe src'), 'Must NOT contain raw executable iframe tag in notes');

      // Escaped entities must be present
      assert.ok(html.includes('&lt;script&gt;alert'), 'Script tags must be escaped as &lt;script&gt;');
      assert.ok(html.includes('&lt;img src=x onerror='), 'Img tags must be escaped');
      assert.ok(html.includes('&lt;iframe src='), 'Iframe tags must be escaped');
    });

    test('ADV-SEC-02: Correctly encodes emojis and Unicode symbols in buyerName, specs, notes', () => {
      const emojiBuyer = 'Toko Gantungan Keren 🎯✨ 🔥 (Bu Ani 👩‍💼)';
      const emojiSpecs = 'Akrilik Bening 🌟 Tebal 3mm 💎 Ring Silver 💍';
      const emojiNotes = 'Packing aman ya kak 📦📦🚀🚀 Mohon jangan dibanting ⚠️';

      const html = renderCard(
        createMockOrder({
          buyerName: emojiBuyer,
          specs: emojiSpecs,
          notes: emojiNotes,
        })
      );

      assert.ok(html.includes('🎯✨'), 'Buyer name emojis preserved');
      assert.ok(html.includes('🌟'), 'Specs emojis preserved');
      assert.ok(html.includes('📦📦🚀🚀'), 'Notes emojis preserved');
    });

    test('ADV-SEC-03: WhatsApp URL encodes special characters and cleans formatted phone numbers', () => {
      const buyerWithSymbols = "CV. 'Maju & Jaya' (Cabang #1) / Jakarta";
      const formattedPhone = '+62 (812) 3456-7890';
      const orderNumber = 'EG/2026/001 #TEST&1';

      const html = renderCard(
        createMockOrder({
          buyerName: buyerWithSymbols,
          buyerPhone: formattedPhone,
          orderNumber: orderNumber,
        })
      );

      // cleanPhone strips non-digits: +62 (812) 3456-7890 -> 6281234567890
      assert.ok(html.includes('https://wa.me/6281234567890?text='), 'Wa URL must clean non-digits from phone number');

      // encodeURIComponent on buyerName and orderNumber prevents broken links
      // Note: React SSR escapes single quotes in HTML attributes as &#x27; for security
      const encodedBuyer = encodeURIComponent(buyerWithSymbols).replace(/'/g, '&#x27;');
      const encodedOrderNum = encodeURIComponent(orderNumber).replace(/'/g, '&#x27;');
      assert.ok(html.includes(encodedBuyer), 'Wa URL must encode buyer name URI component with SSR safety');
      assert.ok(html.includes(encodedOrderNum), 'Wa URL must encode order number URI component with SSR safety');
    });
  });

  // ==========================================================================
  // 7. RESPONSIVE CONTAINER & ZERO HORIZONTAL OVERFLOW INVARIANTS
  // ==========================================================================
  describe('Challenge 7: Layout Invariants & Anti-Blowout Architecture', () => {
    test('ADV-LAYOUT-01: Grid layout enforces 2-column tracks (md:grid-cols-12, col-span-7 / col-span-5)', () => {
      const html = renderCard(createMockOrder());

      // Outer container
      assert.ok(html.includes('grid grid-cols-1 md:grid-cols-12'), 'Body must use responsive grid');
      assert.ok(html.includes('items-stretch'), 'Grid items must stretch to match heights');
      assert.ok(html.includes('min-w-0'), 'Outer grid container must have min-w-0');

      // Left column
      assert.ok(html.includes('md:col-span-7'), 'Left column must span 7 tracks');
      assert.ok(html.includes('min-w-0'), 'Left column must have min-w-0');

      // Right column
      assert.ok(html.includes('md:col-span-5'), 'Right column must span 5 tracks');

      // Right column dedicated Notion card box
      assert.ok(html.includes('bg-[#fcfbf9]'), 'Right column box must have #fcfbf9 surface');
      assert.ok(html.includes('border-[#e5e3df]'), 'Right column box must have #e5e3df border');
      assert.ok(html.includes('Detail Pesanan'), 'Right column box must have "Detail Pesanan" header');
    });

    test('ADV-LAYOUT-02: Touch isolation and accessible minimum touch targets', () => {
      const dragProps = { 'data-testid': 'drag-handle' };
      const html = renderCard(createMockOrder(), dragProps);

      // Drag handle touch isolation
      assert.ok(html.includes('touch-none'), 'Drag handle must have touch-none to prevent touch scrolling conflict');
      assert.ok(html.includes('min-w-[36px]'), 'Drag handle must meet minimum 36px width');
      assert.ok(html.includes('min-h-[36px]'), 'Drag handle must meet minimum 36px height');
      assert.ok(html.includes('aria-label="Atur Prioritas Antrean"'), 'Drag handle must have accessible aria-label');

      // Status dropdowns
      assert.ok(html.includes('min-h-[36px]'), 'Status selects must have min-h-[36px]');

      // Action buttons
      assert.ok(html.includes('aria-label="Edit Pesanan"'), 'Edit button must have accessible aria-label');
      assert.ok(html.includes('aria-label="Hapus Pesanan"'), 'Delete button must have accessible aria-label');
    });

    test('ADV-LAYOUT-03: Zero horizontal blowout classes strictly present across all elements', () => {
      const html = renderCard(
        createMockOrder({
          productName: 'P'.repeat(300),
          specs: 'S'.repeat(1500),
          notes: 'N'.repeat(800),
        })
      );

      // Check anti-blowout guardrails
      assert.ok(html.includes('min-w-0'), 'Guaranteed min-w-0 for flex/grid shrink capability');
      assert.ok(html.includes('break-words'), 'Guaranteed break-words for long string wrap');
      assert.ok(html.includes('overflow-x-hidden'), 'Guaranteed overflow-x-hidden in scrollable containers');
      assert.ok(html.includes('truncate'), 'Guaranteed truncate on single-line text');
    });
  });
});
