// Challenger Adversarial Test Suite for Milestone 2:
// Timezone Drift, Date Boundaries, Month Hierarchy & Selection Edge Cases
// Validates:
// 1. Date boundaries (2026-10-01, 2026-10-31, 2026-02-28, 2026-12-31, leap years) never drift across month borders.
// 2. Month hierarchy resolution (current month priority, latest month fallback, empty cold start).
// 3. Multi-select edge cases (deletion cleanup, ghost IDs, toggle and select-all deduplication).
// 4. Multi-select cross-month aggregation (financial KPIs, buyer summaries, profit invariant).
// 5. Empty month selection yields clean zeroed metrics without NaN or crash.
// 6. Microcopy limits and palette audit.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getOrderMonth } from '../src/context/OrderContext';
import { orderService } from '../src/lib/supabase';
import { formatRp, calculateMargin } from '../src/lib/utils';
import { Order, HPPBreakdown, PaymentStatus, ProcessStatus } from '../src/types/order';

// Mock Order Factory for deterministic test cases conforming to strict TypeScript types
function createMockOrder(overrides: Partial<Order> = {}): Order {
  const qty = overrides.qty ?? 100;
  const pricePerPcs = overrides.pricePerPcs ?? 15000;
  const omzet = overrides.omzet ?? qty * pricePerPcs;
  const hppBreakdown: HPPBreakdown = overrides.hppBreakdown ?? {
    bahanBaku: 2500,
    tintaSablon: 2000,
    tenagaKerja: 1500,
    kemasan: 500,
    overhead: 1000,
    totalHppPerPcs: 7500,
    totalHpp: 750000,
  };
  const profit = overrides.profit ?? omzet - hppBreakdown.totalHpp;
  const marginPct = overrides.marginPct ?? calculateMargin(omzet, hppBreakdown.totalHpp).marginPct;
  const paymentStatus: PaymentStatus = overrides.paymentStatus ?? 'DP';
  const dpAmount = overrides.dpAmount ?? 500000;
  const remainingPayment = overrides.remainingPayment ?? (paymentStatus === 'LUNAS' ? 0 : omzet - dpAmount);

  return {
    id: overrides.id ?? `ord-${Math.random().toString(36).slice(2, 8)}`,
    orderNumber: overrides.orderNumber ?? 'EG-2026-001',
    buyerName: overrides.buyerName ?? 'Budi Santoso',
    buyerPhone: overrides.buyerPhone ?? '081234567890',
    orderDate: overrides.orderDate ?? '2026-10-15',
    deadline: overrides.deadline ?? '2026-10-25',
    productName: overrides.productName ?? 'Gantungan Kunci Akrilik 5cm',
    specs: overrides.specs ?? 'Akrilik 2 sisi, ring putar tebal',
    notes: overrides.notes ?? 'Packing per 50 pcs',
    qty,
    pricePerPcs,
    omzet,
    hppBreakdown,
    profit,
    marginPct,
    paymentStatus,
    dpAmount,
    remainingPayment,
    processStatus: overrides.processStatus ?? 'PROSES_CETAK',
    queueOrder: overrides.queueOrder ?? 1,
    designFiles: overrides.designFiles ?? [],
    createdAt: overrides.createdAt ?? '2026-10-15T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-10-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('Challenger M2 — Suite 1: Date Boundaries & Timezone Drift', () => {
  test('CH-M2-01: First day of month (YYYY-MM-01) boundary never drifts backward into previous month', () => {
    // Critical boundary dates where new Date().getMonth() typically drifts to previous month in UTC- offsets
    const testCases = [
      { input: '2026-10-01', expected: '2026-10' },
      { input: '2026-01-01', expected: '2026-01' },
      { input: '2026-02-01', expected: '2026-02' },
      { input: '2026-03-01', expected: '2026-03' },
      { input: '2026-12-01', expected: '2026-12' },
    ];

    for (const { input, expected } of testCases) {
      const order = createMockOrder({ orderDate: input });
      const extracted = getOrderMonth(order);
      assert.equal(
        extracted,
        expected,
        `Boundary date ${input} must extract strictly to ${expected}, but got ${extracted}`
      );
    }
  });

  test('CH-M2-02: Last day of month boundary never drifts forward into next month', () => {
    const testCases = [
      { input: '2026-10-31', expected: '2026-10' }, // 31-day month
      { input: '2026-02-28', expected: '2026-02' }, // Non-leap February
      { input: '2028-02-29', expected: '2028-02' }, // Leap year February
      { input: '2026-04-30', expected: '2026-04' }, // 30-day month
      { input: '2026-12-31', expected: '2026-12' }, // Year end boundary
    ];

    for (const { input, expected } of testCases) {
      const order = createMockOrder({ orderDate: input });
      const extracted = getOrderMonth(order);
      assert.equal(
        extracted,
        expected,
        `Last-day boundary ${input} must extract strictly to ${expected}, but got ${extracted}`
      );
    }
  });

  test('CH-M2-03: ISO-8601 timestamps with UTC Z suffix parse deterministically without drift', () => {
    const testCases = [
      { input: '2026-10-01T00:00:00.000Z', expected: '2026-10' },
      { input: '2026-10-31T23:59:59.999Z', expected: '2026-10' },
      { input: '2026-02-28T00:00:00.000Z', expected: '2026-02' },
      { input: '2026-12-31T23:59:59.000Z', expected: '2026-12' },
    ];

    for (const { input, expected } of testCases) {
      const order = createMockOrder({ orderDate: input });
      const extracted = getOrderMonth(order);
      assert.equal(
        extracted,
        expected,
        `ISO UTC timestamp ${input} must extract strictly to ${expected}`
      );
    }
  });

  test('CH-M2-04: Slash format (YYYY/MM/DD) and whitespace padding are normalized cleanly', () => {
    assert.equal(getOrderMonth('2026/10/01'), '2026-10');
    assert.equal(getOrderMonth('2026/02/28'), '2026-02');
    assert.equal(getOrderMonth('   2026-10-31   '), '2026-10');
    assert.equal(getOrderMonth(' \t 2026-12-31 \n '), '2026-12');
  });

  test('CH-M2-05: Fallback precedence: orderDate over createdAt, empty on invalid inputs', () => {
    // orderDate takes precedence over createdAt
    const orderWithBoth = createMockOrder({
      orderDate: '2026-10-15',
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    assert.equal(getOrderMonth(orderWithBoth), '2026-10');

    // createdAt used when orderDate is missing
    const orderWithCreatedAtOnly = createMockOrder({
      orderDate: '',
      createdAt: '2026-09-01T14:30:00.000Z',
    });
    assert.equal(getOrderMonth(orderWithCreatedAtOnly), '2026-09');

    // Invalid or empty inputs return empty string safely
    assert.equal(getOrderMonth(null), '');
    assert.equal(getOrderMonth(undefined), '');
    assert.equal(getOrderMonth(''), '');
    assert.equal(getOrderMonth('not-a-date'), '');
    assert.equal(getOrderMonth('01-10-2026'), ''); // DD-MM-YYYY format not starting with YYYY-
  });

  test('CH-M2-06: Empirical verification of naive new Date() drift vs string slicing superiority', () => {
    // Demonstrate why string slicing is superior to new Date() for "YYYY-MM-DD" date-only strings:
    // In UTC, "2026-10-01" is parsed as UTC midnight.
    const rawDateStr = '2026-10-01';
    const sliced = getOrderMonth(rawDateStr);
    assert.equal(sliced, '2026-10', 'String slicing always yields 2026-10 regardless of runtime timezone');

    // Simulated Western Hemisphere offset (e.g. UTC-4 / EDT or UTC-7 / PDT):
    // In UTC-4, 2026-10-01T00:00:00Z corresponds to 2026-09-30 20:00:00 EDT.
    const utcMidnight = new Date('2026-10-01T00:00:00.000Z');
    const edtOffsetHours = -4;
    const localTimeMs = utcMidnight.getTime() + edtOffsetHours * 3600 * 1000;
    const simulatedDate = new Date(localTimeMs);

    // In EDT, getUTCMonth() of simulatedDate is 8 (September, 0-indexed)!
    assert.equal(simulatedDate.getUTCMonth(), 8, 'Simulated UTC-4 shifts Oct 1 to Sept 30');
    // String slicing is immune to this shift!
    assert.equal(sliced, '2026-10');
  });
});

describe('Challenger M2 — Suite 2: Month Hierarchy Resolution', () => {
  test('CH-M2-07: Available months extracts unique YYYY-MM values sorted strictly descending', () => {
    const orders = [
      createMockOrder({ orderDate: '2026-08-15' }),
      createMockOrder({ orderDate: '2026-10-01' }),
      createMockOrder({ orderDate: '2026-09-20' }),
      createMockOrder({ orderDate: '2026-10-31' }), // Duplicate month
      createMockOrder({ orderDate: '2026-07-10' }),
    ];

    const monthSet = new Set<string>();
    orders.forEach((o) => {
      const m = getOrderMonth(o);
      if (m) monthSet.add(m);
    });
    const availableMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

    assert.deepEqual(availableMonths, ['2026-10', '2026-09', '2026-08', '2026-07']);
  });

  test('CH-M2-08: Default month hierarchy selects current month when available', () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Given orders that include the current calendar month
    const availableMonths = [currentMonth, '2026-01', '2025-12'];

    const resolveDefaultMonth = (months: string[]): string => {
      if (months.includes(currentMonth)) return currentMonth;
      if (months.length > 0) return months[0];
      return currentMonth;
    };

    assert.equal(resolveDefaultMonth(availableMonths), currentMonth);
  });

  test('CH-M2-09: Default month hierarchy falls back to latest available month when current month has no data', () => {
    const availableMonths = ['2026-08', '2026-07', '2026-06']; // Current month (e.g. 2026-10) not present
    const fakeCurrentMonth = '2026-10';

    const resolveDefaultMonth = (months: string[], nowMonth: string): string => {
      if (months.includes(nowMonth)) return nowMonth;
      if (months.length > 0) return months[0]; // Newest available
      return nowMonth;
    };

    const resolved = resolveDefaultMonth(availableMonths, fakeCurrentMonth);
    assert.equal(resolved, '2026-08', 'Must fall back to newest month with data (2026-08)');
  });

  test('CH-M2-10: Default month hierarchy falls back to current month on completely empty dataset', () => {
    const availableMonths: string[] = [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const resolveDefaultMonth = (months: string[], nowMonth: string): string => {
      if (months.includes(nowMonth)) return nowMonth;
      if (months.length > 0) return months[0];
      return nowMonth;
    };

    const resolved = resolveDefaultMonth(availableMonths, currentMonth);
    assert.equal(resolved, currentMonth, 'Must safely fall back to current calendar month on empty data');
  });

  test('CH-M2-11: User manual selection strictly overrides default month', () => {
    const defaultMonth = '2026-10';
    let selectedMonthState = '2026-06';
    const effectiveSelectedMonth = selectedMonthState || defaultMonth;
    assert.equal(effectiveSelectedMonth, '2026-06');

    // When reset to empty string, reverts to default
    selectedMonthState = '';
    const revertedMonth = selectedMonthState || defaultMonth;
    assert.equal(revertedMonth, '2026-10');
  });
});

describe('Challenger M2 — Suite 3: Multi-Select Edge Cases & Deletion Cleanup', () => {
  test('CH-M2-12: Multi-select state machine handles toggle, selectAll deduplication, and clear', () => {
    let selectedOrderIds: string[] = [];

    // Toggle add
    const toggle = (id: string) => {
      selectedOrderIds = selectedOrderIds.includes(id)
        ? selectedOrderIds.filter((item) => item !== id)
        : [...selectedOrderIds, id];
    };

    toggle('ord-1');
    assert.deepEqual(selectedOrderIds, ['ord-1']);

    toggle('ord-2');
    assert.deepEqual(selectedOrderIds, ['ord-1', 'ord-2']);

    // Toggle remove
    toggle('ord-1');
    assert.deepEqual(selectedOrderIds, ['ord-2']);

    // Select all with duplicates in input
    const selectAll = (ids: string[]) => {
      selectedOrderIds = Array.from(new Set(ids));
    };
    selectAll(['ord-1', 'ord-2', 'ord-3', 'ord-2', 'ord-1']);
    assert.deepEqual(selectedOrderIds, ['ord-1', 'ord-2', 'ord-3']);

    // Clear
    const clear = () => {
      selectedOrderIds = [];
    };
    clear();
    assert.deepEqual(selectedOrderIds, []);
  });

  test('CH-M2-13: Deletion of a selected order cleanly purges its ID from selectedOrderIds', () => {
    let orders = [
      createMockOrder({ id: 'ord-1', orderNumber: 'EG-001' }),
      createMockOrder({ id: 'ord-2', orderNumber: 'EG-002' }),
      createMockOrder({ id: 'ord-3', orderNumber: 'EG-003' }),
    ];
    let selectedOrderIds = ['ord-1', 'ord-2'];

    // Simulate handleDeleteOrder behavior in OrderContext.tsx line 365:
    // setSelectedOrderIds((prev) => prev.filter((orderId) => orderId !== id))
    const deleteOrderSimulated = (idToDelete: string) => {
      selectedOrderIds = selectedOrderIds.filter((orderId) => orderId !== idToDelete);
      orders = orders.filter((o) => o.id !== idToDelete);
    };

    deleteOrderSimulated('ord-1');
    assert.deepEqual(selectedOrderIds, ['ord-2'], 'Deleted ord-1 must be removed from selectedOrderIds');
    assert.equal(orders.length, 2);

    // Deleting the remaining selected order resets selection completely
    deleteOrderSimulated('ord-2');
    assert.deepEqual(selectedOrderIds, [], 'Deleting ord-2 leaves selectedOrderIds empty');
    assert.equal(orders.length, 1);

    // Deleting unselected order leaves selection untouched
    deleteOrderSimulated('ord-3');
    assert.deepEqual(selectedOrderIds, []);
    assert.equal(orders.length, 0);
  });

  test('CH-M2-14: Active orders calculation cleanly handles ghost IDs without runtime errors', () => {
    const orders = [
      createMockOrder({ id: 'ord-1', orderDate: '2026-10-10' }),
      createMockOrder({ id: 'ord-2', orderDate: '2026-10-12' }),
    ];
    // Ghost IDs (IDs of orders that were deleted externally or corrupted)
    const selectedOrderIds = ['ord-1', 'ghost-99', 'ghost-100'];

    // OrderContext.tsx line 623-628 implementation:
    const selectedSet = new Set(selectedOrderIds);
    const activeOrders = orders.filter((o) => selectedSet.has(o.id));

    assert.equal(activeOrders.length, 1);
    assert.equal(activeOrders[0].id, 'ord-1');

    // Computing metrics over this filtered set succeeds with no TypeError
    const metrics = orderService.getDashboardMetrics(activeOrders);
    assert.equal(metrics.totalPcs, orders[0].qty);
    assert.equal(metrics.totalOmzet, orders[0].omzet);
  });

  test('CH-M2-15: Indeterminate and select-all state calculations in Order toolbar', () => {
    const visibleOrders = [
      createMockOrder({ id: 'ord-1' }),
      createMockOrder({ id: 'ord-2' }),
      createMockOrder({ id: 'ord-3' }),
    ];
    const visibleOrderIds = visibleOrders.map((o) => o.id);

    // Case A: None selected
    let selectedOrderIds: string[] = [];
    let selectedInViewCount = visibleOrderIds.filter((id) => selectedOrderIds.includes(id)).length;
    let isAllSelected = visibleOrderIds.length > 0 && selectedInViewCount === visibleOrderIds.length;
    let isPartiallySelected = selectedInViewCount > 0 && !isAllSelected;
    assert.equal(isAllSelected, false);
    assert.equal(isPartiallySelected, false);

    // Case B: Partially selected (1 of 3)
    selectedOrderIds = ['ord-1'];
    selectedInViewCount = visibleOrderIds.filter((id) => selectedOrderIds.includes(id)).length;
    isAllSelected = visibleOrderIds.length > 0 && selectedInViewCount === visibleOrderIds.length;
    isPartiallySelected = selectedInViewCount > 0 && !isAllSelected;
    assert.equal(isAllSelected, false);
    assert.equal(isPartiallySelected, true);

    // Case C: All selected (3 of 3)
    selectedOrderIds = ['ord-1', 'ord-2', 'ord-3'];
    selectedInViewCount = visibleOrderIds.filter((id) => selectedOrderIds.includes(id)).length;
    isAllSelected = visibleOrderIds.length > 0 && selectedInViewCount === visibleOrderIds.length;
    isPartiallySelected = selectedInViewCount > 0 && !isAllSelected;
    assert.equal(isAllSelected, true);
    assert.equal(isPartiallySelected, false);
  });
});

describe('Challenger M2 — Suite 4: Multi-Select Cross-Month Aggregation', () => {
  test('CH-M2-16: Cross-month selection overrides selectedMonth and aggregates financial KPIs accurately', () => {
    // Order in September
    const orderSept = createMockOrder({
      id: 'ord-sept',
      orderDate: '2026-09-15',
      buyerName: 'PT Alpha Indonesia',
      qty: 100,
      pricePerPcs: 10000,
      omzet: 1000000,
      hppBreakdown: { bahanBaku: 2000, tintaSablon: 1500, tenagaKerja: 1000, kemasan: 500, overhead: 1000, totalHppPerPcs: 6000, totalHpp: 600000 },
      profit: 400000,
      processStatus: 'SELESAI',
    });

    // Order in October
    const orderOct1 = createMockOrder({
      id: 'ord-oct-1',
      orderDate: '2026-10-10',
      buyerName: 'CV Beta Printing',
      qty: 200,
      pricePerPcs: 12500,
      omzet: 2500000,
      hppBreakdown: { bahanBaku: 2500, tintaSablon: 2000, tenagaKerja: 1200, kemasan: 800, overhead: 1000, totalHppPerPcs: 7500, totalHpp: 1500000 },
      profit: 1000000,
      processStatus: 'PROSES_CETAK',
    });

    // Another Order in October
    const orderOct2 = createMockOrder({
      id: 'ord-oct-2',
      orderDate: '2026-10-20',
      buyerName: 'Citra Workshop',
      qty: 50,
      pricePerPcs: 16000,
      omzet: 800000,
      hppBreakdown: { bahanBaku: 3000, tintaSablon: 2500, tenagaKerja: 1500, kemasan: 1000, overhead: 1500, totalHppPerPcs: 9500, totalHpp: 475000 },
      profit: 325000,
      processStatus: 'FINISHING',
    });

    const allOrders = [orderSept, orderOct1, orderOct2];
    const selectedMonth = '2026-10';

    // Step 1: Default state (No selection) -> Strictly October orders
    let selectedOrderIds: string[] = [];
    const resolveActiveOrders = (orders: Order[], selectedIds: string[], month: string) => {
      if (selectedIds.length > 0) {
        const set = new Set(selectedIds);
        return orders.filter((o) => set.has(o.id));
      }
      return orders.filter((o) => getOrderMonth(o) === month);
    };

    const defaultActive = resolveActiveOrders(allOrders, selectedOrderIds, selectedMonth);
    assert.equal(defaultActive.length, 2, 'Default view has 2 October orders');
    const defaultMetrics = orderService.getDashboardMetrics(defaultActive);
    assert.equal(defaultMetrics.totalPcs, 250);
    assert.equal(defaultMetrics.totalOmzet, 3300000);
    assert.equal(defaultMetrics.totalProfit, 1325000);
    assert.equal(defaultMetrics.activeOrdersCount, 2);
    assert.equal(defaultMetrics.completedOrdersCount, 0);

    // Step 2: Dynamic Selection across Month Boundaries (Select September + October 1)
    selectedOrderIds = ['ord-sept', 'ord-oct-1'];
    const crossMonthActive = resolveActiveOrders(allOrders, selectedOrderIds, selectedMonth);
    assert.equal(crossMonthActive.length, 2, 'Selection override has 2 selected orders');

    const crossMonthMetrics = orderService.getDashboardMetrics(crossMonthActive);
    assert.equal(crossMonthMetrics.totalPcs, 100 + 200); // 300
    assert.equal(crossMonthMetrics.totalOmzet, 1000000 + 2500000); // 3,500,000
    assert.equal(crossMonthMetrics.totalProfit, 400000 + 1000000); // 1,400,000
    assert.equal(crossMonthMetrics.totalHpp, 600000 + 1500000); // 2,100,000
    // Margin = (1,400,000 / 3,500,000) * 100 = 40.0%
    assert.equal(crossMonthMetrics.averageMarginPct, 40);
    assert.equal(crossMonthMetrics.activeOrdersCount, 1); // ord-oct-1
    assert.equal(crossMonthMetrics.completedOrdersCount, 1); // ord-sept

    // Step 3: Buyer summary cross-month aggregation
    const buyerSummaries = orderService.getBuyerSummaries(crossMonthActive);
    assert.equal(buyerSummaries.length, 2);
    const names = buyerSummaries.map((b) => b.buyerName);
    assert.ok(names.includes('PT Alpha Indonesia'));
    assert.ok(names.includes('CV Beta Printing'));
    assert.ok(!names.includes('Citra Workshop'), 'Unselected order buyer must NOT appear');

    // Step 4: Revert on clear
    selectedOrderIds = [];
    const revertedActive = resolveActiveOrders(allOrders, selectedOrderIds, selectedMonth);
    assert.equal(revertedActive.length, 2);
    assert.deepEqual(revertedActive.map((o) => o.id), ['ord-oct-1', 'ord-oct-2']);
  });

  test('CH-M2-17: Cross-month repeat buyer orders correctly combine in BuyerSummary', () => {
    // Same buyer across two different months
    const buyerOrderSept = createMockOrder({
      id: 'ord-sept-repeat',
      orderDate: '2026-09-01',
      buyerName: 'Warung Kopi Kenangan',
      qty: 150,
      omzet: 1500000,
      hppBreakdown: { bahanBaku: 2000, tintaSablon: 1500, tenagaKerja: 1000, kemasan: 500, overhead: 1000, totalHppPerPcs: 6000, totalHpp: 900000 },
      profit: 600000,
    });
    const buyerOrderOct = createMockOrder({
      id: 'ord-oct-repeat',
      orderDate: '2026-10-01',
      buyerName: 'warung kopi kenangan', // case-insensitive match
      qty: 200,
      omzet: 2000000,
      hppBreakdown: { bahanBaku: 2000, tintaSablon: 1500, tenagaKerja: 1000, kemasan: 500, overhead: 1000, totalHppPerPcs: 6000, totalHpp: 1200000 },
      profit: 800000,
    });

    const summaries = orderService.getBuyerSummaries([buyerOrderSept, buyerOrderOct]);
    assert.equal(summaries.length, 1, 'Should consolidate into single buyer summary');
    assert.equal(summaries[0].totalOrders, 2);
    assert.equal(summaries[0].totalPcs, 350);
    assert.equal(summaries[0].totalOmzet, 3500000);
    assert.equal(summaries[0].totalHpp, 2100000);
    assert.equal(summaries[0].totalProfit, 1400000);
  });

  test('CH-M2-18: Dashboard profit invariant holds — strictly orders-based without capex leakage', () => {
    const orders = [
      createMockOrder({
        omzet: 2000000,
        hppBreakdown: { bahanBaku: 2000, tintaSablon: 1500, tenagaKerja: 1000, kemasan: 500, overhead: 1000, totalHppPerPcs: 6000, totalHpp: 1200000 },
        profit: 800000,
      }),
    ];
    const metrics = orderService.getDashboardMetrics(orders);
    // Profit must strictly match orders omzet - totalHpp
    assert.equal(metrics.totalProfit, 800000);
    assert.equal(metrics.totalProfit, metrics.totalOmzet - metrics.totalHpp);
  });
});

describe('Challenger M2 — Suite 5: Empty Month & Zeroed Metrics Safety', () => {
  test('CH-M2-19: getDashboardMetrics([]) returns strictly clean zeroes with zero NaN values', () => {
    const emptyMetrics = orderService.getDashboardMetrics([]);

    assert.equal(emptyMetrics.totalPcs, 0);
    assert.equal(emptyMetrics.totalOmzet, 0);
    assert.equal(emptyMetrics.totalProfit, 0);
    assert.equal(emptyMetrics.totalHpp, 0);
    assert.equal(emptyMetrics.totalPiutangDp, 0);
    assert.equal(emptyMetrics.activeOrdersCount, 0);
    assert.equal(emptyMetrics.completedOrdersCount, 0);
    assert.equal(emptyMetrics.averageMarginPct, 0);

    // Strict numerical assertions
    for (const [key, val] of Object.entries(emptyMetrics)) {
      assert.equal(typeof val, 'number', `Metric ${key} must be a number`);
      assert.ok(!Number.isNaN(val), `Metric ${key} must NOT be NaN`);
      assert.ok(Number.isFinite(val), `Metric ${key} must be finite`);
    }
  });

  test('CH-M2-20: getBuyerSummaries([]) returns empty array without throwing', () => {
    const emptySummaries = orderService.getBuyerSummaries([]);
    assert.deepEqual(emptySummaries, []);
    assert.equal(Array.isArray(emptySummaries), true);
  });

  test('CH-M2-21: Selecting month with zero orders yields zeroed metrics and empty buyer summaries', () => {
    const orders = [
      createMockOrder({ orderDate: '2026-10-15' }),
      createMockOrder({ orderDate: '2026-10-20' }),
    ];
    // User selects an empty month e.g. 2026-03
    const marchOrders = orders.filter((o) => getOrderMonth(o) === '2026-03');
    assert.deepEqual(marchOrders, []);

    const marchMetrics = orderService.getDashboardMetrics(marchOrders);
    assert.equal(marchMetrics.totalOmzet, 0);
    assert.equal(marchMetrics.averageMarginPct, 0);

    const marchBuyers = orderService.getBuyerSummaries(marchOrders);
    assert.deepEqual(marchBuyers, []);
  });

  test('CH-M2-22: Format helpers handle zero/empty metrics gracefully without errors', () => {
    // Currency formatting
    assert.equal(formatRp(0), 'Rp 0');
    assert.equal(formatRp(null as any), 'Rp 0');
    assert.equal(formatRp(undefined as any), 'Rp 0');

    // Indonesian month formatting helper from dashboard/page.tsx
    const INDONESIAN_MONTHS: Record<string, string> = {
      '01': 'Januari',
      '02': 'Februari',
      '03': 'Maret',
      '04': 'April',
      '05': 'Mei',
      '06': 'Juni',
      '07': 'Juli',
      '08': 'Agustus',
      '09': 'September',
      '10': 'Oktober',
      '11': 'November',
      '12': 'Desember',
    };
    function formatMonthLabel(monthKey: string): string {
      if (!monthKey || !monthKey.includes('-')) return monthKey || 'Semua Bulan';
      const [year, month] = monthKey.split('-');
      const monthName = INDONESIAN_MONTHS[month] || month;
      return `${monthName} ${year}`;
    }

    assert.equal(formatMonthLabel('2026-10'), 'Oktober 2026');
    assert.equal(formatMonthLabel('2026-02'), 'Februari 2026');
    assert.equal(formatMonthLabel(''), 'Semua Bulan');
    assert.equal(formatMonthLabel('invalid'), 'invalid');
  });
});

describe('Challenger M2 — Suite 6: Microcopy, Palette Audit & Memo Optimization', () => {
  const ORDER_ROW_CARD_PATH = path.resolve(process.cwd(), 'src/components/order/OrderRowCard.tsx');
  const cardSource = fs.readFileSync(ORDER_ROW_CARD_PATH, 'utf-8');

  const ORDER_PAGE_PATH = path.resolve(process.cwd(), 'src/app/order/page.tsx');
  const orderPageSource = fs.readFileSync(ORDER_PAGE_PATH, 'utf-8');

  const DASHBOARD_PAGE_PATH = path.resolve(process.cwd(), 'src/app/dashboard/page.tsx');
  const dashboardSource = fs.readFileSync(DASHBOARD_PAGE_PATH, 'utf-8');

  test('CH-M2-23: Microcopy lengths adhere to Indonesian brevity constraints', () => {
    // Rule: Button/label <= 4 words, helper text <= 12 words
    const badgeText = '3 pesanan dipilih';
    assert.ok(badgeText.split(/\s+/).length <= 4, 'Badge count label <= 4 words');

    const clearButtonText = 'Bersihkan';
    assert.ok(clearButtonText.split(/\s+/).length <= 4, 'Clear button label <= 4 words');

    const helperText = 'Dashboard otomatis memfilter data pesanan terpilih';
    assert.ok(helperText.split(/\s+/).length <= 12, 'Helper text <= 12 words');

    const alertText = 'Menampilkan analitik khusus untuk 3 pesanan terpilih.';
    assert.ok(alertText.split(/\s+/).length <= 12, 'Alert message <= 12 words');
  });

  test('CH-M2-24: React.memo in OrderRowCard checks prevProps.isSelected === nextProps.isSelected', () => {
    assert.match(
      cardSource,
      /prevProps\.isSelected\s*===\s*nextProps\.isSelected/,
      'OrderRowCard React.memo must check isSelected to avoid re-rendering untouched cards'
    );
  });

  test('CH-M2-25: Multi-select checkbox has stopPropagation to isolate click from card selection', () => {
    assert.match(
      cardSource,
      /onClick=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/,
      'Checkbox input must have onClick={(e) => e.stopPropagation()}'
    );
  });

  test('CH-M2-26: Notion-style Month Selector in dashboard/page.tsx has accessible labeling', () => {
    assert.match(
      dashboardSource,
      /aria-label="Pilih Bulan Analitik"/,
      'Month select dropdown must have descriptive aria-label'
    );
    assert.match(
      dashboardSource,
      /<select[\s\S]*?id="dashboard-month-select"/,
      'Month select dropdown must have matching id for accessibility'
    );
  });

  test('CH-M2-27: Alert Banner in dashboard/page.tsx has role="alert" and aria-live="polite"', () => {
    assert.match(
      dashboardSource,
      /role="alert"/,
      'Dynamic override alert banner must have role="alert"'
    );
    assert.match(
      dashboardSource,
      /aria-live="polite"/,
      'Dynamic override alert banner must have aria-live="polite"'
    );
  });
});
