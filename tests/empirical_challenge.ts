import assert from 'node:assert/strict';
import { calculateHPP, calculateMargin, formatRp } from '../src/lib/utils';
import { Order, CreateOrderInput, DesignFile } from '../src/types/order';

async function runEmpiricalChallenge() {
  console.log('=== EMPIRICAL CHALLENGE HARNESS START ===\n');

  // ============================================================================
  // PART 1: FINANCIAL CALCULATION STRESS TESTING
  // ============================================================================
  console.log('--- PART 1: FINANCIAL CALCULATION STRESS TEST ---');

  // 1.1 Batch size boundaries: qty = 1 and qty = 100,000
  const hpp1 = calculateHPP({ bahanBaku: 5000, tintaSablon: 1000, tenagaKerja: 2000, kemasan: 500, overhead: 500 }, 1);
  assert.equal(hpp1.totalHppPerPcs, 9000);
  assert.equal(hpp1.totalHpp, 9000);
  console.log('✔ qty = 1 totalHppPerPcs and totalHpp verified');

  const hpp100k = calculateHPP({ bahanBaku: 5000, tintaSablon: 1000, tenagaKerja: 2000, kemasan: 500, overhead: 500 }, 100000);
  assert.equal(hpp100k.totalHppPerPcs, 9000);
  assert.equal(hpp100k.totalHpp, 900000000);
  console.log('✔ qty = 100,000 totalHpp (Rp 900.000.000) verified');

  // 1.2 Zero & Negative qty clamping
  const hppZero = calculateHPP({ bahanBaku: 5000, tintaSablon: 1000, tenagaKerja: 2000, kemasan: 500, overhead: 500 }, 0);
  assert.equal(hppZero.totalHpp, 9000, 'Zero quantity should be clamped to minimum 1 pc');
  const hppNeg = calculateHPP({ bahanBaku: 5000, tintaSablon: 1000, tenagaKerja: 2000, kemasan: 500, overhead: 500 }, -50);
  assert.equal(hppNeg.totalHpp, 9000, 'Negative quantity should be clamped to minimum 1 pc');
  console.log('✔ Zero and negative qty clamped to minimum 1 pc');

  // 1.3 Negative breakdown components clamped to zero
  const hppNegComp = calculateHPP({ bahanBaku: -5000, tintaSablon: 1000, tenagaKerja: -2000, kemasan: 500, overhead: 0 }, 10);
  assert.equal(hppNegComp.bahanBaku, 0);
  assert.equal(hppNegComp.tenagaKerja, 0);
  assert.equal(hppNegComp.totalHppPerPcs, 1500);
  assert.equal(hppNegComp.totalHpp, 15000);
  console.log('✔ Negative HPP components clamped to 0');

  // 1.4 Down Payment Boundary Scenarios
  function computePayment(paymentStatus: string, omzet: number, dpAmount: number) {
    let finalDp = dpAmount || 0;
    let remainingPayment = 0;
    if (paymentStatus === 'LUNAS') {
      finalDp = omzet;
      remainingPayment = 0;
    } else if (paymentStatus === 'DP') {
      remainingPayment = Math.max(0, omzet - finalDp);
    } else {
      finalDp = 0;
      remainingPayment = omzet;
    }
    return { dpAmount: finalDp, remainingPayment };
  }

  // 0 DP under 'DP' status:
  const dpZero = computePayment('DP', 5000000, 0);
  assert.equal(dpZero.remainingPayment, 5000000, '0 DP under DP status leaves full omzet as remaining payment');
  console.log('✔ 0 DP under DP status leaves remainingPayment = omzet');

  // 0 DP under 'BELUM_LUNAS' status:
  const belumLunas = computePayment('BELUM_LUNAS', 5000000, 1000000);
  assert.equal(belumLunas.dpAmount, 0, 'BELUM_LUNAS overrides dpAmount to 0');
  assert.equal(belumLunas.remainingPayment, 5000000, 'BELUM_LUNAS has remainingPayment = omzet');
  console.log('✔ BELUM_LUNAS enforces dpAmount = 0 and remainingPayment = omzet');

  // Full DP (dpAmount == omzet):
  const fullDp = computePayment('DP', 5000000, 5000000);
  assert.equal(fullDp.remainingPayment, 0);
  console.log('✔ DP == omzet leaves remainingPayment = 0');

  // LUNAS status:
  const lunas = computePayment('LUNAS', 5000000, 0);
  assert.equal(lunas.dpAmount, 5000000);
  assert.equal(lunas.remainingPayment, 0);
  console.log('✔ LUNAS enforces dpAmount = omzet and remainingPayment = 0');

  // DP exceeding omzet:
  const excessDp = computePayment('DP', 5000000, 7000000);
  assert.equal(excessDp.remainingPayment, 0, 'Remaining payment must never be negative');
  console.log('✔ DP exceeding omzet clamps remainingPayment to 0 (no negative piutang)');

  // 1.5 Margin Extremes & Negative Margins
  // HPP > Omzet (Loss / Negative Margin)
  const lossMargin = calculateMargin(1000000, 1500000);
  assert.equal(lossMargin.profit, -500000);
  assert.equal(lossMargin.marginPct, -50.0);
  console.log('✔ Loss scenario (omzet 1M, HPP 1.5M) -> profit -500.000, marginPct -50%');

  // Extreme loss: omzet 100,000, HPP 1,000,000 -> profit -900,000, marginPct -900%
  const extremeLoss = calculateMargin(100000, 1000000);
  assert.equal(extremeLoss.profit, -900000);
  assert.equal(extremeLoss.marginPct, -900.0);
  console.log('✔ Extreme loss -> profit -900.000, marginPct -900.0%');

  // Omzet = 0, HPP > 0 (Zero division protection)
  const zeroOmzetLoss = calculateMargin(0, 500000);
  assert.equal(zeroOmzetLoss.profit, -500000);
  assert.equal(zeroOmzetLoss.marginPct, 0, 'Division by zero must return 0%');
  console.log('✔ Zero omzet with positive HPP returns marginPct 0% without NaN / Infinity');

  // Omzet = HPP (Break-even)
  const breakEven = calculateMargin(1000000, 1000000);
  assert.equal(breakEven.profit, 0);
  assert.equal(breakEven.marginPct, 0.0);
  console.log('✔ Break-even -> profit 0, marginPct 0%');

  // HPP = 0 (100% Margin)
  const pureProfit = calculateMargin(1000000, 0);
  assert.equal(pureProfit.profit, 1000000);
  assert.equal(pureProfit.marginPct, 100.0);
  console.log('✔ Pure profit -> marginPct 100.0%');

  // 1.6 Precision: 1-decimal rounding on repeating fractions
  const oneThird = calculateMargin(300000, 200000); // profit 100,000 / 300,000 = 33.3333...%
  assert.equal(oneThird.marginPct, 33.3);
  console.log('✔ 33.3333% rounds to 33.3%');

  const twoThird = calculateMargin(300000, 100000); // profit 200,000 / 300,000 = 66.6666...%
  assert.equal(twoThird.marginPct, 66.7);
  console.log('✔ 66.6666% rounds to 66.7%');

  const negativeThird = calculateMargin(300000, 400000); // profit -100,000 / 300,000 = -33.3333...%
  assert.equal(negativeThird.marginPct, -33.3);
  console.log('✔ -33.3333% rounds to -33.3%');

  // 1.7 Integer precision for Rupiah (formatRp)
  assert.equal(formatRp(0), 'Rp 0');
  assert.equal(formatRp(2500000), 'Rp 2.500.000');
  assert.equal(formatRp(-500000), '-Rp 500.000');
  assert.equal(formatRp(2500000.75), 'Rp 2.500.001', 'Fractional Rupiah rounded to nearest integer');
  assert.equal(formatRp(-2500000.75), '-Rp 2.500.001');
  assert.equal(formatRp(12500000000), 'Rp 12.500.000.000', 'Handles tens of billions IDR');
  assert.equal(formatRp(NaN), 'Rp 0');
  assert.equal(formatRp(undefined as any), 'Rp 0');
  assert.equal(formatRp(null as any), 'Rp 0');
  console.log('✔ formatRp correctly formats 0, negative values, billions, and rounded integers without decimals');


  // ============================================================================
  // PART 2: QUEUE PRIORITY SEQUENCE DETERMINISM STRESS TEST
  // ============================================================================
  console.log('\n--- PART 2: QUEUE PRIORITY SEQUENCE DETERMINISM ---');

  function simulateQueueReorder(initialOrders: { id: string; queueOrder: number }[], orderedIds: string[]) {
    const idMap = new Map<string, number>();
    orderedIds.forEach((id, index) => {
      idMap.set(id, index + 1);
    });

    return [...initialOrders].sort((a, b) => {
      const orderA = idMap.get(a.id) ?? 9999;
      const orderB = idMap.get(b.id) ?? 9999;
      return orderA - orderB;
    }).map((item, idx) => ({
      ...item,
      queueOrder: idx + 1,
    }));
  }

  // 2.1 Standard 4-item reorder
  const qInitial = [
    { id: 'O-1', queueOrder: 1 },
    { id: 'O-2', queueOrder: 2 },
    { id: 'O-3', queueOrder: 3 },
    { id: 'O-4', queueOrder: 4 },
  ];
  const qReordered = simulateQueueReorder(qInitial, ['O-3', 'O-1', 'O-4', 'O-2']);
  assert.deepEqual(qReordered.map(o => o.id), ['O-3', 'O-1', 'O-4', 'O-2']);
  assert.deepEqual(qReordered.map(o => o.queueOrder), [1, 2, 3, 4], 'Queue order must be strictly contiguous 1..4');
  console.log('✔ Standard reorder preserves contiguous 1..4 sequence');

  // 2.2 Partial reorder (reordering subset, remaining pushed to tail deterministically)
  const qPartial = simulateQueueReorder(qInitial, ['O-4', 'O-2']);
  assert.equal(qPartial[0].id, 'O-4');
  assert.equal(qPartial[0].queueOrder, 1);
  assert.equal(qPartial[1].id, 'O-2');
  assert.equal(qPartial[1].queueOrder, 2);
  assert.equal(qPartial.length, 4);
  assert.deepEqual(qPartial.map(o => o.queueOrder), [1, 2, 3, 4]);
  console.log('✔ Partial reorder assigns contiguous 1..N without gaps');

  // 2.3 Reorder with unknown/stale IDs
  const qUnknown = simulateQueueReorder(qInitial, ['UNKNOWN-ID', 'O-2', 'O-1']);
  assert.equal(qUnknown[0].id, 'O-2');
  assert.equal(qUnknown[1].id, 'O-1');
  assert.deepEqual(qUnknown.map(o => o.queueOrder), [1, 2, 3, 4]);
  console.log('✔ Reorder gracefully ignores nonexistent IDs');

  // 2.4 Prepending new order
  function simulateCreatePrepend(existingOrders: { id: string; queueOrder: number }[], newId: string) {
    const newOrder = { id: newId, queueOrder: 1 };
    return [
      newOrder,
      ...existingOrders.map((o) => ({
        ...o,
        queueOrder: (o.queueOrder || 0) + 1,
      })),
    ];
  }
  const prepended = simulateCreatePrepend(qInitial, 'O-NEW');
  assert.equal(prepended[0].id, 'O-NEW');
  assert.deepEqual(prepended.map(o => o.queueOrder), [1, 2, 3, 4, 5]);
  console.log('✔ Creating new order prepends with rank 1 and increments remaining contiguously to 1..5');

  // 2.5 Large queue sequence (100 items shuffled)
  const largeQueue = Array.from({ length: 100 }, (_, i) => ({ id: `ord-${i + 1}`, queueOrder: i + 1 }));
  const shuffledIds = [...largeQueue].sort(() => Math.random() - 0.5).map(o => o.id);
  const reorderedLarge = simulateQueueReorder(largeQueue, shuffledIds);
  assert.equal(reorderedLarge.length, 100);
  for (let i = 0; i < 100; i++) {
    assert.equal(reorderedLarge[i].id, shuffledIds[i]);
    assert.equal(reorderedLarge[i].queueOrder, i + 1);
  }
  console.log('✔ 100-item queue reorder maintains exact 1..100 contiguity without duplicate ranks');


  // ============================================================================
  // PART 3: OPTIMISTIC STATE SNAPSHOTTING & ROLLBACK SIMULATION
  // ============================================================================
  console.log('\n--- PART 3: OPTIMISTIC STATE SNAPSHOTTING & ROLLBACK ---');

  interface MockContextState {
    orders: Order[];
    error: string | null;
  }

  function createBaseOrder(id: string, queueOrder: number, buyer = 'Customer A'): Order {
    return {
      id,
      orderNumber: `EG-2026-${id}`,
      orderDate: '2026-10-23',
      deadline: '2026-10-30',
      buyerName: buyer,
      buyerPhone: '08123456789',
      productName: 'Kaos Sablon Plastisol',
      specs: 'Cotton Combed 30s',
      qty: 50,
      pricePerPcs: 65000,
      omzet: 3250000,
      hppBreakdown: {
        bahanBaku: 30000,
        tintaSablon: 5000,
        tenagaKerja: 5000,
        kemasan: 2000,
        overhead: 3000,
        totalHppPerPcs: 45000,
        totalHpp: 2250000,
      },
      profit: 1000000,
      marginPct: 30.8,
      paymentStatus: 'DP',
      dpAmount: 1500000,
      remainingPayment: 1750000,
      processStatus: 'ANTREAN',
      queueOrder,
      designFiles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  let state: MockContextState = {
    orders: [
      createBaseOrder('ord-1', 1, 'Alpha'),
      createBaseOrder('ord-2', 2, 'Beta'),
      createBaseOrder('ord-3', 3, 'Gamma'),
    ],
    error: null,
  };

  // 3.1 Test Rollback on CREATE failure
  async function optimisticCreate(orderInput: CreateOrderInput, shouldFail: boolean) {
    const previousOrders = state.orders;
    const tempId = `opt-${Date.now()}`;
    const optimisticOrder: Order = {
      ...createBaseOrder(tempId, 1, orderInput.buyerName),
      productName: orderInput.productName,
    };

    // Optimistic update
    state.orders = [
      optimisticOrder,
      ...previousOrders.map((o) => ({ ...o, queueOrder: (o.queueOrder || 0) + 1 })),
    ];

    try {
      if (shouldFail) {
        throw new Error('Supabase 500 Internal Server Error');
      }
      const committed: Order = { ...optimisticOrder, id: `real-ord-${Date.now()}` };
      state.orders = state.orders.map((o) => (o.id === tempId ? committed : o));
      return committed;
    } catch (err: any) {
      state.orders = previousOrders;
      state.error = err.message;
      throw err;
    }
  }

  const preCreateOrders = [...state.orders];
  try {
    await optimisticCreate({
      orderDate: '2026-10-23',
      buyerName: 'Failed Buyer',
      buyerPhone: '081',
      productName: 'Failed Order',
      specs: 'Standard specs',
      qty: 10,
      pricePerPcs: 50000,
      dpAmount: 0,
      hppBreakdown: { bahanBaku: 20000, tintaSablon: 0, tenagaKerja: 0, kemasan: 0, overhead: 0 },
      paymentStatus: 'BELUM_LUNAS',
      processStatus: 'ANTREAN',
      deadline: '2026-10-31',
    }, true);
    assert.fail('Should have failed');
  } catch (e: any) {
    assert.equal(e.message, 'Supabase 500 Internal Server Error');
  }
  assert.deepEqual(state.orders, preCreateOrders, 'State must rollback exactly to snapshot on CREATE failure');
  assert.equal(state.orders.length, 3);
  console.log('✔ CREATE failure successfully rolls back state to snapshot');

  // 3.2 Test Rollback on UPDATE failure
  async function optimisticUpdate(id: string, updates: Partial<Order>, shouldFail: boolean) {
    const previousOrders = state.orders;
    const target = previousOrders.find((o) => o.id === id);
    if (!target) return null;

    const optimisticUpdated: Order = { ...target, ...updates };
    state.orders = previousOrders.map((o) => (o.id === id ? optimisticUpdated : o));

    try {
      if (shouldFail) {
        throw new Error('Supabase 408 Request Timeout');
      }
      return optimisticUpdated;
    } catch (err: any) {
      state.orders = previousOrders;
      state.error = err.message;
      throw err;
    }
  }

  const preUpdateOrders = [...state.orders];
  try {
    await optimisticUpdate('ord-2', { buyerName: 'HACKED NAME', qty: 9999 }, true);
    assert.fail('Should have failed');
  } catch (e: any) {
    assert.equal(e.message, 'Supabase 408 Request Timeout');
  }
  assert.deepEqual(state.orders, preUpdateOrders, 'State must rollback exactly to snapshot on UPDATE failure');
  assert.equal(state.orders.find(o => o.id === 'ord-2')?.buyerName, 'Beta');
  console.log('✔ UPDATE failure successfully rolls back state to snapshot');

  // 3.3 Test Rollback on DELETE failure
  async function optimisticDelete(id: string, shouldFail: boolean) {
    const previousOrders = state.orders;
    state.orders = previousOrders.filter((o) => o.id !== id);

    try {
      if (shouldFail) {
        throw new Error('Supabase 403 Forbidden');
      }
      return true;
    } catch (err: any) {
      state.orders = previousOrders;
      state.error = err.message;
      throw err;
    }
  }

  const preDeleteOrders = [...state.orders];
  try {
    await optimisticDelete('ord-1', true);
    assert.fail('Should have failed');
  } catch (e: any) {
    assert.equal(e.message, 'Supabase 403 Forbidden');
  }
  assert.deepEqual(state.orders, preDeleteOrders, 'State must rollback to snapshot on DELETE failure');
  assert.equal(state.orders.length, 3);
  assert.equal(state.orders[0].id, 'ord-1');
  console.log('✔ DELETE failure successfully rolls back state to snapshot');

  // 3.4 Test Rollback on REORDER failure
  async function optimisticReorder(orderedIds: string[], shouldFail: boolean) {
    const previousOrders = state.orders;
    state.orders = simulateQueueReorder(previousOrders, orderedIds) as Order[];

    try {
      if (shouldFail) {
        throw new Error('Supabase Database Connection Lost');
      }
    } catch (err: any) {
      state.orders = previousOrders;
      state.error = err.message;
      throw err;
    }
  }

  const preReorderOrders = [...state.orders];
  try {
    await optimisticReorder(['ord-3', 'ord-2', 'ord-1'], true);
    assert.fail('Should have failed');
  } catch (e: any) {
    assert.equal(e.message, 'Supabase Database Connection Lost');
  }
  assert.deepEqual(state.orders, preReorderOrders, 'State must rollback to snapshot on REORDER failure');
  assert.equal(state.orders[0].id, 'ord-1');
  assert.equal(state.orders[2].id, 'ord-3');
  console.log('✔ REORDER failure successfully rolls back queue to snapshot');

  // 3.5 Test Rollback on DESIGN FILE operations
  async function optimisticAddDesignFile(orderId: string, file: DesignFile, shouldFail: boolean) {
    const previousOrders = state.orders;
    state.orders = previousOrders.map((o) =>
      o.id !== orderId ? o : { ...o, designFiles: [...(o.designFiles || []), file] }
    );

    try {
      if (shouldFail) throw new Error('Supabase Storage 507 Insufficient Storage');
      return file;
    } catch (err: any) {
      state.orders = previousOrders;
      state.error = err.message;
      throw err;
    }
  }

  const mockFile: DesignFile = {
    id: 'df-test-1',
    orderId: 'ord-1',
    fileName: 'test.cdr',
    fileSize: 1024,
    fileType: 'CDR',
    fileUrl: 'https://test/test.cdr',
    isReadyToPrint: false,
    uploadedAt: new Date().toISOString(),
  };

  const preDfOrders = [...state.orders];
  try {
    await optimisticAddDesignFile('ord-1', mockFile, true);
    assert.fail('Should have failed');
  } catch (e: any) {
    assert.equal(e.message, 'Supabase Storage 507 Insufficient Storage');
  }
  assert.deepEqual(state.orders, preDfOrders, 'Design file add rollback verified');
  assert.equal(state.orders[0].designFiles.length, 0);
  console.log('✔ DESIGN FILE ADD failure successfully rolls back state to snapshot');

  // Add file successfully first
  await optimisticAddDesignFile('ord-1', mockFile, false);
  assert.equal(state.orders[0].designFiles.length, 1);
  assert.equal(state.orders[0].designFiles[0].isReadyToPrint, false);

  async function optimisticToggleReady(orderId: string, fileId: string, shouldFail: boolean) {
    const previousOrders = state.orders;
    state.orders = previousOrders.map((o) =>
      o.id !== orderId ? o : {
        ...o,
        designFiles: o.designFiles.map((f) =>
          f.id === fileId ? { ...f, isReadyToPrint: !f.isReadyToPrint } : f
        ),
      }
    );

    try {
      if (shouldFail) throw new Error('Network error on ready toggle');
      return true;
    } catch (err: any) {
      state.orders = previousOrders;
      state.error = err.message;
      throw err;
    }
  }

  try {
    await optimisticToggleReady('ord-1', 'df-test-1', true);
    assert.fail('Should have failed');
  } catch (e: any) {
    assert.equal(e.message, 'Network error on ready toggle');
  }
  assert.equal(state.orders[0].designFiles[0].isReadyToPrint, false, 'Print readiness status rolled back to false');
  console.log('✔ DESIGN FILE TOGGLE failure successfully rolls back state to snapshot');

  async function optimisticDeleteDesignFile(orderId: string, fileId: string, shouldFail: boolean) {
    const previousOrders = state.orders;
    state.orders = previousOrders.map((o) =>
      o.id !== orderId ? o : {
        ...o,
        designFiles: o.designFiles.filter((f) => f.id !== fileId),
      }
    );

    try {
      if (shouldFail) throw new Error('Network error on file delete');
      return true;
    } catch (err: any) {
      state.orders = previousOrders;
      state.error = err.message;
      throw err;
    }
  }

  try {
    await optimisticDeleteDesignFile('ord-1', 'df-test-1', true);
    assert.fail('Should have failed');
  } catch (e: any) {
    assert.equal(e.message, 'Network error on file delete');
  }
  assert.equal(state.orders[0].designFiles.length, 1, 'File delete rolled back, file remains in state');
  assert.equal(state.orders[0].designFiles[0].id, 'df-test-1');
  console.log('✔ DESIGN FILE DELETE failure successfully rolls back state to snapshot');

  console.log('\n================================================================================');
  console.log('✅ ALL EMPIRICAL CHALLENGE TESTS PASSED PERFECTLY!');
  console.log('================================================================================');
}

runEmpiricalChallenge().catch((err) => {
  console.error('Empirical challenge failed:', err);
  process.exit(1);
});
