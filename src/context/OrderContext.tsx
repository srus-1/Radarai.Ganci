'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

const subscribeNoop = () => () => {};
const getClientCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const getServerCurrentMonth = () => '';
import {
  Order,
  CreateOrderInput,
  DesignFile,
  FilterTab,
  DashboardMetrics,
  MonthlyProfitData,
  BuyerSummary,
  ProcessStatus,
  PaymentStatus,
} from '@/types/order';
import {
  orderService,
  isSupabaseConfigured,
  getSupabaseConfigStatus,
} from '@/lib/supabase';
import { calculateHPP, calculateMargin, toLocalDateString } from '@/lib/utils';


/**
 * Timezone-safe month extraction helper using string slicing (YYYY-MM).
 * Avoids UTC date drift inherent in `new Date(dateStr).getMonth()`.
 */
export function getOrderMonth(
  orderOrDate?: { orderDate?: string; createdAt?: string } | string | null
): string {
  if (!orderOrDate) return '';
  const raw =
    typeof orderOrDate === 'string'
      ? orderOrDate.trim()
      : (orderOrDate.orderDate || orderOrDate.createdAt || '').trim();

  if (!raw) return '';
  if (raw.length >= 7 && /^\d{4}-\d{2}/.test(raw)) {
    return raw.slice(0, 7);
  }
  if (raw.length >= 7 && /^\d{4}\/\d{2}/.test(raw)) {
    return raw.slice(0, 7).replace('/', '-');
  }
  return '';
}

export interface OrderContextType {
  orders: Order[];
  loading: boolean;
  fetchError: string | null;
  refreshOrders: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterTab: FilterTab;
  setFilterTab: (tab: FilterTab) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  isFormModalOpen: boolean;
  setIsFormModalOpen: (open: boolean) => void;
  editingOrder: Order | null;
  setEditingOrder: (order: Order | null) => void;
  openCreateModal: () => void;
  openEditModal: (order: Order) => void;
  activeDrawerOrder: Order | null;
  setActiveDrawerOrder: (order: Order | null) => void;
  lightboxFile: DesignFile | null;
  setLightboxFile: (file: DesignFile | null) => void;
  createOrder: (orderData: CreateOrderInput) => Promise<Order>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<Order | null>;
  deleteOrder: (id: string) => Promise<boolean>;
  softDeleteOrder: (order: Order, undoWindowMs?: number) => () => void;
  bulkDeleteOrders: (ids: string[]) => Promise<boolean>;
  updateProcessStatus: (id: string, status: ProcessStatus) => Promise<void>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  reorderQueue: (orderedIds: string[]) => Promise<void>;
  addDesignFile: (orderId: string, file: DesignFile) => Promise<DesignFile | null>;
  uploadDesignFile: (orderId: string, file: File) => Promise<DesignFile | null>;
  toggleDesignReady: (orderId: string, designId: string) => Promise<boolean>;
  deleteDesignFile: (orderId: string, designId: string) => Promise<boolean>;
  metrics: DashboardMetrics;
  monthlyProfit: MonthlyProfitData[];
  buyerSummaries: BuyerSummary[];
  isConfigured: boolean;
  configReason?: string;
  error: string | null;
  clearError: () => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  selectedOrderIds: string[];
  toggleSelectOrder: (orderId: string) => void;
  selectAllOrders: (orderIds: string[]) => void;
  clearSelectedOrders: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [activeDrawerOrderId, setActiveDrawerOrderId] = useState<string | null>(null);
  const [lightboxFile, setLightboxFile] = useState<DesignFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonthState, setSelectedMonthState] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearError = useCallback(() => setError(null), []);

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month);
  }, []);

  const toggleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  }, []);

  const selectAllOrders = useCallback((orderIds: string[]) => {
    setSelectedOrderIds(Array.from(new Set(orderIds)));
  }, []);

  const clearSelectedOrders = useCallback(() => {
    setSelectedOrderIds([]);
  }, []);

  const configStatus = useMemo(() => {
    if (typeof getSupabaseConfigStatus === 'function') {
      return getSupabaseConfigStatus();
    }
    return {
      isConfigured: Boolean(isSupabaseConfigured),
      reason: isSupabaseConfigured
        ? undefined
        : 'Supabase belum dikonfigurasi di environment variables.',
    };
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!configStatus.isConfigured) {
      setOrders([]);
      setFetchError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const res = await orderService.getOrdersWithStatus();
      if (res.error) {
        setFetchError(res.error);
        setOrders([]);
      } else {
        setOrders(res.orders || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data pesanan.';
      setFetchError(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [configStatus.isConfigured]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialOrders() {
      try {
        if (!configStatus.isConfigured) {
          if (isMounted) {
            setOrders([]);
            setFetchError(null);
            setLoading(false);
          }
          return;
        }

        const res = await orderService.getOrdersWithStatus();
        if (isMounted) {
          if (res.error) {
            setFetchError(res.error);
            setOrders([]);
          } else {
            setFetchError(null);
            setOrders(res.orders || []);
          }
        }
      } catch (err) {
        console.error('Failed to load initial orders:', err);
        if (isMounted) {
          setFetchError(err instanceof Error ? err.message : 'Gagal memuat pesanan.');
          setOrders([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialOrders();

    return () => {
      isMounted = false;
    };
  }, [configStatus.isConfigured]);

  // Derive activeDrawerOrder from orders and activeDrawerOrderId (eliminates react-hooks/set-state-in-effect line 73)
  const activeDrawerOrder = useMemo(() => {
    if (!activeDrawerOrderId) return null;
    return orders.find((o) => o.id === activeDrawerOrderId) ?? null;
  }, [orders, activeDrawerOrderId]);

  const setActiveDrawerOrder = useCallback((order: Order | null) => {
    setActiveDrawerOrderId(order ? order.id : null);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingOrder(null);
    setIsFormModalOpen(true);
  }, []);

  const openEditModal = useCallback((order: Order) => {
    setEditingOrder(order);
    setIsFormModalOpen(true);
  }, []);

  // 1-frame optimistic mutations with automatic rollback on error

  // a) createOrder: optimistic prepend, background commit, rollback on error
  const handleCreateOrder = useCallback(
    async (orderData: CreateOrderInput): Promise<Order> => {
      const previousOrders = orders;
      const now = new Date();
      const safeQty = Math.max(1, orderData.qty || 1);
      const safePrice = Math.max(0, orderData.pricePerPcs || 0);
      const calculatedHpp = calculateHPP(orderData.hppBreakdown, safeQty);
      const omzet = safeQty * safePrice;
      const { profit, marginPct } = calculateMargin(omzet, calculatedHpp.totalHpp);

      let dpAmount = orderData.dpAmount || 0;
      let remainingPayment = 0;
      if (orderData.paymentStatus === 'LUNAS') {
        dpAmount = omzet;
        remainingPayment = 0;
      } else if (orderData.paymentStatus === 'DP') {
        remainingPayment = Math.max(0, omzet - dpAmount);
      } else {
        dpAmount = 0;
        remainingPayment = omzet;
      }

      const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const shortYear = String(now.getFullYear()).slice(-2);
      const optimisticOrder: Order = {
        id: tempId,
        orderNumber: `MF${shortYear}${String(previousOrders.length + 1).padStart(3, '0')}`,
        orderDate: orderData.orderDate || toLocalDateString(now),
        deadline: orderData.deadline,
        buyerName: orderData.buyerName,
        buyerPhone: orderData.buyerPhone,
        productName: orderData.productName,
        specs: orderData.specs || '',
        qty: safeQty,
        pricePerPcs: safePrice,
        omzet,
        hppBreakdown: calculatedHpp,
        profit,
        marginPct,
        paymentStatus: orderData.paymentStatus,
        dpAmount,
        remainingPayment,
        processStatus: orderData.processStatus,
        queueOrder: 1,
        designFiles: orderData.designFiles || [],
        notes: orderData.notes,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      // 1. Frame 0: Immediate optimistic prepend and re-index queue
      setOrders([
        optimisticOrder,
        ...previousOrders.map((o) => ({
          ...o,
          queueOrder: (o.queueOrder || 0) + 1,
        })),
      ]);

      try {
        // 2. Background async commit to Supabase
        const committed = await Promise.resolve(orderService.createOrder(orderData));
        // Reconcile optimistic order with committed remote order
        setOrders((current) =>
          current.map((o) => (o.id === tempId ? committed : o))
        );
        return committed;
      } catch (err: unknown) {
        // 3. Automatic rollback on error
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal membuat pesanan baru.';
        setError(`Gagal membuat pesanan. ${msg}`);
        throw err;
      }
    },
    [orders]
  );

  // b) updateOrder: optimistic update, background commit, rollback on error
  const handleUpdateOrder = useCallback(
    async (id: string, updates: Partial<Order>): Promise<Order | null> => {
      const previousOrders = orders;
      const target = previousOrders.find((o) => o.id === id);
      if (!target) return null;

      const qty = updates.qty !== undefined ? updates.qty : target.qty;
      const pricePerPcs =
        updates.pricePerPcs !== undefined ? updates.pricePerPcs : target.pricePerPcs;
      const omzet = qty * pricePerPcs;

      let hppBreakdown = target.hppBreakdown;
      if (updates.hppBreakdown) {
        hppBreakdown = calculateHPP(updates.hppBreakdown, qty);
      } else if (updates.qty !== undefined) {
        hppBreakdown = calculateHPP(target.hppBreakdown, qty);
      }

      const { profit, marginPct } = calculateMargin(omzet, hppBreakdown.totalHpp);
      const paymentStatus = updates.paymentStatus || target.paymentStatus;
      let dpAmount =
        updates.dpAmount !== undefined ? updates.dpAmount : target.dpAmount;
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

      const optimisticUpdated: Order = {
        ...target,
        ...updates,
        qty,
        pricePerPcs,
        omzet,
        hppBreakdown,
        profit,
        marginPct,
        paymentStatus,
        dpAmount,
        remainingPayment,
        updatedAt: new Date().toISOString(),
      };

      // 1. Frame 0: Synchronous 1-frame state update
      setOrders(previousOrders.map((o) => (o.id === id ? optimisticUpdated : o)));

      try {
        // 2. Background async commit
        const remote = await Promise.resolve(orderService.updateOrder(id, updates));
        if (remote) {
          setOrders((current) =>
            current.map((o) => (o.id === id ? remote : o))
          );
          return remote;
        }
        return optimisticUpdated;
      } catch (err: unknown) {
        // 3. Automatic rollback on error
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal memperbarui pesanan.';
        setError(`Gagal memperbarui pesanan. ${msg}`);
        throw err;
      }
    },
    [orders]
  );

  // c) deleteOrder: optimistic remove, background commit, rollback on error
  const handleDeleteOrder = useCallback(
    async (id: string): Promise<boolean> => {
      const previousOrders = orders;
      if (activeDrawerOrderId === id) {
        setActiveDrawerOrderId(null);
      }
      setSelectedOrderIds((prev) => prev.filter((orderId) => orderId !== id));

      // 1. Frame 0: Synchronous removal
      setOrders(previousOrders.filter((o) => o.id !== id));

      try {
        // 2. Background commit
        const success = await Promise.resolve(orderService.deleteOrder(id));
        return success;
      } catch (err: unknown) {
        // 3. Automatic rollback on error
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal menghapus pesanan.';
        setError(`Gagal menghapus pesanan. ${msg}`);
        throw err;
      }
    },
    [orders, activeDrawerOrderId]
  );

  // Soft delete with 8-second undo grace window before committing DB delete
  const handleSoftDeleteOrder = useCallback(
    (targetOrder: Order, undoWindowMs = 8000): (() => void) => {
      const id = targetOrder.id;
      const existingTimer = pendingDeletesRef.current.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        pendingDeletesRef.current.delete(id);
      }

      if (activeDrawerOrderId === id) {
        setActiveDrawerOrderId(null);
      }
      setSelectedOrderIds((prev) => prev.filter((orderId) => orderId !== id));
      setOrders((prev) => prev.filter((o) => o.id !== id));

      const timer = setTimeout(async () => {
        pendingDeletesRef.current.delete(id);
        try {
          await Promise.resolve(orderService.deleteOrder(id));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Gagal menghapus pesanan.';
          setOrders((current) =>
            current.some((o) => o.id === id)
              ? current
              : [...current, targetOrder].sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0))
          );
          setError(`Gagal menghapus pesanan ${targetOrder.orderNumber}. ${msg}`);
        }
      }, undoWindowMs);

      pendingDeletesRef.current.set(id, timer);

      return () => {
        const activeTimer = pendingDeletesRef.current.get(id);
        if (activeTimer) {
          clearTimeout(activeTimer);
          pendingDeletesRef.current.delete(id);
        }
        setOrders((current) =>
          current.some((o) => o.id === id)
            ? current
            : [...current, targetOrder].sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0))
        );
      };
    },
    [activeDrawerOrderId]
  );

  const handleBulkDeleteOrders = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return true;
      const previousOrders = orders;
      const idSet = new Set(ids);

      if (activeDrawerOrderId && idSet.has(activeDrawerOrderId)) {
        setActiveDrawerOrderId(null);
      }
      setSelectedOrderIds((prev) => prev.filter((orderId) => !idSet.has(orderId)));
      setOrders((prev) => prev.filter((o) => !idSet.has(o.id)));

      try {
        await Promise.all(ids.map((id) => Promise.resolve(orderService.deleteOrder(id))));
        return true;
      } catch (err: unknown) {
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal menghapus pesanan terpilih.';
        setError(`Gagal menghapus pesanan terpilih. ${msg}`);
        throw err;
      }
    },
    [orders, activeDrawerOrderId]
  );

  // d) updateProcessStatus & updatePaymentStatus: optimistic update, background commit, rollback
  const handleUpdateProcessStatus = useCallback(
    async (id: string, status: ProcessStatus): Promise<void> => {
      await handleUpdateOrder(id, { processStatus: status });
    },
    [handleUpdateOrder]
  );

  const handleUpdatePaymentStatus = useCallback(
    async (id: string, status: PaymentStatus): Promise<void> => {
      await handleUpdateOrder(id, { paymentStatus: status });
    },
    [handleUpdateOrder]
  );

  // e) reorderQueue: optimistic reorder & queue_index update, background commit, rollback on error
  const handleReorderQueue = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const previousOrders = orders;

      // 1. Frame 0: Synchronously reorder array and assign queueOrder 1..N
      const idMap = new Map<string, number>();
      orderedIds.forEach((id, index) => {
        idMap.set(id, index + 1);
      });

      const reordered = [...previousOrders].sort((a, b) => {
        const orderA = idMap.get(a.id) ?? 9999;
        const orderB = idMap.get(b.id) ?? 9999;
        return orderA - orderB;
      }).map((item, idx) => ({
        ...item,
        queueOrder: idx + 1,
      }));

      setOrders(reordered);

      try {
        // 2. Background async commit
        await Promise.resolve(orderService.reorderQueue(orderedIds));
      } catch (err: unknown) {
        // 3. Automatic rollback on error
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan urutan antrean.';
        setError(`Gagal menyimpan urutan antrean. ${msg}`);
        throw err;
      }
    },
    [orders]
  );

  // f) uploadDesignFile, toggleDesignReady, deleteDesignFile: optimistic update, background commit, rollback on error
  const handleAddDesignFile = useCallback(
    async (orderId: string, file: DesignFile): Promise<DesignFile | null> => {
      const previousOrders = orders;

      // 1. Frame 0: Optimistically attach file to order
      setOrders(
        previousOrders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            designFiles: [...(o.designFiles || []), file],
          };
        })
      );

      try {
        // 2. Background commit
        const remote = await Promise.resolve(orderService.addDesignFile(orderId, file));
        if (remote) {
          setOrders((current) =>
            current.map((o) => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                designFiles: o.designFiles.map((f) => (f.id === file.id ? remote : f)),
              };
            })
          );
          return remote;
        }
        return file;
      } catch (err: unknown) {
        // 3. Automatic rollback on error
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal menambahkan file desain.';
        setError(`Gagal menambahkan file desain. ${msg}`);
        throw err;
      }
    },
    [orders]
  );

  const handleUploadDesignFile = useCallback(
    async (orderId: string, file: File): Promise<DesignFile | null> => {
      const previousOrders = orders;
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const fileUrl = URL.createObjectURL(file);
      const tempFile: DesignFile = {
        id: `df-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        orderId,
        fileName: file.name,
        fileSize: file.size,
        fileType: ext,
        fileUrl,
        thumbnailUrl: ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext) ? fileUrl : undefined,
        isReadyToPrint: false,
        uploadedAt: new Date().toISOString(),
      };

      // 1. Frame 0: Optimistic prepend
      setOrders(
        previousOrders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            designFiles: [...(o.designFiles || []), tempFile],
          };
        })
      );

      try {
        if (typeof orderService.uploadDesignFile === 'function') {
          const remote = await orderService.uploadDesignFile(orderId, file);
          setOrders((current) =>
            current.map((o) => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                designFiles: o.designFiles.map((f) => (f.id === tempFile.id ? remote : f)),
              };
            })
          );
          return remote;
        }
        return tempFile;
      } catch (err: unknown) {
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal mengunggah file desain.';
        setError(`Gagal mengunggah file desain. ${msg}`);
        throw err;
      }
    },
    [orders]
  );

  const handleToggleDesignReady = useCallback(
    async (orderId: string, designId: string): Promise<boolean> => {
      const previousOrders = orders;

      // 1. Frame 0: Synchronously toggle print readiness
      setOrders(
        previousOrders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            designFiles: o.designFiles.map((f) =>
              f.id === designId ? { ...f, isReadyToPrint: !f.isReadyToPrint } : f
            ),
          };
        })
      );

      try {
        // 2. Background commit
        const success = await Promise.resolve(orderService.toggleDesignReady(orderId, designId));
        return success;
      } catch (err: unknown) {
        // 3. Automatic rollback on error
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal memperbarui status file siap cetak.';
        setError(`Gagal memperbarui status file cetak. ${msg}`);
        throw err;
      }
    },
    [orders]
  );

  const handleDeleteDesignFile = useCallback(
    async (orderId: string, designId: string): Promise<boolean> => {
      const previousOrders = orders;

      // 1. Frame 0: Synchronously remove design file
      setOrders(
        previousOrders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            designFiles: o.designFiles.filter((f) => f.id !== designId),
          };
        })
      );

      try {
        // 2. Background commit
        const success = await Promise.resolve(orderService.deleteDesignFile(orderId, designId));
        return success;
      } catch (err: unknown) {
        // 3. Automatic rollback on error
        setOrders(previousOrders);
        const msg = err instanceof Error ? err.message : 'Gagal menghapus file desain.';
        setError(`Gagal menghapus file desain. ${msg}`);
        throw err;
      }
    },
    [orders]
  );

  // Milestone 2: Available months derived from all orders (newest first)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const m = getOrderMonth(o);
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  // Client-only current month resolved without effect cascade for Next.js 16 cacheComponents
  const clientCurrentMonth = useSyncExternalStore(
    subscribeNoop,
    getClientCurrentMonth,
    getServerCurrentMonth
  );

  // Default month: current month if in available months, else latest available month, else client current month
  const defaultMonth = useMemo(() => {
    if (clientCurrentMonth && availableMonths.includes(clientCurrentMonth)) {
      return clientCurrentMonth;
    }
    if (availableMonths.length > 0) {
      return availableMonths[0]; // latest available month with data
    }
    return clientCurrentMonth;
  }, [availableMonths, clientCurrentMonth]);

  const selectedMonth = selectedMonthState || defaultMonth;

  // Dynamic active orders for dashboard:
  // If 1+ orders selected via checkbox -> calculate strictly over selected orders (Dynamic Override)
  // Otherwise -> calculate strictly over orders matching selectedMonth (Monthly Scoping)
  const activeOrdersForDashboard = useMemo(() => {
    if (selectedOrderIds.length > 0) {
      const selectedSet = new Set(selectedOrderIds);
      return orders.filter((o) => selectedSet.has(o.id));
    }
    return orders.filter((o) => getOrderMonth(o) === selectedMonth);
  }, [orders, selectedOrderIds, selectedMonth]);

  // Scoped metrics and buyer summaries fed by activeOrdersForDashboard
  // Profit remains strictly computed from orders (omzet - totalHpp), completely independent of Capex/Materials
  const metrics = useMemo(
    () => orderService.getDashboardMetrics(activeOrdersForDashboard),
    [activeOrdersForDashboard]
  );
  const monthlyProfit = useMemo(
    () => orderService.getMonthlyProfitData(orders),
    [orders]
  );
  const buyerSummaries = useMemo(
    () => orderService.getBuyerSummaries(activeOrdersForDashboard),
    [activeOrdersForDashboard]
  );

  // Context value memoization
  const contextValue = useMemo<OrderContextType>(
    () => ({
      orders,
      loading,
      fetchError,
      refreshOrders,
      searchQuery,
      setSearchQuery,
      filterTab,
      setFilterTab,
      dateFilter,
      setDateFilter,
      isFormModalOpen,
      setIsFormModalOpen,
      editingOrder,
      setEditingOrder,
      openCreateModal,
      openEditModal,
      activeDrawerOrder,
      setActiveDrawerOrder,
      lightboxFile,
      setLightboxFile,
      createOrder: handleCreateOrder,
      updateOrder: handleUpdateOrder,
      deleteOrder: handleDeleteOrder,
      softDeleteOrder: handleSoftDeleteOrder,
      bulkDeleteOrders: handleBulkDeleteOrders,
      updateProcessStatus: handleUpdateProcessStatus,
      updatePaymentStatus: handleUpdatePaymentStatus,
      reorderQueue: handleReorderQueue,
      addDesignFile: handleAddDesignFile,
      uploadDesignFile: handleUploadDesignFile,
      toggleDesignReady: handleToggleDesignReady,
      deleteDesignFile: handleDeleteDesignFile,
      metrics,
      monthlyProfit,
      buyerSummaries,
      isConfigured: configStatus.isConfigured,
      configReason: configStatus.reason,
      error,
      clearError,
      selectedMonth,
      setSelectedMonth,
      availableMonths,
      selectedOrderIds,
      toggleSelectOrder,
      selectAllOrders,
      clearSelectedOrders,
    }),
    [
      orders,
      loading,
      fetchError,
      refreshOrders,
      searchQuery,
      filterTab,
      setFilterTab,
      dateFilter,
      setDateFilter,
      isFormModalOpen,
      editingOrder,
      openCreateModal,
      openEditModal,
      activeDrawerOrder,
      setActiveDrawerOrder,
      lightboxFile,
      handleCreateOrder,
      handleUpdateOrder,
      handleDeleteOrder,
      handleSoftDeleteOrder,
      handleBulkDeleteOrders,
      handleUpdateProcessStatus,
      handleUpdatePaymentStatus,
      handleReorderQueue,
      handleAddDesignFile,
      handleUploadDesignFile,
      handleToggleDesignReady,
      handleDeleteDesignFile,
      metrics,
      monthlyProfit,
      buyerSummaries,
      configStatus.isConfigured,
      configStatus.reason,
      error,
      clearError,
      selectedMonth,
      setSelectedMonth,
      availableMonths,
      selectedOrderIds,
      toggleSelectOrder,
      selectAllOrders,
      clearSelectedOrders,
    ]
  );

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders(): OrderContextType {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
