import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOrderMonth } from '../src/context/OrderContext';
import { orderService } from '../src/lib/supabase';
import { Order } from '../src/types/order';

describe('Milestone 2 Logic & State Reviewer Verification Suite', () => {
  describe('Requirement 1: Timezone-Safe Month Extraction (getOrderMonth)', () => {
    test('extracts YYYY-MM from standard YYYY-MM-DD string', () => {
      assert.equal(getOrderMonth('2026-10-15'), '2026-10');
      assert.equal(getOrderMonth('2025-01-01'), '2025-01');
      assert.equal(getOrderMonth('2026-12-31'), '2026-12');
    });

    test('extracts YYYY-MM from ISO-8601 timestamp string', () => {
      assert.equal(getOrderMonth('2026-10-01T00:00:00.000Z'), '2026-10');
      assert.equal(getOrderMonth('2026-04-30T23:59:59.999Z'), '2026-04');
    });

    test('extracts YYYY-MM from slash-formatted YYYY/MM/DD string', () => {
      assert.equal(getOrderMonth('2026/08/20'), '2026-08');
    });

    test('extracts month from Order-like objects with orderDate or createdAt', () => {
      assert.equal(getOrderMonth({ orderDate: '2026-07-04' }), '2026-07');
      assert.equal(getOrderMonth({ createdAt: '2026-09-12T10:00:00Z' }), '2026-09');
      // orderDate takes precedence over createdAt
      assert.equal(
        getOrderMonth({ orderDate: '2026-06-01', createdAt: '2026-05-15T00:00:00Z' }),
        '2026-06'
      );
    });

    test('handles null, undefined, empty, and invalid inputs gracefully without throwing', () => {
      assert.equal(getOrderMonth(null), '');
      assert.equal(getOrderMonth(undefined), '');
      assert.equal(getOrderMonth(''), '');
      assert.equal(getOrderMonth('   '), '');
      assert.equal(getOrderMonth({}), '');
      assert.equal(getOrderMonth('not-a-date'), '');
      assert.equal(getOrderMonth('26-10-2026'), '');
    });
  });

  describe('Requirement 2: Month Scoping & All-Time Accumulation Fix', () => {
    const mockOrders: Order[] = [
      {
        id: 'ord-1',
        orderNumber: 'EG-2026-001',
        buyerName: 'Buyer October A',
        buyerPhone: '08123456789',
        productName: 'Ganci 1',
        specs: 'Akrilik 3mm',
        orderDate: '2026-10-05',
        deadline: '2026-10-10',
        qty: 100,
        pricePerPcs: 5000,
        omzet: 500000,
        hppBreakdown: { bahanBaku: 100000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 100000, totalHppPerPcs: 2000, totalHpp: 200000 },
        profit: 300000,
        marginPct: 60,
        paymentStatus: 'LUNAS',
        dpAmount: 0,
        remainingPayment: 0,
        processStatus: 'SELESAI',
        queueOrder: 1,
        designFiles: [],
        createdAt: '2026-10-05T00:00:00Z',
        updatedAt: '2026-10-05T00:00:00Z',
      },
      {
        id: 'ord-2',
        orderNumber: 'EG-2026-002',
        buyerName: 'Buyer October B',
        buyerPhone: '08123456789',
        productName: 'Ganci 2',
        specs: 'Akrilik 3mm',
        orderDate: '2026-10-18',
        deadline: '2026-10-25',
        qty: 200,
        pricePerPcs: 5000,
        omzet: 1000000,
        hppBreakdown: { bahanBaku: 200000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 200000, totalHppPerPcs: 2000, totalHpp: 400000 },
        profit: 600000,
        marginPct: 60,
        paymentStatus: 'DP',
        dpAmount: 400000,
        remainingPayment: 600000,
        processStatus: 'PROSES_CETAK',
        queueOrder: 2,
        designFiles: [],
        createdAt: '2026-10-18T00:00:00Z',
        updatedAt: '2026-10-18T00:00:00Z',
      },
      {
        id: 'ord-3',
        orderNumber: 'EG-2026-003',
        buyerName: 'Buyer September C',
        buyerPhone: '08123456789',
        productName: 'Ganci 3',
        specs: 'Akrilik 3mm',
        orderDate: '2026-09-22',
        deadline: '2026-09-28',
        qty: 50,
        pricePerPcs: 10000,
        omzet: 500000,
        hppBreakdown: { bahanBaku: 150000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 100000, totalHppPerPcs: 5000, totalHpp: 250000 },
        profit: 250000,
        marginPct: 50,
        paymentStatus: 'LUNAS',
        dpAmount: 0,
        remainingPayment: 0,
        processStatus: 'SELESAI',
        queueOrder: 3,
        designFiles: [],
        createdAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T00:00:00Z',
      },
      {
        id: 'ord-4',
        orderNumber: 'EG-2026-004',
        buyerName: 'Buyer August D',
        buyerPhone: '08123456789',
        productName: 'Ganci 4',
        specs: 'Akrilik 3mm',
        orderDate: '2026-08-10',
        deadline: '2026-08-15',
        qty: 300,
        pricePerPcs: 4000,
        omzet: 1200000,
        hppBreakdown: { bahanBaku: 300000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 300000, totalHppPerPcs: 2000, totalHpp: 600000 },
        profit: 600000,
        marginPct: 50,
        paymentStatus: 'LUNAS',
        dpAmount: 0,
        remainingPayment: 0,
        processStatus: 'SELESAI',
        queueOrder: 4,
        designFiles: [],
        createdAt: '2026-08-10T00:00:00Z',
        updatedAt: '2026-08-10T00:00:00Z',
      },
    ];

    test('filters orders strictly by selectedMonth (fixing all-time accumulation)', () => {
      const octoberOrders = mockOrders.filter((o) => getOrderMonth(o) === '2026-10');
      assert.equal(octoberOrders.length, 2);

      const metricsOct = orderService.getDashboardMetrics(octoberOrders);
      // October omzet must be 500k + 1000k = 1500k (NOT all-time 3200k)
      assert.equal(metricsOct.totalOmzet, 1500000);
      assert.equal(metricsOct.totalProfit, 900000);
      assert.equal(metricsOct.totalHpp, 600000);
      assert.equal(metricsOct.totalPcs, 300);
      assert.equal(metricsOct.totalPiutangDp, 600000);
      assert.equal(metricsOct.activeOrdersCount, 1);
      assert.equal(metricsOct.completedOrdersCount, 1);

      const buyerOct = orderService.getBuyerSummaries(octoberOrders);
      assert.equal(buyerOct.length, 2);
      assert.ok(buyerOct.every((b) => b.buyerName.includes('October')));
    });

    test('calculates empty metrics correctly when selecting a month with zero orders', () => {
      const novemberOrders = mockOrders.filter((o) => getOrderMonth(o) === '2026-11');
      assert.equal(novemberOrders.length, 0);

      const metricsNov = orderService.getDashboardMetrics(novemberOrders);
      assert.equal(metricsNov.totalOmzet, 0);
      assert.equal(metricsNov.totalProfit, 0);
      assert.equal(metricsNov.totalHpp, 0);
      assert.equal(metricsNov.totalPcs, 0);
      assert.equal(metricsNov.totalPiutangDp, 0);
      assert.equal(metricsNov.activeOrdersCount, 0);
      assert.equal(metricsNov.completedOrdersCount, 0);
      assert.equal(metricsNov.averageMarginPct, 0);

      const buyerNov = orderService.getBuyerSummaries(novemberOrders);
      assert.deepEqual(buyerNov, []);
    });
  });

  describe('Requirement 3: Dynamic Multi-Select Override', () => {
    const mockOrders: Order[] = [
      {
        id: 'ord-101',
        orderNumber: 'EG-2026-101',
        buyerName: 'Special Selection 1',
        buyerPhone: '08123456789',
        productName: 'Ganci Special',
        specs: 'Akrilik 3mm',
        orderDate: '2026-10-01',
        deadline: '2026-10-06',
        qty: 150,
        pricePerPcs: 6000,
        omzet: 900000,
        hppBreakdown: { bahanBaku: 200000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 150000, totalHppPerPcs: 2333, totalHpp: 350000 },
        profit: 550000,
        marginPct: 61,
        paymentStatus: 'LUNAS',
        dpAmount: 0,
        remainingPayment: 0,
        processStatus: 'SELESAI',
        queueOrder: 1,
        designFiles: [],
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'ord-102',
        orderNumber: 'EG-2026-102',
        buyerName: 'Other Order in Same Month',
        buyerPhone: '08123456789',
        productName: 'Ganci Normal',
        specs: 'Akrilik 3mm',
        orderDate: '2026-10-15',
        deadline: '2026-10-20',
        qty: 100,
        pricePerPcs: 5000,
        omzet: 500000,
        hppBreakdown: { bahanBaku: 100000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 100000, totalHppPerPcs: 2000, totalHpp: 200000 },
        profit: 300000,
        marginPct: 60,
        paymentStatus: 'LUNAS',
        dpAmount: 0,
        remainingPayment: 0,
        processStatus: 'SELESAI',
        queueOrder: 2,
        designFiles: [],
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
      },
      {
        id: 'ord-103',
        orderNumber: 'EG-2026-103',
        buyerName: 'Special Selection 2 (Different Month)',
        buyerPhone: '08123456789',
        productName: 'Ganci Cross-Month',
        specs: 'Akrilik 3mm',
        orderDate: '2026-09-10',
        deadline: '2026-09-15',
        qty: 250,
        pricePerPcs: 4000,
        omzet: 1000000,
        hppBreakdown: { bahanBaku: 250000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 150000, totalHppPerPcs: 1600, totalHpp: 400000 },
        profit: 600000,
        marginPct: 60,
        paymentStatus: 'LUNAS',
        dpAmount: 0,
        remainingPayment: 0,
        processStatus: 'SELESAI',
        queueOrder: 3,
        designFiles: [],
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];

    test('when selectedOrderIds has entries, metrics derive strictly from those orders across months', () => {
      const selectedOrderIds = ['ord-101', 'ord-103'];
      const selectedSet = new Set(selectedOrderIds);

      // Emulate OrderContext activeOrdersForDashboard logic
      const activeOrders =
        selectedOrderIds.length > 0
          ? mockOrders.filter((o) => selectedSet.has(o.id))
          : mockOrders.filter((o) => getOrderMonth(o) === '2026-10');

      assert.equal(activeOrders.length, 2);
      assert.deepEqual(
        activeOrders.map((o) => o.id),
        ['ord-101', 'ord-103']
      );

      const metrics = orderService.getDashboardMetrics(activeOrders);
      assert.equal(metrics.totalOmzet, 1900000); // 900k + 1000k
      assert.equal(metrics.totalProfit, 1150000); // 550k + 600k
      assert.equal(metrics.totalHpp, 750000); // 350k + 400k
      assert.equal(metrics.totalPcs, 400); // 150 + 250

      const buyerSummaries = orderService.getBuyerSummaries(activeOrders);
      assert.equal(buyerSummaries.length, 2);
      assert.ok(buyerSummaries.some((b) => b.buyerName === 'Special Selection 1'));
      assert.ok(buyerSummaries.some((b) => b.buyerName === 'Special Selection 2 (Different Month)'));
      assert.ok(!buyerSummaries.some((b) => b.buyerName === 'Other Order in Same Month'));
    });

    test('when selectedOrderIds is cleared, reverts strictly to selectedMonth filter', () => {
      const selectedOrderIds: string[] = [];
      const selectedMonth = '2026-10';

      const activeOrders =
        selectedOrderIds.length > 0
          ? mockOrders.filter((o) => new Set(selectedOrderIds).has(o.id))
          : mockOrders.filter((o) => getOrderMonth(o) === selectedMonth);

      assert.equal(activeOrders.length, 2);
      assert.deepEqual(
        activeOrders.map((o) => o.id),
        ['ord-101', 'ord-102']
      );

      const metrics = orderService.getDashboardMetrics(activeOrders);
      assert.equal(metrics.totalOmzet, 1400000); // 900k + 500k
      assert.equal(metrics.totalProfit, 850000); // 550k + 300k
    });
  });

  describe('Requirement 4: Dashboard Profit Invariant Isolation', () => {
    test('profit is strictly omzet - totalHpp derived only from order data', () => {
      const sampleOrder: Order = {
        id: 'ord-inv',
        orderNumber: 'EG-2026-INV',
        buyerName: 'Invariant Buyer',
        buyerPhone: '08123456789',
        productName: 'Ganci Invariant',
        specs: 'Akrilik 3mm',
        orderDate: '2026-10-24',
        deadline: '2026-10-30',
        qty: 1000,
        pricePerPcs: 10000,
        omzet: 10000000,
        hppBreakdown: { bahanBaku: 3000000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 1500000, totalHppPerPcs: 4500, totalHpp: 4500000 },
        profit: 5500000,
        marginPct: 55,
        paymentStatus: 'LUNAS',
        dpAmount: 0,
        remainingPayment: 0,
        processStatus: 'SELESAI',
        queueOrder: 1,
        designFiles: [],
        createdAt: '2026-10-24T00:00:00Z',
        updatedAt: '2026-10-24T00:00:00Z',
      };

      const metrics = orderService.getDashboardMetrics([sampleOrder]);
      assert.equal(metrics.totalOmzet, 10000000);
      assert.equal(metrics.totalHpp, 4500000);
      assert.equal(metrics.totalProfit, 5500000);
      assert.equal(metrics.totalProfit, metrics.totalOmzet - metrics.totalHpp);
    });
  });
});
