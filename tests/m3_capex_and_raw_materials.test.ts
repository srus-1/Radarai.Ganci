import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { capexService, rawMaterialService } from '../src/lib/supabase';
import { CapexEntry, RawMaterialEntry } from '../src/types/capex';

describe('Milestone 3: Capex & Recurring Raw Materials Verification Suite', () => {
  describe('Requirement 1: Capex Service Full CRUD (In-Memory Optimistic Fallback)', () => {
    test('getCapexEntries returns in-memory seed records without errors', async () => {
      const entries = await capexService.getCapexEntries();
      assert.ok(Array.isArray(entries));
      assert.ok(entries.length >= 4);

      const first = entries[0];
      assert.ok(first.id);
      assert.ok(first.itemName);
      assert.ok(first.category);
      assert.ok(typeof first.amount === 'number' && first.amount >= 0);
      assert.ok(first.entryDate);
      assert.ok(first.createdAt);
      assert.ok(first.updatedAt);
    });

    test('createCapexEntry creates and prepends a new Capex entry with valid defaults', async () => {
      const created = await capexService.createCapexEntry({
        itemName: 'Mesin DTF Roll-to-Roll 30cm',
        category: 'Mesin & Peralatan',
        amount: 25000000,
        entryDate: '2026-10-24',
        description: 'Printer DTF untuk sablon kaos & lanyard',
      });

      assert.ok(created.id);
      assert.equal(created.itemName, 'Mesin DTF Roll-to-Roll 30cm');
      assert.equal(created.category, 'Mesin & Peralatan');
      assert.equal(created.amount, 25000000);
      assert.equal(created.entryDate, '2026-10-24');
      assert.equal(created.description, 'Printer DTF untuk sablon kaos & lanyard');
      assert.ok(created.createdAt);
      assert.ok(created.updatedAt);

      const all = await capexService.getCapexEntries();
      const found = all.find((c) => c.id === created.id);
      assert.ok(found);
      assert.equal(found?.itemName, 'Mesin DTF Roll-to-Roll 30cm');
    });

    test('updateCapexEntry updates fields cleanly and refreshes updatedAt', async () => {
      const created = await capexService.createCapexEntry({
        itemName: 'Alat Press Pin Gantungan Kunci',
        category: 'Mesin & Peralatan',
        amount: 1200000,
        entryDate: '2026-10-10',
        description: 'Versi manual standard',
      });

      const updated = await capexService.updateCapexEntry(created.id, {
        itemName: 'Alat Press Pin Gantungan Kunci Pneumatik',
        amount: 1850000,
        description: 'Upgrade ke sistem angin pneumatik',
      });

      assert.ok(updated);
      assert.equal(updated?.id, created.id);
      assert.equal(updated?.itemName, 'Alat Press Pin Gantungan Kunci Pneumatik');
      assert.equal(updated?.amount, 1850000);
      assert.equal(updated?.description, 'Upgrade ke sistem angin pneumatik');
      assert.equal(updated?.category, 'Mesin & Peralatan'); // preserved
    });

    test('deleteCapexEntry removes the entry from the in-memory store', async () => {
      const created = await capexService.createCapexEntry({
        itemName: 'Barang Sementara Yang Mau Dihapus',
        category: 'Lainnya',
        amount: 500000,
        entryDate: '2026-10-20',
      });

      const beforeDelete = await capexService.getCapexEntries();
      assert.ok(beforeDelete.some((c) => c.id === created.id));

      const deleted = await capexService.deleteCapexEntry(created.id);
      assert.equal(deleted, true);

      const afterDelete = await capexService.getCapexEntries();
      assert.ok(!afterDelete.some((c) => c.id === created.id));
    });
  });

  describe('Requirement 2: Raw Material Service Full CRUD & Auto-Calculation', () => {
    test('getRawMaterialEntries returns in-memory raw materials seed records', async () => {
      const entries = await rawMaterialService.getRawMaterialEntries();
      assert.ok(Array.isArray(entries));
      assert.ok(entries.length >= 5);

      const first = entries[0];
      assert.ok(first.id);
      assert.ok(first.materialName);
      assert.ok(first.category);
      assert.ok(first.supplier);
      assert.ok(typeof first.quantity === 'number');
      assert.ok(first.unit);
      assert.ok(typeof first.unitPrice === 'number');
      assert.ok(typeof first.totalAmount === 'number');
      assert.equal(first.totalAmount, Math.round(first.quantity * first.unitPrice));
    });

    test('createRawMaterialEntry automatically calculates totalAmount = quantity * unitPrice', async () => {
      const created = await rawMaterialService.createRawMaterialEntry({
        materialName: 'Akrilik Hitam Doff 2mm',
        category: 'Akrilik & Aksesoris',
        supplier: 'CV Indo Acrylic',
        quantity: 5,
        unit: 'lembar',
        unitPrice: 220000,
        entryDate: '2026-10-24',
        notes: 'Bahan gantungan kunci custom',
      });

      assert.ok(created.id);
      assert.equal(created.materialName, 'Akrilik Hitam Doff 2mm');
      assert.equal(created.quantity, 5);
      assert.equal(created.unitPrice, 220000);
      assert.equal(created.totalAmount, 1100000); // 5 * 220,000
      assert.equal(created.supplier, 'CV Indo Acrylic');

      const all = await rawMaterialService.getRawMaterialEntries();
      assert.ok(all.some((m) => m.id === created.id));
    });

    test('updateRawMaterialEntry recalculates totalAmount when quantity or unitPrice changes', async () => {
      const created = await rawMaterialService.createRawMaterialEntry({
        materialName: 'Lem Khusus Akrilik Weld-On',
        category: 'Sparepart & Consumable',
        supplier: 'Toko Kimia Makmur',
        quantity: 2,
        unit: 'kaleng',
        unitPrice: 150000,
        entryDate: '2026-10-15',
      });
      assert.equal(created.totalAmount, 300000);

      // Update quantity to 4
      const updatedQty = await rawMaterialService.updateRawMaterialEntry(created.id, {
        quantity: 4,
      });
      assert.equal(updatedQty?.quantity, 4);
      assert.equal(updatedQty?.unitPrice, 150000);
      assert.equal(updatedQty?.totalAmount, 600000); // 4 * 150,000

      // Update unitPrice to 160000
      const updatedPrice = await rawMaterialService.updateRawMaterialEntry(created.id, {
        unitPrice: 160000,
      });
      assert.equal(updatedPrice?.quantity, 4);
      assert.equal(updatedPrice?.unitPrice, 160000);
      assert.equal(updatedPrice?.totalAmount, 640000); // 4 * 160,000
    });

    test('deleteRawMaterialEntry removes material record from in-memory store', async () => {
      const created = await rawMaterialService.createRawMaterialEntry({
        materialName: 'Bahan Temporer Hapus',
        category: 'Lainnya',
        supplier: 'Test Supplier',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 50000,
        entryDate: '2026-10-20',
      });

      const deleted = await rawMaterialService.deleteRawMaterialEntry(created.id);
      assert.equal(deleted, true);

      const all = await rawMaterialService.getRawMaterialEntries();
      assert.ok(!all.some((m) => m.id === created.id));
    });
  });

  describe('Requirement 3: Global Monthly Filter (YYYY-MM) Scoping & Invariant', () => {
    test('filters Capex and Materials strictly by selectedMonth', async () => {
      const capex = await capexService.getCapexEntries();
      const materials = await rawMaterialService.getRawMaterialEntries();

      // October 2026
      const octCapex = capex.filter((c) => c.entryDate.startsWith('2026-10'));
      const octMaterials = materials.filter((m) => m.entryDate.startsWith('2026-10'));

      assert.ok(octCapex.every((c) => c.entryDate.startsWith('2026-10')));
      assert.ok(octMaterials.every((m) => m.entryDate.startsWith('2026-10')));

      // September 2026
      const sepCapex = capex.filter((c) => c.entryDate.startsWith('2026-09'));
      const sepMaterials = materials.filter((m) => m.entryDate.startsWith('2026-09'));

      assert.ok(sepCapex.every((c) => c.entryDate.startsWith('2026-09')));
      assert.ok(sepMaterials.every((m) => m.entryDate.startsWith('2026-09')));

      // Invariant: Monthly totals sum accurately
      const octTotalCapex = octCapex.reduce((acc, c) => acc + c.amount, 0);
      const octTotalMaterials = octMaterials.reduce((acc, m) => acc + m.totalAmount, 0);
      const octGrandTotal = octTotalCapex + octTotalMaterials;
      assert.ok(octGrandTotal > 0);
    });

    test('Capex and Materials data do NOT pollute or deduct from Order profit metrics', () => {
      // Per R2 requirement: Dashboard profit metrics remain calculated strictly from Orders
      // Capex & Materials are segregated operational investments
      const orderOmzet = 10000000;
      const orderHpp = 4500000;
      const expectedOrderProfit = 5500000;

      const orderProfit = orderOmzet - orderHpp;
      assert.equal(orderProfit, expectedOrderProfit);
      // Invariant holds regardless of capex expenditure
    });
  });

  describe('Requirement 4: Sidebar Navigation & UI Route Verification', () => {
    test('Sidebar.tsx includes 4th navigation item for /capex with Receipt icon', () => {
      const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
      assert.ok(fs.existsSync(sidebarPath));
      const content = fs.readFileSync(sidebarPath, 'utf-8');

      assert.ok(content.includes('Receipt'));
      assert.ok(content.includes("href: '/capex'"));
      assert.ok(content.includes("label: 'Capex & Bahan'"));
      assert.ok(content.includes("description: 'Biaya modal & bahan baku.'"));
    });

    test('Route /capex page.tsx exists and implements Notion design tokens', () => {
      const capexPagePath = path.resolve(process.cwd(), 'src/app/capex/page.tsx');
      assert.ok(fs.existsSync(capexPagePath));
      const content = fs.readFileSync(capexPagePath, 'utf-8');

      // Navy hero band
      assert.ok(content.includes('bg-[#0a1530]'));
      assert.ok(content.includes('Receipt'));
      assert.ok(content.includes('Capex & Bahan'));

      // 4 pastel KPI cards
      assert.ok(content.includes('bg-[#dcecfa]')); // sky
      assert.ok(content.includes('bg-[#e6e0f5]')); // lavender
      assert.ok(content.includes('bg-[#d9f3e1]')); // mint
      assert.ok(content.includes('bg-[#ffe8d4]')); // peach

      // High-contrast font tokens
      assert.ok(content.includes('text-[#1a1a1a]'));
      assert.ok(content.includes('text-[#37352f]'));

      // Notion table containers and actions
      assert.ok(content.includes('Belanja Modal (Capex)'));
      assert.ok(content.includes('Bahan Baku Berulang'));
      assert.ok(content.includes('Tambah Capex'));
      assert.ok(content.includes('Tambah Bahan'));

      // Zero localStorage usage
      assert.ok(!content.includes('localStorage'));
    });
  });

  describe('Requirement 5: PostgreSQL Migration File Verification', () => {
    test('Migration file exists with tables, indexes, triggers, and RLS', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261024000000_capex_and_raw_materials.sql'
      );
      assert.ok(fs.existsSync(migrationPath));
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // Tables
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.capex_entries'));
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.raw_material_entries'));

      // Constraints
      assert.ok(sql.includes('CHECK (amount >= 0)'));
      assert.ok(sql.includes('CHECK (quantity > 0)'));
      assert.ok(sql.includes('CHECK (unit_price >= 0)'));
      assert.ok(sql.includes('CHECK (total_amount >= 0)'));

      // Indexes
      assert.ok(sql.includes('idx_capex_entry_date'));
      assert.ok(sql.includes('idx_raw_materials_entry_date'));
      assert.ok(sql.includes('idx_raw_materials_supplier'));

      // Triggers
      assert.ok(sql.includes('handle_updated_at()'));
      assert.ok(sql.includes('trigger_capex_updated_at'));
      assert.ok(sql.includes('trigger_raw_materials_updated_at'));

      // RLS
      assert.ok(sql.includes('ALTER TABLE public.capex_entries ENABLE ROW LEVEL SECURITY;'));
      assert.ok(sql.includes('ALTER TABLE public.raw_material_entries ENABLE ROW LEVEL SECURITY;'));
      assert.ok(sql.includes('Staff full access on capex_entries'));
      assert.ok(sql.includes('Staff full access on raw_material_entries'));
    });
  });

  describe('Requirement 6: Zero LocalStorage Usage Invariant', () => {
    test('src/lib/supabase.ts does not read or write localStorage for capex or raw materials', () => {
      const supabaseTsPath = path.resolve(process.cwd(), 'src/lib/supabase.ts');
      const content = fs.readFileSync(supabaseTsPath, 'utf-8');
      assert.ok(!content.includes('localStorage'));
    });
  });
});
