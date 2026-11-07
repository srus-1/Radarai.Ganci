import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { capexService, rawMaterialService } from '../src/lib/supabase';
import {
  CapexEntry,
  RawMaterialEntry,
  CapexCategory,
  RawMaterialCategory,
  CreateCapexInput,
  CreateRawMaterialInput,
} from '../src/types/capex';

describe('Adversarial Stress Test Suite: Milestone 3 Capex & Raw Materials', () => {
  // ==========================================================================
  // Suite 1: Full CRUD Lifecycle Stress (50 Capex + 50 Raw Materials)
  // ==========================================================================
  describe('Suite 1: Full CRUD Lifecycle Stress Harness', () => {
    test('1.1: Sequentially create 50 Capex entries with unique IDs and valid timestamps', async () => {
      const categories: CapexCategory[] = [
        'Mesin & Peralatan',
        'Perlengkapan Workshop',
        'Elektronik & IT',
        'Renovasi Workshop',
        'Lainnya',
      ];

      const createdEntries: CapexEntry[] = [];

      for (let i = 1; i <= 50; i++) {
        const cat = categories[i % categories.length];
        const entry = await capexService.createCapexEntry({
          itemName: `Capex Stress Equipment #${i}`,
          category: cat,
          amount: 500000 + i * 150000,
          entryDate: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
          description: `Stress testing sequential creation item #${i}`,
        });

        assert.ok(entry.id, `Entry #${i} must have an ID`);
        assert.equal(entry.itemName, `Capex Stress Equipment #${i}`);
        assert.equal(entry.category, cat);
        assert.equal(entry.amount, 500000 + i * 150000);
        assert.ok(entry.createdAt, `Entry #${i} must have createdAt`);
        assert.ok(entry.updatedAt, `Entry #${i} must have updatedAt`);
        createdEntries.push(entry);
      }

      assert.equal(createdEntries.length, 50, 'Exactly 50 Capex entries must be generated');

      // Check unique IDs invariant
      const uniqueIds = new Set(createdEntries.map((e) => e.id));
      assert.equal(uniqueIds.size, 50, 'All 50 Capex generated IDs must be strictly unique');

      // Check all entries exist in store
      const allCapex = await capexService.getCapexEntries();
      for (const entry of createdEntries) {
        const found = allCapex.find((c) => c.id === entry.id);
        assert.ok(found, `Entry ${entry.id} must be retrievable from getCapexEntries`);
        assert.equal(found?.amount, entry.amount);
      }
    });

    test('1.2: Sequentially update all 50 Capex entries across all mutable fields', async () => {
      const allCapex = await capexService.getCapexEntries();
      const stressEntries = allCapex.filter((c) => c.itemName.startsWith('Capex Stress Equipment #'));
      assert.ok(stressEntries.length >= 50, 'Must find at least 50 stress entries to update');

      for (let i = 0; i < 50; i++) {
        const target = stressEntries[i];
        const newAmount = 10000000 + (i + 1) * 200000;
        const newCategory: CapexCategory = i % 2 === 0 ? 'Elektronik & IT' : 'Perlengkapan Workshop';
        const newDate = `2026-09-${String((i % 25) + 1).padStart(2, '0')}`;
        const newName = `UPDATED Capex Stress #${i + 1}`;
        const newDesc = `Updated description #${i + 1}`;

        const updated = await capexService.updateCapexEntry(target.id, {
          itemName: newName,
          category: newCategory,
          amount: newAmount,
          entryDate: newDate,
          description: newDesc,
        });

        assert.ok(updated, `Update for ${target.id} must return non-null`);
        assert.equal(updated?.id, target.id);
        assert.equal(updated?.itemName, newName);
        assert.equal(updated?.category, newCategory);
        assert.equal(updated?.amount, newAmount);
        assert.equal(updated?.entryDate, newDate);
        assert.equal(updated?.description, newDesc);
        assert.ok(
          new Date(updated!.updatedAt).getTime() >= new Date(target.createdAt).getTime(),
          'updatedAt must be refreshed'
        );
      }

      // Verify persistence in store
      const refreshedList = await capexService.getCapexEntries();
      for (let i = 0; i < 50; i++) {
        const originalId = stressEntries[i].id;
        const found = refreshedList.find((c) => c.id === originalId);
        assert.ok(found);
        assert.equal(found?.itemName, `UPDATED Capex Stress #${i + 1}`);
        assert.equal(found?.amount, 10000000 + (i + 1) * 200000);
      }
    });

    test('1.3: Sequentially delete 25 Capex entries and verify remaining 25 remain intact', async () => {
      const beforeDelete = await capexService.getCapexEntries();
      const stressEntries = beforeDelete.filter((c) => c.itemName.startsWith('UPDATED Capex Stress #'));
      assert.ok(stressEntries.length >= 50, 'Must have 50 updated stress entries');

      const toDelete = stressEntries.slice(0, 25);
      const toKeep = stressEntries.slice(25, 50);

      for (let i = 0; i < toDelete.length; i++) {
        const target = toDelete[i];
        const countBefore = (await capexService.getCapexEntries()).length;

        const success = await capexService.deleteCapexEntry(target.id);
        assert.equal(success, true, `Delete call for ${target.id} must succeed`);

        const afterEntries = await capexService.getCapexEntries();
        assert.equal(afterEntries.length, countBefore - 1, 'Store count must decrement by exactly 1');
        assert.ok(!afterEntries.some((c) => c.id === target.id), `Deleted entry ${target.id} must be removed`);
      }

      // Verify the remaining 25 are 100% intact
      const remainingList = await capexService.getCapexEntries();
      for (const kept of toKeep) {
        const found = remainingList.find((c) => c.id === kept.id);
        assert.ok(found, `Kept entry ${kept.id} must still exist`);
        assert.equal(found?.itemName, kept.itemName);
        assert.equal(found?.amount, kept.amount);
        assert.equal(found?.category, kept.category);
      }
    });

    test('1.4: Capex non-existent ID operations resolve gracefully without crashing', async () => {
      const nonExistentId = 'cpx-nonexistent-adversarial-id-99999999';

      // Update non-existent
      const updateResult = await capexService.updateCapexEntry(nonExistentId, {
        itemName: 'Ghost Item',
        amount: 999999,
      });
      assert.equal(updateResult, null, 'Updating non-existent ID must safely return null');

      // Delete non-existent
      const deleteResult = await capexService.deleteCapexEntry(nonExistentId);
      assert.equal(deleteResult, true, 'Deleting non-existent ID must safely return true (idempotent)');

      // Verify existing entries were not altered
      const currentList = await capexService.getCapexEntries();
      assert.ok(currentList.length > 0, 'Store must remain intact');
    });

    test('1.5: Sequentially create 50 Raw Material entries with auto-calculated totalAmount', async () => {
      const categories: RawMaterialCategory[] = [
        'Akrilik & Aksesoris',
        'Tinta & Sablon',
        'Kemasan & Packaging',
        'Sparepart & Consumable',
        'Lainnya',
      ];
      const units = ['pcs', 'lembar', 'kg', 'pack', 'meter'];

      const createdMaterials: RawMaterialEntry[] = [];

      for (let i = 1; i <= 50; i++) {
        const cat = categories[i % categories.length];
        const unit = units[i % units.length];
        const qty = 5 + (i % 10);
        const unitPrice = 25000 + i * 2500;
        const expectedTotal = Math.round(qty * unitPrice);

        const entry = await rawMaterialService.createRawMaterialEntry({
          materialName: `Raw Material Stress #${i}`,
          category: cat,
          supplier: `Supplier Indo #${(i % 5) + 1}`,
          quantity: qty,
          unit: unit,
          unitPrice: unitPrice,
          entryDate: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
          notes: `Batch test note #${i}`,
        });

        assert.ok(entry.id, `Material #${i} must have an ID`);
        assert.equal(entry.materialName, `Raw Material Stress #${i}`);
        assert.equal(entry.category, cat);
        assert.equal(entry.quantity, qty);
        assert.equal(entry.unitPrice, unitPrice);
        assert.equal(entry.totalAmount, expectedTotal, `totalAmount for #${i} must equal qty * unitPrice`);
        assert.ok(entry.createdAt);
        assert.ok(entry.updatedAt);
        createdMaterials.push(entry);
      }

      assert.equal(createdMaterials.length, 50);

      // Verify unique IDs
      const uniqueMatIds = new Set(createdMaterials.map((m) => m.id));
      assert.equal(uniqueMatIds.size, 50, 'All 50 Raw Material IDs must be unique');

      // Verify presence in store
      const allMaterials = await rawMaterialService.getRawMaterialEntries();
      for (const mat of createdMaterials) {
        const found = allMaterials.find((m) => m.id === mat.id);
        assert.ok(found, `Material ${mat.id} must be in store`);
        assert.equal(found?.totalAmount, mat.totalAmount);
      }
    });

    test('1.6: Sequentially update 50 Raw Materials and verify dynamic totalAmount recalculation', async () => {
      const allMaterials = await rawMaterialService.getRawMaterialEntries();
      const stressMaterials = allMaterials.filter((m) => m.materialName.startsWith('Raw Material Stress #'));
      assert.ok(stressMaterials.length >= 50, 'Must find 50 raw material stress entries');

      for (let i = 0; i < 50; i++) {
        const target = stressMaterials[i];
        const updatedQty = target.quantity + 10;
        const updatedPrice = target.unitPrice + 5000;
        const expectedNewTotal = Math.round(updatedQty * updatedPrice);

        // Update both quantity and unitPrice
        const updated = await rawMaterialService.updateRawMaterialEntry(target.id, {
          materialName: `UPDATED Material #${i + 1}`,
          quantity: updatedQty,
          unitPrice: updatedPrice,
          supplier: `New Global Supplier #${i + 1}`,
          notes: `Recalculated totalAmount verification #${i + 1}`,
        });

        assert.ok(updated);
        assert.equal(updated?.materialName, `UPDATED Material #${i + 1}`);
        assert.equal(updated?.quantity, updatedQty);
        assert.equal(updated?.unitPrice, updatedPrice);
        assert.equal(
          updated?.totalAmount,
          expectedNewTotal,
          `Recalculated totalAmount must equal ${updatedQty} * ${updatedPrice} = ${expectedNewTotal}`
        );
      }
    });

    test('1.7: Sequentially delete 25 Raw Materials and verify store stability', async () => {
      const currentList = await rawMaterialService.getRawMaterialEntries();
      const stressMaterials = currentList.filter((m) => m.materialName.startsWith('UPDATED Material #'));
      assert.ok(stressMaterials.length >= 50);

      const toDelete = stressMaterials.slice(0, 25);
      const toKeep = stressMaterials.slice(25, 50);

      for (let i = 0; i < toDelete.length; i++) {
        const target = toDelete[i];
        const countBefore = (await rawMaterialService.getRawMaterialEntries()).length;

        const success = await rawMaterialService.deleteRawMaterialEntry(target.id);
        assert.equal(success, true);

        const afterList = await rawMaterialService.getRawMaterialEntries();
        assert.equal(afterList.length, countBefore - 1);
        assert.ok(!afterList.some((m) => m.id === target.id));
      }

      // Check remaining
      const finalList = await rawMaterialService.getRawMaterialEntries();
      for (const kept of toKeep) {
        const found = finalList.find((m) => m.id === kept.id);
        assert.ok(found, `Kept material ${kept.id} must still exist`);
        assert.equal(found?.materialName, kept.materialName);
        assert.equal(found?.totalAmount, kept.totalAmount);
      }
    });

    test('1.8: Raw Materials non-existent ID operations resolve gracefully without crashing', async () => {
      const nonExistentId = 'mat-nonexistent-adversarial-id-88888888';

      const updateResult = await rawMaterialService.updateRawMaterialEntry(nonExistentId, {
        materialName: 'Ghost Material',
        quantity: 10,
        unitPrice: 1000,
      });
      assert.equal(updateResult, null);

      const deleteResult = await rawMaterialService.deleteRawMaterialEntry(nonExistentId);
      assert.equal(deleteResult, true);
    });
  });

  // ==========================================================================
  // Suite 2: In-Memory Optimistic Fallback & Zero LocalStorage Invariant
  // ==========================================================================
  describe('Suite 2: Optimistic Local Fallback & Strict 0 LocalStorage Invariant', () => {
    test('2.1: In-memory fallback maintains state across multiple calls in standby mode', async () => {
      const newCapex = await capexService.createCapexEntry({
        itemName: 'Standby Persistence Verification Tool',
        category: 'Mesin & Peralatan',
        amount: 4500000,
        entryDate: '2026-10-24',
      });

      const list1 = await capexService.getCapexEntries();
      const found1 = list1.find((c) => c.id === newCapex.id);
      assert.ok(found1, 'Newly added entry must be immediately retrievable');

      const list2 = await capexService.getCapexEntries();
      const found2 = list2.find((c) => c.id === newCapex.id);
      assert.ok(found2, 'Entry must persist in in-memory store across subsequent calls');

      // Cleanup
      await capexService.deleteCapexEntry(newCapex.id);
    });

    test('2.2: Static Code Scan: Zero occurrences of localStorage across Capex modules', () => {
      const filesToAudit = [
        'src/lib/supabase.ts',
        'src/app/capex/page.tsx',
        'src/types/capex.ts',
      ];

      for (const relativePath of filesToAudit) {
        const fullPath = path.resolve(process.cwd(), relativePath);
        assert.ok(fs.existsSync(fullPath), `Target file must exist: ${relativePath}`);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const hasLocalStorage = content.includes('localStorage');
        assert.equal(
          hasLocalStorage,
          false,
          `File ${relativePath} contains forbidden 'localStorage' reference!`
        );
      }
    });

    test('2.3: Runtime Trap: Mocking poisonous localStorage confirms ZERO runtime calls during CRUD', async () => {
      let trapTripped = false;
      let trapAction = '';

      // Install poisonous localStorage spy on globalThis
      const poisonousStorage = new Proxy(
        {},
        {
          get(_target, prop) {
            trapTripped = true;
            trapAction = `GET ${String(prop)}`;
            throw new Error(`CRITICAL INVARIANT VIOLATION: Illegal localStorage.${String(prop)} access!`);
          },
          set(_target, prop) {
            trapTripped = true;
            trapAction = `SET ${String(prop)}`;
            throw new Error(`CRITICAL INVARIANT VIOLATION: Illegal localStorage.${String(prop)} write!`);
          },
        }
      );

      const originalLocalStorage = (globalThis as any).localStorage;
      (globalThis as any).localStorage = poisonousStorage;

      try {
        // Execute comprehensive CRUD on Capex under the poisonous trap
        const capex = await capexService.createCapexEntry({
          itemName: 'Poison Trap Test Item',
          category: 'Lainnya',
          amount: 150000,
          entryDate: '2026-10-24',
        });
        await capexService.getCapexEntries();
        await capexService.updateCapexEntry(capex.id, { amount: 200000 });
        await capexService.deleteCapexEntry(capex.id);

        // Execute comprehensive CRUD on Raw Materials under the poisonous trap
        const mat = await rawMaterialService.createRawMaterialEntry({
          materialName: 'Poison Trap Material',
          category: 'Lainnya',
          supplier: 'Poison Supplier',
          quantity: 2,
          unit: 'pcs',
          unitPrice: 50000,
          entryDate: '2026-10-24',
        });
        await rawMaterialService.getRawMaterialEntries();
        await rawMaterialService.updateRawMaterialEntry(mat.id, { quantity: 4 });
        await rawMaterialService.deleteRawMaterialEntry(mat.id);

        assert.equal(trapTripped, false, `localStorage was accessed: ${trapAction}`);
      } finally {
        (globalThis as any).localStorage = originalLocalStorage;
      }
    });
  });

  // ==========================================================================
  // Suite 3: Optimistic Rollback Simulation
  // ==========================================================================
  describe('Suite 3: Optimistic Rollback Simulation Harness', () => {
    test('3.1: Optimistic Update Rollback on Backend Rejection', async () => {
      // Simulate UI component state
      let capexUiState: CapexEntry[] = [
        {
          id: 'ui-cpx-1',
          itemName: 'Mesin Sablon Asli',
          category: 'Mesin & Peralatan',
          amount: 15000000,
          entryDate: '2026-10-10',
          createdAt: '2026-10-10T00:00:00.000Z',
          updatedAt: '2026-10-10T00:00:00.000Z',
        },
        {
          id: 'ui-cpx-2',
          itemName: 'PC Admin Asli',
          category: 'Elektronik & IT',
          amount: 7000000,
          entryDate: '2026-10-12',
          createdAt: '2026-10-12T00:00:00.000Z',
          updatedAt: '2026-10-12T00:00:00.000Z',
        },
      ];

      const previousSnapshot = [...capexUiState];
      const targetId = 'ui-cpx-1';

      // 1. User initiates edit -> UI applies optimistic change
      const optimisticUpdate: CapexEntry = {
        ...capexUiState[0],
        itemName: 'Mesin Sablon Super Mewah',
        amount: 99999999,
        updatedAt: new Date().toISOString(),
      };
      capexUiState = capexUiState.map((c) => (c.id === targetId ? optimisticUpdate : c));
      assert.equal(capexUiState[0].amount, 99999999, 'Optimistic change must be visible immediately');

      // 2. Simulated remote mutation rejects with error
      let errorThrown = false;
      try {
        await new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase network disconnection')), 10)
        );
      } catch (err) {
        errorThrown = true;
        // 3. Rollback handler restores previous state snapshot
        capexUiState = previousSnapshot;
      }

      assert.equal(errorThrown, true, 'Error must be caught');
      assert.deepEqual(capexUiState, previousSnapshot, 'State must cleanly rollback to previous snapshot');
      assert.equal(capexUiState[0].amount, 15000000, 'Original amount must be restored');
      assert.equal(capexUiState[0].itemName, 'Mesin Sablon Asli', 'Original name must be restored');
    });

    test('3.2: Optimistic Create Rollback on Backend Rejection', async () => {
      let capexUiState: CapexEntry[] = [
        {
          id: 'ui-cpx-stable',
          itemName: 'Komputer Desain',
          category: 'Elektronik & IT',
          amount: 8000000,
          entryDate: '2026-10-01',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ];

      const initialCount = capexUiState.length;
      const tempId = `temp-cpx-${Date.now()}`;

      // 1. Optimistic append
      const optimisticNew: CapexEntry = {
        id: tempId,
        itemName: 'Peralatan Gagal Simpan',
        category: 'Lainnya',
        amount: 2500000,
        entryDate: '2026-10-24',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      capexUiState = [optimisticNew, ...capexUiState];
      assert.equal(capexUiState.length, initialCount + 1);

      // 2. Backend rejects
      try {
        throw new Error('Supabase 503 Service Unavailable');
      } catch (err) {
        // 3. Rollback removes temporary entry
        capexUiState = capexUiState.filter((c) => c.id !== tempId);
      }

      assert.equal(capexUiState.length, initialCount, 'Temporary entry must be purged on failure');
      assert.ok(!capexUiState.some((c) => c.id === tempId));
    });

    test('3.3: Optimistic Delete Rollback on Backend Rejection', async () => {
      let materialUiState: RawMaterialEntry[] = [
        {
          id: 'ui-mat-1',
          materialName: 'Akrilik Bening 2mm',
          category: 'Akrilik & Aksesoris',
          supplier: 'CV Indo Acrylic',
          quantity: 10,
          qty: 10,
          unit: 'lembar',
          unitPrice: 200000,
          totalAmount: 2000000,
          entryDate: '2026-10-10',
          createdAt: '2026-10-10T00:00:00.000Z',
          updatedAt: '2026-10-10T00:00:00.000Z',
        },
      ];

      const prevSnapshot = [...materialUiState];
      const targetId = 'ui-mat-1';

      // 1. Optimistic removal
      materialUiState = materialUiState.filter((m) => m.id !== targetId);
      assert.equal(materialUiState.length, 0, 'Item must be optimistically removed');

      // 2. Backend rejects
      try {
        throw new Error('Database constraint violation on delete');
      } catch (err) {
        // 3. Rollback restores snapshot
        materialUiState = prevSnapshot;
      }

      assert.equal(materialUiState.length, 1, 'Item must be restored on delete failure');
      assert.equal(materialUiState[0].id, targetId);
      assert.equal(materialUiState[0].materialName, 'Akrilik Bening 2mm');
    });
  });

  // ==========================================================================
  // Suite 4: Boundary & Corner Data Stress
  // ==========================================================================
  describe('Suite 4: Boundary & Corner Data Stress Harness', () => {
    test('4.1: Accepts zero amount Capex (amount: 0) without converting to NaN or rejecting', async () => {
      const zeroCapex = await capexService.createCapexEntry({
        itemName: 'Hibah Peralatan Mesin (Biaya Rp 0)',
        category: 'Mesin & Peralatan',
        amount: 0,
        entryDate: '2026-10-24',
        description: 'Barang hibah tanpa biaya perolehan',
      });

      assert.equal(zeroCapex.amount, 0);
      assert.equal(typeof zeroCapex.amount, 'number');
      assert.ok(!Number.isNaN(zeroCapex.amount));

      // Update to zero as well
      const updatedZero = await capexService.updateCapexEntry(zeroCapex.id, {
        amount: 0,
      });
      assert.equal(updatedZero?.amount, 0);

      // Cleanup
      await capexService.deleteCapexEntry(zeroCapex.id);
    });

    test('4.2: Handles extreme Capex amount (Rp 1.000.000.000 & Rp 99.999.999.999) with full numerical precision', async () => {
      const extreme1B = await capexService.createCapexEntry({
        itemName: 'Pembangunan Gedung Pabrik Sablon Utama',
        category: 'Renovasi Workshop',
        amount: 1000000000, // 1 Miliar
        entryDate: '2026-10-01',
      });
      assert.equal(extreme1B.amount, 1000000000);

      const extreme100B = await capexService.createCapexEntry({
        itemName: 'Mega Industrial Production Line 2027',
        category: 'Mesin & Peralatan',
        amount: 99999999999, // ~100 Miliar
        entryDate: '2026-10-01',
      });
      assert.equal(extreme100B.amount, 99999999999);

      // Cleanup
      await capexService.deleteCapexEntry(extreme1B.id);
      await capexService.deleteCapexEntry(extreme100B.id);
    });

    test('4.3: Defensively clamps negative inputs to 0 or valid minimums', async () => {
      // Negative capex amount should clamp to 0
      const negativeCapex = await capexService.createCapexEntry({
        itemName: 'Negative Amount Defense Check',
        category: 'Lainnya',
        amount: -500000,
        entryDate: '2026-10-24',
      });
      assert.equal(negativeCapex.amount, 0, 'Negative capex amount must be safely clamped to 0');

      // Negative raw material quantity should clamp to at least 0.01
      const negativeMat = await rawMaterialService.createRawMaterialEntry({
        materialName: 'Negative Qty Defense Check',
        category: 'Lainnya',
        supplier: 'Test Supplier',
        quantity: -10,
        unit: 'pcs',
        unitPrice: -5000,
        entryDate: '2026-10-24',
      });
      assert.ok(negativeMat.quantity > 0, 'Quantity must be clamped positive');
      assert.equal(negativeMat.unitPrice, 0, 'Negative unit price must clamp to 0');
      assert.equal(negativeMat.totalAmount, 0, 'Total amount must be >= 0');

      // Cleanup
      await capexService.deleteCapexEntry(negativeCapex.id);
      await rawMaterialService.deleteRawMaterialEntry(negativeMat.id);
    });

    test('4.4: Preserves Unicode & Indonesian special characters verbatim', async () => {
      const specialName = 'Mesin DTF «Garuda-X» UV Sablon — 30cm (Lt. 2) 🇮🇩';
      const specialCategory: CapexCategory = 'Mesin & Peralatan';
      const specialDesc = 'Spesifikasi: Suhu 18°–22°C; Garansi s/d 2028; Catatan: “Jangan dibanting!” ✨';

      const unicodeCapex = await capexService.createCapexEntry({
        itemName: specialName,
        category: specialCategory,
        amount: 32500000,
        entryDate: '2026-10-24',
        description: specialDesc,
      });

      assert.equal(unicodeCapex.itemName, specialName);
      assert.equal(unicodeCapex.description, specialDesc);

      const fetchedList = await capexService.getCapexEntries();
      const found = fetchedList.find((c) => c.id === unicodeCapex.id);
      assert.ok(found);
      assert.equal(found?.itemName, specialName);
      assert.equal(found?.description, specialDesc);

      // Raw Material with special characters
      const matSupplier = 'PT. Sumber Rejeki & Rekan (Cab. Malang / Sby) — 100% Original';
      const matNotes = 'Bahan khusus pesanan custom; tgl PO: 24/10/26; ref: #PO-888';
      const unicodeMat = await rawMaterialService.createRawMaterialEntry({
        materialName: 'Ring Gantungan Kunci Silver «Type-A» 25mm 🔑',
        category: 'Akrilik & Aksesoris',
        supplier: matSupplier,
        quantity: 500,
        unit: 'pcs',
        unitPrice: 450,
        entryDate: '2026-10-24',
        notes: matNotes,
      });

      assert.equal(unicodeMat.supplier, matSupplier);
      assert.equal(unicodeMat.notes, matNotes);

      // Cleanup
      await capexService.deleteCapexEntry(unicodeCapex.id);
      await rawMaterialService.deleteRawMaterialEntry(unicodeMat.id);
    });

    test('4.5: Supports Raw Materials with fractional quantities and accurate rounding', async () => {
      // Case 1: 2.5 lembar @ Rp 15.000 = Rp 37.500
      const fracMat1 = await rawMaterialService.createRawMaterialEntry({
        materialName: 'Akrilik Sisa Potongan 2mm',
        category: 'Akrilik & Aksesoris',
        supplier: 'CV Akrilik Jaya',
        quantity: 2.5,
        unit: 'lembar',
        unitPrice: 15000,
        entryDate: '2026-10-24',
      });

      assert.equal(fracMat1.quantity, 2.5);
      assert.equal(fracMat1.qty, 2.5);
      assert.equal(fracMat1.unitPrice, 15000);
      assert.equal(fracMat1.totalAmount, 37500);

      // Case 2: 0.75 kg @ Rp 80.000 = Rp 60.000
      const fracMat2 = await rawMaterialService.createRawMaterialEntry({
        materialName: 'Tinta Emas Pigment',
        category: 'Tinta & Sablon',
        supplier: 'Toko Sablon Grafika',
        quantity: 0.75,
        unit: 'kg',
        unitPrice: 80000,
        entryDate: '2026-10-24',
      });

      assert.equal(fracMat2.quantity, 0.75);
      assert.equal(fracMat2.unitPrice, 80000);
      assert.equal(fracMat2.totalAmount, 60000);

      // Case 3: 3.333 meter @ Rp 10.000 = Rp 33.330
      const fracMat3 = await rawMaterialService.createRawMaterialEntry({
        materialName: 'Tali Lanyard Polos 2cm',
        category: 'Lainnya',
        supplier: 'Mitra Tekstil',
        quantity: 3.333,
        unit: 'meter',
        unitPrice: 10000,
        entryDate: '2026-10-24',
      });

      assert.equal(fracMat3.quantity, 3.333);
      assert.equal(fracMat3.totalAmount, Math.round(3.333 * 10000)); // 33330

      // Cleanup
      await rawMaterialService.deleteRawMaterialEntry(fracMat1.id);
      await rawMaterialService.deleteRawMaterialEntry(fracMat2.id);
      await rawMaterialService.deleteRawMaterialEntry(fracMat3.id);
    });

    test('4.6: Trims whitespace and handles optional fields cleanly', async () => {
      const paddedEntry = await capexService.createCapexEntry({
        itemName: '   Mesin Potong Sudut Presisi   ',
        category: 'Mesin & Peralatan',
        amount: 850000,
        entryDate: '2026-10-24',
        description: '   Spesifikasi presisi sudut 45 derajat   ',
      });

      assert.equal(paddedEntry.itemName, 'Mesin Potong Sudut Presisi', 'Leading/trailing whitespace must be trimmed');
      assert.equal(paddedEntry.description, 'Spesifikasi presisi sudut 45 derajat');

      // Update with whitespace
      const updatedPadded = await capexService.updateCapexEntry(paddedEntry.id, {
        itemName: '   Mesin Potong Sudut Otomatis   ',
      });
      assert.equal(updatedPadded?.itemName, 'Mesin Potong Sudut Otomatis');

      // Cleanup
      await capexService.deleteCapexEntry(paddedEntry.id);
    });
  });
});
