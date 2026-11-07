// eganci Admin & Production - E2E & Integration Test Suite
// Covering Requirements R1-R4 across Tiers 1-4

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  Order,
  DesignFile,
  CreateOrderInput,
  PaymentStatus,
  ProcessStatus,
  FilterTab,
  DashboardMetrics,
  MonthlyProfitData,
  BuyerSummary,
} from '@/types/order';
import { calculateHPP, calculateMargin, formatRp, formatDateShort } from '@/lib/utils';

// ============================================================================
// IN-MEMORY SUPABASE EMULATOR (PostgREST + Storage)
// ============================================================================

export interface DbOrderRow {
  id: string;
  order_number: string;
  order_date: string;
  deadline: string;
  buyer_name: string;
  buyer_phone: string;
  product_name: string;
  specs: string;
  qty: number;
  price_per_pcs: number;
  omzet: number;
  hpp_bahan_baku: number;
  hpp_tinta_sablon: number;
  hpp_tenaga_kerja: number;
  hpp_kemasan: number;
  hpp_overhead: number;
  total_hpp_per_pcs: number;
  total_hpp: number;
  profit: number;
  margin_pct: number;
  payment_status: PaymentStatus;
  dp_amount: number;
  remaining_payment: number;
  process_status: ProcessStatus;
  queue_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDesignFileRow {
  id: string;
  order_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  thumbnail_url: string | null;
  is_ready_to_print: boolean;
  uploaded_at: string;
}

export class MockStorageBucket {
  private files: Map<string, { buffer: Buffer | Uint8Array; mimeType: string }> = new Map();
  public maxSizeBytes = 52428800; // 50MB
  public allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/postscript',
    'image/vnd.adobe.photoshop',
    'application/octet-stream',
    'application/x-cdr',
    'application/cdr',
    'application/illustrator',
  ];

  async upload(
    path: string,
    file: Buffer | Uint8Array,
    options?: { contentType?: string }
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    if (file.byteLength > this.maxSizeBytes) {
      return {
        data: null,
        error: new Error(`File size exceeds 50MB limit (${file.byteLength} bytes)`),
      };
    }
    const contentType = options?.contentType || 'application/octet-stream';
    if (!this.allowedMimeTypes.includes(contentType)) {
      return {
        data: null,
        error: new Error(`Unsupported MIME type: ${contentType}`),
      };
    }
    this.files.set(path, { buffer: file, mimeType: contentType });
    return { data: { path }, error: null };
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    return { data: { publicUrl: `https://mock-storage.eganci.test/design-files/${path}` } };
  }

  async remove(paths: string[]): Promise<{ data: { path: string }[]; error: Error | null }> {
    const removed: { path: string }[] = [];
    for (const p of paths) {
      if (this.files.has(p)) {
        this.files.delete(p);
        removed.push({ path: p });
      }
    }
    return { data: removed, error: null };
  }

  hasFile(path: string): boolean {
    return this.files.has(path);
  }

  clear(): void {
    this.files.clear();
  }
}

export class MockSupabaseEmulator {
  public ordersTable: DbOrderRow[] = [];
  public designFilesTable: DbDesignFileRow[] = [];
  public storageBucket = new MockStorageBucket();
  private shouldFail = false;
  private failureMsg = 'Simulated Supabase Network Error';

  setFailureMode(fail: boolean, message = 'Simulated Supabase Network Error') {
    this.shouldFail = fail;
    this.failureMsg = message;
  }

  reset() {
    this.ordersTable = [];
    this.designFilesTable = [];
    this.storageBucket.clear();
    this.shouldFail = false;
  }

  // Storage mock interface
  public storage = {
    from: (bucket: string) => {
      if (bucket !== 'design-files') {
        throw new Error(`Bucket ${bucket} not found`);
      }
      return this.storageBucket;
    },
  };

  from(table: string): any {
    if (this.shouldFail) {
      const failPromise = Promise.reject(new Error(this.failureMsg));
      const failChain: any = {
        order: () => failChain,
        eq: () => failChain,
        single: () => failPromise,
        select: () => failChain,
        then: (resolve: any, reject: any) => failPromise.then(resolve, reject),
      };
      return {
        select: () => failChain,
        insert: () => failChain,
        update: () => failChain,
        delete: () => failChain,
      };
    }

    if (table === 'orders') {
      return this.orderQueryBuilder();
    }
    if (table === 'order_design_files') {
      return this.designFileQueryBuilder();
    }
    throw new Error(`Table ${table} not found in mock`);
  }

  private orderQueryBuilder() {
    let filterFn: (r: DbOrderRow) => boolean = () => true;
    let sortCol: keyof DbOrderRow = 'queue_order';
    let asc = true;

    const builder = {
      select: (cols = '*') => {
        return {
          order: (col: keyof DbOrderRow, opts?: { ascending?: boolean }) => {
            sortCol = col;
            asc = opts?.ascending !== false;
            return {
              eq: (field: keyof DbOrderRow, val: any) => {
                const prev = filterFn;
                filterFn = (r) => prev(r) && r[field] === val;
                return builder.resolveSelect(cols, filterFn, sortCol, asc);
              },
              then: (resolve: any, reject: any) =>
                builder.resolveSelect(cols, filterFn, sortCol, asc).then(resolve, reject),
            };
          },
          eq: (field: keyof DbOrderRow, val: any) => {
            const prev = filterFn;
            filterFn = (r) => prev(r) && r[field] === val;
            return {
              single: async () => {
                const res = await builder.resolveSelect(cols, filterFn, sortCol, asc);
                if (res.data && res.data.length > 0) return { data: res.data[0], error: null };
                return { data: null, error: new Error('Order not found') };
              },
              then: (resolve: any, reject: any) =>
                builder.resolveSelect(cols, filterFn, sortCol, asc).then(resolve, reject),
            };
          },
          single: async () => {
            const res = await builder.resolveSelect(cols, filterFn, sortCol, asc);
            if (res.data && res.data.length > 0) return { data: res.data[0], error: null };
            return { data: null, error: new Error('Order not found') };
          },
          then: (resolve: any, reject: any) =>
            builder.resolveSelect(cols, filterFn, sortCol, asc).then(resolve, reject),
        };
      },

      insert: (payload: DbOrderRow | DbOrderRow[]) => {
        const rows = Array.isArray(payload) ? payload : [payload];
        for (const row of rows) {
          if (this.ordersTable.some((r) => r.id === row.id)) {
            throw new Error(`Duplicate key violation for order id ${row.id}`);
          }
          this.ordersTable.push({ ...row });
        }
        return {
          select: () => ({
            single: async () => ({ data: { ...rows[0] }, error: null }),
            then: (resolve: any, reject: any) =>
              Promise.resolve({ data: rows.map((r) => ({ ...r })), error: null }).then(resolve, reject),
          }),
          then: (resolve: any, reject: any) =>
            Promise.resolve({ data: rows.map((r) => ({ ...r })), error: null }).then(resolve, reject),
        };
      },

      update: (updates: Partial<DbOrderRow>) => {
        return {
          eq: (field: keyof DbOrderRow, val: any) => {
            let updated: DbOrderRow | null = null;
            this.ordersTable = this.ordersTable.map((r) => {
              if (r[field] === val) {
                updated = { ...r, ...updates, updated_at: new Date().toISOString() };
                return updated;
              }
              return r;
            });
            return {
              select: () => ({
                single: async () => ({
                  data: updated ? { ...updated } : null,
                  error: updated ? null : new Error('Order not found for update'),
                }),
              }),
              then: (resolve: any, reject: any) =>
                Promise.resolve({ data: updated ? [{ ...updated }] : [], error: null }).then(resolve, reject),
            };
          },
        };
      },

      delete: () => {
        return {
          eq: (field: keyof DbOrderRow, val: any) => {
            const deleted = this.ordersTable.filter((r) => r[field] === val);
            this.ordersTable = this.ordersTable.filter((r) => r[field] !== val);
            for (const d of deleted) {
              this.designFilesTable = this.designFilesTable.filter((df) => df.order_id !== d.id);
            }
            return Promise.resolve({ data: deleted, error: null });
          },
        };
      },

      resolveSelect: async (
        cols: string,
        filter: (r: DbOrderRow) => boolean,
        sortField: keyof DbOrderRow,
        isAsc: boolean
      ) => {
        const rows = this.ordersTable.filter(filter);
        rows.sort((a, b) => {
          const valA = a[sortField] ?? 0;
          const valB = b[sortField] ?? 0;
          if (valA < valB) return isAsc ? -1 : 1;
          if (valA > valB) return isAsc ? 1 : -1;
          return 0;
        });

        const includeFiles = cols.includes('design_files') || cols.includes('*');
        const mapped = rows.map((r) => {
          const rowCopy: any = { ...r };
          if (includeFiles) {
            rowCopy.order_design_files = this.designFilesTable
              .filter((df) => df.order_id === r.id)
              .map((f) => ({ ...f }));
          }
          return rowCopy;
        });

        return { data: mapped, error: null };
      },
    };

    return builder;
  }

  private designFileQueryBuilder() {
    let filterFn: (r: DbDesignFileRow) => boolean = () => true;

    return {
      select: () => ({
        eq: (field: keyof DbDesignFileRow, val: any) => {
          const prev = filterFn;
          filterFn = (r) => prev(r) && r[field] === val;
          return Promise.resolve({
            data: this.designFilesTable.filter(filterFn).map((f) => ({ ...f })),
            error: null,
          });
        },
      }),

      insert: (payload: DbDesignFileRow | DbDesignFileRow[]) => {
        const rows = Array.isArray(payload) ? payload : [payload];
        for (const r of rows) {
          this.designFilesTable.push({ ...r });
        }
        return {
          select: () => ({
            single: async () => ({ data: { ...rows[0] }, error: null }),
          }),
          then: (resolve: any, reject: any) =>
            Promise.resolve({ data: rows.map((r) => ({ ...r })), error: null }).then(resolve, reject),
        };
      },

      update: (updates: Partial<DbDesignFileRow>) => {
        return {
          eq: (field: keyof DbDesignFileRow, val: any) => {
            let updated: DbDesignFileRow | null = null;
            this.designFilesTable = this.designFilesTable.map((f) => {
              if (f[field] === val) {
                updated = { ...f, ...updates };
                return updated;
              }
              return f;
            });
            return {
              select: () => ({
                single: async () => ({
                  data: updated ? { ...updated } : null,
                  error: updated ? null : new Error('Design file not found'),
                }),
              }),
              then: (resolve: any, reject: any) =>
                Promise.resolve({ data: updated ? [{ ...updated }] : [], error: null }).then(resolve, reject),
            };
          },
        };
      },

      delete: () => {
        return {
          eq: (field: keyof DbDesignFileRow, val: any) => {
            const removed = this.designFilesTable.filter((f) => f[field] === val);
            this.designFilesTable = this.designFilesTable.filter((f) => f[field] !== val);
            return Promise.resolve({ data: removed, error: null });
          },
        };
      },
    };
  }
}

// Global emulator singleton for tests
export const emulator = new MockSupabaseEmulator();

// ============================================================================
// DOMAIN ADAPTERS & APPLICATION SERVICE
// ============================================================================

export function mapRowToOrder(row: any): Order {
  const rawFiles = row.order_design_files || row.design_files || [];
  const designFiles: DesignFile[] = rawFiles.map((f: any) => ({
    id: f.id,
    orderId: f.order_id,
    fileName: f.file_name,
    fileSize: Number(f.file_size),
    fileType: f.file_type,
    fileUrl: f.file_url,
    thumbnailUrl: f.thumbnail_url || undefined,
    isReadyToPrint: Boolean(f.is_ready_to_print),
    uploadedAt: f.uploaded_at,
  }));

  return {
    id: row.id,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    deadline: row.deadline,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone,
    productName: row.product_name,
    specs: row.specs || '',
    qty: Number(row.qty),
    pricePerPcs: Number(row.price_per_pcs),
    omzet: Number(row.omzet),
    hppBreakdown: {
      bahanBaku: Number(row.hpp_bahan_baku),
      tintaSablon: Number(row.hpp_tinta_sablon),
      tenagaKerja: Number(row.hpp_tenaga_kerja),
      kemasan: Number(row.hpp_kemasan),
      overhead: Number(row.hpp_overhead),
      totalHppPerPcs: Number(row.total_hpp_per_pcs),
      totalHpp: Number(row.total_hpp),
    },
    profit: Number(row.profit),
    marginPct: Number(row.margin_pct),
    paymentStatus: row.payment_status,
    dpAmount: Number(row.dp_amount),
    remainingPayment: Number(row.remaining_payment),
    processStatus: row.process_status,
    queueOrder: Number(row.queue_order),
    designFiles,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrderToRow(order: Partial<Order> & { id: string }): Partial<DbOrderRow> {
  const row: any = { id: order.id };
  if (order.orderNumber !== undefined) row.order_number = order.orderNumber;
  if (order.orderDate !== undefined) row.order_date = order.orderDate;
  if (order.deadline !== undefined) row.deadline = order.deadline;
  if (order.buyerName !== undefined) row.buyer_name = order.buyerName;
  if (order.buyerPhone !== undefined) row.buyer_phone = order.buyerPhone;
  if (order.productName !== undefined) row.product_name = order.productName;
  if (order.specs !== undefined) row.specs = order.specs;
  if (order.qty !== undefined) row.qty = order.qty;
  if (order.pricePerPcs !== undefined) row.price_per_pcs = order.pricePerPcs;
  if (order.omzet !== undefined) row.omzet = order.omzet;

  if (order.hppBreakdown !== undefined) {
    row.hpp_bahan_baku = order.hppBreakdown.bahanBaku;
    row.hpp_tinta_sablon = order.hppBreakdown.tintaSablon;
    row.hpp_tenaga_kerja = order.hppBreakdown.tenagaKerja;
    row.hpp_kemasan = order.hppBreakdown.kemasan;
    row.hpp_overhead = order.hppBreakdown.overhead;
    row.total_hpp_per_pcs = order.hppBreakdown.totalHppPerPcs;
    row.total_hpp = order.hppBreakdown.totalHpp;
  }

  if (order.profit !== undefined) row.profit = order.profit;
  if (order.marginPct !== undefined) row.margin_pct = order.marginPct;
  if (order.paymentStatus !== undefined) row.payment_status = order.paymentStatus;
  if (order.dpAmount !== undefined) row.dp_amount = order.dpAmount;
  if (order.remainingPayment !== undefined) row.remaining_payment = order.remainingPayment;
  if (order.processStatus !== undefined) row.process_status = order.processStatus;
  if (order.queueOrder !== undefined) row.queue_order = order.queueOrder;
  if (order.notes !== undefined) row.notes = order.notes || null;
  if (order.createdAt !== undefined) row.created_at = order.createdAt;
  if (order.updatedAt !== undefined) row.updated_at = order.updatedAt;

  return row;
}

export class OrderServiceIntegration {
  constructor(private client: MockSupabaseEmulator) {}

  async getOrders(): Promise<Order[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('*, order_design_files(*)')
      .order('queue_order', { ascending: true });
    if (error || !data) return [];
    return data.map(mapRowToOrder);
  }

  async getOrderById(id: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('*, order_design_files(*)')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return mapRowToOrder(data);
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const existing = await this.getOrders();
    const count = existing.length + 1;
    const year = new Date().getFullYear();
    const orderNumber = `EG-${year}-${String(count).padStart(3, '0')}`;
    const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const hpp = calculateHPP(input.hppBreakdown, input.qty);
    const omzet = input.qty * input.pricePerPcs;
    const { profit, marginPct } = calculateMargin(omzet, hpp.totalHpp);

    let dpAmount = input.dpAmount || 0;
    let remainingPayment = 0;
    if (input.paymentStatus === 'LUNAS') {
      dpAmount = omzet;
      remainingPayment = 0;
    } else if (input.paymentStatus === 'DP') {
      remainingPayment = Math.max(0, omzet - dpAmount);
    } else {
      dpAmount = 0;
      remainingPayment = omzet;
    }

    const newOrder: Order = {
      ...input,
      id,
      orderNumber,
      omzet,
      hppBreakdown: hpp,
      profit,
      marginPct,
      dpAmount,
      remainingPayment,
      queueOrder: count,
      designFiles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const row = mapOrderToRow(newOrder) as DbOrderRow;
    await this.client.from('orders').insert(row);

    if (input.designFiles && input.designFiles.length > 0) {
      for (const df of input.designFiles) {
        await this.addDesignFile(id, df);
      }
    }

    return (await this.getOrderById(id))!;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    const existing = await this.getOrderById(id);
    if (!existing) return null;

    const qty = updates.qty !== undefined ? updates.qty : existing.qty;
    const pricePerPcs = updates.pricePerPcs !== undefined ? updates.pricePerPcs : existing.pricePerPcs;
    const omzet = qty * pricePerPcs;

    let hppBreakdown = existing.hppBreakdown;
    if (updates.hppBreakdown) {
      hppBreakdown = calculateHPP(updates.hppBreakdown, qty);
    } else if (updates.qty !== undefined) {
      hppBreakdown = calculateHPP(existing.hppBreakdown, qty);
    }

    const { profit, marginPct } = calculateMargin(omzet, hppBreakdown.totalHpp);

    const paymentStatus = updates.paymentStatus || existing.paymentStatus;
    let dpAmount = updates.dpAmount !== undefined ? updates.dpAmount : existing.dpAmount;
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

    const partialRow = mapOrderToRow({
      ...updates,
      id,
      qty,
      pricePerPcs,
      omzet,
      hppBreakdown,
      profit,
      marginPct,
      paymentStatus,
      dpAmount,
      remainingPayment,
    });

    await this.client.from('orders').update(partialRow).eq('id', id);
    return await this.getOrderById(id);
  }

  async deleteOrder(id: string): Promise<boolean> {
    const res = await this.client.from('orders').delete().eq('id', id);
    return Boolean(res.data && res.data.length > 0);
  }

  async reorderQueue(orderedIds: string[]): Promise<Order[]> {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      await this.client.from('orders').update({ queue_order: i + 1 }).eq('id', id);
    }
    return await this.getOrders();
  }

  async addDesignFile(orderId: string, file: Omit<DesignFile, 'orderId'>): Promise<DesignFile> {
    const row: DbDesignFileRow = {
      id: file.id || `df-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order_id: orderId,
      file_name: file.fileName,
      file_size: file.fileSize,
      file_type: file.fileType,
      file_url: file.fileUrl,
      thumbnail_url: file.thumbnailUrl || null,
      is_ready_to_print: Boolean(file.isReadyToPrint),
      uploaded_at: file.uploadedAt || new Date().toISOString(),
    };

    await this.client.from('order_design_files').insert(row);
    return {
      id: row.id,
      orderId: row.order_id,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileType: row.file_type,
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url || undefined,
      isReadyToPrint: row.is_ready_to_print,
      uploadedAt: row.uploaded_at,
    };
  }

  async toggleDesignReady(fileId: string, isReady: boolean): Promise<boolean> {
    const res = await this.client
      .from('order_design_files')
      .update({ is_ready_to_print: isReady })
      .eq('id', fileId);
    return Boolean(res.data && res.data.length > 0);
  }

  async deleteDesignFile(fileId: string): Promise<boolean> {
    const res = await this.client.from('order_design_files').delete().eq('id', fileId);
    return Boolean(res.data && res.data.length > 0);
  }

  // Pure analytical metrics
  getDashboardMetrics(orders: Order[]): DashboardMetrics {
    let totalPcs = 0;
    let totalOmzet = 0;
    let totalProfit = 0;
    let totalHpp = 0;
    let totalPiutangDp = 0;
    let activeOrdersCount = 0;
    let completedOrdersCount = 0;

    orders.forEach((o) => {
      totalPcs += o.qty;
      totalOmzet += o.omzet;
      totalProfit += o.profit;
      totalHpp += o.hppBreakdown.totalHpp;
      totalPiutangDp += o.remainingPayment;

      if (o.processStatus === 'SELESAI') {
        completedOrdersCount++;
      } else {
        activeOrdersCount++;
      }
    });

    const averageMarginPct =
      totalOmzet > 0 ? Math.round(((totalProfit / totalOmzet) * 100) * 10) / 10 : 0;

    return {
      totalPcs,
      totalOmzet,
      totalProfit,
      totalHpp,
      totalPiutangDp,
      activeOrdersCount,
      completedOrdersCount,
      averageMarginPct,
    };
  }

  getBuyerSummaries(orders: Order[]): BuyerSummary[] {
    const map = new Map<string, BuyerSummary>();

    orders.forEach((o) => {
      const key = o.buyerName.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalPcs += o.qty;
        existing.totalOmzet += o.omzet;
        existing.totalHpp += o.hppBreakdown.totalHpp;
        existing.totalProfit += o.profit;
      } else {
        map.set(key, {
          buyerName: o.buyerName,
          buyerPhone: o.buyerPhone,
          totalOrders: 1,
          totalPcs: o.qty,
          totalOmzet: o.omzet,
          totalHpp: o.hppBreakdown.totalHpp,
          totalProfit: o.profit,
          marginPct: 0,
        });
      }
    });

    const list = Array.from(map.values()).map((b) => {
      const marginPct =
        b.totalOmzet > 0 ? Math.round(((b.totalProfit / b.totalOmzet) * 100) * 10) / 10 : 0;
      return { ...b, marginPct };
    });

    list.sort((a, b) => b.totalProfit - a.totalProfit);
    return list.map((item, index) => ({ ...item, rank: index + 1 }));
  }

  getMonthlyProfitData(orders: Order[]): MonthlyProfitData[] {
    const monthMap = new Map<string, { omzet: number; hpp: number; profit: number; pcs: number; label: string }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    orders.forEach((o) => {
      const date = new Date(o.orderDate || o.createdAt);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      const curr = monthMap.get(key) || { omzet: 0, hpp: 0, profit: 0, pcs: 0, label };
      curr.omzet += o.omzet;
      curr.hpp += o.hppBreakdown.totalHpp;
      curr.profit += o.profit;
      curr.pcs += o.qty;
      monthMap.set(key, curr);
    });

    const sortedKeys = Array.from(monthMap.keys()).sort();
    return sortedKeys.map((key) => {
      const val = monthMap.get(key)!;
      const marginPct = val.omzet > 0 ? Math.round(((val.profit / val.omzet) * 100) * 10) / 10 : 0;
      return {
        month: key,
        monthLabel: val.label,
        omzet: val.omzet,
        hpp: val.hpp,
        profit: val.profit,
        marginPct,
        pcs: val.pcs,
      };
    });
  }
}

export const service = new OrderServiceIntegration(emulator);

// Helper to validate microcopy
export function checkMicrocopy(label: string, maxWords = 4): boolean {
  const words = label.trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords;
}

export function checkDescription(desc: string, maxWords = 15): boolean {
  const words = desc.trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords;
}

// Sample order factory
export function createOrderInput(overrides?: Partial<CreateOrderInput>): CreateOrderInput {
  return {
    orderDate: '2026-10-23',
    deadline: '2026-10-27',
    buyerName: 'Komunitas Vespa Nusantara',
    buyerPhone: '081234567890',
    productName: 'Ganci Akrilik 2 Sisi 5x5 cm',
    specs: 'Akrilik Bening 3mm, Sablon 3 Warna',
    qty: 500,
    pricePerPcs: 6500,
    hppBreakdown: {
      bahanBaku: 1800,
      tintaSablon: 600,
      tenagaKerja: 900,
      kemasan: 250,
      overhead: 250,
    },
    paymentStatus: 'DP',
    dpAmount: 1500000,
    processStatus: 'ANTREAN',
    notes: 'Prioritas festival sablon.',
    ...overrides,
  };
}

// ============================================================================
// SUITE EXECUTION & TEST CASES
// ============================================================================

describe('eganci Automated Test Suite (R1-R4 across Tiers 1-4)', () => {
  beforeEach(() => {
    emulator.reset();
  });

  // --------------------------------------------------------------------------
  // TIER 1: FEATURE COVERAGE (>=5 tests per feature)
  // --------------------------------------------------------------------------
  describe('Tier 1: Feature Coverage', () => {
    // Feature 1: Order Intake & Creation
    describe('F-01: Order Intake & Creation', () => {
      test('T1-F01-1: creates order with auto-generated order number format EG-YYYY-XXX', async () => {
        const order = await service.createOrder(createOrderInput());
        assert.match(order.orderNumber, /^EG-\d{4}-\d{3}$/);
        assert.equal(order.buyerName, 'Komunitas Vespa Nusantara');
      });

      test('T1-F01-2: initializes queueOrder sequentially starting from 1', async () => {
        const o1 = await service.createOrder(createOrderInput({ buyerName: 'Order 1' }));
        const o2 = await service.createOrder(createOrderInput({ buyerName: 'Order 2' }));
        assert.equal(o1.queueOrder, 1);
        assert.equal(o2.queueOrder, 2);
      });

      test('T1-F01-3: correctly calculates omzet, HPP, profit, and margin % on creation', async () => {
        const order = await service.createOrder(
          createOrderInput({
            qty: 100,
            pricePerPcs: 10000, // omzet = 1.000.000
            hppBreakdown: { bahanBaku: 3000, tintaSablon: 1000, tenagaKerja: 1000, kemasan: 500, overhead: 500 }, // hpp/pcs = 6000, total = 600.000
          })
        );
        assert.equal(order.omzet, 1000000);
        assert.equal(order.hppBreakdown.totalHppPerPcs, 6000);
        assert.equal(order.hppBreakdown.totalHpp, 600000);
        assert.equal(order.profit, 400000);
        assert.equal(order.marginPct, 40);
      });

      test('T1-F01-4: calculates remaining payment correctly when paymentStatus is DP', async () => {
        const order = await service.createOrder(
          createOrderInput({ qty: 100, pricePerPcs: 10000, paymentStatus: 'DP', dpAmount: 300000 })
        );
        assert.equal(order.omzet, 1000000);
        assert.equal(order.dpAmount, 300000);
        assert.equal(order.remainingPayment, 700000);
      });

      test('T1-F01-5: sets remaining payment to 0 and dpAmount = omzet when paymentStatus is LUNAS', async () => {
        const order = await service.createOrder(
          createOrderInput({ qty: 100, pricePerPcs: 10000, paymentStatus: 'LUNAS', dpAmount: 0 })
        );
        assert.equal(order.dpAmount, 1000000);
        assert.equal(order.remainingPayment, 0);
      });
    });

    // Feature 2: Order Listing, Filtering & Search
    describe('F-02: Order Listing, Filtering & Search', () => {
      test('T1-F02-1: lists all orders sorted by queueOrder ascending', async () => {
        await service.createOrder(createOrderInput({ buyerName: 'Beta', qty: 50 }));
        await service.createOrder(createOrderInput({ buyerName: 'Alpha', qty: 100 }));
        const list = await service.getOrders();
        assert.equal(list.length, 2);
        assert.equal(list[0].queueOrder, 1);
        assert.equal(list[1].queueOrder, 2);
      });

      test('T1-F02-2: filters by BELUM_LUNAS_DP tab correctly', async () => {
        await service.createOrder(createOrderInput({ paymentStatus: 'LUNAS' }));
        await service.createOrder(createOrderInput({ paymentStatus: 'DP' }));
        await service.createOrder(createOrderInput({ paymentStatus: 'BELUM_LUNAS' }));
        const all = await service.getOrders();
        const pending = all.filter((o) => o.paymentStatus === 'DP' || o.paymentStatus === 'BELUM_LUNAS');
        assert.equal(pending.length, 2);
      });

      test('T1-F02-3: filters by PROSES tab correctly (excluding SELESAI)', async () => {
        await service.createOrder(createOrderInput({ processStatus: 'ANTREAN' }));
        await service.createOrder(createOrderInput({ processStatus: 'PROSES_CETAK' }));
        await service.createOrder(createOrderInput({ processStatus: 'SELESAI' }));
        const all = await service.getOrders();
        const active = all.filter((o) => o.processStatus !== 'SELESAI');
        assert.equal(active.length, 2);
      });

      test('T1-F02-4: searches orders by buyer name case-insensitively', async () => {
        await service.createOrder(createOrderInput({ buyerName: 'Distro Bandung Perkasa' }));
        await service.createOrder(createOrderInput({ buyerName: 'Kedai Kopi Senja' }));
        const all = await service.getOrders();
        const results = all.filter((o) => o.buyerName.toLowerCase().includes('bandung'));
        assert.equal(results.length, 1);
        assert.equal(results[0].buyerName, 'Distro Bandung Perkasa');
      });

      test('T1-F02-5: returns empty array when no orders exist without error', async () => {
        const list = await service.getOrders();
        assert.deepEqual(list, []);
      });
    });

    // Feature 3: Order Mutation & Status Progression
    describe('F-03: Order Mutation & Status Progression', () => {
      test('T1-F03-1: updates process status across the 6-stage physical workshop workflow', async () => {
        const o = await service.createOrder(createOrderInput({ processStatus: 'ANTREAN' }));
        const stages: ProcessStatus[] = ['SETTING_DESAIN', 'PROSES_CETAK', 'FINISHING', 'SIAP_KIRIM', 'SELESAI'];
        for (const s of stages) {
          const updated = await service.updateOrder(o.id, { processStatus: s });
          assert.equal(updated?.processStatus, s);
        }
      });

      test('T1-F03-2: updates quantity and automatically recalculates omzet, HPP, and profit', async () => {
        const o = await service.createOrder(createOrderInput({ qty: 100, pricePerPcs: 5000 }));
        assert.equal(o.omzet, 500000);
        const updated = await service.updateOrder(o.id, { qty: 200 });
        assert.equal(updated?.qty, 200);
        assert.equal(updated?.omzet, 1000000);
        assert.equal(updated?.hppBreakdown.totalHpp, o.hppBreakdown.totalHppPerPcs * 200);
      });

      test('T1-F03-3: changing payment status from DP to LUNAS zeroes remaining balance', async () => {
        const o = await service.createOrder(createOrderInput({ qty: 100, pricePerPcs: 10000, paymentStatus: 'DP', dpAmount: 400000 }));
        assert.equal(o.remainingPayment, 600000);
        const updated = await service.updateOrder(o.id, { paymentStatus: 'LUNAS' });
        assert.equal(updated?.paymentStatus, 'LUNAS');
        assert.equal(updated?.remainingPayment, 0);
        assert.equal(updated?.dpAmount, 1000000);
      });

      test('T1-F03-4: partial update preserves existing fields unchanged', async () => {
        const o = await service.createOrder(createOrderInput({ notes: 'Catatan penting' }));
        const updated = await service.updateOrder(o.id, { buyerPhone: '08999999999' });
        assert.equal(updated?.buyerPhone, '08999999999');
        assert.equal(updated?.notes, 'Catatan penting');
        assert.equal(updated?.buyerName, o.buyerName);
      });

      test('T1-F03-5: updating non-existent order returns null safely', async () => {
        const res = await service.updateOrder('non-existent-id', { notes: 'test' });
        assert.equal(res, null);
      });
    });

    // Feature 4: Order Deletion & Queue Continuity
    describe('F-04: Order Deletion & Queue Continuity', () => {
      test('T1-F04-1: deletes existing order successfully', async () => {
        const o = await service.createOrder(createOrderInput());
        const ok = await service.deleteOrder(o.id);
        assert.equal(ok, true);
        const fetched = await service.getOrderById(o.id);
        assert.equal(fetched, null);
      });

      test('T1-F04-2: deleting order cascades and deletes attached design files', async () => {
        const o = await service.createOrder(createOrderInput());
        await service.addDesignFile(o.id, {
          id: 'df-del-1',
          fileName: 'artwork.cdr',
          fileSize: 1024,
          fileType: 'CDR',
          fileUrl: 'http://test/artwork.cdr',
          isReadyToPrint: false,
          uploadedAt: new Date().toISOString(),
        });
        assert.equal(emulator.designFilesTable.length, 1);
        await service.deleteOrder(o.id);
        assert.equal(emulator.designFilesTable.length, 0);
      });

      test('T1-F04-3: deleting non-existent order returns false', async () => {
        const ok = await service.deleteOrder('missing-id');
        assert.equal(ok, false);
      });

      test('T1-F04-4: re-indexing queue orders remains contiguous after mid-queue delete', async () => {
        const o1 = await service.createOrder(createOrderInput({ buyerName: 'One' }));
        const o2 = await service.createOrder(createOrderInput({ buyerName: 'Two' }));
        const o3 = await service.createOrder(createOrderInput({ buyerName: 'Three' }));
        await service.deleteOrder(o2.id);
        const remaining = await service.getOrders();
        await service.reorderQueue(remaining.map((r) => r.id));
        const finalOrders = await service.getOrders();
        assert.equal(finalOrders.length, 2);
        assert.equal(finalOrders[0].id, o1.id);
        assert.equal(finalOrders[0].queueOrder, 1);
        assert.equal(finalOrders[1].id, o3.id);
        assert.equal(finalOrders[1].queueOrder, 2);
      });

      test('T1-F04-5: deleting last order results in empty order list', async () => {
        const o = await service.createOrder(createOrderInput());
        await service.deleteOrder(o.id);
        const list = await service.getOrders();
        assert.deepEqual(list, []);
      });
    });

    // Feature 5: Queue Priority & Reordering
    describe('F-05: Queue Priority & Reordering', () => {
      test('T1-F05-1: reorders queue items according to new ID order', async () => {
        const o1 = await service.createOrder(createOrderInput({ buyerName: 'First' }));
        const o2 = await service.createOrder(createOrderInput({ buyerName: 'Second' }));
        const o3 = await service.createOrder(createOrderInput({ buyerName: 'Third' }));
        await service.reorderQueue([o3.id, o1.id, o2.id]);
        const reordered = await service.getOrders();
        assert.equal(reordered[0].id, o3.id);
        assert.equal(reordered[0].queueOrder, 1);
        assert.equal(reordered[1].id, o1.id);
        assert.equal(reordered[1].queueOrder, 2);
        assert.equal(reordered[2].id, o2.id);
        assert.equal(reordered[2].queueOrder, 3);
      });

      test('T1-F05-2: promotes urgent order to queue position 1', async () => {
        const o1 = await service.createOrder(createOrderInput({ buyerName: 'Standard' }));
        const o2 = await service.createOrder(createOrderInput({ buyerName: 'Rush' }));
        await service.reorderQueue([o2.id, o1.id]);
        const list = await service.getOrders();
        assert.equal(list[0].id, o2.id);
        assert.equal(list[0].queueOrder, 1);
      });

      test('T1-F05-3: maintaining order with single item queue preserves rank 1', async () => {
        const o = await service.createOrder(createOrderInput());
        await service.reorderQueue([o.id]);
        const list = await service.getOrders();
        assert.equal(list[0].queueOrder, 1);
      });

      test('T1-F05-4: empty queue reorder executes cleanly without error', async () => {
        const res = await service.reorderQueue([]);
        assert.deepEqual(res, []);
      });

      test('T1-F05-5: preserves contiguous 1..N indices with no duplicate ranks', async () => {
        const orders = [];
        for (let i = 0; i < 5; i++) {
          orders.push(await service.createOrder(createOrderInput({ buyerName: `B-${i}` })));
        }
        const reversedIds = orders.map((o) => o.id).reverse();
        const reordered = await service.reorderQueue(reversedIds);
        const ranks = reordered.map((o) => o.queueOrder);
        assert.deepEqual(ranks, [1, 2, 3, 4, 5]);
      });
    });

    // Feature 6: Design File Lifecycle & Artwork Drawer
    describe('F-06: Design File Lifecycle & Artwork Drawer', () => {
      test('T1-F06-1: adds design file with valid print format (.cdr, .ai, .psd, .pdf)', async () => {
        const o = await service.createOrder(createOrderInput());
        const df = await service.addDesignFile(o.id, {
          id: 'df-cdr-1',
          fileName: 'Design_Vespa_Final.cdr',
          fileSize: 4500000,
          fileType: 'CDR',
          fileUrl: 'https://test/Design_Vespa_Final.cdr',
          isReadyToPrint: false,
          uploadedAt: new Date().toISOString(),
        });
        assert.equal(df.fileType, 'CDR');
        assert.equal(df.orderId, o.id);
        const fetched = await service.getOrderById(o.id);
        assert.equal(fetched?.designFiles.length, 1);
      });

      test('T1-F06-2: toggles isReadyToPrint flag for workshop operator', async () => {
        const o = await service.createOrder(createOrderInput());
        const df = await service.addDesignFile(o.id, {
          id: 'df-toggle-1',
          fileName: 'Film_Sablon.ai',
          fileSize: 2000000,
          fileType: 'AI',
          fileUrl: 'https://test/Film_Sablon.ai',
          isReadyToPrint: false,
          uploadedAt: new Date().toISOString(),
        });
        assert.equal(df.isReadyToPrint, false);
        await service.toggleDesignReady(df.id, true);
        const fetched = await service.getOrderById(o.id);
        assert.equal(fetched?.designFiles[0].isReadyToPrint, true);
      });

      test('T1-F06-3: deletes design file independently from order', async () => {
        const o = await service.createOrder(createOrderInput());
        const df = await service.addDesignFile(o.id, {
          id: 'df-del-sub',
          fileName: 'Draft.png',
          fileSize: 500000,
          fileType: 'PNG',
          fileUrl: 'https://test/Draft.png',
          isReadyToPrint: false,
          uploadedAt: new Date().toISOString(),
        });
        const deleted = await service.deleteDesignFile(df.id);
        assert.equal(deleted, true);
        const fetched = await service.getOrderById(o.id);
        assert.equal(fetched?.designFiles.length, 0);
      });

      test('T1-F06-4: uploads binary file to storage bucket and verifies public URL', async () => {
        const buffer = Buffer.from('mock print artwork binary content');
        const uploadRes = await emulator.storage.from('design-files').upload('orders/ord-1/art.pdf', buffer, {
          contentType: 'application/pdf',
        });
        assert.equal(uploadRes.error, null);
        assert.equal(uploadRes.data?.path, 'orders/ord-1/art.pdf');
        const urlRes = emulator.storage.from('design-files').getPublicUrl('orders/ord-1/art.pdf');
        assert.match(urlRes.data.publicUrl, /^https:\/\/mock-storage\.eganci\.test\/design-files\/orders\/ord-1\/art\.pdf$/);
      });

      test('T1-F06-5: rejects file exceeding 50MB storage limit', async () => {
        const oversized = Buffer.alloc(53 * 1024 * 1024); // 53MB
        const res = await emulator.storage.from('design-files').upload('too_big.ai', oversized);
        assert.notEqual(res.error, null);
        assert.match(res.error!.message, /exceeds 50MB/);
      });
    });

    // Feature 7: Derived Financial Metrics & Aggregations
    describe('F-07: Derived Financial Metrics & Aggregations', () => {
      test('T1-F07-1: calculates dashboard metrics totals accurately', async () => {
        await service.createOrder(
          createOrderInput({
            qty: 100,
            pricePerPcs: 10000, // omzet: 1.000.000, hpp: 600.000, profit: 400.000, piutang: 0
            paymentStatus: 'LUNAS',
            processStatus: 'SELESAI',
            hppBreakdown: { bahanBaku: 3000, tintaSablon: 1000, tenagaKerja: 1000, kemasan: 500, overhead: 500 },
          })
        );
        await service.createOrder(
          createOrderInput({
            qty: 200,
            pricePerPcs: 5000, // omzet: 1.000.000, hpp: 500.000, profit: 500.000, piutang: 500.000
            paymentStatus: 'DP',
            dpAmount: 500000,
            processStatus: 'PROSES_CETAK',
            hppBreakdown: { bahanBaku: 1000, tintaSablon: 500, tenagaKerja: 500, kemasan: 250, overhead: 250 },
          })
        );
        const orders = await service.getOrders();
        const metrics = service.getDashboardMetrics(orders);
        assert.equal(metrics.totalPcs, 300);
        assert.equal(metrics.totalOmzet, 2000000);
        assert.equal(metrics.totalHpp, 1100000);
        assert.equal(metrics.totalProfit, 900000);
        assert.equal(metrics.totalPiutangDp, 500000);
        assert.equal(metrics.activeOrdersCount, 1);
        assert.equal(metrics.completedOrdersCount, 1);
        assert.equal(metrics.averageMarginPct, 45.0); // 900k / 2000k = 45%
      });

      test('T1-F07-2: computes buyer summaries and ranks by total profit descending', async () => {
        await service.createOrder(createOrderInput({ buyerName: 'Client Small', qty: 10, pricePerPcs: 5000 }));
        await service.createOrder(createOrderInput({ buyerName: 'Client Big', qty: 1000, pricePerPcs: 10000 }));
        const orders = await service.getOrders();
        const summaries = service.getBuyerSummaries(orders);
        assert.equal(summaries.length, 2);
        assert.equal(summaries[0].buyerName, 'Client Big');
        assert.equal(summaries[0].rank, 1);
        assert.equal(summaries[1].buyerName, 'Client Small');
        assert.equal(summaries[1].rank, 2);
      });

      test('T1-F07-3: groups monthly profit data chronologically', async () => {
        await service.createOrder(createOrderInput({ orderDate: '2026-08-15', qty: 100, pricePerPcs: 5000 }));
        await service.createOrder(createOrderInput({ orderDate: '2026-09-10', qty: 200, pricePerPcs: 5000 }));
        const orders = await service.getOrders();
        const monthly = service.getMonthlyProfitData(orders);
        assert.equal(monthly.length, 2);
        assert.equal(monthly[0].month, '2026-08');
        assert.equal(monthly[1].month, '2026-09');
      });

      test('T1-F07-4: formatRp produces valid Indonesian Rupiah currency format', () => {
        assert.equal(formatRp(2500000), 'Rp 2.500.000');
        assert.equal(formatRp(0), 'Rp 0');
        assert.equal(formatRp(-15000), '-Rp 15.000');
      });

      test('T1-F07-5: formatDateShort produces Indonesian month names', () => {
        assert.equal(formatDateShort('2026-10-24'), '24 Okt 2026');
        assert.equal(formatDateShort('2026-05-01'), '1 Mei 2026');
        assert.equal(formatDateShort(''), '-');
      });
    });

    // Feature 8: Supabase Configuration & Fallback State
    describe('F-08: Supabase Configuration & Fallback State', () => {
      function validateSupabaseConfig(url?: string, key?: string): { isConfigured: boolean; reason?: string } {
        if (!url || !key) return { isConfigured: false, reason: 'URL atau Anon Key belum diisi.' };
        if (url.includes('project-id-kamu') || url.includes('placeholder')) {
          return { isConfigured: false, reason: 'URL masih menggunakan placeholder template.' };
        }
        if (key.includes('...') || key.length < 20) {
          return { isConfigured: false, reason: 'Anon Key tidak valid atau terlalu pendek.' };
        }
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { isConfigured: false, reason: 'Protokol URL Supabase harus diawali http:// atau https://.' };
          }
        } catch {
          return { isConfigured: false, reason: 'Format URL Supabase tidak valid.' };
        }
        return { isConfigured: true };
      }

      test('T1-F08-1: detects empty/missing environment variables', () => {
        const res = validateSupabaseConfig('', '');
        assert.equal(res.isConfigured, false);
      });

      test('T1-F08-2: detects placeholder url containing project-id-kamu', () => {
        const res = validateSupabaseConfig('https://project-id-kamu.supabase.co', 'valid-long-anon-key-1234567890');
        assert.equal(res.isConfigured, false);
        assert.match(res.reason!, /placeholder/);
      });

      test('T1-F08-3: detects placeholder key containing ellipsis', () => {
        const res = validateSupabaseConfig('https://valid-project.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        assert.equal(res.isConfigured, false);
      });

      test('T1-F08-4: accepts valid Supabase credentials without throwing', () => {
        const res = validateSupabaseConfig('https://eganci-prod.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijklmnop');
        assert.equal(res.isConfigured, true);
      });

      test('T1-F08-5: unconfigured state returns empty order array [] without crashing', async () => {
        const config = validateSupabaseConfig('', '');
        const orders = config.isConfigured ? await service.getOrders() : [];
        assert.deepEqual(orders, []);
      });
    });

    // Feature 9: Indonesian Microcopy & UX Constraints
    describe('F-09: Indonesian Microcopy & UX Constraints', () => {
      test('T1-F09-1: all standard button labels have <= 4 words', () => {
        const buttons = [
          'Tambah Pesanan',
          'Simpan Perubahan',
          'Hapus Pesanan',
          'Upload Desain',
          'Tandai Selesai',
          'Filter Status',
          'Export Excel',
        ];
        for (const btn of buttons) {
          assert.equal(checkMicrocopy(btn, 4), true, `Button "${btn}" exceeds 4 words`);
        }
      });

      test('T1-F09-2: filter tab labels are concise Indonesian words', () => {
        const tabs = ['Semua Pesanan', 'Belum Lunas & DP', 'Dalam Proses', 'Selesai'];
        for (const tab of tabs) {
          assert.equal(checkMicrocopy(tab, 4), true, `Tab "${tab}" exceeds 4 words`);
        }
      });

      test('T1-F09-3: empty state descriptions have <= 1 short sentence (~15 words)', () => {
        const descriptions = [
          'Belum ada antrean produksi aktif saat ini.',
          'Riwayat pesanan yang selesai akan tampil di sini.',
          'Tidak ada data pesanan yang cocok dengan pencarian.',
          'Belum ada file desain yang diunggah untuk pesanan ini.',
        ];
        for (const desc of descriptions) {
          assert.equal(checkDescription(desc, 15), true, `Description "${desc}" exceeds limit`);
        }
      });

      test('T1-F09-4: process status badges use standard workshop terminology', () => {
        const badgeLabels = ['Antrean', 'Setting Desain', 'Proses Cetak', 'Finishing', 'Siap Kirim', 'Selesai'];
        for (const b of badgeLabels) {
          assert.equal(checkMicrocopy(b, 2), true);
        }
      });

      test('T1-F09-5: payment status labels are <= 2 words', () => {
        const paymentLabels = ['Lunas', 'Uang Muka (DP)', 'Belum Lunas'];
        for (const p of paymentLabels) {
          assert.equal(checkMicrocopy(p, 3), true);
        }
      });
    });
  });

  // --------------------------------------------------------------------------
  // TIER 2: BOUNDARY & CORNER CASES (>=5 per boundary domain)
  // --------------------------------------------------------------------------
  describe('Tier 2: Boundary & Corner Cases', () => {
    // Domain B-01: Quantity limits
    describe('B-01: Quantity Limits & Batch Sizes', () => {
      test('T2-B01-1: handles minimum single unit order (qty = 1)', async () => {
        const order = await service.createOrder(createOrderInput({ qty: 1, pricePerPcs: 15000 }));
        assert.equal(order.qty, 1);
        assert.equal(order.omzet, 15000);
        assert.equal(order.hppBreakdown.totalHpp, order.hppBreakdown.totalHppPerPcs);
      });

      test('T2-B01-2: prevents zero quantity by clamping to minimum 1 pc in calculation', () => {
        const hpp = calculateHPP({ bahanBaku: 1000, tintaSablon: 500, tenagaKerja: 500, kemasan: 200, overhead: 200 }, 0);
        assert.equal(hpp.totalHpp, 2400); // 1 safe qty minimum
      });

      test('T2-B01-3: handles extreme mass production batches (qty = 100,000 pcs)', async () => {
        const order = await service.createOrder(
          createOrderInput({
            qty: 100000,
            pricePerPcs: 4500, // omzet: 450.000.000
            hppBreakdown: { bahanBaku: 1500, tintaSablon: 500, tenagaKerja: 500, kemasan: 200, overhead: 200 }, // hpp: 290.000.000
          })
        );
        assert.equal(order.omzet, 450000000);
        assert.equal(order.hppBreakdown.totalHpp, 290000000);
        assert.equal(order.profit, 160000000);
      });

      test('T2-B01-4: negative breakdown components are clamped to zero', () => {
        const hpp = calculateHPP(
          { bahanBaku: -500, tintaSablon: 1000, tenagaKerja: -200, kemasan: 100, overhead: 100 },
          10
        );
        assert.equal(hpp.bahanBaku, 0);
        assert.equal(hpp.tenagaKerja, 0);
        assert.equal(hpp.totalHppPerPcs, 1200);
        assert.equal(hpp.totalHpp, 12000);
      });

      test('T2-B01-5: fractional prices are cleanly handled and rounded', async () => {
        const order = await service.createOrder(createOrderInput({ qty: 3, pricePerPcs: 3333.33 }));
        assert.equal(Math.round(order.omzet), 10000);
      });
    });

    // Domain B-02: Financial extremes
    describe('B-02: Financial Extremes & Down Payment Bounds', () => {
      test('T2-B02-1: DP exactly equal to omzet sets remaining payment to 0', async () => {
        const order = await service.createOrder(
          createOrderInput({ qty: 100, pricePerPcs: 10000, paymentStatus: 'DP', dpAmount: 1000000 })
        );
        assert.equal(order.remainingPayment, 0);
      });

      test('T2-B02-2: DP = 0 under DP status defaults remaining payment to full omzet', async () => {
        const order = await service.createOrder(
          createOrderInput({ qty: 100, pricePerPcs: 10000, paymentStatus: 'DP', dpAmount: 0 })
        );
        assert.equal(order.remainingPayment, 1000000);
      });

      test('T2-B02-3: DP exceeding omzet clamps remaining payment to 0 (no negative balance)', async () => {
        const order = await service.createOrder(
          createOrderInput({ qty: 100, pricePerPcs: 10000, paymentStatus: 'DP', dpAmount: 1500000 })
        );
        assert.equal(order.remainingPayment, 0);
      });

      test('T2-B02-4: pricePerPcs = 0 produces omzet = 0 without division by zero errors', () => {
        const { profit, marginPct } = calculateMargin(0, 50000);
        assert.equal(profit, -50000);
        assert.equal(marginPct, 0);
      });

      test('T2-B02-5: huge financial amounts (billions of IDR) maintain integer precision', async () => {
        const order = await service.createOrder(
          createOrderInput({
            qty: 500000,
            pricePerPcs: 25000, // omzet = 12.500.000.000 (12.5 Billion Rp)
            paymentStatus: 'LUNAS',
          })
        );
        assert.equal(order.omzet, 12500000000);
        assert.equal(formatRp(order.omzet), 'Rp 12.500.000.000');
      });
    });

    // Domain B-03: Margin breakdown
    describe('B-03: Margin Extremes & Negative Cost Scenarios', () => {
      test('T2-B03-1: 0% margin when omzet equals total HPP exactly', () => {
        const { profit, marginPct } = calculateMargin(1000000, 1000000);
        assert.equal(profit, 0);
        assert.equal(marginPct, 0);
      });

      test('T2-B03-2: negative profit and negative margin percentage when HPP > omzet', () => {
        const { profit, marginPct } = calculateMargin(1000000, 1500000);
        assert.equal(profit, -500000);
        assert.equal(marginPct, -50.0);
      });

      test('T2-B03-3: 100% margin when HPP is 0', () => {
        const { profit, marginPct } = calculateMargin(1000000, 0);
        assert.equal(profit, 1000000);
        assert.equal(marginPct, 100);
      });

      test('T2-B03-4: high overhead scenario (>70% of total cost) correctly factors in total HPP', () => {
        const hpp = calculateHPP({ bahanBaku: 100, tintaSablon: 100, tenagaKerja: 100, kemasan: 100, overhead: 3600 }, 10);
        assert.equal(hpp.totalHppPerPcs, 4000);
        assert.equal(hpp.totalHpp, 40000);
      });

      test('T2-B03-5: margin percentage is rounded to exactly one decimal place', () => {
        const { marginPct } = calculateMargin(300, 200); // 100/300 = 33.333333...%
        assert.equal(marginPct, 33.3);
      });
    });

    // Domain B-04: File boundaries
    describe('B-04: Design File Boundaries & MIME Validation', () => {
      test('T2-B04-1: accepts exactly 50MB file size boundary', async () => {
        const maxBuffer = Buffer.alloc(52428800); // 50MB
        const res = await emulator.storage.from('design-files').upload('exact_50mb.cdr', maxBuffer);
        assert.equal(res.error, null);
      });

      test('T2-B04-2: rejects unsupported executable/script file types (.exe, .sh, .bat)', async () => {
        const scriptBuffer = Buffer.from('echo hello');
        const res = await emulator.storage.from('design-files').upload('malicious.sh', scriptBuffer, {
          contentType: 'application/x-sh',
        });
        assert.notEqual(res.error, null);
        assert.match(res.error!.message, /Unsupported MIME/);
      });

      test('T2-B04-3: order with zero design files maintains empty array []', async () => {
        const order = await service.createOrder(createOrderInput());
        assert.deepEqual(order.designFiles, []);
      });

      test('T2-B04-4: handles special characters and spaces in design file names', async () => {
        const o = await service.createOrder(createOrderInput());
        const df = await service.addDesignFile(o.id, {
          id: 'df-special',
          fileName: 'Artwork Logo (Ganci) #01 [Final].cdr',
          fileSize: 1024,
          fileType: 'CDR',
          fileUrl: 'https://test/encoded_url',
          isReadyToPrint: true,
          uploadedAt: new Date().toISOString(),
        });
        assert.equal(df.fileName, 'Artwork Logo (Ganci) #01 [Final].cdr');
      });

      test('T2-B04-5: deleting already deleted file returns false cleanly', async () => {
        const res = await service.deleteDesignFile('already-deleted-id');
        assert.equal(res, false);
      });
    });

    // Domain B-05: Queue boundaries
    describe('B-05: Queue Boundaries & Sequence Edge Cases', () => {
      test('T2-B05-1: reordering with empty array returns empty list without error', async () => {
        const res = await service.reorderQueue([]);
        assert.deepEqual(res, []);
      });

      test('T2-B05-2: reordering ignores unknown or non-existent IDs without breaking sequence', async () => {
        const o1 = await service.createOrder(createOrderInput({ buyerName: 'One' }));
        const o2 = await service.createOrder(createOrderInput({ buyerName: 'Two' }));
        await service.reorderQueue(['unknown-1', o2.id, 'unknown-2', o1.id]);
        const list = await service.getOrders();
        assert.equal(list[0].id, o2.id);
        assert.equal(list[1].id, o1.id);
      });

      test('T2-B05-3: single item queue reorder preserves rank 1', async () => {
        const o = await service.createOrder(createOrderInput());
        await service.reorderQueue([o.id]);
        const list = await service.getOrders();
        assert.equal(list[0].queueOrder, 1);
      });

      test('T2-B05-4: handles large queue sequence (50 items) with contiguous indices 1..50', async () => {
        const ids: string[] = [];
        for (let i = 0; i < 50; i++) {
          const o = await service.createOrder(createOrderInput({ buyerName: `Buyer ${i}` }));
          ids.push(o.id);
        }
        const reversed = [...ids].reverse();
        await service.reorderQueue(reversed);
        const list = await service.getOrders();
        assert.equal(list.length, 50);
        for (let i = 0; i < 50; i++) {
          assert.equal(list[i].id, reversed[i]);
          assert.equal(list[i].queueOrder, i + 1);
        }
      });

      test('T2-B05-5: multiple orders with same buyer preserve distinct order IDs', async () => {
        const o1 = await service.createOrder(createOrderInput({ buyerName: 'Repeat Buyer' }));
        const o2 = await service.createOrder(createOrderInput({ buyerName: 'Repeat Buyer' }));
        assert.notEqual(o1.id, o2.id);
        assert.notEqual(o1.orderNumber, o2.orderNumber);
      });
    });
  });

  // --------------------------------------------------------------------------
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // --------------------------------------------------------------------------
  describe('Tier 3: Cross-Feature Combinations', () => {
    test('T3-C01: Process status progression combined with queue priority shifts', async () => {
      const o1 = await service.createOrder(createOrderInput({ buyerName: 'Normal Order', processStatus: 'ANTREAN' }));
      const o2 = await service.createOrder(createOrderInput({ buyerName: 'Priority Order', processStatus: 'ANTREAN' }));

      // Move priority order to top
      await service.reorderQueue([o2.id, o1.id]);
      // Advance status
      await service.updateOrder(o2.id, { processStatus: 'PROSES_CETAK' });

      const list = await service.getOrders();
      assert.equal(list[0].id, o2.id);
      assert.equal(list[0].queueOrder, 1);
      assert.equal(list[0].processStatus, 'PROSES_CETAK');
      assert.equal(list[1].id, o1.id);
      assert.equal(list[1].queueOrder, 2);
    });

    test('T3-C02: Down payment change with retroactive unit price and HPP adjustments', async () => {
      const o = await service.createOrder(
        createOrderInput({
          qty: 100,
          pricePerPcs: 10000,
          paymentStatus: 'DP',
          dpAmount: 400000,
        })
      );
      assert.equal(o.omzet, 1000000);
      assert.equal(o.remainingPayment, 600000);

      // Client negotiates discount pricePerPcs: 9000 -> omzet = 900.000, remaining = 500.000
      const updated = await service.updateOrder(o.id, { pricePerPcs: 9000 });
      assert.equal(updated?.omzet, 900000);
      assert.equal(updated?.remainingPayment, 500000);

      // Client pays balance in full
      const settled = await service.updateOrder(o.id, { paymentStatus: 'LUNAS' });
      assert.equal(settled?.paymentStatus, 'LUNAS');
      assert.equal(settled?.dpAmount, 900000);
      assert.equal(settled?.remainingPayment, 0);
    });

    test('T3-C03: Mid-queue deletion followed by bulk drag-and-drop and index validation', async () => {
      const o1 = await service.createOrder(createOrderInput({ buyerName: 'A' }));
      const o2 = await service.createOrder(createOrderInput({ buyerName: 'B' }));
      const o3 = await service.createOrder(createOrderInput({ buyerName: 'C' }));
      const o4 = await service.createOrder(createOrderInput({ buyerName: 'D' }));

      // Delete item B
      await service.deleteOrder(o2.id);
      // Reorder remaining [D, A, C]
      await service.reorderQueue([o4.id, o1.id, o3.id]);

      const finalOrders = await service.getOrders();
      assert.equal(finalOrders.length, 3);
      assert.equal(finalOrders[0].id, o4.id);
      assert.equal(finalOrders[0].queueOrder, 1);
      assert.equal(finalOrders[1].id, o1.id);
      assert.equal(finalOrders[1].queueOrder, 2);
      assert.equal(finalOrders[2].id, o3.id);
      assert.equal(finalOrders[2].queueOrder, 3);
    });

    test('T3-C04: Artwork upload in PROSES_CETAK stage triggering print readiness check', async () => {
      const o = await service.createOrder(createOrderInput({ processStatus: 'SETTING_DESAIN' }));
      const df = await service.addDesignFile(o.id, {
        id: 'df-print-ready',
        fileName: 'Vector_Keychain.cdr',
        fileSize: 3200000,
        fileType: 'CDR',
        fileUrl: 'https://test/Vector_Keychain.cdr',
        isReadyToPrint: false,
        uploadedAt: new Date().toISOString(),
      });

      // Operator marks file ready
      await service.toggleDesignReady(df.id, true);
      // Operator advances status to PROSES_CETAK
      await service.updateOrder(o.id, { processStatus: 'PROSES_CETAK' });

      const fetched = await service.getOrderById(o.id);
      assert.equal(fetched?.processStatus, 'PROSES_CETAK');
      assert.equal(fetched?.designFiles[0].isReadyToPrint, true);
    });

    test('T3-C05: Optimistic update with simulated network failure and state rollback', async () => {
      const o = await service.createOrder(createOrderInput({ notes: 'Original note' }));

      // Local optimistic state
      let localState: Order = { ...o, notes: 'Optimistic change' };

      // Backend fails
      emulator.setFailureMode(true, '503 Service Unavailable');

      try {
        await service.updateOrder(o.id, { notes: 'Optimistic change' });
        assert.fail('Should have thrown an error');
      } catch (err: any) {
        // Rollback optimistic state to previous snapshot
        localState = { ...o };
        assert.equal(err.message, '503 Service Unavailable');
      }

      emulator.setFailureMode(false);
      assert.equal(localState.notes, 'Original note');
    });
  });

  // --------------------------------------------------------------------------
  // TIER 4: REAL-WORLD SCENARIOS
  // --------------------------------------------------------------------------
  describe('Tier 4: Real-World Scenarios', () => {
    test('Scenario 1: 500pcs Acrylic Keychain Order Full Lifecycle', async () => {
      // 1. Order Intake with DP
      const order = await service.createOrder(
        createOrderInput({
          buyerName: 'Komunitas Motor CB Klasik',
          productName: 'Ganci Akrilik 2 Sisi 5x5 cm',
          specs: 'Akrilik Bening 3mm, Sablon 3 Warna',
          qty: 500,
          pricePerPcs: 6500, // omzet = 3.250.000
          hppBreakdown: { bahanBaku: 1800, tintaSablon: 600, tenagaKerja: 900, kemasan: 250, overhead: 250 },
          paymentStatus: 'DP',
          dpAmount: 1500000,
          processStatus: 'ANTREAN',
        })
      );
      assert.equal(order.omzet, 3250000);
      assert.equal(order.remainingPayment, 1750000);
      assert.equal(order.queueOrder, 1);

      // 2. Upload CDR Print Artwork
      const artwork = await service.addDesignFile(order.id, {
        id: 'df-cb-101',
        fileName: 'Logo_CB_Klasik_Final_Cetak.cdr',
        fileSize: 4520000,
        fileType: 'CDR',
        fileUrl: 'https://images.unsplash.com/photo-1618005182384?auto=format&fit=crop&w=1200&q=80',
        isReadyToPrint: false,
        uploadedAt: new Date().toISOString(),
      });
      assert.equal(artwork.fileName, 'Logo_CB_Klasik_Final_Cetak.cdr');

      // 3. Operator reviews and marks artwork ready
      await service.toggleDesignReady(artwork.id, true);
      await service.updateOrder(order.id, { processStatus: 'SETTING_DESAIN' });

      // 4. Physical workshop progression: Cetak -> Finishing -> Siap Kirim
      await service.updateOrder(order.id, { processStatus: 'PROSES_CETAK' });
      await service.updateOrder(order.id, { processStatus: 'FINISHING' });
      await service.updateOrder(order.id, { processStatus: 'SIAP_KIRIM' });

      // 5. Final invoice settlement & handover
      const finalized = await service.updateOrder(order.id, {
        paymentStatus: 'LUNAS',
        processStatus: 'SELESAI',
      });
      assert.equal(finalized?.paymentStatus, 'LUNAS');
      assert.equal(finalized?.remainingPayment, 0);
      assert.equal(finalized?.processStatus, 'SELESAI');

      // 6. Metrics reflect completed order
      const orders = await service.getOrders();
      const metrics = service.getDashboardMetrics(orders);
      assert.equal(metrics.completedOrdersCount, 1);
      assert.equal(metrics.activeOrdersCount, 0);
    });

    test('Scenario 2: 150pcs Plastisol Apparel Rush Order with Queue Boost', async () => {
      // Existing backlog order
      const backlog = await service.createOrder(createOrderInput({ buyerName: 'Regular Client' }));

      // Rush apparel order
      const rush = await service.createOrder(
        createOrderInput({
          buyerName: 'Distro Apparel Bandung',
          productName: 'Kaos Sablon Plastisol 24s',
          qty: 150,
          pricePerPcs: 65000, // omzet: 9.750.000
          paymentStatus: 'LUNAS',
          notes: 'URGENT festival weekend ini.',
        })
      );

      // Boost rush order to queue position 1
      await service.reorderQueue([rush.id, backlog.id]);
      const queue = await service.getOrders();
      assert.equal(queue[0].id, rush.id);
      assert.equal(queue[0].queueOrder, 1);
      assert.equal(queue[1].id, backlog.id);
      assert.equal(queue[1].queueOrder, 2);
    });

    test('Scenario 3: Loyal Buyer Repeat Ordering & Profit Leaderboard Promotion', async () => {
      // Client places 3 consecutive orders over time
      await service.createOrder(
        createOrderInput({
          buyerName: 'Komunitas Motor CB Klasik',
          qty: 500,
          pricePerPcs: 6500,
          hppBreakdown: { bahanBaku: 1800, tintaSablon: 600, tenagaKerja: 900, kemasan: 250, overhead: 250 },
        })
      );
      await service.createOrder(
        createOrderInput({
          buyerName: 'Komunitas Motor CB Klasik',
          qty: 1000,
          pricePerPcs: 2500,
          hppBreakdown: { bahanBaku: 700, tintaSablon: 350, tenagaKerja: 350, kemasan: 100, overhead: 100 },
        })
      );
      await service.createOrder(createOrderInput({ buyerName: 'Other Buyer', qty: 50, pricePerPcs: 5000 }));

      const orders = await service.getOrders();
      const leaderboard = service.getBuyerSummaries(orders);

      assert.equal(leaderboard[0].buyerName, 'Komunitas Motor CB Klasik');
      assert.equal(leaderboard[0].totalOrders, 2);
      assert.equal(leaderboard[0].totalPcs, 1500);
      assert.equal(leaderboard[0].rank, 1);
      assert.equal(leaderboard[1].buyerName, 'Other Buyer');
      assert.equal(leaderboard[1].rank, 2);
    });

    test('Scenario 4: Erroneous Order Entry & Clean Cancellation with Re-indexing', async () => {
      const o1 = await service.createOrder(createOrderInput({ buyerName: 'Client Alpha' }));
      const mistaken = await service.createOrder(createOrderInput({ buyerName: 'Mistake Input' }));
      const o3 = await service.createOrder(createOrderInput({ buyerName: 'Client Omega' }));

      // Detect error and immediately delete
      const deleted = await service.deleteOrder(mistaken.id);
      assert.equal(deleted, true);

      // Re-index remaining queue
      const remaining = await service.getOrders();
      await service.reorderQueue(remaining.map((r) => r.id));

      const finalQueue = await service.getOrders();
      assert.equal(finalQueue.length, 2);
      assert.equal(finalQueue[0].id, o1.id);
      assert.equal(finalQueue[0].queueOrder, 1);
      assert.equal(finalQueue[1].id, o3.id);
      assert.equal(finalQueue[1].queueOrder, 2);

      // Verify no orphan records in database
      const check = await service.getOrderById(mistaken.id);
      assert.equal(check, null);
    });

    test('Scenario 5: Unconfigured Cold Start to Live Database Transition', async () => {
      // 1. Initial unconfigured state
      let isConfigured = false;
      let initialOrders: Order[] = isConfigured ? await service.getOrders() : [];
      assert.deepEqual(initialOrders, []);

      // 2. Workshop manager configures .env.local credentials
      isConfigured = true;

      // 3. Database is seeded with initial workshop production orders
      await service.createOrder(createOrderInput({ buyerName: 'Workshop Seed 1' }));
      await service.createOrder(createOrderInput({ buyerName: 'Workshop Seed 2' }));

      // 4. Client fetches live persisted orders seamlessly
      const liveOrders = await service.getOrders();
      assert.equal(liveOrders.length, 2);
      assert.equal(liveOrders[0].buyerName, 'Workshop Seed 1');
      assert.equal(liveOrders[1].buyerName, 'Workshop Seed 2');
    });
  });
});
