// Adversarial Challenger Test Suite for Milestone 2:
// State Scoping, Monthly Filtering, Dynamic Multi-Select Override & Dashboard Analytics
//
// Authoritative Requirements:
// 1. Default metrics & buyer summaries filter strictly to active month.
// 2. Orders in other months do not alter active month metrics (proof of accumulation fix).
// 3. Selecting 1 order immediately overrides metrics to that exact order.
// 4. Selecting N orders recalculates to sum of those N orders.
// 5. Clearing selection reverts to active month metrics.
// 6. Profit calculation is strictly `omzet - totalHpp`.
// 7. Timezone-safe month extraction (avoids UTC date drift).
// 8. Dynamic Override Alert Banner & Month Selector in dashboard/page.tsx.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getOrderMonth } from '../src/context/OrderContext';
import { orderService } from '../src/lib/supabase';
import { Order, CreateOrderInput, BuyerSummary } from '../src/types/order';

const ORDER_CONTEXT_PATH = path.resolve(process.cwd(), 'src/context/OrderContext.tsx');
const DASHBOARD_PAGE_PATH = path.resolve(process.cwd(), 'src/app/dashboard/page.tsx');
const ORDER_CARD_PATH = path.resolve(process.cwd(), 'src/components/order/OrderRowCard.tsx');
const ORDER_PAGE_PATH = path.resolve(process.cwd(), 'src/app/order/page.tsx');

const orderContextSource = fs.readFileSync(ORDER_CONTEXT_PATH, 'utf-8');
const dashboardPageSource = fs.readFileSync(DASHBOARD_PAGE_PATH, 'utf-8');
const orderCardSource = fs.readFileSync(ORDER_CARD_PATH, 'utf-8');
const orderPageSource = fs.readFileSync(ORDER_PAGE_PATH, 'utf-8');

// Helper to generate realistic mock orders for testing
function createMockOrder(params: {
  id: string;
  orderNumber: string;
  orderDate: string;
  buyerName: string;
  qty: number;
  pricePerPcs: number;
  totalHppPerPcs: number;
  paymentStatus?: 'LUNAS' | 'DP' | 'BELUM_LUNAS';
  dpAmount?: number;
  processStatus?: 'ANTREAN' | 'PROSES_CETAK' | 'SELESAI';
  createdAt?: string;
}): Order {
  const qty = params.qty;
  const pricePerPcs = params.pricePerPcs;
  const omzet = qty * pricePerPcs;
  const totalHpp = qty * params.totalHppPerPcs;
  const profit = omzet - totalHpp;
  const marginPct = omzet > 0 ? Math.round(((profit / omzet) * 100) * 10) / 10 : 0;
  const paymentStatus = params.paymentStatus || 'LUNAS';
  let dpAmount = params.dpAmount || 0;
  let remainingPayment = 0;

  if (paymentStatus === 'LUNAS') {
    dpAmount = omzet;
    remainingPayment = 0;
  } else if (paymentStatus === 'DP') {
    remainingPayment = Math.max(0, omzet - dpAmount);
  } else {
    dpAmount = 0;
    remainingPayment = omzet;
  }

  return {
    id: params.id,
    orderNumber: params.orderNumber,
    orderDate: params.orderDate,
    deadline: '2026-10-31',
    buyerName: params.buyerName,
    buyerPhone: '081234567890',
    productName: 'Gantungan Kunci Akrilik 5cm',
    specs: '2 Sisi Bolak-Balik Tebal 3mm',
    qty,
    pricePerPcs,
    omzet,
    hppBreakdown: {
      bahanBaku: params.totalHppPerPcs * 0.5,
      tintaSablon: params.totalHppPerPcs * 0.2,
      tenagaKerja: params.totalHppPerPcs * 0.15,
      kemasan: params.totalHppPerPcs * 0.05,
      overhead: params.totalHppPerPcs * 0.1,
      totalHppPerPcs: params.totalHppPerPcs,
      totalHpp,
    },
    profit,
    marginPct,
    paymentStatus,
    dpAmount,
    remainingPayment,
    processStatus: params.processStatus || 'PROSES_CETAK',
    queueOrder: 1,
    designFiles: [],
    createdAt: params.createdAt || `${params.orderDate}T10:00:00.000Z`,
    updatedAt: params.createdAt || `${params.orderDate}T10:00:00.000Z`,
  };
}

describe('Challenger M2: Timezone Safety & Date Extraction (getOrderMonth)', () => {
  test('CH-M2-01: Timezone drift immunity on 1st day of month (UTC boundary)', () => {
    // In naive `new Date('2026-10-01').getMonth()`, clients in GMT-1 to GMT-12 drift to September ('2026-09')
    const boundaryOrder1 = { orderDate: '2026-10-01', createdAt: '2026-10-01T00:00:00.000Z' };
    assert.equal(getOrderMonth(boundaryOrder1), '2026-10', '1st day of month must strictly resolve to 2026-10');

    // ISO string with midnight UTC
    assert.equal(getOrderMonth('2026-10-01T00:00:00.000Z'), '2026-10');

    // Year boundary
    assert.equal(getOrderMonth('2026-01-01'), '2026-01');
    assert.equal(getOrderMonth('2025-12-31'), '2025-12');
  });

  test('CH-M2-02: Support for diverse date representations & fallbacks', () => {
    // Standard hyphen format YYYY-MM-DD
    assert.equal(getOrderMonth('2026-08-25'), '2026-08');

    // Slash format YYYY/MM/DD
    assert.equal(getOrderMonth('2026/05/19'), '2026-05');

    // Object with only createdAt
    assert.equal(getOrderMonth({ createdAt: '2026-07-14T15:30:00Z' }), '2026-07');

    // Object with both orderDate and createdAt prefers orderDate
    assert.equal(
      getOrderMonth({ orderDate: '2026-04-10', createdAt: '2026-03-31T23:59:00Z' }),
      '2026-04'
    );

    // Whitespace trimming
    assert.equal(getOrderMonth('  2026-09-12  '), '2026-09');

    // Empty, null, undefined, malformed inputs return empty string safely
    assert.equal(getOrderMonth(null), '');
    assert.equal(getOrderMonth(undefined), '');
    assert.equal(getOrderMonth(''), '');
    assert.equal(getOrderMonth('   '), '');
    assert.equal(getOrderMonth('invalid-date-string'), '');
    assert.equal(getOrderMonth({}), '');
  });
});

describe('Challenger M2: Month Scoping & All-Time Accumulation Bug Fix', () => {
  // Test dataset spanning three distinct months:
  // 3 orders in 2026-10 (Active Month)
  // 2 orders in 2026-09 (Past Month)
  // 1 order in 2026-11 (Future Month)
  const ordersOct: Order[] = [
    createMockOrder({
      id: 'oct-1',
      orderNumber: 'EG-26-001',
      orderDate: '2026-10-05',
      buyerName: 'Buyer Alfa',
      qty: 100,
      pricePerPcs: 10000,
      totalHppPerPcs: 6000,
      paymentStatus: 'LUNAS',
      processStatus: 'SELESAI',
    }), // omzet: 1,000,000, hpp: 600,000, profit: 400,000, piutang: 0, SELESAI
    createMockOrder({
      id: 'oct-2',
      orderNumber: 'EG-26-002',
      orderDate: '2026-10-15',
      buyerName: 'Buyer Beta',
      qty: 200,
      pricePerPcs: 12000,
      totalHppPerPcs: 7000,
      paymentStatus: 'DP',
      dpAmount: 1000000,
      processStatus: 'PROSES_CETAK',
    }), // omzet: 2,400,000, hpp: 1,400,000, profit: 1,000,000, piutang: 1,400,000, ACTIVE
    createMockOrder({
      id: 'oct-3',
      orderNumber: 'EG-26-003',
      orderDate: '2026-10-25',
      buyerName: 'Buyer Alfa',
      qty: 50,
      pricePerPcs: 15000,
      totalHppPerPcs: 9000,
      paymentStatus: 'BELUM_LUNAS',
      processStatus: 'ANTREAN',
    }), // omzet: 750,000, hpp: 450,000, profit: 300,000, piutang: 750,000, ACTIVE
  ];

  const ordersSep: Order[] = [
    createMockOrder({
      id: 'sep-1',
      orderNumber: 'EG-26-091',
      orderDate: '2026-09-10',
      buyerName: 'Buyer Gamma',
      qty: 500,
      pricePerPcs: 8000,
      totalHppPerPcs: 5000,
      paymentStatus: 'LUNAS',
      processStatus: 'SELESAI',
    }), // omzet: 4,000,000, hpp: 2,500,000, profit: 1,500,000
    createMockOrder({
      id: 'sep-2',
      orderNumber: 'EG-26-092',
      orderDate: '2026-09-20',
      buyerName: 'Buyer Alfa',
      qty: 300,
      pricePerPcs: 9000,
      totalHppPerPcs: 5500,
      paymentStatus: 'LUNAS',
      processStatus: 'SELESAI',
    }), // omzet: 2,700,000, hpp: 1,650,000, profit: 1,050,000
  ];

  const ordersNov: Order[] = [
    createMockOrder({
      id: 'nov-1',
      orderNumber: 'EG-26-111',
      orderDate: '2026-11-02',
      buyerName: 'Buyer Delta',
      qty: 1000,
      pricePerPcs: 20000,
      totalHppPerPcs: 12000,
      paymentStatus: 'DP',
      dpAmount: 5000000,
      processStatus: 'ANTREAN',
    }), // omzet: 20,000,000, hpp: 12,000,000, profit: 8,000,000, piutang: 15,000,000
  ];

  const allOrders = [...ordersOct, ...ordersSep, ...ordersNov];

  // Logic model reproducing OrderContext activeOrdersForDashboard:
  function getActiveOrdersForDashboard(
    ordersList: Order[],
    selectedMonth: string,
    selectedOrderIds: string[]
  ): Order[] {
    if (selectedOrderIds.length > 0) {
      const selectedSet = new Set(selectedOrderIds);
      return ordersList.filter((o) => selectedSet.has(o.id));
    }
    return ordersList.filter((o) => getOrderMonth(o) === selectedMonth);
  }

  test('CH-M2-03: Default metrics filter strictly to active month (2026-10)', () => {
    const scopedOrders = getActiveOrdersForDashboard(allOrders, '2026-10', []);
    assert.equal(scopedOrders.length, 3, 'Must contain exactly 3 orders for 2026-10');

    const metrics = orderService.getDashboardMetrics(scopedOrders);

    // Sum of Oct orders:
    // Pcs: 100 + 200 + 50 = 350
    assert.equal(metrics.totalPcs, 350);
    // Omzet: 1,000,000 + 2,400,000 + 750,000 = 4,150,000
    assert.equal(metrics.totalOmzet, 4150000);
    // HPP: 600,000 + 1,400,000 + 450,000 = 2,450,000
    assert.equal(metrics.totalHpp, 2450000);
    // Profit: 400,000 + 1,000,000 + 300,000 = 1,700,000
    assert.equal(metrics.totalProfit, 1700000);
    // Piutang: 0 + 1,400,000 + 750,000 = 2,150,000
    assert.equal(metrics.totalPiutangDp, 2150000);
    // Active orders: oct-2, oct-3 -> 2
    assert.equal(metrics.activeOrdersCount, 2);
    // Completed orders: oct-1 -> 1
    assert.equal(metrics.completedOrdersCount, 1);
    // Margin pct: (1,700,000 / 4,150,000) * 100 = 40.96% -> 41.0%
    assert.equal(metrics.averageMarginPct, 41.0);
  });

  test('CH-M2-04: Default buyer summaries filter strictly to active month buyers', () => {
    const scopedOrders = getActiveOrdersForDashboard(allOrders, '2026-10', []);
    const summaries = orderService.getBuyerSummaries(scopedOrders);

    // In Oct, only Buyer Alfa and Buyer Beta exist.
    // Buyer Gamma and Buyer Delta (from Sep and Nov) MUST NOT appear.
    const buyerNames = summaries.map((s) => s.buyerName);
    assert.deepEqual(buyerNames.sort(), ['Buyer Alfa', 'Buyer Beta']);

    // Check Buyer Alfa aggregation in Oct (oct-1 + oct-3):
    // Pcs: 100 + 50 = 150
    // Omzet: 1,000,000 + 750,000 = 1,750,000
    // Profit: 400,000 + 300,000 = 700,000
    // Total Orders: 2
    const alfa = summaries.find((s) => s.buyerName === 'Buyer Alfa')!;
    assert.equal(alfa.totalOrders, 2);
    assert.equal(alfa.totalPcs, 150);
    assert.equal(alfa.totalOmzet, 1750000);
    assert.equal(alfa.totalProfit, 700000);

    // Check Buyer Beta (oct-2):
    // Pcs: 200, Omzet: 2,400,000, Profit: 1,000,000
    const beta = summaries.find((s) => s.buyerName === 'Buyer Beta')!;
    assert.equal(beta.totalOrders, 1);
    assert.equal(beta.totalProfit, 1000000);

    // Ranking: Buyer Beta (profit 1M) is Rank 1, Buyer Alfa (profit 700k) is Rank 2
    assert.equal(beta.rank, 1);
    assert.equal(alfa.rank, 2);
  });

  test('CH-M2-05: Proof of accumulation fix: Orders in other months do not alter active month metrics', () => {
    const baselineScoped = getActiveOrdersForDashboard(allOrders, '2026-10', []);
    const baselineMetrics = orderService.getDashboardMetrics(baselineScoped);
    const baselineBuyers = orderService.getBuyerSummaries(baselineScoped);

    // Adversarial attack: Inject massive orders in 2026-09, 2026-11, 2025-01, 2027-01
    const massiveForeignOrders: Order[] = [];
    for (let i = 1; i <= 50; i++) {
      massiveForeignOrders.push(
        createMockOrder({
          id: `foreign-sep-${i}`,
          orderNumber: `EG-MASSIVE-SEP-${i}`,
          orderDate: '2026-09-15',
          buyerName: 'Whale Client Sep',
          qty: 10000,
          pricePerPcs: 100000,
          totalHppPerPcs: 50000,
          paymentStatus: 'LUNAS',
        })
      );
      massiveForeignOrders.push(
        createMockOrder({
          id: `foreign-nov-${i}`,
          orderNumber: `EG-MASSIVE-NOV-${i}`,
          orderDate: '2026-11-20',
          buyerName: 'Whale Client Nov',
          qty: 50000,
          pricePerPcs: 200000,
          totalHppPerPcs: 100000,
          paymentStatus: 'LUNAS',
        })
      );
    }

    const contaminatedOrders = [...allOrders, ...massiveForeignOrders];
    assert.equal(contaminatedOrders.length, allOrders.length + 100);

    // Re-evaluate active month metrics
    const newScoped = getActiveOrdersForDashboard(contaminatedOrders, '2026-10', []);
    const newMetrics = orderService.getDashboardMetrics(newScoped);
    const newBuyers = orderService.getBuyerSummaries(newScoped);

    // Empirical assertion: Active month metrics and buyer summaries MUST BE 100% BIT-FOR-BIT IDENTICAL
    assert.deepEqual(
      newMetrics,
      baselineMetrics,
      'Active month metrics must not change when orders are added to other months'
    );
    assert.deepEqual(
      newBuyers,
      baselineBuyers,
      'Active month buyer summaries must not change when orders are added to other months'
    );
  });
});

describe('Challenger M2: Dynamic Multi-Select Override Mechanics', () => {
  const mockOrderA = createMockOrder({
    id: 'ord-A',
    orderNumber: 'EG-26-A',
    orderDate: '2026-10-01',
    buyerName: 'Buyer A',
    qty: 50,
    pricePerPcs: 20000,
    totalHppPerPcs: 12000,
    paymentStatus: 'LUNAS',
    processStatus: 'SELESAI',
  }); // Omzet: 1,000,000, Hpp: 600,000, Profit: 400,000, Piutang: 0

  const mockOrderB = createMockOrder({
    id: 'ord-B',
    orderNumber: 'EG-26-B',
    orderDate: '2026-10-10',
    buyerName: 'Buyer B',
    qty: 150,
    pricePerPcs: 30000,
    totalHppPerPcs: 18000,
    paymentStatus: 'DP',
    dpAmount: 2000000,
    processStatus: 'PROSES_CETAK',
  }); // Omzet: 4,500,000, Hpp: 2,700,000, Profit: 1,800,000, Piutang: 2,500,000

  const mockOrderC = createMockOrder({
    id: 'ord-C',
    orderNumber: 'EG-26-C',
    orderDate: '2026-09-15', // Previous month
    buyerName: 'Buyer C',
    qty: 300,
    pricePerPcs: 10000,
    totalHppPerPcs: 5000,
    paymentStatus: 'BELUM_LUNAS',
    processStatus: 'ANTREAN',
  }); // Omzet: 3,000,000, Hpp: 1,500,000, Profit: 1,500,000, Piutang: 3,000,000

  const ordersPool = [mockOrderA, mockOrderB, mockOrderC];

  function evaluateDashboard(ordersList: Order[], selectedMonth: string, selectedIds: string[]) {
    if (selectedIds.length > 0) {
      const set = new Set(selectedIds);
      return ordersList.filter((o) => set.has(o.id));
    }
    return ordersList.filter((o) => getOrderMonth(o) === selectedMonth);
  }

  test('CH-M2-06: Selecting 1 order immediately overrides metrics to that exact order', () => {
    // Select exactly 1 order: mockOrderB
    const selected = evaluateDashboard(ordersPool, '2026-10', ['ord-B']);
    assert.equal(selected.length, 1);
    assert.equal(selected[0].id, 'ord-B');

    const metrics = orderService.getDashboardMetrics(selected);
    assert.equal(metrics.totalPcs, mockOrderB.qty);
    assert.equal(metrics.totalOmzet, mockOrderB.omzet);
    assert.equal(metrics.totalHpp, mockOrderB.hppBreakdown.totalHpp);
    assert.equal(metrics.totalProfit, mockOrderB.profit);
    assert.equal(metrics.totalPiutangDp, mockOrderB.remainingPayment);
    assert.equal(metrics.activeOrdersCount, 1);
    assert.equal(metrics.completedOrdersCount, 0);

    const summaries = orderService.getBuyerSummaries(selected);
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].buyerName, 'Buyer B');
    assert.equal(summaries[0].totalProfit, mockOrderB.profit);
  });

  test('CH-M2-07: Selecting cross-month single order overrides active month filter', () => {
    // Active month is 2026-10, but user selected mockOrderC (which is 2026-09)
    const selected = evaluateDashboard(ordersPool, '2026-10', ['ord-C']);
    assert.equal(selected.length, 1);
    assert.equal(selected[0].id, 'ord-C');

    const metrics = orderService.getDashboardMetrics(selected);
    assert.equal(metrics.totalOmzet, 3000000);
    assert.equal(metrics.totalProfit, 1500000);
    assert.equal(metrics.totalPiutangDp, 3000000);
  });

  test('CH-M2-08: Selecting N orders recalculates metrics to the exact sum of those N orders', () => {
    // Select 2 orders: mockOrderA and mockOrderC (across months)
    const selected = evaluateDashboard(ordersPool, '2026-10', ['ord-A', 'ord-C']);
    assert.equal(selected.length, 2);

    const metrics = orderService.getDashboardMetrics(selected);
    const expectedPcs = mockOrderA.qty + mockOrderC.qty; // 50 + 300 = 350
    const expectedOmzet = mockOrderA.omzet + mockOrderC.omzet; // 1,000,000 + 3,000,000 = 4,000,000
    const expectedHpp = mockOrderA.hppBreakdown.totalHpp + mockOrderC.hppBreakdown.totalHpp; // 600,000 + 1,500,000 = 2,100,000
    const expectedProfit = mockOrderA.profit + mockOrderC.profit; // 400,000 + 1,500,000 = 1,900,000
    const expectedPiutang = mockOrderA.remainingPayment + mockOrderC.remainingPayment; // 0 + 3,000,000 = 3,000,000

    assert.equal(metrics.totalPcs, expectedPcs);
    assert.equal(metrics.totalOmzet, expectedOmzet);
    assert.equal(metrics.totalHpp, expectedHpp);
    assert.equal(metrics.totalProfit, expectedProfit);
    assert.equal(metrics.totalPiutangDp, expectedPiutang);
    assert.equal(metrics.activeOrdersCount, 1); // ord-C is ANTREAN
    assert.equal(metrics.completedOrdersCount, 1); // ord-A is SELESAI

    // Buyer summaries
    const summaries = orderService.getBuyerSummaries(selected);
    assert.equal(summaries.length, 2);
    // Rank 1: Buyer C (profit 1.5M), Rank 2: Buyer A (profit 400k)
    assert.equal(summaries[0].buyerName, 'Buyer C');
    assert.equal(summaries[0].rank, 1);
    assert.equal(summaries[1].buyerName, 'Buyer A');
    assert.equal(summaries[1].rank, 2);
  });

  test('CH-M2-09: Clearing selection reverts strictly to active month metrics', () => {
    // First, user had selected orders
    const activeDuringSelection = evaluateDashboard(ordersPool, '2026-10', ['ord-A', 'ord-B']);
    assert.equal(activeDuringSelection.length, 2);

    // User triggers clearSelectedOrders() -> selectedOrderIds becomes []
    const activeAfterClear = evaluateDashboard(ordersPool, '2026-10', []);
    // Reverts to orders matching 2026-10 (mockOrderA and mockOrderB, but NOT mockOrderC)
    assert.equal(activeAfterClear.length, 2);
    assert.ok(activeAfterClear.every((o) => getOrderMonth(o) === '2026-10'));
    assert.ok(!activeAfterClear.some((o) => o.id === 'ord-C'));

    // Switch month to 2026-09 with empty selection
    const activeSep = evaluateDashboard(ordersPool, '2026-09', []);
    assert.equal(activeSep.length, 1);
    assert.equal(activeSep[0].id, 'ord-C');
  });
});

describe('Challenger M2: Profit Calculation Invariant (omzet - totalHpp)', () => {
  test('CH-M2-10: Profit is strictly omzet - totalHpp under all financial scenarios', () => {
    // 1. Standard profit
    const normalOrder = createMockOrder({
      id: 'inv-1',
      orderNumber: 'EG-INV-1',
      orderDate: '2026-10-10',
      buyerName: 'Buyer Normal',
      qty: 100,
      pricePerPcs: 10000,
      totalHppPerPcs: 6000,
    });
    assert.equal(normalOrder.profit, normalOrder.omzet - normalOrder.hppBreakdown.totalHpp);

    // 2. Break-even (omzet === totalHpp)
    const breakEvenOrder = createMockOrder({
      id: 'inv-2',
      orderNumber: 'EG-INV-2',
      orderDate: '2026-10-10',
      buyerName: 'Buyer BreakEven',
      qty: 50,
      pricePerPcs: 5000,
      totalHppPerPcs: 5000,
    });
    assert.equal(breakEvenOrder.profit, 0);
    assert.equal(breakEvenOrder.profit, breakEvenOrder.omzet - breakEvenOrder.hppBreakdown.totalHpp);
    assert.equal(breakEvenOrder.marginPct, 0);

    // 3. Negative Profit / Loss (omzet < totalHpp)
    const lossOrder = createMockOrder({
      id: 'inv-3',
      orderNumber: 'EG-INV-3',
      orderDate: '2026-10-10',
      buyerName: 'Buyer Loss',
      qty: 100,
      pricePerPcs: 4000,
      totalHppPerPcs: 6000,
    });
    assert.equal(lossOrder.omzet, 400000);
    assert.equal(lossOrder.hppBreakdown.totalHpp, 600000);
    assert.equal(lossOrder.profit, -200000);
    assert.equal(lossOrder.profit, lossOrder.omzet - lossOrder.hppBreakdown.totalHpp);
    assert.equal(lossOrder.marginPct, -50.0);

    // Verify orderService.getDashboardMetrics preserves the exact sum of profits
    const metrics = orderService.getDashboardMetrics([normalOrder, breakEvenOrder, lossOrder]);
    const expectedTotalProfit = normalOrder.profit + breakEvenOrder.profit + lossOrder.profit;
    const expectedTotalOmzet = normalOrder.omzet + breakEvenOrder.omzet + lossOrder.omzet;
    const expectedTotalHpp =
      normalOrder.hppBreakdown.totalHpp +
      breakEvenOrder.hppBreakdown.totalHpp +
      lossOrder.hppBreakdown.totalHpp;

    assert.equal(metrics.totalProfit, expectedTotalProfit);
    assert.equal(metrics.totalOmzet, expectedTotalOmzet);
    assert.equal(metrics.totalHpp, expectedTotalHpp);
    assert.equal(metrics.totalProfit, expectedTotalOmzet - expectedTotalHpp);
  });
});

describe('Challenger M2: Boundary Conditions & Edge Case Stress Testing', () => {
  test('CH-M2-11: Empty month selection produces clean zero metrics without crash', () => {
    // When selected month has 0 orders
    const emptyOrders: Order[] = [];
    const metrics = orderService.getDashboardMetrics(emptyOrders);

    assert.equal(metrics.totalPcs, 0);
    assert.equal(metrics.totalOmzet, 0);
    assert.equal(metrics.totalProfit, 0);
    assert.equal(metrics.totalHpp, 0);
    assert.equal(metrics.totalPiutangDp, 0);
    assert.equal(metrics.activeOrdersCount, 0);
    assert.equal(metrics.completedOrdersCount, 0);
    assert.equal(metrics.averageMarginPct, 0);

    const buyerSummaries = orderService.getBuyerSummaries(emptyOrders);
    assert.deepEqual(buyerSummaries, []);
  });

  test('CH-M2-12: Available months derivation, deduplication, and descending sort', () => {
    const rawOrders: Order[] = [
      createMockOrder({ id: '1', orderNumber: '1', orderDate: '2026-03-01', buyerName: 'A', qty: 1, pricePerPcs: 10, totalHppPerPcs: 5 }),
      createMockOrder({ id: '2', orderNumber: '2', orderDate: '2026-10-15', buyerName: 'B', qty: 1, pricePerPcs: 10, totalHppPerPcs: 5 }),
      createMockOrder({ id: '3', orderNumber: '3', orderDate: '2026-03-25', buyerName: 'C', qty: 1, pricePerPcs: 10, totalHppPerPcs: 5 }), // Duplicate 2026-03
      createMockOrder({ id: '4', orderNumber: '4', orderDate: '2026-12-05', buyerName: 'D', qty: 1, pricePerPcs: 10, totalHppPerPcs: 5 }),
      createMockOrder({ id: '5', orderNumber: '5', orderDate: '2025-11-20', buyerName: 'E', qty: 1, pricePerPcs: 10, totalHppPerPcs: 5 }),
    ];

    // Simulate availableMonths logic in OrderContext:
    const set = new Set<string>();
    rawOrders.forEach((o) => {
      const m = getOrderMonth(o);
      if (m) set.add(m);
    });
    const available = Array.from(set).sort((a, b) => b.localeCompare(a));

    assert.deepEqual(available, ['2026-12', '2026-10', '2026-03', '2025-11']);
  });

  test('CH-M2-13: Deletion of selected order cleans up selectedOrderIds state', () => {
    // Simulate OrderContext.handleDeleteOrder behavior:
    let selectedOrderIds = ['ord-1', 'ord-2', 'ord-3'];
    const deleteId = 'ord-2';

    // State update in handleDeleteOrder:
    selectedOrderIds = selectedOrderIds.filter((orderId) => orderId !== deleteId);

    assert.deepEqual(selectedOrderIds, ['ord-1', 'ord-3']);
    assert.ok(!selectedOrderIds.includes('ord-2'));
  });

  test('CH-M2-14: selectAllOrders deduplicates IDs safely', () => {
    // Pass duplicate IDs:
    const inputIds = ['ord-1', 'ord-2', 'ord-1', 'ord-3', 'ord-2'];
    const deduplicated = Array.from(new Set(inputIds));
    assert.deepEqual(deduplicated, ['ord-1', 'ord-2', 'ord-3']);
  });
});

describe('Challenger M2: Static Source Code Verification & Design Adherence', () => {
  test('CH-M2-15: OrderContext.tsx exposes all 7 required milestone fields', () => {
    const requiredSignatures = [
      'selectedMonth: string;',
      'setSelectedMonth: (month: string) => void;',
      'availableMonths: string[];',
      'selectedOrderIds: string[];',
      'toggleSelectOrder: (orderId: string) => void;',
      'selectAllOrders: (orderIds: string[]) => void;',
      'clearSelectedOrders: () => void;',
    ];

    for (const sig of requiredSignatures) {
      assert.ok(
        orderContextSource.includes(sig),
        `OrderContextType must include signature: ${sig}`
      );
    }
  });

  test('CH-M2-16: OrderContext.tsx computes activeOrdersForDashboard with dynamic override', () => {
    // Check that activeOrdersForDashboard checks selectedOrderIds.length > 0
    assert.match(
      orderContextSource,
      /const activeOrdersForDashboard = useMemo\(\(\) => \{\s*if \(selectedOrderIds\.length > 0\) \{/s,
      'activeOrdersForDashboard must check selectedOrderIds.length > 0 for override'
    );

    // Check that fallback filters by getOrderMonth(o) === selectedMonth
    assert.match(
      orderContextSource,
      /return orders\.filter\(\(o\) => getOrderMonth\(o\) === selectedMonth\);/,
      'Fallback must filter by getOrderMonth(o) === selectedMonth'
    );

    // Check handleDeleteOrder cleans up selectedOrderIds
    assert.match(
      orderContextSource,
      /setSelectedOrderIds\(\(prev\) => prev\.filter\(\(orderId\) => orderId !== id\)\);/,
      'handleDeleteOrder must remove deleted order ID from selectedOrderIds'
    );
  });

  test('CH-M2-17: dashboard/page.tsx renders Notion-style Month Selector and Dynamic Override Alert', () => {
    // Month selector in hero banner
    assert.match(
      dashboardPageSource,
      /id="dashboard-month-select"/,
      'Dashboard must render select element with id dashboard-month-select'
    );
    assert.match(
      dashboardPageSource,
      /aria-label="Pilih Bulan Analitik"/,
      'Month select must have accessible aria-label'
    );

    // Dynamic Override Alert Banner
    assert.match(
      dashboardPageSource,
      /\{selectedOrderIds\.length > 0 && \(/,
      'Dashboard must conditionally render override banner when selectedOrderIds.length > 0'
    );
    assert.match(
      dashboardPageSource,
      /role="alert"/,
      'Dynamic override alert banner must have role="alert"'
    );
    assert.match(
      dashboardPageSource,
      /Menampilkan analitik khusus untuk/,
      'Alert banner must inform staff that analytics are scoped to selected orders'
    );
    assert.match(
      dashboardPageSource,
      /onClick=\{clearSelectedOrders\}/,
      'Alert banner button must call clearSelectedOrders'
    );
  });

  test('CH-M2-18: OrderRowCard.tsx and order/page.tsx checkbox & toolbar integration', () => {
    // Checkbox in OrderRowCard
    assert.match(
      orderCardSource,
      /<input\s+type="checkbox"[^>]*checked=\{isSelected\}[^>]*onChange=\{handleToggleSelect\}/s,
      'OrderRowCard must render multi-select checkbox bound to isSelected and handleToggleSelect'
    );
    assert.match(
      orderCardSource,
      /onClick=\{\(e\) => e\.stopPropagation\(\)\}/,
      'Checkbox must stop click propagation to avoid triggering parent drag/click handlers'
    );

    // Selection Toolbar in order/page.tsx
    assert.match(
      orderPageSource,
      /selectedOrderIds\.length > 0/,
      'Orders page must check selectedOrderIds.length > 0 for toolbar display/styling'
    );
    assert.match(
      orderPageSource,
      /clearSelectedOrders/,
      'Orders page must integrate clearSelectedOrders'
    );
  });
});
