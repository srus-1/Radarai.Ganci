import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Order,
  CreateOrderInput,
  DesignFile,
  DashboardMetrics,
  MonthlyProfitData,
  BuyerSummary,
  ProcessStatus,
  PaymentStatus,
} from '@/types/order';
import {
  CapexEntry,
  CreateCapexInput,
  RawMaterialEntry,
  CreateRawMaterialInput,
} from '@/types/capex';
import { calculateHPP, calculateMargin, parseLocalDate, toLocalDateString } from './utils';

// ============================================================================
// Supabase Configuration Status Detection
// ============================================================================

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  reason?: string;
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url || !key) {
    return {
      isConfigured: false,
      reason: 'URL atau Anon Key belum disetel di environment variables.',
    };
  }

  const placeholderTokens = [
    'project-id-kamu',
    'your-project',
    'placeholder',
    'example.com',
    '...',
    '<your-anon-key>',
    '<your-supabase-url>',
  ];

  const hasPlaceholder = placeholderTokens.some(
    (token) => url.toLowerCase().includes(token) || key.toLowerCase().includes(token)
  );

  if (hasPlaceholder) {
    return {
      isConfigured: false,
      reason: 'Environment variables masih menggunakan nilai placeholder.',
    };
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        isConfigured: false,
        reason: 'Protokol URL Supabase harus diawali http:// atau https://.',
      };
    }
  } catch {
    return {
      isConfigured: false,
      reason: 'Format NEXT_PUBLIC_SUPABASE_URL tidak valid.',
    };
  }

  if (key.length < 20) {
    return {
      isConfigured: false,
      reason: 'NEXT_PUBLIC_SUPABASE_ANON_KEY tampak tidak valid atau terlalu pendek.',
    };
  }

  return { isConfigured: true };
}

export const isSupabaseConfigured = getSupabaseConfigStatus().isConfigured;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      (
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      )!.trim()
    )
  : null;

// ============================================================================
// Database Row Mapping Types (PostgreSQL snake_case <-> TypeScript camelCase)
// ============================================================================

export interface DbOrderRow {
  id: string;
  order_number: string;
  order_date: string;
  deadline: string | null;
  buyer_name: string;
  buyer_phone: string;
  product_name: string;
  specs: string;
  qty: number;
  price_per_pcs: number | string;
  omzet: number | string;
  hpp_bahan_baku: number | string;
  hpp_tinta_sablon: number | string;
  hpp_tenaga_kerja: number | string;
  hpp_kemasan: number | string;
  hpp_overhead: number | string;
  total_hpp_per_pcs: number | string;
  total_hpp: number | string;
  profit: number | string;
  margin_pct: number | string;
  payment_status: PaymentStatus;
  dp_amount: number | string;
  remaining_payment: number | string;
  process_status: ProcessStatus;
  queue_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_design_files?: DbDesignFileRow[];
  design_files?: DbDesignFileRow[];
}

export interface DbDesignFileRow {
  id: string;
  order_id: string;
  file_name: string;
  file_size: number | string;
  file_type: string;
  file_url: string;
  thumbnail_url: string | null;
  is_ready_to_print: boolean;
  uploaded_at: string;
}

export function mapDbDesignFileToDomain(row: DbDesignFileRow): DesignFile {
  return {
    id: row.id,
    orderId: row.order_id,
    fileName: row.file_name,
    fileSize: Number(row.file_size) || 0,
    fileType: row.file_type,
    fileUrl: row.file_url,
    thumbnailUrl: row.thumbnail_url || undefined,
    isReadyToPrint: Boolean(row.is_ready_to_print),
    uploadedAt: row.uploaded_at,
  };
}

export function mapDbOrderToDomain(row: DbOrderRow): Order {
  const rawFiles = row.order_design_files || row.design_files || [];
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    deadline: row.deadline || undefined,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone,
    productName: row.product_name,
    specs: row.specs || '',
    qty: Number(row.qty) || 0,
    pricePerPcs: Number(row.price_per_pcs) || 0,
    omzet: Number(row.omzet) || 0,
    hppBreakdown: {
      bahanBaku: Number(row.hpp_bahan_baku) || 0,
      tintaSablon: Number(row.hpp_tinta_sablon) || 0,
      tenagaKerja: Number(row.hpp_tenaga_kerja) || 0,
      kemasan: Number(row.hpp_kemasan) || 0,
      overhead: Number(row.hpp_overhead) || 0,
      totalHppPerPcs: Number(row.total_hpp_per_pcs) || 0,
      totalHpp: Number(row.total_hpp) || 0,
    },
    profit: Number(row.profit) || 0,
    marginPct: Number(row.margin_pct) || 0,
    paymentStatus: row.payment_status,
    dpAmount: Number(row.dp_amount) || 0,
    remainingPayment: Number(row.remaining_payment) || 0,
    processStatus: row.process_status,
    queueOrder: Number(row.queue_order) || 0,
    designFiles: rawFiles.map(mapDbDesignFileToDomain),
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Authentic Supabase Order Service
// ============================================================================

export const orderService = {
  /**
   * Fetches all production orders sorted by queue order.
   * Returns empty array `[]` cleanly when unconfigured or on error.
   */
  async getOrders(): Promise<Order[]> {
    if (!supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_design_files(*)')
        .order('queue_order', { ascending: true });

      if (error) {
        console.error('Error fetching orders from Supabase:', error);
        return [];
      }

      return (data as DbOrderRow[]).map(mapDbOrderToDomain);
    } catch (err) {
      console.error('Unexpected error fetching orders:', err);
      return [];
    }
  },

  /**
   * Fetches production orders and surfaces real query/network errors cleanly for UI retry states.
   */
  async getOrdersWithStatus(): Promise<{ orders: Order[]; error: string | null }> {
    if (!supabase) {
      return { orders: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_design_files(*)')
        .order('queue_order', { ascending: true });

      if (error) {
        console.error('Error fetching orders from Supabase:', error);
        return {
          orders: [],
          error: error.message || 'Gagal memuat pesanan dari database.',
        };
      }

      return {
        orders: (data as DbOrderRow[]).map(mapDbOrderToDomain),
        error: null,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Koneksi ke Supabase terganggu.';
      console.error('Unexpected error fetching orders:', err);
      return { orders: [], error: message };
    }
  },

  /**
   * Fetches a single order by ID with design files attached.
   */
  async getOrderById(id: string): Promise<Order | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_design_files(*)')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        if (error) console.error('Error fetching order by ID:', error);
        return null;
      }

      return mapDbOrderToDomain(data as DbOrderRow);
    } catch (err) {
      console.error('Unexpected error in getOrderById:', err);
      return null;
    }
  },

  /**
   * Creates a new production order with automatic code generation, HPP, and profit margins.
   */
  async createOrder(newOrderData: CreateOrderInput): Promise<Order> {
    const safeQty = Math.max(1, newOrderData.qty || 1);
    const safePrice = Math.max(0, newOrderData.pricePerPcs || 0);
    const calculatedHpp = calculateHPP(newOrderData.hppBreakdown, safeQty);
    const omzet = safeQty * safePrice;
    const { profit, marginPct } = calculateMargin(omzet, calculatedHpp.totalHpp);

    let dpAmount = newOrderData.dpAmount || 0;
    let remainingPayment = 0;
    if (newOrderData.paymentStatus === 'LUNAS') {
      dpAmount = omzet;
      remainingPayment = 0;
    } else if (newOrderData.paymentStatus === 'DP') {
      remainingPayment = Math.max(0, omzet - dpAmount);
    } else {
      dpAmount = 0;
      remainingPayment = omzet;
    }

    const now = new Date();
    const orderDate = newOrderData.orderDate || toLocalDateString(now);
    const year = now.getFullYear();
    const shortYear = String(year).slice(-2);
    const prefix = `MF${shortYear}`;

    if (!supabase) {
      // Degraded in-memory fallback object
      const fallbackOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: `${prefix}${String(Math.floor(Math.random() * 900) + 100)}`,
        orderDate,
        deadline: newOrderData.deadline,
        buyerName: newOrderData.buyerName,
        buyerPhone: newOrderData.buyerPhone,
        productName: newOrderData.productName,
        specs: newOrderData.specs || '',
        qty: safeQty,
        pricePerPcs: safePrice,
        omzet,
        hppBreakdown: calculatedHpp,
        profit,
        marginPct,
        paymentStatus: newOrderData.paymentStatus,
        dpAmount,
        remainingPayment,
        processStatus: newOrderData.processStatus,
        queueOrder: 1,
        designFiles: [],
        notes: newOrderData.notes,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      return fallbackOrder;
    }

    // Determine next unique order number (max sequence + 1) and queue order
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('order_number, queue_order');

    let maxSeq = 0;
    let maxQueue = 0;
    const existingNumbers = new Set<string>();

    (existingOrders || []).forEach(
      (row: { order_number?: string; queue_order?: number }) => {
        if (row.order_number) {
          existingNumbers.add(row.order_number);
          let seqPart = '';
          if (row.order_number.startsWith(prefix)) {
            seqPart = row.order_number.slice(prefix.length);
          } else if (row.order_number.startsWith(`MF${year}`)) {
            seqPart = row.order_number.slice(`MF${year}`.length);
          } else if (row.order_number.includes('-')) {
            seqPart = row.order_number.split('-').pop() || '';
          }
          const num = parseInt(seqPart, 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
        const q = Number(row.queue_order) || 0;
        if (q > maxQueue) {
          maxQueue = q;
        }
      }
    );

    let nextSeq = maxSeq + 1;
    let orderNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    while (existingNumbers.has(orderNumber)) {
      nextSeq++;
      orderNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    }
    const queueOrder = maxQueue + 1;

    const dbPayload = {
      order_number: orderNumber,
      order_date: orderDate,
      deadline: newOrderData.deadline ?? null,
      buyer_name: newOrderData.buyerName,
      buyer_phone: newOrderData.buyerPhone,
      product_name: newOrderData.productName,
      specs: newOrderData.specs || '',
      qty: safeQty,
      price_per_pcs: safePrice,
      omzet,
      hpp_bahan_baku: calculatedHpp.bahanBaku,
      hpp_tinta_sablon: calculatedHpp.tintaSablon,
      hpp_tenaga_kerja: calculatedHpp.tenagaKerja,
      hpp_kemasan: calculatedHpp.kemasan,
      hpp_overhead: calculatedHpp.overhead,
      total_hpp_per_pcs: calculatedHpp.totalHppPerPcs,
      total_hpp: calculatedHpp.totalHpp,
      profit,
      margin_pct: marginPct,
      payment_status: newOrderData.paymentStatus,
      dp_amount: dpAmount,
      remaining_payment: remainingPayment,
      process_status: newOrderData.processStatus,
      queue_order: queueOrder,
      notes: newOrderData.notes || null,
    };

    let { data, error } = await supabase
      .from('orders')
      .insert(dbPayload)
      .select('*, order_design_files(*)')
      .single();

    // Compatibility fallback if live DB has not yet applied DROP NOT NULL on deadline
    if (
      error &&
      dbPayload.deadline === null &&
      (error.code === '23502' || /deadline/i.test(`${error.message || ''} ${error.details || ''}`))
    ) {
      const retry = await supabase
        .from('orders')
        .insert({ ...dbPayload, deadline: orderDate })
        .select('*, order_design_files(*)')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Error inserting order into Supabase:', error);
      throw error;
    }

    return mapDbOrderToDomain(data as DbOrderRow);
  },

  /**
   * Updates an existing order, recalculating financials if quantity, price, or HPP changed.
   */
  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    if (!supabase) return null;

    const existing = await this.getOrderById(id);
    if (!existing) return null;

    const qty = updates.qty !== undefined ? updates.qty : existing.qty;
    const pricePerPcs =
      updates.pricePerPcs !== undefined ? updates.pricePerPcs : existing.pricePerPcs;
    const omzet = qty * pricePerPcs;

    let hppBreakdown = existing.hppBreakdown;
    if (updates.hppBreakdown) {
      hppBreakdown = calculateHPP(updates.hppBreakdown, qty);
    } else if (updates.qty !== undefined) {
      hppBreakdown = calculateHPP(existing.hppBreakdown, qty);
    }

    const { profit, marginPct } = calculateMargin(omzet, hppBreakdown.totalHpp);
    const paymentStatus = updates.paymentStatus || existing.paymentStatus;
    let dpAmount =
      updates.dpAmount !== undefined ? updates.dpAmount : existing.dpAmount;
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

    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      qty,
      price_per_pcs: pricePerPcs,
      omzet,
      hpp_bahan_baku: hppBreakdown.bahanBaku,
      hpp_tinta_sablon: hppBreakdown.tintaSablon,
      hpp_tenaga_kerja: hppBreakdown.tenagaKerja,
      hpp_kemasan: hppBreakdown.kemasan,
      hpp_overhead: hppBreakdown.overhead,
      total_hpp_per_pcs: hppBreakdown.totalHppPerPcs,
      total_hpp: hppBreakdown.totalHpp,
      profit,
      margin_pct: marginPct,
      payment_status: paymentStatus,
      dp_amount: dpAmount,
      remaining_payment: remainingPayment,
    };

    if (updates.buyerName !== undefined) dbUpdates.buyer_name = updates.buyerName;
    if (updates.buyerPhone !== undefined) dbUpdates.buyer_phone = updates.buyerPhone;
    if (updates.productName !== undefined) dbUpdates.product_name = updates.productName;
    if (updates.specs !== undefined) dbUpdates.specs = updates.specs;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
    if (updates.orderDate !== undefined) dbUpdates.order_date = updates.orderDate;
    if (updates.processStatus !== undefined) dbUpdates.process_status = updates.processStatus;
    if (updates.queueOrder !== undefined) dbUpdates.queue_order = updates.queueOrder;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { data, error } = await supabase
      .from('orders')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, order_design_files(*)')
      .single();

    if (error) {
      console.error('Error updating order in Supabase:', error);
      throw error;
    }

    return mapDbOrderToDomain(data as DbOrderRow);
  },

  /**
   * Deletes an order; attached design files are deleted via CASCADE in DB.
   */
  async deleteOrder(id: string): Promise<boolean> {
    if (!supabase) return true;

    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      console.error('Error deleting order in Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Updates queue_order sequence for drag & drop priority queue.
   */
  async reorderOrders(orderedIds: string[]): Promise<void> {
    if (!supabase) return;

    await Promise.all(
      orderedIds.map((id, index) =>
        supabase!
          .from('orders')
          .update({ queue_order: index + 1 })
          .eq('id', id)
      )
    );
  },

  /**
   * Reorder alias for backward compatibility.
   */
  async reorderQueue(orderedIds: string[]): Promise<void> {
    return this.reorderOrders(orderedIds);
  },

  /**
   * Uploads artwork file to Supabase Storage and records metadata in database.
   */
  async uploadDesignFile(orderId: string, file: File): Promise<DesignFile> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `orders/${orderId}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('design-files')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.error('Error uploading to Supabase Storage:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('design-files')
      .getPublicUrl(storagePath);

    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext);

    const designFileRecord = {
      order_id: orderId,
      file_name: file.name,
      file_size: file.size,
      file_type: ext,
      file_url: urlData.publicUrl,
      thumbnail_url: isImage ? urlData.publicUrl : null,
      is_ready_to_print: false,
    };

    const { data, error: dbError } = await supabase
      .from('order_design_files')
      .insert(designFileRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Error inserting design file record:', dbError);
      throw dbError;
    }

    return mapDbDesignFileToDomain(data as DbDesignFileRow);
  },

  /**
   * Directly attaches an already constructed DesignFile record into database.
   */
  async addDesignFile(orderId: string, file: DesignFile): Promise<DesignFile> {
    if (!supabase) return file;

    const { data, error } = await supabase
      .from('order_design_files')
      .insert({
        id: file.id,
        order_id: orderId,
        file_name: file.fileName,
        file_size: file.fileSize,
        file_type: file.fileType,
        file_url: file.fileUrl,
        thumbnail_url: file.thumbnailUrl || null,
        is_ready_to_print: file.isReadyToPrint,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding design file:', error);
      throw error;
    }

    return mapDbDesignFileToDomain(data as DbDesignFileRow);
  },

  /**
   * Toggles operator print-readiness flag for an artwork file.
   */
  async toggleDesignReady(orderId: string, fileId: string, isReady?: boolean): Promise<boolean> {
    if (!supabase) return true;

    let targetReady = isReady;
    if (targetReady === undefined) {
      const { data } = await supabase
        .from('order_design_files')
        .select('is_ready_to_print')
        .eq('id', fileId)
        .maybeSingle();

      targetReady = !(data?.is_ready_to_print);
    }

    const { error } = await supabase
      .from('order_design_files')
      .update({ is_ready_to_print: targetReady })
      .eq('id', fileId);

    if (error) {
      console.error('Error toggling design ready status:', error);
      throw error;
    }

    return true;
  },

  /**
   * Deletes artwork file record from database and cleans up Supabase storage.
   */
  async deleteDesignFile(orderId: string, fileId: string): Promise<boolean> {
    if (!supabase) return true;

    const { data: fileRecord } = await supabase
      .from('order_design_files')
      .select('file_url')
      .eq('id', fileId)
      .maybeSingle();

    if (fileRecord?.file_url) {
      try {
        const urlParts = fileRecord.file_url.split('/design-files/');
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('design-files').remove([filePath]);
        }
      } catch (storageErr) {
        console.warn('Could not remove file from storage bucket:', storageErr);
      }
    }

    const { error } = await supabase
      .from('order_design_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      console.error('Error deleting design file record:', error);
      throw error;
    }

    return true;
  },

  // ============================================================================
  // Pure Analytical Financial Metrics (Deterministic In-Memory Computations)
  // ============================================================================

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
      totalOmzet > 0
        ? Math.round(((totalProfit / totalOmzet) * 100) * 10) / 10
        : 0;

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
  },

  getMonthlyProfitData(orders: Order[]): MonthlyProfitData[] {
    const monthMap = new Map<
      string,
      { omzet: number; hpp: number; profit: number; pcs: number; label: string }
    >();

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];

    orders.forEach((o) => {
      const date = parseLocalDate(o.orderDate || o.createdAt);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      const curr = monthMap.get(key) || {
        omzet: 0,
        hpp: 0,
        profit: 0,
        pcs: 0,
        label,
      };
      curr.omzet += o.omzet;
      curr.hpp += o.hppBreakdown.totalHpp;
      curr.profit += o.profit;
      curr.pcs += o.qty;
      monthMap.set(key, curr);
    });

    const result: MonthlyProfitData[] = [];
    const sortedKeys = Array.from(monthMap.keys()).sort();

    sortedKeys.forEach((key) => {
      const val = monthMap.get(key)!;
      const marginPct =
        val.omzet > 0
          ? Math.round(((val.profit / val.omzet) * 100) * 10) / 10
          : 0;

      result.push({
        month: key,
        monthLabel: val.label,
        omzet: val.omzet,
        hpp: val.hpp,
        profit: val.profit,
        marginPct,
        pcs: val.pcs,
      });
    });

    return result;
  },

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
        b.totalOmzet > 0
          ? Math.round(((b.totalProfit / b.totalOmzet) * 100) * 10) / 10
          : 0;
      return {
        ...b,
        marginPct,
      };
    });

    list.sort((a, b) => b.totalProfit - a.totalProfit);

    return list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  },
};

// ============================================================================
// Capex & Raw Materials Row Mapping
// ============================================================================

export interface DbCapexRow {
  id: string;
  item_name: string;
  category: string;
  amount: number | string;
  entry_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDbCapexToDomain(row: DbCapexRow): CapexEntry {
  return {
    id: row.id,
    itemName: row.item_name,
    category: row.category,
    amount: Number(row.amount) || 0,
    entryDate: row.entry_date,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface DbRawMaterialRow {
  id: string;
  material_name: string;
  category: string;
  supplier: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  total_amount: number | string;
  entry_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDbRawMaterialToDomain(row: DbRawMaterialRow): RawMaterialEntry {
  const qty = Number(row.quantity) || 0;
  return {
    id: row.id,
    materialName: row.material_name,
    category: row.category,
    supplier: row.supplier,
    quantity: qty,
    qty: qty,
    unit: row.unit,
    unitPrice: Number(row.unit_price) || 0,
    totalAmount: Number(row.total_amount) || 0,
    entryDate: row.entry_date,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Capex & Raw Materials In-Memory Stores (Fallback when !supabase, zero storage usage)
// ============================================================================

let inMemoryCapexEntries: CapexEntry[] = [
  {
    id: 'cpx-1',
    itemName: 'Mesin Laser Cutting Acrylic 60W',
    category: 'Mesin & Peralatan',
    amount: 18500000,
    entryDate: '2026-10-02',
    description: 'Mesin potong akrilik workshop utama',
    createdAt: '2026-10-02T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
  },
  {
    id: 'cpx-2',
    itemName: 'Komputer Desain Corel & Mockup',
    category: 'Elektronik & IT',
    amount: 8200000,
    entryDate: '2026-10-08',
    description: 'PC operasional setting desain',
    createdAt: '2026-10-08T09:30:00.000Z',
    updatedAt: '2026-10-08T09:30:00.000Z',
  },
  {
    id: 'cpx-3',
    itemName: 'Rak Pengering Sablon 50 Susun',
    category: 'Perlengkapan Workshop',
    amount: 2400000,
    entryDate: '2026-09-15',
    description: 'Rak pengering hasil cetak sablon',
    createdAt: '2026-09-15T11:00:00.000Z',
    updatedAt: '2026-09-15T11:00:00.000Z',
  },
  {
    id: 'cpx-4',
    itemName: 'Mesin Press Heat & Laminasi 38x38',
    category: 'Mesin & Peralatan',
    amount: 3750000,
    entryDate: '2026-08-20',
    description: 'Alat press gantungan kunci double sided',
    createdAt: '2026-08-20T14:15:00.000Z',
    updatedAt: '2026-08-20T14:15:00.000Z',
  },
];

let inMemoryRawMaterialEntries: RawMaterialEntry[] = [
  {
    id: 'mat-1',
    materialName: 'Lembaran Akrilik Bening 3mm (122x244cm)',
    category: 'Akrilik & Aksesoris',
    supplier: 'CV Akrilik Sentosa',
    quantity: 10,
    qty: 10,
    unit: 'lembar',
    unitPrice: 380000,
    totalAmount: 3800000,
    entryDate: '2026-10-04',
    notes: 'Bahan dasar gantungan kunci standard',
    createdAt: '2026-10-04T07:30:00.000Z',
    updatedAt: '2026-10-04T07:30:00.000Z',
  },
  {
    id: 'mat-2',
    materialName: 'Ring Gantungan Kunci Putar + Rantai',
    category: 'Akrilik & Aksesoris',
    supplier: 'Toko Aksesoris Jaya',
    quantity: 2000,
    qty: 2000,
    unit: 'pcs',
    unitPrice: 450,
    totalAmount: 900000,
    entryDate: '2026-10-06',
    notes: 'Gantungan kunci ring silver',
    createdAt: '2026-10-06T10:00:00.000Z',
    updatedAt: '2026-10-06T10:00:00.000Z',
  },
  {
    id: 'mat-3',
    materialName: 'Tinta Sablon Plastisol Super White 1kg',
    category: 'Tinta & Sablon',
    supplier: 'Multi Screen Printing',
    quantity: 4,
    qty: 4,
    unit: 'kg',
    unitPrice: 175000,
    totalAmount: 700000,
    entryDate: '2026-10-12',
    notes: 'Tinta sablon dasar putih',
    createdAt: '2026-10-12T13:45:00.000Z',
    updatedAt: '2026-10-12T13:45:00.000Z',
  },
  {
    id: 'mat-4',
    materialName: 'Plastik OPP Seal 6x10cm + Hang Tag',
    category: 'Kemasan & Packaging',
    supplier: 'Mitra Packindo',
    quantity: 3000,
    qty: 3000,
    unit: 'pcs',
    unitPrice: 120,
    totalAmount: 360000,
    entryDate: '2026-09-18',
    notes: 'Kemasan plastik satuan souvenir',
    createdAt: '2026-09-18T09:00:00.000Z',
    updatedAt: '2026-09-18T09:00:00.000Z',
  },
  {
    id: 'mat-5',
    materialName: 'Mata Pisau Cutter Akrilik Olfa P-800',
    category: 'Sparepart & Consumable',
    supplier: 'Teknik Prima Tools',
    quantity: 5,
    qty: 5,
    unit: 'pack',
    unitPrice: 85000,
    totalAmount: 425000,
    entryDate: '2026-08-25',
    notes: 'Mata pisau potong cadangan',
    createdAt: '2026-08-25T15:20:00.000Z',
    updatedAt: '2026-08-25T15:20:00.000Z',
  },
];

// ============================================================================
// Authentic Supabase Capex Service
// ============================================================================

export const capexService = {
  /**
   * Fetches all capital expenditure records sorted by entry_date descending.
   * Returns in-memory fallback when unconfigured or on error.
   */
  async getCapexEntries(): Promise<CapexEntry[]> {
    if (!supabase) {
      return [...inMemoryCapexEntries];
    }

    try {
      const { data, error } = await supabase
        .from('capex_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase capex_entries fallback to in-memory:', error.message || error);
        return [...inMemoryCapexEntries];
      }

      return (data as DbCapexRow[]).map(mapDbCapexToDomain);
    } catch (err) {
      console.warn('Unexpected error fetching capex entries (using in-memory fallback):', err);
      return [...inMemoryCapexEntries];
    }
  },

  /**
   * Creates a new capital expenditure record.
   */
  async createCapexEntry(input: CreateCapexInput): Promise<CapexEntry> {
    const nowIso = new Date().toISOString();
    const safeAmount = Math.max(0, Number(input.amount) || 0);

    if (!supabase) {
      const newEntry: CapexEntry = {
        id: `cpx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        itemName: input.itemName.trim(),
        category: input.category,
        amount: safeAmount,
        entryDate: input.entryDate || nowIso.split('T')[0],
        description: input.description?.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      inMemoryCapexEntries = [newEntry, ...inMemoryCapexEntries];
      return newEntry;
    }

    try {
      const payload = {
        item_name: input.itemName.trim(),
        category: input.category,
        amount: safeAmount,
        entry_date: input.entryDate || nowIso.split('T')[0],
        description: input.description?.trim() || null,
      };

      const { data, error } = await supabase
        .from('capex_entries')
        .insert(payload)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Gagal menyimpan data capex');
      }

      return mapDbCapexToDomain(data as DbCapexRow);
    } catch (err) {
      console.warn('Supabase createCapexEntry fallback to in-memory:', err);
      const fallbackEntry: CapexEntry = {
        id: `cpx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        itemName: input.itemName.trim(),
        category: input.category,
        amount: safeAmount,
        entryDate: input.entryDate || nowIso.split('T')[0],
        description: input.description?.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      inMemoryCapexEntries = [fallbackEntry, ...inMemoryCapexEntries];
      return fallbackEntry;
    }
  },

  /**
   * Updates an existing capital expenditure record.
   */
  async updateCapexEntry(
    id: string,
    updates: Partial<CreateCapexInput>
  ): Promise<CapexEntry | null> {
    const nowIso = new Date().toISOString();

    if (!supabase) {
      const index = inMemoryCapexEntries.findIndex((e) => e.id === id);
      if (index === -1) return null;

      const current = inMemoryCapexEntries[index];
      const updated: CapexEntry = {
        ...current,
        ...(updates.itemName !== undefined && { itemName: updates.itemName.trim() }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.amount !== undefined && { amount: Math.max(0, Number(updates.amount) || 0) }),
        ...(updates.entryDate !== undefined && { entryDate: updates.entryDate }),
        ...(updates.description !== undefined && { description: updates.description.trim() || undefined }),
        updatedAt: nowIso,
      };
      inMemoryCapexEntries[index] = updated;
      return updated;
    }

    try {
      const payload: Record<string, unknown> = {
        updated_at: nowIso,
      };
      if (updates.itemName !== undefined) payload.item_name = updates.itemName.trim();
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.amount !== undefined) payload.amount = Math.max(0, Number(updates.amount) || 0);
      if (updates.entryDate !== undefined) payload.entry_date = updates.entryDate;
      if (updates.description !== undefined) payload.description = updates.description.trim() || null;

      const { data, error } = await supabase
        .from('capex_entries')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Gagal memperbarui data capex');
      }

      return mapDbCapexToDomain(data as DbCapexRow);
    } catch (err) {
      console.warn('Supabase updateCapexEntry fallback to in-memory:', err);
      const index = inMemoryCapexEntries.findIndex((e) => e.id === id);
      if (index === -1) return null;
      const current = inMemoryCapexEntries[index];
      const updated: CapexEntry = {
        ...current,
        ...(updates.itemName !== undefined && { itemName: updates.itemName.trim() }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.amount !== undefined && { amount: Math.max(0, Number(updates.amount) || 0) }),
        ...(updates.entryDate !== undefined && { entryDate: updates.entryDate }),
        ...(updates.description !== undefined && { description: updates.description.trim() || undefined }),
        updatedAt: nowIso,
      };
      inMemoryCapexEntries[index] = updated;
      return updated;
    }
  },

  /**
   * Deletes a capital expenditure record.
   */
  async deleteCapexEntry(id: string): Promise<boolean> {
    if (!supabase) {
      inMemoryCapexEntries = inMemoryCapexEntries.filter((e) => e.id !== id);
      return true;
    }

    try {
      const { error } = await supabase
        .from('capex_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase deleteCapexEntry fallback to in-memory:', error.message || error);
        inMemoryCapexEntries = inMemoryCapexEntries.filter((e) => e.id !== id);
        return true;
      }
      return true;
    } catch (err) {
      console.warn('Unexpected error deleting capex entry (using in-memory fallback):', err);
      inMemoryCapexEntries = inMemoryCapexEntries.filter((e) => e.id !== id);
      return true;
    }
  },
};

// ============================================================================
// Authentic Supabase Raw Material Service
// ============================================================================

export const rawMaterialService = {
  /**
   * Fetches all recurring raw material purchase records sorted by entry_date descending.
   * Returns in-memory fallback when unconfigured or on error.
   */
  async getRawMaterialEntries(): Promise<RawMaterialEntry[]> {
    if (!supabase) {
      return [...inMemoryRawMaterialEntries];
    }

    try {
      const { data, error } = await supabase
        .from('raw_material_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase raw_material_entries fallback to in-memory:', error.message || error);
        return [...inMemoryRawMaterialEntries];
      }

      return (data as DbRawMaterialRow[]).map(mapDbRawMaterialToDomain);
    } catch (err) {
      console.warn('Unexpected error fetching raw material entries (using in-memory fallback):', err);
      return [...inMemoryRawMaterialEntries];
    }
  },

  /**
   * Creates a new recurring raw material purchase record.
   * Automatically calculates totalAmount = quantity * unitPrice.
   */
  async createRawMaterialEntry(input: CreateRawMaterialInput): Promise<RawMaterialEntry> {
    const nowIso = new Date().toISOString();
    const safeQty = Math.max(0.01, Number(input.quantity ?? input.qty) || 1);
    const safeUnitPrice = Math.max(0, Number(input.unitPrice) || 0);
    const calculatedTotal = input.totalAmount !== undefined
      ? Math.max(0, Number(input.totalAmount) || 0)
      : Math.round(safeQty * safeUnitPrice);

    if (!supabase) {
      const newEntry: RawMaterialEntry = {
        id: `mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        materialName: input.materialName.trim(),
        category: input.category,
        supplier: input.supplier.trim(),
        quantity: safeQty,
        qty: safeQty,
        unit: input.unit.trim() || 'pcs',
        unitPrice: safeUnitPrice,
        totalAmount: calculatedTotal,
        entryDate: input.entryDate || nowIso.split('T')[0],
        notes: input.notes?.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      inMemoryRawMaterialEntries = [newEntry, ...inMemoryRawMaterialEntries];
      return newEntry;
    }

    try {
      const payload = {
        material_name: input.materialName.trim(),
        category: input.category,
        supplier: input.supplier.trim(),
        quantity: safeQty,
        unit: input.unit.trim() || 'pcs',
        unit_price: safeUnitPrice,
        total_amount: calculatedTotal,
        entry_date: input.entryDate || nowIso.split('T')[0],
        notes: input.notes?.trim() || null,
      };

      const { data, error } = await supabase
        .from('raw_material_entries')
        .insert(payload)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Gagal menyimpan data bahan baku');
      }

      return mapDbRawMaterialToDomain(data as DbRawMaterialRow);
    } catch (err) {
      console.warn('Supabase createRawMaterialEntry fallback to in-memory:', err);
      const fallbackEntry: RawMaterialEntry = {
        id: `mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        materialName: input.materialName.trim(),
        category: input.category,
        supplier: input.supplier.trim(),
        quantity: safeQty,
        qty: safeQty,
        unit: input.unit.trim() || 'pcs',
        unitPrice: safeUnitPrice,
        totalAmount: calculatedTotal,
        entryDate: input.entryDate || nowIso.split('T')[0],
        notes: input.notes?.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      inMemoryRawMaterialEntries = [fallbackEntry, ...inMemoryRawMaterialEntries];
      return fallbackEntry;
    }
  },

  /**
   * Updates an existing recurring raw material purchase record.
   * Recalculates totalAmount if quantity or unitPrice is updated.
   */
  async updateRawMaterialEntry(
    id: string,
    updates: Partial<CreateRawMaterialInput>
  ): Promise<RawMaterialEntry | null> {
    const nowIso = new Date().toISOString();

    if (!supabase) {
      const index = inMemoryRawMaterialEntries.findIndex((e) => e.id === id);
      if (index === -1) return null;

      const current = inMemoryRawMaterialEntries[index];
      const newQty = updates.quantity !== undefined
        ? Math.max(0.01, Number(updates.quantity) || 1)
        : current.quantity;
      const newUnitPrice = updates.unitPrice !== undefined
        ? Math.max(0, Number(updates.unitPrice) || 0)
        : current.unitPrice;
      const newTotal = updates.totalAmount !== undefined
        ? Math.max(0, Number(updates.totalAmount) || 0)
        : (updates.quantity !== undefined || updates.unitPrice !== undefined)
          ? Math.round(newQty * newUnitPrice)
          : current.totalAmount;

      const updated: RawMaterialEntry = {
        ...current,
        ...(updates.materialName !== undefined && { materialName: updates.materialName.trim() }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.supplier !== undefined && { supplier: updates.supplier.trim() }),
        quantity: newQty,
        qty: newQty,
        ...(updates.unit !== undefined && { unit: updates.unit.trim() || 'pcs' }),
        unitPrice: newUnitPrice,
        totalAmount: newTotal,
        ...(updates.entryDate !== undefined && { entryDate: updates.entryDate }),
        ...(updates.notes !== undefined && { notes: updates.notes.trim() || undefined }),
        updatedAt: nowIso,
      };
      inMemoryRawMaterialEntries[index] = updated;
      return updated;
    }

    try {
      const { data: existingData } = await supabase
        .from('raw_material_entries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const curQty = existingData ? Number(existingData.quantity) || 1 : 1;
      const curPrice = existingData ? Number(existingData.unit_price) || 0 : 0;
      const newQty = updates.quantity !== undefined ? Math.max(0.01, Number(updates.quantity) || 1) : curQty;
      const newUnitPrice = updates.unitPrice !== undefined ? Math.max(0, Number(updates.unitPrice) || 0) : curPrice;
      const newTotal = updates.totalAmount !== undefined
        ? Math.max(0, Number(updates.totalAmount) || 0)
        : (updates.quantity !== undefined || updates.unitPrice !== undefined)
          ? Math.round(newQty * newUnitPrice)
          : (existingData ? Number(existingData.total_amount) || 0 : 0);

      const payload: Record<string, unknown> = {
        updated_at: nowIso,
      };
      if (updates.materialName !== undefined) payload.material_name = updates.materialName.trim();
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.supplier !== undefined) payload.supplier = updates.supplier.trim();
      if (updates.quantity !== undefined) payload.quantity = newQty;
      if (updates.unit !== undefined) payload.unit = updates.unit.trim() || 'pcs';
      if (updates.unitPrice !== undefined) payload.unit_price = newUnitPrice;
      payload.total_amount = newTotal;
      if (updates.entryDate !== undefined) payload.entry_date = updates.entryDate;
      if (updates.notes !== undefined) payload.notes = updates.notes.trim() || null;

      const { data, error } = await supabase
        .from('raw_material_entries')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Gagal memperbarui data bahan baku');
      }

      return mapDbRawMaterialToDomain(data as DbRawMaterialRow);
    } catch (err) {
      console.warn('Supabase updateRawMaterialEntry fallback to in-memory:', err);
      const index = inMemoryRawMaterialEntries.findIndex((e) => e.id === id);
      if (index === -1) return null;

      const current = inMemoryRawMaterialEntries[index];
      const newQty = updates.quantity !== undefined
        ? Math.max(0.01, Number(updates.quantity) || 1)
        : current.quantity;
      const newUnitPrice = updates.unitPrice !== undefined
        ? Math.max(0, Number(updates.unitPrice) || 0)
        : current.unitPrice;
      const newTotal = updates.totalAmount !== undefined
        ? Math.max(0, Number(updates.totalAmount) || 0)
        : (updates.quantity !== undefined || updates.unitPrice !== undefined)
          ? Math.round(newQty * newUnitPrice)
          : current.totalAmount;

      const updated: RawMaterialEntry = {
        ...current,
        ...(updates.materialName !== undefined && { materialName: updates.materialName.trim() }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.supplier !== undefined && { supplier: updates.supplier.trim() }),
        quantity: newQty,
        qty: newQty,
        ...(updates.unit !== undefined && { unit: updates.unit.trim() || 'pcs' }),
        unitPrice: newUnitPrice,
        totalAmount: newTotal,
        ...(updates.entryDate !== undefined && { entryDate: updates.entryDate }),
        ...(updates.notes !== undefined && { notes: updates.notes.trim() || undefined }),
        updatedAt: nowIso,
      };
      inMemoryRawMaterialEntries[index] = updated;
      return updated;
    }
  },

  /**
   * Deletes a recurring raw material purchase record.
   */
  async deleteRawMaterialEntry(id: string): Promise<boolean> {
    if (!supabase) {
      inMemoryRawMaterialEntries = inMemoryRawMaterialEntries.filter((e) => e.id !== id);
      return true;
    }

    try {
      const { error } = await supabase
        .from('raw_material_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase deleteRawMaterialEntry fallback to in-memory:', error.message || error);
        inMemoryRawMaterialEntries = inMemoryRawMaterialEntries.filter((e) => e.id !== id);
        return true;
      }
      return true;
    } catch (err) {
      console.warn('Unexpected error deleting raw material entry (using in-memory fallback):', err);
      inMemoryRawMaterialEntries = inMemoryRawMaterialEntries.filter((e) => e.id !== id);
      return true;
    }
  },
};

