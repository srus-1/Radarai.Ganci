import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Order } from '../src/types/order';
import {
  getPaymentSettlementSummary,
  isOrderActionable,
  isOrderInProgress,
  isOrderUnpaid,
  paymentStatusMeta,
  productionStatusMeta,
} from '../src/lib/status';
import {
  buildWhatsAppUrl,
  formatDateShort,
  formatMonthLabel,
  formatPercent,
  formatRp,
  formatUnitQty,
  normalizeMaterialKey,
} from '../src/lib/utils';
import {
  buildAdaptiveSeries,
  computeNiceScale,
} from '../src/components/dashboard/MonthlyProfitChart';

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: partial.id ?? 'ord-1',
    orderNumber: partial.orderNumber ?? 'MF26001',
    orderDate: partial.orderDate ?? '2026-11-12',
    deadline: partial.deadline ?? '2026-11-16',
    buyerName: partial.buyerName ?? 'Haka',
    buyerPhone: partial.buyerPhone ?? '081234567890',
    productName: partial.productName ?? 'Ganci',
    specs: partial.specs ?? 'Custom Sablon Presisi',
    qty: partial.qty ?? 1,
    pricePerPcs: partial.pricePerPcs ?? 6000,
    omzet: partial.omzet ?? 6000,
    hppBreakdown: partial.hppBreakdown ?? {
      bahanBaku: 1000,
      tintaSablon: 100,
      tenagaKerja: 150,
      kemasan: 100,
      overhead: 50,
      totalHppPerPcs: 1400,
      totalHpp: 1400,
    },
    profit: partial.profit ?? 4600,
    marginPct: partial.marginPct ?? 76.7,
    paymentStatus: partial.paymentStatus ?? 'LUNAS',
    dpAmount: partial.dpAmount ?? 6000,
    remainingPayment: partial.remainingPayment ?? 0,
    processStatus: partial.processStatus ?? 'SELESAI',
    queueOrder: partial.queueOrder ?? 1,
    designFiles: partial.designFiles ?? [],
    createdAt: partial.createdAt ?? '2026-11-12T08:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-11-12T08:00:00.000Z',
  };
}

describe('Section 3 & Domain Rules Verification (v2)', () => {
  test('paymentStatusMeta maps known enums and falls back safely on unknown enum', () => {
    assert.deepEqual(
      { label: paymentStatusMeta('LUNAS').label, tone: paymentStatusMeta('LUNAS').tone },
      { label: 'Lunas', tone: 'green' }
    );
    assert.deepEqual(
      {
        label: paymentStatusMeta('BELUM_LUNAS').label,
        tone: paymentStatusMeta('BELUM_LUNAS').tone,
      },
      { label: 'Belum lunas', tone: 'amber' }
    );
    assert.deepEqual(
      { label: paymentStatusMeta('DP').label, tone: paymentStatusMeta('DP').tone },
      { label: 'DP', tone: 'amber' }
    );

    const warnings: unknown[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args.join(' '));
    try {
      const unknown = paymentStatusMeta('INVALID_RAW_ENUM');
      assert.equal(unknown.tone, 'neutral');
      assert.equal(unknown.label, 'Perlu cek status');
      assert.ok(warnings.length >= 1);
    } finally {
      console.warn = origWarn;
    }
  });

  test('productionStatusMeta covers all 6 stages cleanly', () => {
    const stages = [
      'ANTREAN',
      'SETTING_DESAIN',
      'PROSES_CETAK',
      'FINISHING',
      'SIAP_KIRIM',
      'SELESAI',
    ] as const;

    stages.forEach((stage, i) => {
      const meta = productionStatusMeta(stage);
      assert.equal(meta.step, i + 1);
      assert.equal(meta.totalSteps, 6);
      assert.ok(!meta.label.includes('_'));
    });
  });

  test('isOrderActionable keeps completed-but-unpaid orders active for billing', () => {
    const donePaid = makeOrder({ processStatus: 'SELESAI', paymentStatus: 'LUNAS' });
    const doneUnpaid = makeOrder({
      processStatus: 'SELESAI',
      paymentStatus: 'BELUM_LUNAS',
      remainingPayment: 30000,
    });
    const printingPaid = makeOrder({ processStatus: 'PROSES_CETAK', paymentStatus: 'LUNAS' });

    assert.equal(isOrderActionable(donePaid), false);
    assert.equal(isOrderActionable(doneUnpaid), true);
    assert.equal(isOrderActionable(printingPaid), true);
    assert.equal(isOrderInProgress(doneUnpaid), false);
    assert.equal(isOrderUnpaid(doneUnpaid), true);
  });

  test('getPaymentSettlementSummary reproduces accurate 58% / Rp 30.000 piutang summary (Bug H1 fix)', () => {
    const orders = [
      makeOrder({ id: '1', omzet: 42000, paymentStatus: 'LUNAS', dpAmount: 42000, remainingPayment: 0 }),
      makeOrder({
        id: '2',
        orderNumber: 'MF26002',
        omzet: 30000,
        paymentStatus: 'BELUM_LUNAS',
        dpAmount: 0,
        remainingPayment: 30000,
      }),
    ];

    const summary = getPaymentSettlementSummary(orders);
    assert.equal(summary.totalOmzet, 72000);
    assert.equal(summary.collectedAmount, 42000);
    assert.equal(summary.receivableAmount, 30000);
    assert.equal(summary.collectedPct, 58);
    assert.equal(summary.unpaidOrdersCount, 1);
    assert.equal(summary.headline, 'Terbayar 58%');
    assert.equal(summary.subline, 'Piutang Rp 30.000 (1 pesanan)');
  });
});

describe('Indonesian Formatting Utilities & WA Validation', () => {
  test('uses comma decimals, dot thousands, lowercase units, uniform dates', () => {
    assert.equal(formatPercent(76.7), '76,7%');
    assert.equal(formatPercent(75.8), '75,8%');
    assert.equal(formatRp(4600), 'Rp 4.600');
    assert.equal(formatRp(197700), 'Rp 197.700');
    assert.equal(formatUnitQty(12, 'pcs'), '12 pcs');
    assert.equal(formatDateShort('2026-11-13'), '13 Nov 2026');
    assert.equal(formatMonthLabel('2026-11'), 'November 2026');
    assert.equal(normalizeMaterialKey('  Gantungan   Kunci Akrilik '), 'gantungan kunci akrilik');
  });

  test('buildWhatsAppUrl rejects empty or invalid numbers and formats valid ID numbers', () => {
    assert.equal(buildWhatsAppUrl(''), null);
    assert.equal(buildWhatsAppUrl('123'), null);
    assert.equal(buildWhatsAppUrl('0812-3456-7890'), 'https://wa.me/6281234567890');
    assert.ok(
      buildWhatsAppUrl('081234567890', 'Halo Laila')?.startsWith(
        'https://wa.me/6281234567890?text='
      )
    );
  });
});

describe('Adaptive Chart Granularity & Auto-Scaled Y-Axis', () => {
  test('computeNiceScale removes hardcoded 5M ceiling and scales small revenue cleanly', () => {
    const scaleSmall = computeNiceScale(30000);
    assert.ok(scaleSmall.max < 100000, `Expected max < 100000, got ${scaleSmall.max}`);
    assert.equal(scaleSmall.max, 40000);

    const scaleMid = computeNiceScale(72000);
    assert.equal(scaleMid.max, 80000);

    const scaleLarge = computeNiceScale(6200000);
    assert.ok(scaleLarge.max >= 6200000);
  });

  test('buildAdaptiveSeries uses daily points when <3 months exist', () => {
    const monthly = [
      { month: '2026-11', monthLabel: 'Nov 2026', omzet: 72000, hpp: 17404, profit: 54596, marginPct: 75.8, pcs: 12 },
    ];
    const orders = [
      makeOrder({ id: 'a', orderDate: '2026-11-10', omzet: 30000, profit: 22000, qty: 5 }),
      makeOrder({ id: 'b', orderDate: '2026-11-12', omzet: 42000, profit: 32596, qty: 7 }),
    ];

    const res = buildAdaptiveSeries(monthly, orders, '2026-11');
    assert.equal(res.title, 'Omzet dan laba per hari, November 2026');
    assert.equal(res.points.length, 2);
    assert.equal(res.points[0].shortLabel, '10 Nov');
    assert.equal(res.points[1].shortLabel, '12 Nov');
  });
});

describe('v2 UI Hygiene & Anti-Regression Static Checks', () => {
  const routesAndShell = [
    'src/app/layout.tsx',
    'src/app/globals.css',
    'src/components/layout/Sidebar.tsx',
    'src/app/order/page.tsx',
    'src/app/history/page.tsx',
    'src/app/capex/page.tsx',
    'src/app/dashboard/page.tsx',
  ];

  test('eliminates banned dark navy hero banners, pastel cards, confetti, pulses, and blur classes', () => {
    for (const rel of routesAndShell) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf-8');
      assert.ok(!content.includes('#0a1530'), `${rel} still references dark navy #0a1530`);
      assert.ok(!content.includes('card-bounce'), `${rel} still references card-bounce`);
      assert.ok(!content.includes('animate-pulse'), `${rel} still references animate-pulse`);
      assert.ok(!content.includes('shadow-notion-hero'), `${rel} still references shadow-notion-hero`);
      assert.ok(!content.includes('backdrop-blur'), `${rel} still uses backdrop-blur`);
      assert.ok(!content.includes('bg-[#dcecfa]'), `${rel} still uses pastel sky card`);
      assert.ok(!content.includes('bg-[#e6e0f5]'), `${rel} still uses pastel lavender card`);
      assert.ok(!content.includes('bg-[#d9f3e1]'), `${rel} still uses pastel mint card`);
      assert.ok(!content.includes('bg-[#ffe8d4]'), `${rel} still uses pastel peach card`);
      assert.ok(!content.includes('bg-[#fef7d6]'), `${rel} still uses pastel yellow card`);
    }
  });

  test('layout removes TopHeader and includes keyboard skip link', () => {
    const layout = fs.readFileSync(path.resolve(process.cwd(), 'src/app/layout.tsx'), 'utf-8');
    assert.ok(!layout.includes('TopHeader'));
    assert.ok(layout.includes('#page-main-heading'));
  });
});
