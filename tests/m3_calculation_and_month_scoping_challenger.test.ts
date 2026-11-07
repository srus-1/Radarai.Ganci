// Adversarial Challenger Test Suite for Milestone 3:
// Auto-Calculations, Global Month Scoping, Timezone Drift Immunity & Order Profit Isolation Invariant
//
// Authoritative Challenge Requirements:
// 1. Auto-calculations of totalAmount = quantity * unitPrice with float and boundary inputs.
// 2. Global month filter (YYYY-MM) scoping and month transitions.
// 3. Empty month handling (zero entries -> zero sums, 0 average, no NaN/div-by-zero).
// 4. Timezone drift immunity on boundary dates (1st and last of month).
// 5. Order profit isolation invariant: Capex and Materials NEVER alter or deduct from Order metrics.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { capexService, rawMaterialService, orderService } from '../src/lib/supabase';
import { getOrderMonth } from '../src/context/OrderContext';
import { CapexEntry, CreateCapexInput, RawMaterialEntry, CreateRawMaterialInput } from '../src/types/capex';
import { Order, DashboardMetrics } from '../src/types/order';

// Paths to verify source invariants
const CAPEX_PAGE_PATH = path.resolve(process.cwd(), 'src/app/capex/page.tsx');
const SUPABASE_TS_PATH = path.resolve(process.cwd(), 'src/lib/supabase.ts');
const ORDER_CONTEXT_PATH = path.resolve(process.cwd(), 'src/context/OrderContext.tsx');
const MIGRATION_PATH = path.resolve(
  process.cwd(),
  'supabase/migrations/20261024000000_capex_and_raw_materials.sql'
);

const capexPageSource = fs.readFileSync(CAPEX_PAGE_PATH, 'utf-8');
const supabaseTsSource = fs.readFileSync(SUPABASE_TS_PATH, 'utf-8');
const orderContextSource = fs.readFileSync(ORDER_CONTEXT_PATH, 'utf-8');
const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

// Helper to create mock orders for isolation testing
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

describe('Challenger M3: Auto-Calculation Stress & Precision (Raw Materials)', () => {
  test('Stress 1.1: Floating point volume and prices auto-calculate with mathematical precision', async () => {
    // Test case 1: Fractional quantity (3.333 lembar @ Rp 12,000)
    const entry1 = await rawMaterialService.createRawMaterialEntry({
      materialName: 'Akrilik Custom Tebal 3.333',
      category: 'Akrilik & Aksesoris',
      supplier: 'Supplier Presisi',
      quantity: 3.333,
      unit: 'lembar',
      unitPrice: 12000,
      entryDate: '2026-10-15',
    });
    // 3.333 * 12000 = 39996
    assert.equal(entry1.quantity, 3.333);
    assert.equal(entry1.unitPrice, 12000);
    assert.equal(entry1.totalAmount, 39996);

    // Test case 2: Fractional volume with decimals (0.25 kg @ Rp 15,500)
    const entry2 = await rawMaterialService.createRawMaterialEntry({
      materialName: 'Pigmen Tinta Khusus 0.25kg',
      category: 'Tinta & Sablon',
      supplier: 'Color Lab',
      quantity: 0.25,
      unit: 'kg',
      unitPrice: 15500,
      entryDate: '2026-10-16',
    });
    // 0.25 * 15500 = 3875
    assert.equal(entry2.quantity, 0.25);
    assert.equal(entry2.unitPrice, 15500);
    assert.equal(entry2.totalAmount, 3875);

    // Test case 3: Fractional price with rounding (1000.5 pcs @ Rp 450.75)
    const entry3 = await rawMaterialService.createRawMaterialEntry({
      materialName: 'Ring Gantungan Presisi',
      category: 'Akrilik & Aksesoris',
      supplier: 'Ring Indo',
      quantity: 1000.5,
      unit: 'pcs',
      unitPrice: 450.75,
      entryDate: '2026-10-17',
    });
    // 1000.5 * 450.75 = 450975.375 -> rounded to 450975
    assert.equal(entry3.totalAmount, 450975);
  });

  test('Stress 1.2: Updating quantity while keeping unitPrice constant must strictly recompute totalAmount', async () => {
    const created = await rawMaterialService.createRawMaterialEntry({
      materialName: 'Bahan Uji Update Qty',
      category: 'Akrilik & Aksesoris',
      supplier: 'Supplier Uji',
      quantity: 10,
      unit: 'lembar',
      unitPrice: 50000,
      entryDate: '2026-10-18',
    });
    assert.equal(created.totalAmount, 500000);

    // Update quantity to 25.5 while unitPrice is NOT in payload
    const updated = await rawMaterialService.updateRawMaterialEntry(created.id, {
      quantity: 25.5,
    });

    assert.ok(updated);
    assert.equal(updated?.quantity, 25.5);
    assert.equal(updated?.unitPrice, 50000); // Preserved
    // 25.5 * 50000 = 1275000
    assert.equal(updated?.totalAmount, 1275000);
  });

  test('Stress 1.3: Updating unitPrice while keeping quantity constant must strictly recompute totalAmount', async () => {
    const created = await rawMaterialService.createRawMaterialEntry({
      materialName: 'Bahan Uji Update UnitPrice',
      category: 'Tinta & Sablon',
      supplier: 'Supplier Uji',
      quantity: 8,
      unit: 'kg',
      unitPrice: 75000,
      entryDate: '2026-10-19',
    });
    assert.equal(created.totalAmount, 600000);

    // Update unitPrice to 92500 while quantity is NOT in payload
    const updated = await rawMaterialService.updateRawMaterialEntry(created.id, {
      unitPrice: 92500,
    });

    assert.ok(updated);
    assert.equal(updated?.quantity, 8); // Preserved
    assert.equal(updated?.unitPrice, 92500);
    // 8 * 92500 = 740000
    assert.equal(updated?.totalAmount, 740000);
  });

  test('Stress 1.4: Zero and negative boundary inputs are safely sanitized (no crashes or negative totals)', async () => {
    // Non-positive quantity handling
    const zeroQtyEntry = await rawMaterialService.createRawMaterialEntry({
      materialName: 'Barang Qty 0',
      category: 'Lainnya',
      supplier: 'Supplier Test',
      quantity: 0,
      unit: 'pcs',
      unitPrice: 10000,
      entryDate: '2026-10-20',
    });
    // In supabase.ts: Number(0) || 1 fallback enforces safeQty >= 1
    assert.ok(zeroQtyEntry.quantity > 0, 'Quantity should be sanitized to positive');
    assert.ok(zeroQtyEntry.totalAmount >= 0);

    // Negative unitPrice handling
    const negPriceEntry = await rawMaterialService.createRawMaterialEntry({
      materialName: 'Barang Harga Minus',
      category: 'Lainnya',
      supplier: 'Supplier Test',
      quantity: 5,
      unit: 'pcs',
      unitPrice: -25000,
      entryDate: '2026-10-20',
    });
    // In supabase.ts: Math.max(0, -25000) clamps to 0
    assert.equal(negPriceEntry.unitPrice, 0);
    assert.equal(negPriceEntry.totalAmount, 0);

    // Negative quantity update handling
    const updatedNeg = await rawMaterialService.updateRawMaterialEntry(zeroQtyEntry.id, {
      quantity: -10,
    });
    assert.ok(updatedNeg);
    assert.ok(updatedNeg!.quantity > 0, 'Updated quantity must remain positive');
    assert.ok(updatedNeg!.totalAmount >= 0);
  });

  test('Stress 1.5: UI RawMaterialFormModal formula parity with backend service calculation', () => {
    // Verify UI formula in src/app/capex/page.tsx:
    // const calculatedTotal = Math.round((Number(quantity) || 0) * (Number(unitPrice) || 0));
    assert.ok(
      capexPageSource.includes(
        'const calculatedTotal = Math.round((Number(quantity) || 0) * (Number(unitPrice) || 0));'
      ),
      'UI must implement robust auto-calculation formula'
    );

    const calcUi = (qty: any, price: any) =>
      Math.round((Number(qty) || 0) * (Number(price) || 0));

    assert.equal(calcUi(3.333, 12000), 39996);
    assert.equal(calcUi('', 12000), 0);
    assert.equal(calcUi(5, ''), 0);
    assert.equal(calcUi(undefined, undefined), 0);
    assert.equal(calcUi('10.5', '2000'), 21000);
    assert.equal(calcUi(NaN, 1000), 0);
  });
});

describe('Challenger M3: Global Monthly Filter (YYYY-MM) Scoping & Transitions', () => {
  test('Stress 2.1: Strict monthly scoping isolates October 2026 from other months', async () => {
    const allCapex = await capexService.getCapexEntries();
    const allMaterials = await rawMaterialService.getRawMaterialEntries();

    // Scoping to 2026-10
    const selectedMonth = '2026-10';
    const scopedCapex = allCapex.filter((c) => c.entryDate.startsWith(selectedMonth));
    const scopedMaterials = allMaterials.filter((m) => m.entryDate.startsWith(selectedMonth));

    // Verify all filtered entries strictly belong to 2026-10
    assert.ok(scopedCapex.length > 0, 'Should have Capex in 2026-10');
    assert.ok(scopedMaterials.length > 0, 'Should have Materials in 2026-10');
    assert.ok(scopedCapex.every((c) => c.entryDate.startsWith('2026-10')));
    assert.ok(scopedMaterials.every((m) => m.entryDate.startsWith('2026-10')));

    // Check that records with 2026-09 or 2026-08 are EXCLUDED
    const excludedCapex = allCapex.filter((c) => !c.entryDate.startsWith(selectedMonth));
    const excludedMaterials = allMaterials.filter((m) => !m.entryDate.startsWith(selectedMonth));
    assert.ok(excludedCapex.length > 0, 'Seed should have Capex in prior months');
    assert.ok(excludedMaterials.length > 0, 'Seed should have Materials in prior months');

    for (const item of excludedCapex) {
      assert.ok(
        !scopedCapex.some((c) => c.id === item.id),
        `Capex ${item.itemName} (${item.entryDate}) leaked into 2026-10 scope`
      );
    }

    for (const item of excludedMaterials) {
      assert.ok(
        !scopedMaterials.some((m) => m.id === item.id),
        `Material ${item.materialName} (${item.entryDate}) leaked into 2026-10 scope`
      );
    }
  });

  test('Stress 2.2: Dynamic month transition sequence (2026-09 -> 2026-10 -> 2026-11 -> ALL) recomputes totals accurately', async () => {
    const capexList = await capexService.getCapexEntries();
    const materialsList = await rawMaterialService.getRawMaterialEntries();

    const computeTotalsForMonth = (month: string) => {
      const filteredC = capexList.filter((item) =>
        !month || month === 'ALL' ? true : item.entryDate.startsWith(month)
      );
      const filteredM = materialsList.filter((item) =>
        !month || month === 'ALL' ? true : item.entryDate.startsWith(month)
      );

      const totalCapex = filteredC.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const totalMaterials = filteredM.reduce(
        (acc, curr) => acc + (Number(curr.totalAmount) || 0),
        0
      );
      const totalSpending = totalCapex + totalMaterials;
      const totalTransactions = filteredC.length + filteredM.length;
      const averageSpending =
        totalTransactions > 0 ? Math.round(totalSpending / totalTransactions) : 0;

      return {
        countC: filteredC.length,
        countM: filteredM.length,
        totalCapex,
        totalMaterials,
        totalSpending,
        totalTransactions,
        averageSpending,
      };
    };

    // Transition 1: 2026-09
    const t09 = computeTotalsForMonth('2026-09');
    assert.ok(t09.countC >= 1, 'Should have September capex (Rak Pengering)');
    assert.ok(t09.countM >= 1, 'Should have September materials (Plastik OPP)');
    assert.equal(t09.totalSpending, t09.totalCapex + t09.totalMaterials);

    // Transition 2: 2026-10
    const t10 = computeTotalsForMonth('2026-10');
    assert.ok(t10.countC >= 2, 'Should have October capex');
    assert.ok(t10.countM >= 3, 'Should have October materials');
    assert.notEqual(t10.totalSpending, t09.totalSpending);

    // Transition 3: 2026-11 (Empty month)
    const t11 = computeTotalsForMonth('2026-11');
    assert.equal(t11.countC, 0);
    assert.equal(t11.countM, 0);
    assert.equal(t11.totalCapex, 0);
    assert.equal(t11.totalMaterials, 0);
    assert.equal(t11.totalSpending, 0);
    assert.equal(t11.averageSpending, 0);

    // Transition 4: ALL (Aggregates entire historical ledger)
    const tAll = computeTotalsForMonth('ALL');
    assert.equal(tAll.countC, capexList.length);
    assert.equal(tAll.countM, materialsList.length);
    assert.ok(tAll.totalSpending >= t10.totalSpending + t09.totalSpending);
  });
});

describe('Challenger M3: Empty Month Handling & Div-by-Zero Safety', () => {
  test('Stress 3.1: Zero entries in selected month produce strictly 0 KPI totals and 0 average without NaN', () => {
    const emptyCapex: CapexEntry[] = [];
    const emptyMaterials: RawMaterialEntry[] = [];

    const totalCapexAmount = emptyCapex.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalMaterialsAmount = emptyMaterials.reduce(
      (acc, curr) => acc + (Number(curr.totalAmount) || 0),
      0
    );
    const totalSpending = totalCapexAmount + totalMaterialsAmount;
    const totalTransactions = emptyCapex.length + emptyMaterials.length;
    const averageSpending =
      totalTransactions > 0 ? Math.round(totalSpending / totalTransactions) : 0;

    assert.equal(totalCapexAmount, 0);
    assert.equal(totalMaterialsAmount, 0);
    assert.equal(totalSpending, 0);
    assert.equal(totalTransactions, 0);
    assert.equal(averageSpending, 0);
    assert.ok(!Number.isNaN(averageSpending), 'Average spending must not be NaN');
    assert.ok(Number.isFinite(averageSpending), 'Average spending must be finite');
  });

  test('Stress 3.2: Empty month in Orders dashboard metrics produces zeroed metrics without NaN', () => {
    const emptyMetrics = orderService.getDashboardMetrics([]);

    assert.equal(emptyMetrics.totalPcs, 0);
    assert.equal(emptyMetrics.totalOmzet, 0);
    assert.equal(emptyMetrics.totalProfit, 0);
    assert.equal(emptyMetrics.totalHpp, 0);
    assert.equal(emptyMetrics.totalPiutangDp, 0);
    assert.equal(emptyMetrics.activeOrdersCount, 0);
    assert.equal(emptyMetrics.completedOrdersCount, 0);
    assert.equal(emptyMetrics.averageMarginPct, 0);
    assert.ok(!Number.isNaN(emptyMetrics.averageMarginPct), 'Average margin must not be NaN');
  });

  test('Stress 3.3: UI contains dedicated empty states for both Capex and Raw Materials tables', () => {
    // Check desktop & mobile empty states
    assert.ok(
      capexPageSource.includes('Belum ada data belanja modal'),
      'Capex table must have empty state notice'
    );
    assert.ok(
      capexPageSource.includes('Belum ada data belanja bahan baku'),
      'Raw materials table must have empty state notice'
    );

    // Check zero-guard in KPI cards
    assert.ok(
      capexPageSource.includes('totalTransactions > 0 ? Math.round(totalSpending / totalTransactions) : 0'),
      'averageSpending must be guarded with totalTransactions > 0 check'
    );
  });
});

describe('Challenger M3: Timezone Drift Immunity on Boundary Dates (1st and Last of Month)', () => {
  test('Stress 4.1: First and last days of month (2026-10-01 and 2026-10-31) scope strictly to 2026-10', async () => {
    const firstDay = await capexService.createCapexEntry({
      itemName: 'Belanja Tanggal 1',
      category: 'Perlengkapan Workshop',
      amount: 1500000,
      entryDate: '2026-10-01',
    });

    const lastDay = await capexService.createCapexEntry({
      itemName: 'Belanja Tanggal 31',
      category: 'Perlengkapan Workshop',
      amount: 2500000,
      entryDate: '2026-10-31',
    });

    // Verification of month extraction
    assert.equal(firstDay.entryDate.slice(0, 7), '2026-10');
    assert.equal(lastDay.entryDate.slice(0, 7), '2026-10');
    assert.ok(firstDay.entryDate.startsWith('2026-10'));
    assert.ok(lastDay.entryDate.startsWith('2026-10'));

    // Verification via OrderContext's getOrderMonth
    assert.equal(getOrderMonth(firstDay.entryDate), '2026-10');
    assert.equal(getOrderMonth(lastDay.entryDate), '2026-10');
  });

  test('Stress 4.2: String slicing vs new Date() timezone offset vulnerability proof', () => {
    // Demonstration of Date constructor pitfall:
    // In western timezones (e.g. UTC-5, UTC-8), `new Date('2026-10-01')` parses as UTC midnight,
    // which in local time is 2026-09-30 19:00:00! Calling .getMonth() yields 8 (September).
    const dateStr = '2026-10-01';

    // Simulated western timezone offset (e.g. -300 minutes for UTC-5)
    const simulatedDate = new Date(`${dateStr}T00:00:00.000Z`);
    const offsetHours = -5;
    const shiftedTime = new Date(simulatedDate.getTime() + offsetHours * 3600 * 1000);
    const naiveUtcMonth = `${shiftedTime.getUTCFullYear()}-${String(shiftedTime.getUTCMonth() + 1).padStart(2, '0')}`;
    
    // Naive Date evaluation causes date drift to September 2026!
    assert.equal(naiveUtcMonth, '2026-09', 'Naive date construction drifts into previous month');

    // Robust implementation using string slicing:
    const robustMonth = dateStr.slice(0, 7);
    assert.equal(robustMonth, '2026-10', 'String slicing is 100% immune to timezone drift');

    // Confirm that OrderContext and CapexPage use string slicing / startsWith
    assert.ok(
      capexPageSource.includes("item.entryDate.startsWith(selectedMonth)"),
      'CapexPage must use startsWith instead of new Date().getMonth()'
    );
    assert.ok(
      orderContextSource.includes("raw.slice(0, 7)"),
      'OrderContext getOrderMonth must use string slicing'
    );
  });

  test('Stress 4.3: Leap year and boundary month dates (Feb 28, Feb 29, Dec 31, Jan 01)', () => {
    const leapDate = '2024-02-29';
    const nonLeapDate = '2025-02-28';
    const endOfYear = '2026-12-31';
    const startOfYear = '2027-01-01';

    assert.equal(getOrderMonth(leapDate), '2024-02');
    assert.equal(getOrderMonth(nonLeapDate), '2025-02');
    assert.equal(getOrderMonth(endOfYear), '2026-12');
    assert.equal(getOrderMonth(startOfYear), '2027-01');
  });
});

describe('Challenger M3: Order Profit Isolation Invariant', () => {
  test('Stress 5.1: Mathematical Law — metrics.totalProfit === metrics.totalOmzet - metrics.totalHpp strictly holds', () => {
    const mockOrders: Order[] = [
      createMockOrder({
        id: 'ord-iso-1',
        orderNumber: 'MF26001',
        orderDate: '2026-10-05',
        buyerName: 'Buyer A',
        qty: 100,
        pricePerPcs: 15000,
        totalHppPerPcs: 6000,
      }),
      createMockOrder({
        id: 'ord-iso-2',
        orderNumber: 'MF26002',
        orderDate: '2026-10-10',
        buyerName: 'Buyer B',
        qty: 250,
        pricePerPcs: 12000,
        totalHppPerPcs: 5000,
      }),
      createMockOrder({
        id: 'ord-iso-3',
        orderNumber: 'MF26003',
        orderDate: '2026-10-22',
        buyerName: 'Buyer C',
        qty: 50,
        pricePerPcs: 25000,
        totalHppPerPcs: 10000,
      }),
    ];

    const metrics = orderService.getDashboardMetrics(mockOrders);

    // Order 1: omzet 1,500,000 | hpp 600,000 | profit 900,000
    // Order 2: omzet 3,000,000 | hpp 1,250,000 | profit 1,750,000
    // Order 3: omzet 1,250,000 | hpp 500,000 | profit 750,000
    // Sum: omzet 5,750,000 | hpp 2,350,000 | profit 3,400,000
    assert.equal(metrics.totalOmzet, 5750000);
    assert.equal(metrics.totalHpp, 2350000);
    assert.equal(metrics.totalProfit, 3400000);
    assert.equal(metrics.totalProfit, metrics.totalOmzet - metrics.totalHpp);
  });

  test('Stress 5.2: Adversarial Injection Attack — Adding 100 Billion Rp Capex and Materials NEVER alters Order metrics', async () => {
    const baselineOrders: Order[] = [
      createMockOrder({
        id: 'base-1',
        orderNumber: 'MF26101',
        orderDate: '2026-10-02',
        buyerName: 'PT Sukses Makmur',
        qty: 500,
        pricePerPcs: 20000,
        totalHppPerPcs: 8000,
      }),
      createMockOrder({
        id: 'base-2',
        orderNumber: 'MF26102',
        orderDate: '2026-10-14',
        buyerName: 'CV Berkah Bersama',
        qty: 1000,
        pricePerPcs: 18000,
        totalHppPerPcs: 7500,
      }),
    ];

    const baselineMetrics = orderService.getDashboardMetrics(baselineOrders);
    const baselineBuyers = orderService.getBuyerSummaries(baselineOrders);
    const baselineMonthly = orderService.getMonthlyProfitData(baselineOrders);

    assert.equal(baselineMetrics.totalOmzet, 28000000); // (500*20k) + (1000*18k) = 10m + 18m
    assert.equal(baselineMetrics.totalHpp, 11500000);   // (500*8k) + (1000*7.5k) = 4m + 7.5m
    assert.equal(baselineMetrics.totalProfit, 16500000); // 28m - 11.5m
    assert.equal(baselineMetrics.totalProfit, baselineMetrics.totalOmzet - baselineMetrics.totalHpp);

    // Adversarial Action: Inject 100 Billion Rp Capex and 50 Billion Rp Materials
    const megaCapex = await capexService.createCapexEntry({
      itemName: 'Mega Industrial Production Facility',
      category: 'Mesin & Peralatan',
      amount: 100000000000, // Rp 100,000,000,000
      entryDate: '2026-10-15',
    });

    const megaMaterial = await rawMaterialService.createRawMaterialEntry({
      materialName: 'Mega Bulk Acrylic Tanker',
      category: 'Akrilik & Aksesoris',
      supplier: 'Global Polymer Corp',
      quantity: 100000,
      unit: 'lembar',
      unitPrice: 500000, // Rp 50,000,000,000
      entryDate: '2026-10-15',
    });

    assert.equal(megaCapex.amount, 100000000000);
    assert.equal(megaMaterial.totalAmount, 50000000000);

    // Re-verify Order Dashboard Metrics
    const postInjectionMetrics = orderService.getDashboardMetrics(baselineOrders);
    const postInjectionBuyers = orderService.getBuyerSummaries(baselineOrders);
    const postInjectionMonthly = orderService.getMonthlyProfitData(baselineOrders);

    // Strict Invariant Assertions:
    assert.equal(
      postInjectionMetrics.totalOmzet,
      baselineMetrics.totalOmzet,
      'Order totalOmzet must not change after Capex/Material injection'
    );
    assert.equal(
      postInjectionMetrics.totalHpp,
      baselineMetrics.totalHpp,
      'Order totalHpp must not change after Capex/Material injection'
    );
    assert.equal(
      postInjectionMetrics.totalProfit,
      baselineMetrics.totalProfit,
      'Order totalProfit must NOT deduct Capex or Materials'
    );
    assert.equal(
      postInjectionMetrics.averageMarginPct,
      baselineMetrics.averageMarginPct,
      'Order averageMarginPct must remain completely isolated'
    );
    assert.deepEqual(
      postInjectionBuyers,
      baselineBuyers,
      'Buyer summaries must be 100% isolated from Capex/Materials'
    );
    assert.deepEqual(
      postInjectionMonthly,
      baselineMonthly,
      'Monthly profit data must be 100% isolated from Capex/Materials'
    );

    // Clean up injected test records
    await capexService.deleteCapexEntry(megaCapex.id);
    await rawMaterialService.deleteRawMaterialEntry(megaMaterial.id);
  });
});

describe('Challenger M3: Architectural & Source Invariant Checks', () => {
  test('Check 6.1: Zero localStorage usage across Capex page and backend services', () => {
    assert.ok(!capexPageSource.includes('localStorage'), 'src/app/capex/page.tsx must not use localStorage');
    assert.ok(!supabaseTsSource.includes('localStorage'), 'src/lib/supabase.ts must not use localStorage');
  });

  test('Check 6.2: PostgreSQL migration schema enforces non-negative constraints and audit triggers', () => {
    assert.ok(migrationSql.includes('CHECK (amount >= 0)'), 'Migration must enforce amount >= 0');
    assert.ok(migrationSql.includes('CHECK (quantity > 0)'), 'Migration must enforce quantity > 0');
    assert.ok(migrationSql.includes('CHECK (unit_price >= 0)'), 'Migration must enforce unit_price >= 0');
    assert.ok(migrationSql.includes('CHECK (total_amount >= 0)'), 'Migration must enforce total_amount >= 0');
    assert.ok(migrationSql.includes('trigger_capex_updated_at'), 'Migration must define trigger_capex_updated_at');
    assert.ok(migrationSql.includes('trigger_raw_materials_updated_at'), 'Migration must define trigger_raw_materials_updated_at');
    assert.ok(migrationSql.includes('ENABLE ROW LEVEL SECURITY'), 'Migration must enable RLS');
  });

  test('Check 6.3: Sidebar navigation incorporates 4th route /capex with accessible tooltip and microcopy', () => {
    const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
    const sidebarSource = fs.readFileSync(sidebarPath, 'utf-8');

    assert.ok(sidebarSource.includes("href: '/capex'"));
    assert.ok(sidebarSource.includes("label: 'Capex & Bahan'"));
    assert.ok(sidebarSource.includes("description: 'Biaya modal & bahan baku.'"));
    assert.ok(sidebarSource.includes('Receipt'));
  });
});
