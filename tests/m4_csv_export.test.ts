import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  escapeCSVField,
  formatNumericML,
  formatDateML,
  formatTimestampML,
  exportOrdersToCSV,
  exportCapexToCSV,
  exportRawMaterialsToCSV,
  downloadCSVFile,
  exportOrdersToExcel,
  exportCapexToExcel,
  exportRawMaterialsToExcel,
  downloadExcelFile,
  exportOrdersToPDF,
  exportCapexToPDF,
  exportRawMaterialsToPDF,
} from '../src/lib/csvExport';
import { Order } from '../src/types/order';
import { CapexEntry, RawMaterialEntry } from '../src/types/capex';

describe('Milestone 4: ML-Ready CSV Export Verification Suite', () => {
  test('escapeCSVField adheres strictly to RFC 4180', () => {
    assert.equal(escapeCSVField(null), '');
    assert.equal(escapeCSVField(undefined), '');
    assert.equal(escapeCSVField('Budi Santoso'), 'Budi Santoso');
    assert.equal(escapeCSVField('CV. Maju, Jaya'), '"CV. Maju, Jaya"');
    assert.equal(escapeCSVField('Ganci "Premium" Akrilik'), '"Ganci ""Premium"" Akrilik"');
    assert.equal(escapeCSVField('Line 1\nLine 2'), '"Line 1\nLine 2"');
  });

  test('formatNumericML returns raw numbers only without Rp, %, or thousand separators', () => {
    assert.equal(formatNumericML(1500000), '1500000');
    assert.equal(formatNumericML(42.5), '42.5');
    assert.equal(formatNumericML(0), '0');
    assert.equal(formatNumericML(-0), '0');
    assert.equal(formatNumericML(null), '0');
    assert.equal(formatNumericML(undefined), '0');
    assert.equal(formatNumericML(Number.NaN), '0');
    assert.equal(formatNumericML(Number.POSITIVE_INFINITY), '0');
  });

  test('formatDateML and formatTimestampML standardize date and ISO-8601 representations', () => {
    assert.equal(formatDateML('2026-10-24'), '2026-10-24');
    assert.equal(formatDateML('2026-10-24T15:30:00.000Z'), '2026-10-24');
    assert.equal(formatDateML(null), '');
    assert.equal(formatDateML('invalid-date'), '');

    assert.equal(formatTimestampML('2026-10-24T08:00:00.000Z'), '2026-10-24T08:00:00.000Z');
    assert.equal(formatTimestampML(null), '');
    assert.equal(formatTimestampML('not-a-timestamp'), '');
  });

  test('exportOrdersToCSV generates 26 ML columns and strictly excludes specs, notes, and designFiles', () => {
    const sampleOrder: Order = {
      id: 'ord-ml-1',
      orderNumber: 'ORD-2026-0099',
      orderDate: '2026-10-20',
      deadline: '2026-10-28',
      buyerName: 'PT. Sinar, Abadi',
      buyerPhone: '081234567890',
      productName: 'Ganci Akrilik "2 Sisi"',
      specs: 'SECRET_UNSTRUCTURED_SPECS_DO_NOT_EXPORT_12345',
      qty: 500,
      pricePerPcs: 4500,
      omzet: 2250000,
      hppBreakdown: {
        bahanBaku: 700,
        tintaSablon: 300,
        tenagaKerja: 500,
        kemasan: 150,
        overhead: 150,
        totalHppPerPcs: 1800,
        totalHpp: 900000,
      },
      profit: 1350000,
      marginPct: 60,
      paymentStatus: 'DP',
      dpAmount: 1000000,
      remainingPayment: 1250000,
      processStatus: 'PROSES_CETAK',
      queueOrder: 1,
      designFiles: [
        {
          id: 'df-99',
          orderId: 'ord-ml-1',
          fileName: 'SECRET_DESIGN_FILE_DO_NOT_EXPORT.cdr',
          fileSize: 1024,
          fileType: 'CDR',
          fileUrl: 'https://example.com/secret.cdr',
          isReadyToPrint: true,
          uploadedAt: '2026-10-20T10:00:00.000Z',
        },
      ],
      notes: 'SECRET_UNSTRUCTURED_NOTES_DO_NOT_EXPORT_67890',
      createdAt: '2026-10-20T09:00:00.000Z',
      updatedAt: '2026-10-21T11:30:00.000Z',
    };

    const csv = exportOrdersToCSV([sampleOrder]);
    const lines = csv.split('\r\n');
    assert.equal(lines.length, 2);

    const headers = lines[0].split(',');
    assert.equal(headers.length, 26);
    assert.ok(!headers.includes('specs'));
    assert.ok(!headers.includes('notes'));
    assert.ok(!headers.includes('design_files'));

    // Unstructured strings must never appear anywhere in CSV output
    assert.ok(!csv.includes('SECRET_UNSTRUCTURED_SPECS_DO_NOT_EXPORT_12345'));
    assert.ok(!csv.includes('SECRET_UNSTRUCTURED_NOTES_DO_NOT_EXPORT_67890'));
    assert.ok(!csv.includes('SECRET_DESIGN_FILE_DO_NOT_EXPORT.cdr'));

    // Raw numbers only: no Rp, no %
    assert.ok(!csv.includes('Rp'));
    assert.ok(!csv.includes('%'));
    assert.ok(lines[1].includes(',500,4500,2250000,700,300,500,150,150,1800,900000,1350000,60,DP,1000000,1250000,PROSES_CETAK,1,'));
  });

  test('exportCapexToCSV generates 9 ML columns and strictly excludes notes/description', () => {
    const sampleCapex: CapexEntry = {
      id: 'cpx-ml-1',
      entryDate: '2026-10-05',
      category: 'Mesin & Peralatan',
      itemName: 'Mesin UV Flatbed, A3',
      amount: 18500000,
      usefulLifeMonths: 36,
      monthlyDepreciation: 513889,
      description: 'UNSTRUCTURED_CAPEX_DESCRIPTION_DO_NOT_EXPORT',
      notes: 'UNSTRUCTURED_CAPEX_NOTES_DO_NOT_EXPORT',
      createdAt: '2026-10-05T08:00:00.000Z',
      updatedAt: '2026-10-05T08:00:00.000Z',
    };

    const csv = exportCapexToCSV([sampleCapex]);
    const lines = csv.split('\r\n');
    assert.equal(lines.length, 2);

    const headers = lines[0].split(',');
    assert.equal(headers.length, 9);
    assert.deepEqual(headers, [
      'capex_id',
      'entry_date',
      'category',
      'item_name',
      'amount',
      'useful_life_months',
      'monthly_depreciation',
      'created_at',
      'updated_at',
    ]);

    assert.ok(!csv.includes('UNSTRUCTURED_CAPEX_DESCRIPTION_DO_NOT_EXPORT'));
    assert.ok(!csv.includes('UNSTRUCTURED_CAPEX_NOTES_DO_NOT_EXPORT'));
    assert.ok(!csv.includes('Rp'));
    assert.ok(lines[1].includes('"Mesin UV Flatbed, A3",18500000,36,513889'));
  });

  test('exportRawMaterialsToCSV generates 11 ML columns and strictly excludes notes', () => {
    const sampleMaterial: RawMaterialEntry = {
      id: 'mat-ml-1',
      entryDate: '2026-10-12',
      materialName: 'Akrilik Bening 3mm',
      category: 'Akrilik & Aksesoris',
      supplier: 'CV. Akrilik Jaya',
      quantity: 15,
      unit: 'lembar',
      unitPrice: 185000,
      totalAmount: 2775000,
      notes: 'UNSTRUCTURED_MATERIAL_NOTES_DO_NOT_EXPORT',
      createdAt: '2026-10-12T09:00:00.000Z',
      updatedAt: '2026-10-12T09:00:00.000Z',
    };

    const csv = exportRawMaterialsToCSV([sampleMaterial]);
    const lines = csv.split('\r\n');
    assert.equal(lines.length, 2);

    const headers = lines[0].split(',');
    assert.equal(headers.length, 11);
    assert.deepEqual(headers, [
      'material_id',
      'entry_date',
      'material_name',
      'category',
      'supplier',
      'qty',
      'unit',
      'unit_price',
      'total_amount',
      'created_at',
      'updated_at',
    ]);

    assert.ok(!csv.includes('UNSTRUCTURED_MATERIAL_NOTES_DO_NOT_EXPORT'));
    assert.ok(!csv.includes('Rp'));
    assert.ok(lines[1].includes('15,lembar,185000,2775000'));
  });

  test('UI pages import and integrate CSV download actions', () => {
    const orderPage = fs.readFileSync(path.resolve(process.cwd(), 'src/app/order/page.tsx'), 'utf-8');
    const historyPage = fs.readFileSync(path.resolve(process.cwd(), 'src/app/history/page.tsx'), 'utf-8');
    const capexPage = fs.readFileSync(path.resolve(process.cwd(), 'src/app/capex/page.tsx'), 'utf-8');

    assert.ok(orderPage.includes('exportOrdersToCSV'));
    assert.ok(orderPage.includes('downloadCSVFile'));
    assert.ok(orderPage.includes('Unduh CSV'));

    assert.ok(historyPage.includes('exportOrdersToCSV'));
    assert.ok(historyPage.includes('downloadCSVFile'));
    assert.ok(historyPage.includes('Unduh CSV'));

    assert.ok(capexPage.includes('exportCapexToCSV'));
    assert.ok(capexPage.includes('exportRawMaterialsToCSV'));
    assert.ok(capexPage.includes('downloadCSVFile'));
    assert.ok(capexPage.includes('Unduh CSV Capex'));
    assert.ok(capexPage.includes('Unduh CSV Bahan Baku'));

    // Also verify SSR guard in downloadCSVFile does not throw in Node
    assert.doesNotThrow(() => downloadCSVFile('test.csv', 'a,b\r\n1,2'));
    assert.doesNotThrow(() => downloadExcelFile('test.xls', '<table></table>'));
    assert.doesNotThrow(() => exportOrdersToPDF([], 'Title', '2026-10'));
    assert.doesNotThrow(() => exportCapexToPDF([], '2026-10'));
    assert.doesNotThrow(() => exportRawMaterialsToPDF([], '2026-10'));
  });

  test('Owner Excel exports include full details (specs, notes) and summary totals while CSV excludes them', () => {
    const sampleOrder: Order = {
      id: 'ord-xls-1',
      orderNumber: 'ORD-2026-0777',
      orderDate: '2026-10-20',
      deadline: '2026-10-25',
      buyerName: 'Owner Test Buyer',
      buyerPhone: '08123456789',
      productName: 'Ganci Akrilik Tebal',
      specs: 'SPESIFIKASI_LENGKAP_UNTUK_OWNER',
      qty: 100,
      pricePerPcs: 5000,
      omzet: 500000,
      hppBreakdown: {
        bahanBaku: 1000,
        tintaSablon: 300,
        tenagaKerja: 400,
        kemasan: 150,
        overhead: 150,
        totalHppPerPcs: 2000,
        totalHpp: 200000,
      },
      profit: 300000,
      marginPct: 60,
      paymentStatus: 'LUNAS',
      dpAmount: 500000,
      remainingPayment: 0,
      processStatus: 'SELESAI',
      queueOrder: 1,
      designFiles: [],
      notes: 'CATATAN_PENTING_UNTUK_OWNER',
      createdAt: '2026-10-20T08:00:00.000Z',
      updatedAt: '2026-10-20T08:00:00.000Z',
    };

    const excelOrders = exportOrdersToExcel([sampleOrder], 'Oktober 2026');
    assert.ok(excelOrders.includes('LAPORAN PESANAN OWNER'));
    assert.ok(excelOrders.includes('SPESIFIKASI_LENGKAP_UNTUK_OWNER'));
    assert.ok(excelOrders.includes('CATATAN_PENTING_UNTUK_OWNER'));
    assert.ok(excelOrders.includes('TOTAL RINGKASAN OWNER'));

    const excelCapex = exportCapexToExcel(
      [
        {
          id: 'cpx-1',
          entryDate: '2026-10-05',
          category: 'Mesin & Peralatan',
          itemName: 'Mesin Press',
          amount: 5000000,
          description: 'KETERANGAN_CAPEX_OWNER',
          createdAt: '2026-10-05T08:00:00.000Z',
          updatedAt: '2026-10-05T08:00:00.000Z',
        },
      ],
      'Oktober 2026'
    );
    assert.ok(excelCapex.includes('LAPORAN BELANJA MODAL (CAPEX) OWNER'));
    assert.ok(excelCapex.includes('KETERANGAN_CAPEX_OWNER'));

    const excelMat = exportRawMaterialsToExcel(
      [
        {
          id: 'mat-1',
          entryDate: '2026-10-06',
          materialName: 'Akrilik 3mm',
          category: 'Akrilik & Aksesoris',
          supplier: 'CV Akrilik',
          quantity: 10,
          unit: 'lembar',
          unitPrice: 150000,
          totalAmount: 1500000,
          notes: 'CATATAN_BAHAN_OWNER',
          createdAt: '2026-10-06T08:00:00.000Z',
          updatedAt: '2026-10-06T08:00:00.000Z',
        },
      ],
      'Oktober 2026'
    );
    assert.ok(excelMat.includes('LAPORAN BAHAN BAKU BERULANG OWNER'));
    assert.ok(excelMat.includes('CATATAN_BAHAN_OWNER'));
  });
});
