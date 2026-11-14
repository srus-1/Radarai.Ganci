import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Order } from '@/types/order';
import { toLocalDateString } from '@/lib/utils';
import {
  ORDER_DATE_PRESET_LABELS,
  matchesOrderDatePreset,
  sortOrders,
} from '@/lib/orderFilters';
import { exportOrdersToCSV } from '@/lib/csvExport';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    orderNumber: 'ORD-001',
    orderDate: '2026-11-14',
    buyerName: 'Budi Santoso',
    buyerPhone: '081234567890',
    productName: 'Ganci Akrilik 5cm',
    specs: '2 sisi, 3mm, ring putar',
    qty: 100,
    pricePerPcs: 5000,
    omzet: 500000,
    hppBreakdown: {
      bahanBaku: 1500,
      tintaSablon: 400,
      tenagaKerja: 500,
      kemasan: 200,
      overhead: 200,
      totalHppPerPcs: 2800,
      totalHpp: 280000,
    },
    profit: 220000,
    marginPct: 44,
    paymentStatus: 'DP',
    dpAmount: 250000,
    remainingPayment: 250000,
    processStatus: 'PROSES_CETAK',
    queueOrder: 1,
    designFiles: [],
    createdAt: '2026-11-14T08:00:00.000Z',
    updatedAt: '2026-11-14T08:00:00.000Z',
    ...overrides,
  };
}

describe('toLocalDateString', () => {
  it('formats local calendar dates without UTC day drift', () => {
    assert.equal(toLocalDateString(new Date(2026, 10, 14, 0, 5, 0)), '2026-11-14');
    assert.equal(toLocalDateString(new Date(2026, 0, 5, 23, 59, 59)), '2026-01-05');
  });
});

describe('matchesOrderDatePreset', () => {
  const ref = new Date(2026, 10, 14, 10, 0, 0);

  it('exposes the expected Indonesian preset labels', () => {
    assert.deepEqual(ORDER_DATE_PRESET_LABELS, {
      TODAY: 'Hari ini',
      YESTERDAY: 'Kemarin',
      LAST_7_DAYS: '7 hari terakhir',
      THIS_MONTH: 'Bulan ini',
    });
  });

  it('returns true when preset is null and false for invalid dates when preset is active', () => {
    assert.equal(matchesOrderDatePreset({ orderDate: '' }, null, ref), true);
    assert.equal(matchesOrderDatePreset({ orderDate: '' }, 'TODAY', ref), false);
    assert.equal(matchesOrderDatePreset({ orderDate: 'invalid' }, 'THIS_MONTH', ref), false);
  });

  it('matches TODAY and YESTERDAY accurately', () => {
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-14' }, 'TODAY', ref), true);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-13' }, 'TODAY', ref), false);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-15' }, 'TODAY', ref), false);

    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-13' }, 'YESTERDAY', ref), true);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-14' }, 'YESTERDAY', ref), false);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-12' }, 'YESTERDAY', ref), false);
  });

  it('matches LAST_7_DAYS as inclusive 7 calendar days ending today', () => {
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-14' }, 'LAST_7_DAYS', ref), true);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-08' }, 'LAST_7_DAYS', ref), true);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-07' }, 'LAST_7_DAYS', ref), false);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-15' }, 'LAST_7_DAYS', ref), false);
  });

  it('matches THIS_MONTH across exact month and year', () => {
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-01' }, 'THIS_MONTH', ref), true);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-11-30' }, 'THIS_MONTH', ref), true);
    assert.equal(matchesOrderDatePreset({ orderDate: '2026-10-31' }, 'THIS_MONTH', ref), false);
    assert.equal(matchesOrderDatePreset({ orderDate: '2025-11-14' }, 'THIS_MONTH', ref), false);
  });
});

describe('sortOrders', () => {
  it('sorts default view by SELESAI-unpaid first, newest active orderDate/createdAt next, and SELESAI-LUNAS last', () => {
    const orders = [
      makeOrder({ id: 'done-paid', orderDate: '2026-11-14', processStatus: 'SELESAI', paymentStatus: 'LUNAS', queueOrder: 1 }),
      makeOrder({ id: 'active-old', orderDate: '2026-11-10', processStatus: 'ANTREAN', paymentStatus: 'DP', queueOrder: 2 }),
      makeOrder({ id: 'active-same-early', orderDate: '2026-11-12', createdAt: '2026-11-12T07:00:00.000Z', processStatus: 'PROSES_CETAK', paymentStatus: 'LUNAS', queueOrder: 4 }),
      makeOrder({ id: 'active-same-late', orderDate: '2026-11-12', createdAt: '2026-11-12T09:00:00.000Z', processStatus: 'SETTING_DESAIN', paymentStatus: 'BELUM_LUNAS', queueOrder: 5 }),
      makeOrder({ id: 'done-unpaid', orderDate: '2026-11-01', processStatus: 'SELESAI', paymentStatus: 'DP', queueOrder: 3 }),
    ];

    const sorted = sortOrders(orders, null, 'asc', false);
    assert.deepEqual(
      sorted.map((o) => o.id),
      ['done-unpaid', 'active-same-late', 'active-same-early', 'active-old', 'done-paid']
    );
  });

  it('ignores queueOrder when useQueueOrder is false and respects it when true', () => {
    const orders = [
      makeOrder({ id: 'b', orderDate: '2026-11-10', queueOrder: 1 }),
      makeOrder({ id: 'a', orderDate: '2026-11-14', queueOrder: 2 }),
    ];
    assert.deepEqual(sortOrders(orders, null, 'asc', true).map((o) => o.id), ['b', 'a']);
    assert.deepEqual(sortOrders(orders, null, 'asc', false).map((o) => o.id), ['a', 'b']);
  });

  it('sorts explicitly by orderDate ascending and descending', () => {
    const orders = [
      makeOrder({ id: 'mid', orderNumber: 'ORD-002', orderDate: '2026-11-12', createdAt: '2026-11-12T08:00:00.000Z' }),
      makeOrder({ id: 'old', orderNumber: 'ORD-001', orderDate: '2026-11-10', createdAt: '2026-11-10T08:00:00.000Z' }),
      makeOrder({ id: 'new', orderNumber: 'ORD-003', orderDate: '2026-11-14', createdAt: '2026-11-14T08:00:00.000Z' }),
    ];

    assert.deepEqual(sortOrders(orders, 'orderDate', 'asc', false).map((o) => o.id), ['old', 'mid', 'new']);
    assert.deepEqual(sortOrders(orders, 'orderDate', 'desc', false).map((o) => o.id), ['new', 'mid', 'old']);
  });
});

describe('Deadline removal across exports and UI modules', () => {
  it('keeps 26 ML CSV columns and outputs empty string when deadline is undefined', () => {
    const csv = exportOrdersToCSV([makeOrder({ deadline: undefined })]);
    const clean = csv.replace(/^\uFEFF/, '');
    const lines = clean.trim().split('\n');
    assert.equal(lines.length, 2);
    const headers = lines[0].split(',');
    const values = lines[1].split(',');
    assert.equal(headers.length, 26);
    assert.equal(values.length, 26);
    const deadlineIdx = headers.indexOf('deadline');
    assert.ok(deadlineIdx >= 0);
    assert.equal(values[deadlineIdx], '');
  });

  it('removes Deadline column from Owner Excel export and Deadline controls from UI files', () => {
    const root = process.cwd();
    const excelSrc = fs.readFileSync(path.join(root, 'src/lib/csvExport.ts'), 'utf8');
    assert.ok(!excelSrc.includes('<th>Deadline</th>'));
    assert.ok(excelSrc.includes('<th>Tgl Pesan</th>'));
    assert.ok(excelSrc.includes('colspan="18"'));
    assert.ok(excelSrc.includes('<td colspan="7">'));

    const formSrc = fs.readFileSync(path.join(root, 'src/components/order/OrderFormModal.tsx'), 'utf8');
    assert.ok(formSrc.includes('Tanggal pesanan masuk'));
    assert.ok(!formSrc.includes('Deadline produksi'));

    const viewSrc = fs.readFileSync(path.join(root, 'src/components/order/OrdersDataView.tsx'), 'utf8');
    assert.ok(viewSrc.includes("header: 'Tanggal Masuk'"));
    assert.ok(!viewSrc.includes("header: 'Deadline'"));
    assert.ok(!viewSrc.includes('formatRelativeDeadline'));

    const pageSrc = fs.readFileSync(path.join(root, 'src/app/order/page.tsx'), 'utf8');
    assert.ok(pageSrc.includes('Preset Tanggal Masuk'));
    assert.ok(pageSrc.includes('Rentang Tanggal Masuk'));
    assert.ok(!pageSrc.includes('Preset Deadline'));
    assert.ok(!pageSrc.includes('Rentang Tanggal Deadline'));
  });
});
