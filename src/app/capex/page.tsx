'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Edit2, Plus, Trash2 } from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import {
  CapexEntry,
  CreateCapexInput,
  CreateRawMaterialInput,
  RawMaterialEntry,
} from '@/types/capex';
import { capexService, rawMaterialService } from '@/lib/supabase';
import {
  cn,
  formatDateShort,
  formatMonthLabel,
  formatPercent,
  formatRp,
  formatUnitQty,
  normalizeMaterialKey,
} from '@/lib/utils';
import {
  downloadCSVFile,
  downloadExcelFile,
  exportCapexToCSV,
  exportCapexToExcel,
  exportCapexToPDF,
  exportRawMaterialsToCSV,
  exportRawMaterialsToExcel,
  exportRawMaterialsToPDF,
} from '@/lib/csvExport';
import PageHeader from '@/components/shared/PageHeader';
import PeriodPicker from '@/components/shared/PeriodPicker';
import KpiStrip, { KpiStripItem } from '@/components/shared/KpiStrip';
import Toolbar, { ToolbarTab } from '@/components/shared/Toolbar';
import DataTable, { DataTableColumn } from '@/components/shared/DataTable';
import RowMenu from '@/components/shared/RowMenu';
import {
  EmptyState,
  ErrorState,
  SkeletonKpiStrip,
  SkeletonTable,
} from '@/components/shared/StateViews';
import { useToast } from '@/components/shared/ToastProvider';
import { CapexFormModal, RawMaterialFormModal } from '@/components/capex/CapexModals';

interface UnitPriceDelta {
  direction: 'up' | 'down';
  pct: number;
  prevPrice: number;
  prevDate: string;
}

function computeMaterialPriceDeltas(
  entries: RawMaterialEntry[]
): Map<string, UnitPriceDelta> {
  const groups = new Map<string, RawMaterialEntry[]>();
  for (const item of entries) {
    const key = normalizeMaterialKey(item.materialName);
    if (!key) continue;
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }

  const deltas = new Map<string, UnitPriceDelta>();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const chronological = [...list].sort((a, b) => {
      if (a.entryDate !== b.entryDate) return a.entryDate.localeCompare(b.entryDate);
      if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
      return a.id.localeCompare(b.id);
    });

    for (let i = 1; i < chronological.length; i++) {
      const prev = chronological[i - 1];
      const curr = chronological[i];
      if (prev.unitPrice > 0 && curr.unitPrice !== prev.unitPrice) {
        const diffPct = ((curr.unitPrice - prev.unitPrice) / prev.unitPrice) * 100;
        const absRounded = Math.round(Math.abs(diffPct) * 10) / 10;
        if (absRounded > 0) {
          deltas.set(curr.id, {
            direction: diffPct > 0 ? 'up' : 'down',
            pct: absRounded,
            prevPrice: prev.unitPrice,
            prevDate: prev.entryDate,
          });
        }
      }
    }
  }

  return deltas;
}

let cachedCapexList: CapexEntry[] | null = null;
let cachedRawMaterialsList: RawMaterialEntry[] | null = null;

export default function CapexPage() {
  const { selectedMonth, setSelectedMonth, availableMonths = [] } = useOrders();
  const { showToast } = useToast();

  const [capexList, setCapexList] = useState<CapexEntry[]>(() => cachedCapexList ?? []);
  const [rawMaterialsList, setRawMaterialsList] = useState<RawMaterialEntry[]>(
    () => cachedRawMaterialsList ?? [],
  );
  const [loading, setLoading] = useState<boolean>(
    () => cachedCapexList === null || cachedRawMaterialsList === null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'CAPEX' | 'RAW_MATERIAL'>('ALL');
  // Keep "ALL" scoped locally so Dashboard shared month selection never breaks.
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  const [isCapexModalOpen, setIsCapexModalOpen] = useState<boolean>(false);
  const [editingCapex, setEditingCapex] = useState<CapexEntry | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterialEntry | null>(null);

  const [addMenuOpen, setAddMenuOpen] = useState<boolean>(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const addMenuId = useId();
  const exportMenuId = useId();

  const pendingDeleteCommitsRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    if (!loading) {
      cachedCapexList = capexList;
      cachedRawMaterialsList = rawMaterialsList;
    }
  }, [capexList, rawMaterialsList, loading]);

  const loadData = async (showSpinner = true) => {
    if (showSpinner && (cachedCapexList === null || cachedRawMaterialsList === null)) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const [capexData, materialsData] = await Promise.all([
        capexService.getCapexEntries(),
        rawMaterialService.getRawMaterialEntries(),
      ]);
      cachedCapexList = capexData;
      cachedRawMaterialsList = materialsData;
      setCapexList(capexData);
      setRawMaterialsList(materialsData);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal memuat data belanja modal dan bahan.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      capexService.getCapexEntries(),
      rawMaterialService.getRawMaterialEntries(),
    ])
      .then(([capexData, materialsData]) => {
        if (!active) return;
        cachedCapexList = capexData;
        cachedRawMaterialsList = materialsData;
        setCapexList(capexData);
        setRawMaterialsList(materialsData);
      })
      .catch((err) => {
        if (!active) return;
        if (cachedCapexList === null || cachedRawMaterialsList === null) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Gagal memuat data belanja modal dan bahan.';
          setLoadError(msg);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Flush any pending soft deletes cleanly before unmount.
  useEffect(() => {
    const commits = pendingDeleteCommitsRef.current;
    return () => {
      commits.forEach((flush) => flush());
      commits.clear();
    };
  }, []);

  useEffect(() => {
    if (!addMenuOpen && !exportMenuOpen) return;

    const handleOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (addMenuOpen && !addMenuRef.current?.contains(target)) {
        setAddMenuOpen(false);
      }
      if (exportMenuOpen && !exportMenuRef.current?.contains(target)) {
        setExportMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAddMenuOpen(false);
        setExportMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [addMenuOpen, exportMenuOpen]);

  const effectivePeriod = showAllMonths ? 'ALL' : selectedMonth;

  const displayMonths = useMemo(() => {
    const set = new Set<string>();
    if (selectedMonth && selectedMonth !== 'ALL') set.add(selectedMonth);
    availableMonths.forEach((m) => {
      if (m && m !== 'ALL') set.add(m);
    });
    capexList.forEach((c) => {
      if (c.entryDate && c.entryDate.length >= 7) set.add(c.entryDate.slice(0, 7));
    });
    rawMaterialsList.forEach((m) => {
      if (m.entryDate && m.entryDate.length >= 7) set.add(m.entryDate.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [availableMonths, selectedMonth, capexList, rawMaterialsList]);

  const handlePeriodChange = (nextMonth: string) => {
    if (nextMonth === 'ALL') {
      setShowAllMonths(true);
    } else {
      setShowAllMonths(false);
      setSelectedMonth(nextMonth);
    }
  };

  // Period-scoped datasets drive header summary, KPI strip, and tab counters.
  const periodCapex = useMemo(() => {
    if (!effectivePeriod || effectivePeriod === 'ALL') return capexList;
    return capexList.filter((item) => item.entryDate.startsWith(effectivePeriod));
  }, [capexList, effectivePeriod]);

  const periodMaterials = useMemo(() => {
    if (!effectivePeriod || effectivePeriod === 'ALL') return rawMaterialsList;
    return rawMaterialsList.filter((item) => item.entryDate.startsWith(effectivePeriod));
  }, [rawMaterialsList, effectivePeriod]);

  const filteredCapex = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return periodCapex;
    return periodCapex.filter(
      (item) =>
        item.itemName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [periodCapex, searchQuery]);

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return periodMaterials;
    return periodMaterials.filter(
      (item) =>
        item.materialName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
    );
  }, [periodMaterials, searchQuery]);

  // Price deltas always check full history so price jumps across prior months surface accurately.
  const priceDeltaMap = useMemo(
    () => computeMaterialPriceDeltas(rawMaterialsList),
    [rawMaterialsList]
  );

  const totalCapexAmount = useMemo(
    () => periodCapex.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
    [periodCapex]
  );

  const totalMaterialsAmount = useMemo(
    () => periodMaterials.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0),
    [periodMaterials]
  );

  const totalSpending = totalCapexAmount + totalMaterialsAmount;
  const totalTransactions = periodCapex.length + periodMaterials.length;

  const kpiItems: KpiStripItem[] = useMemo(
    () => [
      {
        id: 'capex-total-spending',
        label: effectivePeriod === 'ALL' ? 'Total belanja' : 'Total belanja bulan ini',
        primary: true,
        tone: 'accent',
        value: formatRp(totalSpending),
        supportingText: `${totalTransactions} transaksi`,
      },
      {
        id: 'capex-assets',
        label: 'Belanja modal',
        value: formatRp(totalCapexAmount),
        supportingText: `${periodCapex.length} aset`,
      },
      {
        id: 'capex-materials',
        label: 'Bahan baku',
        value: formatRp(totalMaterialsAmount),
        supportingText: `${periodMaterials.length} nota`,
      },
    ],
    [
      effectivePeriod,
      totalSpending,
      totalTransactions,
      totalCapexAmount,
      periodCapex.length,
      totalMaterialsAmount,
      periodMaterials.length,
    ]
  );

  const tabs: ToolbarTab[] = [
    { id: 'ALL', label: 'Semua', count: periodCapex.length + periodMaterials.length },
    { id: 'CAPEX', label: 'Capex', count: periodCapex.length },
    { id: 'RAW_MATERIAL', label: 'Bahan baku', count: periodMaterials.length },
  ];

  // Capex create / edit
  const handleSaveCapex = async (data: CreateCapexInput) => {
    if (editingCapex) {
      const targetId = editingCapex.id;
      const prev = [...capexList];
      const optimisticUpdated: CapexEntry = {
        ...editingCapex,
        itemName: data.itemName,
        category: data.category,
        amount: Number(data.amount) || 0,
        entryDate: data.entryDate,
        description: data.description,
        updatedAt: new Date().toISOString(),
      };
      setCapexList((curr) => curr.map((c) => (c.id === targetId ? optimisticUpdated : c)));
      setIsCapexModalOpen(false);
      setEditingCapex(null);

      try {
        const result = await capexService.updateCapexEntry(targetId, data);
        if (result) {
          setCapexList((curr) => curr.map((c) => (c.id === targetId ? result : c)));
        }
        showToast({ message: 'Data capex diperbarui', tone: 'success' });
      } catch {
        setCapexList(prev);
        showToast({ message: 'Gagal memperbarui data capex', tone: 'error' });
      }
      return;
    }

    const tempId = `temp-cpx-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticNew: CapexEntry = {
      id: tempId,
      itemName: data.itemName,
      category: data.category,
      amount: Number(data.amount) || 0,
      entryDate: data.entryDate,
      description: data.description,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setCapexList((curr) => [optimisticNew, ...curr]);
    setIsCapexModalOpen(false);

    try {
      const created = await capexService.createCapexEntry(data);
      setCapexList((curr) => curr.map((c) => (c.id === tempId ? created : c)));
      showToast({ message: 'Belanja modal ditambahkan', tone: 'success' });
    } catch {
      setCapexList((curr) => curr.filter((c) => c.id !== tempId));
      showToast({ message: 'Gagal menyimpan capex', tone: 'error' });
    }
  };

  // Raw Material create / edit
  const handleSaveMaterial = async (data: CreateRawMaterialInput) => {
    const safeQty = Number(data.quantity) || 1;
    const safeUnitPrice = Number(data.unitPrice) || 0;
    const calcTotal = data.totalAmount ?? Math.round(safeQty * safeUnitPrice);

    if (editingMaterial) {
      const targetId = editingMaterial.id;
      const prev = [...rawMaterialsList];
      const optimisticUpdated: RawMaterialEntry = {
        ...editingMaterial,
        materialName: data.materialName,
        category: data.category,
        supplier: data.supplier,
        quantity: safeQty,
        qty: safeQty,
        unit: data.unit,
        unitPrice: safeUnitPrice,
        totalAmount: calcTotal,
        entryDate: data.entryDate,
        notes: data.notes,
        updatedAt: new Date().toISOString(),
      };
      setRawMaterialsList((curr) =>
        curr.map((m) => (m.id === targetId ? optimisticUpdated : m))
      );
      setIsMaterialModalOpen(false);
      setEditingMaterial(null);

      try {
        const result = await rawMaterialService.updateRawMaterialEntry(targetId, data);
        if (result) {
          setRawMaterialsList((curr) =>
            curr.map((m) => (m.id === targetId ? result : m))
          );
        }
        showToast({ message: 'Catatan bahan baku diperbarui', tone: 'success' });
      } catch {
        setRawMaterialsList(prev);
        showToast({ message: 'Gagal memperbarui bahan baku', tone: 'error' });
      }
      return;
    }

    const tempId = `temp-mat-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticNew: RawMaterialEntry = {
      id: tempId,
      materialName: data.materialName,
      category: data.category,
      supplier: data.supplier,
      quantity: safeQty,
      qty: safeQty,
      unit: data.unit,
      unitPrice: safeUnitPrice,
      totalAmount: calcTotal,
      entryDate: data.entryDate,
      notes: data.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setRawMaterialsList((curr) => [optimisticNew, ...curr]);
    setIsMaterialModalOpen(false);

    try {
      const created = await rawMaterialService.createRawMaterialEntry(data);
      setRawMaterialsList((curr) =>
        curr.map((m) => (m.id === tempId ? created : m))
      );
      showToast({ message: 'Bahan baku berhasil dicatat', tone: 'success' });
    } catch {
      setRawMaterialsList((curr) => curr.filter((m) => m.id !== tempId));
      showToast({ message: 'Gagal mencatat bahan baku', tone: 'error' });
    }
  };

  // Soft delete with 8s undo for both sections
  const handleSoftDeleteCapex = (entry: CapexEntry) => {
    const key = `capex:${entry.id}`;
    setCapexList((curr) => curr.filter((c) => c.id !== entry.id));

    const commit = () => {
      pendingDeleteCommitsRef.current.delete(key);
      void capexService.deleteCapexEntry(entry.id).catch(() => {
        setCapexList((curr) => [entry, ...curr]);
        showToast({ message: `Gagal menghapus ${entry.itemName}`, tone: 'error' });
      });
    };

    const timer = window.setTimeout(commit, 8000);
    pendingDeleteCommitsRef.current.set(key, () => {
      window.clearTimeout(timer);
      commit();
    });

    showToast({
      message: `${entry.itemName} dihapus`,
      tone: 'neutral',
      durationMs: 8000,
      onUndo: () => {
        window.clearTimeout(timer);
        pendingDeleteCommitsRef.current.delete(key);
        setCapexList((curr) => {
          if (curr.some((c) => c.id === entry.id)) return curr;
          return [entry, ...curr].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
        });
      },
    });
  };

  const handleSoftDeleteMaterial = (entry: RawMaterialEntry) => {
    const key = `mat:${entry.id}`;
    setRawMaterialsList((curr) => curr.filter((m) => m.id !== entry.id));

    const commit = () => {
      pendingDeleteCommitsRef.current.delete(key);
      void rawMaterialService.deleteRawMaterialEntry(entry.id).catch(() => {
        setRawMaterialsList((curr) => [entry, ...curr]);
        showToast({ message: `Gagal menghapus ${entry.materialName}`, tone: 'error' });
      });
    };

    const timer = window.setTimeout(commit, 8000);
    pendingDeleteCommitsRef.current.set(key, () => {
      window.clearTimeout(timer);
      commit();
    });

    showToast({
      message: `${entry.materialName} dihapus`,
      tone: 'neutral',
      durationMs: 8000,
      onUndo: () => {
        window.clearTimeout(timer);
        pendingDeleteCommitsRef.current.delete(key);
        setRawMaterialsList((curr) => {
          if (curr.some((m) => m.id === entry.id)) return curr;
          return [entry, ...curr].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
        });
      },
    });
  };

  const materialColumns: DataTableColumn<RawMaterialEntry>[] = [
    {
      key: 'date',
      header: 'Tanggal',
      headerClassName: 'w-[84px] 2xl:w-[92px]',
      cellClassName: 'w-[84px] 2xl:w-[92px] whitespace-nowrap text-[var(--text-muted)] tabular-nums',
      renderCell: (m) => formatDateShort(m.entryDate),
    },
    {
      key: 'name',
      header: 'Nama bahan',
      headerClassName: 'min-w-[210px]',
      cellClassName: 'min-w-[210px] max-w-[270px] 2xl:max-w-[340px]',
      renderCell: (m) => (
        <div
          className="font-medium text-[13px] text-[var(--text)] truncate"
          title={m.notes ? `${m.materialName} — ${m.notes}` : m.materialName}
        >
          {m.materialName}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      headerClassName: 'w-[144px] 2xl:w-[156px]',
      cellClassName: 'w-[144px] 2xl:w-[156px] whitespace-nowrap',
      renderCell: (m) => (
        <span className="inline-flex h-6 items-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-1.5 2xl:px-2 text-[12px] font-medium text-[var(--text)] whitespace-nowrap">
          {m.category}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      headerClassName: 'w-[116px] 2xl:w-[144px]',
      cellClassName: 'w-[116px] max-w-[128px] 2xl:w-[144px] 2xl:max-w-[164px]',
      renderCell: (m) => (
        <div className="truncate text-[13px] text-[var(--text-muted)]" title={m.supplier || '-'}>
          {m.supplier || '—'}
        </div>
      ),
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      headerClassName: 'w-[72px] 2xl:w-[84px]',
      cellClassName: 'w-[72px] 2xl:w-[84px] whitespace-nowrap tabular-nums',
      renderCell: (m) => formatUnitQty(m.quantity ?? m.qty ?? 1, m.unit),
    },
    {
      key: 'unitPrice',
      header: 'Harga satuan',
      align: 'right',
      headerClassName: 'w-[118px] 2xl:w-[136px]',
      cellClassName: 'w-[118px] 2xl:w-[136px] whitespace-nowrap tabular-nums',
      renderCell: (m) => {
        const delta = priceDeltaMap.get(m.id);
        return (
          <div className="inline-flex items-center justify-end gap-1.5">
            <span className="text-[13px] text-[var(--text)]">
              {formatRp(m.unitPrice)}
            </span>
            {delta && (
              <span
                title={`${formatRp(delta.prevPrice)} pada ${formatDateShort(delta.prevDate)} → ${formatRp(m.unitPrice)}`}
                aria-label={`Harga satuan ${delta.direction === 'up' ? 'naik' : 'turun'} ${formatPercent(delta.pct)} dari ${formatRp(delta.prevPrice)} pada ${formatDateShort(delta.prevDate)}`}
                className={cn(
                  'inline-flex h-5 items-center rounded px-1.5 text-[12px] font-medium tabular-nums border whitespace-nowrap',
                  delta.direction === 'up'
                    ? 'border-[var(--status-amber-border)] bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)]'
                    : 'border-[var(--status-green-border)] bg-[var(--status-green-bg)] text-[var(--status-green-ink)]'
                )}
              >
                {delta.direction === 'up' ? '▲' : '▼'} {formatPercent(delta.pct)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      headerClassName: 'w-[92px] 2xl:w-[104px]',
      cellClassName: 'w-[92px] 2xl:w-[104px] whitespace-nowrap tabular-nums font-semibold text-[var(--text)]',
      renderCell: (m) => formatRp(m.totalAmount),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Aksi</span>,
      align: 'right',
      headerClassName: 'w-[64px] 2xl:w-[72px]',
      cellClassName: 'w-[64px] 2xl:w-[72px] whitespace-nowrap',
      renderCell: (m) => (
        <div className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => {
              setEditingMaterial(m);
              setIsMaterialModalOpen(true);
            }}
            aria-label={`Edit bahan baku ${m.materialName}`}
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <RowMenu
            ariaLabel={`Menu aksi untuk ${m.materialName}`}
            items={[
              {
                id: 'edit',
                label: 'Edit catatan',
                icon: <Edit2 className="w-3.5 h-3.5" />,
                onSelect: () => {
                  setEditingMaterial(m);
                  setIsMaterialModalOpen(true);
                },
              },
              {
                id: 'delete',
                label: 'Hapus',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                tone: 'danger',
                onSelect: () => handleSoftDeleteMaterial(m),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const capexColumns: DataTableColumn<CapexEntry>[] = [
    {
      key: 'date',
      header: 'Tanggal',
      headerClassName: 'w-[96px]',
      cellClassName: 'w-[96px] whitespace-nowrap text-[var(--text-muted)] tabular-nums',
      renderCell: (c) => formatDateShort(c.entryDate),
    },
    {
      key: 'name',
      header: 'Nama aset / barang',
      headerClassName: 'min-w-[240px]',
      cellClassName: 'min-w-[240px] max-w-[420px]',
      renderCell: (c) => (
        <div
          className="font-medium text-[13px] text-[var(--text)] truncate"
          title={c.description ? `${c.itemName} — ${c.description}` : c.itemName}
        >
          {c.itemName}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      headerClassName: 'w-[180px]',
      cellClassName: 'w-[180px] whitespace-nowrap',
      renderCell: (c) => (
        <span className="inline-flex h-6 items-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-[12px] font-medium text-[var(--text)] whitespace-nowrap">
          {c.category}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Total',
      align: 'right',
      headerClassName: 'w-[130px]',
      cellClassName: 'w-[130px] whitespace-nowrap tabular-nums font-semibold text-[var(--text)]',
      renderCell: (c) => formatRp(c.amount),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Aksi</span>,
      align: 'right',
      headerClassName: 'w-[72px]',
      cellClassName: 'w-[72px] whitespace-nowrap',
      renderCell: (c) => (
        <div className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => {
              setEditingCapex(c);
              setIsCapexModalOpen(true);
            }}
            aria-label={`Edit capex ${c.itemName}`}
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <RowMenu
            ariaLabel={`Menu aksi untuk ${c.itemName}`}
            items={[
              {
                id: 'edit',
                label: 'Edit capex',
                icon: <Edit2 className="w-3.5 h-3.5" />,
                onSelect: () => {
                  setEditingCapex(c);
                  setIsCapexModalOpen(true);
                },
              },
              {
                id: 'delete',
                label: 'Hapus',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                tone: 'danger',
                onSelect: () => handleSoftDeleteCapex(c),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const primaryButtonLabel =
    activeTab === 'CAPEX'
      ? 'Tambah capex'
      : activeTab === 'RAW_MATERIAL'
        ? 'Tambah bahan'
        : 'Tambah';

  const handlePrimaryClick = () => {
    if (activeTab === 'CAPEX') {
      setEditingCapex(null);
      setIsCapexModalOpen(true);
      return;
    }
    if (activeTab === 'RAW_MATERIAL') {
      setEditingMaterial(null);
      setIsMaterialModalOpen(true);
      return;
    }
    setAddMenuOpen((prev) => !prev);
  };

  const showCapexSection = activeTab === 'ALL' || activeTab === 'CAPEX';
  const showMaterialsSection = activeTab === 'ALL' || activeTab === 'RAW_MATERIAL';

  const headerSummary = loading
    ? 'Memuat data pengeluaran workshop...'
    : `${periodMaterials.length} nota bahan · ${periodCapex.length} capex · Total ${formatRp(totalSpending)}`;

  const hasActiveSearch = searchQuery.trim().length > 0;
  const bothFilteredEmpty =
    filteredCapex.length === 0 && filteredMaterials.length === 0;

  return (
    <div>
      <PageHeader
        title="Capex & Bahan"
        summary={headerSummary}
        actions={
          <>
            <PeriodPicker
              id="capex-month-select"
              label="Periode"
              value={effectivePeriod}
              onChange={handlePeriodChange}
              months={displayMonths}
              includeAllOption
              allLabel="Semua bulan"
            />

            {/* Report export menu ("⋯") consolidating Capex & Raw Materials reports */}
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                aria-label="Unduh laporan Capex & Bahan baku"
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen}
                aria-controls={exportMenuOpen ? exportMenuId : undefined}
                title="Unduh laporan"
                onClick={() => setExportMenuOpen((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--control-border)] bg-[var(--surface)] text-[14px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
              >
                <span aria-hidden="true">⋯</span>
              </button>

              {exportMenuOpen && (
                <div
                  id={exportMenuId}
                  role="menu"
                  aria-label="Opsi unduhan laporan pengeluaran"
                  className="absolute right-0 mt-1.5 w-60 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 popover-shadow z-50"
                >
                  <div className="px-2.5 py-1 text-[12px] font-semibold text-[var(--text-muted)]">
                    Bahan baku ({filteredMaterials.length})
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const content = exportRawMaterialsToExcel(
                        filteredMaterials,
                        `Laporan Bahan Baku (${formatMonthLabel(effectivePeriod)})`
                      );
                      downloadExcelFile(
                        `eganci-bahan-owner-${effectivePeriod || 'all'}.xls`,
                        content
                      );
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    Unduh Excel Bahan (.xls)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      exportRawMaterialsToPDF(
                        filteredMaterials,
                        formatMonthLabel(effectivePeriod)
                      );
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    Cetak PDF Bahan
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const csv = exportRawMaterialsToCSV(filteredMaterials);
                      downloadCSVFile(
                        `eganci-bahan-${effectivePeriod || 'all'}.csv`,
                        csv
                      );
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    Unduh CSV Bahan Baku
                  </button>

                  <div className="my-1 border-t border-[var(--border)]" />

                  <div className="px-2.5 py-1 text-[12px] font-semibold text-[var(--text-muted)]">
                    Belanja modal ({filteredCapex.length})
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const content = exportCapexToExcel(
                        filteredCapex,
                        `Laporan Capex (${formatMonthLabel(effectivePeriod)})`
                      );
                      downloadExcelFile(
                        `eganci-capex-owner-${effectivePeriod || 'all'}.xls`,
                        content
                      );
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    Unduh Excel Capex (.xls)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      exportCapexToPDF(
                        filteredCapex,
                        formatMonthLabel(effectivePeriod)
                      );
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    Cetak PDF Capex
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const csv = exportCapexToCSV(filteredCapex);
                      downloadCSVFile(
                        `eganci-capex-${effectivePeriod || 'all'}.csv`,
                        csv
                      );
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    Unduh CSV Capex
                  </button>
                </div>
              )}
            </div>

            {/* Single Primary CTA ("Tambah" menu on ALL, direct add on filtered tab) */}
            <div ref={addMenuRef} className="relative">
              <button
                type="button"
                onClick={handlePrimaryClick}
                aria-haspopup={activeTab === 'ALL' ? 'menu' : undefined}
                aria-expanded={activeTab === 'ALL' ? addMenuOpen : undefined}
                aria-controls={activeTab === 'ALL' && addMenuOpen ? addMenuId : undefined}
                className="inline-flex h-9 min-h-[36px] items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{primaryButtonLabel}</span>
                {activeTab === 'ALL' && (
                  <ChevronDown className="w-3.5 h-3.5 opacity-90" aria-hidden="true" />
                )}
              </button>

              {activeTab === 'ALL' && addMenuOpen && (
                <div
                  id={addMenuId}
                  role="menu"
                  aria-label="Pilih jenis catatan baru"
                  className="absolute right-0 mt-1.5 w-48 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-1 popover-shadow z-50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAddMenuOpen(false);
                      setEditingMaterial(null);
                      setIsMaterialModalOpen(true);
                    }}
                    className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    Tambah bahan baku
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAddMenuOpen(false);
                      setEditingCapex(null);
                      setIsCapexModalOpen(true);
                    }}
                    className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    Tambah capex
                  </button>
                </div>
              )}
            </div>
          </>
        }
      />

      {loading ? (
        <>
          <SkeletonKpiStrip count={3} />
          <SkeletonTable rows={6} />
        </>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void loadData()} />
      ) : (
        <>
          <KpiStrip items={kpiItems} />

          <Toolbar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as 'ALL' | 'CAPEX' | 'RAW_MATERIAL')}
            tabListLabel="Jenis catatan pengeluaran"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchLabel="Cari capex atau bahan baku"
            searchPlaceholder="Cari nama barang, bahan, atau supplier..."
          />

          {hasActiveSearch && bothFilteredEmpty ? (
            <EmptyState
              variant="empty-filter"
              onResetFilter={() => setSearchQuery('')}
            />
          ) : (
            <div className="space-y-4">
              {/* Collapsible Capex section (56px bar when 0 rows in ALL tab) */}
              {showCapexSection && (
                <section aria-labelledby="capex-section-heading">
                  {filteredCapex.length === 0 ? (
                    activeTab === 'CAPEX' ? (
                      capexList.length === 0 ? (
                        <EmptyState
                          variant="empty-data"
                          title="Belum ada belanja modal"
                          description="Catat pembelian mesin, alat sablon, atau perlengkapan workshop."
                          actionLabel="Tambah capex"
                          onAction={() => {
                            setEditingCapex(null);
                            setIsCapexModalOpen(true);
                          }}
                        />
                      ) : periodCapex.length === 0 ? (
                        <EmptyState
                          variant="empty-period"
                          periodLabel={formatMonthLabel(effectivePeriod)}
                        />
                      ) : (
                        <EmptyState
                          variant="empty-filter"
                          onResetFilter={() => setSearchQuery('')}
                        />
                      )
                    ) : (
                      <div className="flex min-h-[56px] items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2">
                        <span
                          id="capex-section-heading"
                          className="text-[13px] text-[var(--text-muted)]"
                        >
                          Belum ada belanja modal.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCapex(null);
                            setIsCapexModalOpen(true);
                          }}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Tambah capex</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h2
                          id="capex-section-heading"
                          className="text-[13px] font-semibold text-[var(--text)]"
                        >
                          Belanja modal ({filteredCapex.length})
                        </h2>
                        <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                          {formatRp(totalCapexAmount)}
                        </span>
                      </div>

                      <DataTable
                        caption="Daftar belanja modal workshop"
                        rows={filteredCapex}
                        getRowId={(c) => c.id}
                        columns={capexColumns}
                        renderMobileCard={(c) => (
                          <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="font-medium text-[13px] text-[var(--text)] truncate"
                                title={c.itemName}
                              >
                                {c.itemName}
                              </span>
                              <span className="font-semibold text-[13px] text-[var(--text)] tabular-nums shrink-0">
                                {formatRp(c.amount)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                              <span className="truncate">
                                {c.category} · {formatDateShort(c.entryDate)}
                              </span>
                              <div className="inline-flex items-center gap-2.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCapex(c);
                                    setIsCapexModalOpen(true);
                                  }}
                                  aria-label={`Edit capex ${c.itemName}`}
                                  className="touch-target-44 inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <RowMenu
                                  ariaLabel={`Menu aksi untuk ${c.itemName}`}
                                  items={[
                                    {
                                      id: 'delete',
                                      label: 'Hapus',
                                      icon: <Trash2 className="w-3.5 h-3.5" />,
                                      tone: 'danger',
                                      onSelect: () => handleSoftDeleteCapex(c),
                                    },
                                  ]}
                                />
                              </div>
                            </div>
                          </article>
                        )}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* Recurring Raw Materials section */}
              {showMaterialsSection && (
                <section aria-labelledby="materials-section-heading">
                  {filteredMaterials.length === 0 ? (
                    activeTab === 'RAW_MATERIAL' ? (
                      rawMaterialsList.length === 0 ? (
                        <EmptyState
                          variant="empty-data"
                          title="Belum ada pembelian bahan baku"
                          description="Catat pembelian akrilik, tinta, ring, atau kemasan untuk melacak kenaikan harga beli."
                          actionLabel="Tambah bahan baku"
                          onAction={() => {
                            setEditingMaterial(null);
                            setIsMaterialModalOpen(true);
                          }}
                        />
                      ) : periodMaterials.length === 0 ? (
                        <EmptyState
                          variant="empty-period"
                          periodLabel={formatMonthLabel(effectivePeriod)}
                        />
                      ) : (
                        <EmptyState
                          variant="empty-filter"
                          onResetFilter={() => setSearchQuery('')}
                        />
                      )
                    ) : (
                      <div className="flex min-h-[56px] items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2">
                        <span
                          id="materials-section-heading"
                          className="text-[13px] text-[var(--text-muted)]"
                        >
                          Belum ada pembelian bahan baku pada periode ini.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMaterial(null);
                            setIsMaterialModalOpen(true);
                          }}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Tambah bahan</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h2
                          id="materials-section-heading"
                          className="text-[13px] font-semibold text-[var(--text)]"
                        >
                          Pembelian bahan baku ({filteredMaterials.length})
                        </h2>
                        <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                          {formatRp(totalMaterialsAmount)}
                        </span>
                      </div>

                      <DataTable
                        caption="Daftar pembelian bahan baku dan perbandingan harga satuan"
                        rows={filteredMaterials}
                        getRowId={(m) => m.id}
                        columns={materialColumns}
                        renderMobileCard={(m) => {
                          const delta = priceDeltaMap.get(m.id);
                          return (
                            <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 space-y-1">
                              {/* Line 1 */}
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="font-medium text-[13px] text-[var(--text)] truncate"
                                  title={m.materialName}
                                >
                                  {m.materialName}
                                </span>
                                <span className="font-semibold text-[13px] text-[var(--text)] tabular-nums shrink-0">
                                  {formatRp(m.totalAmount)}
                                </span>
                              </div>

                              {/* Line 2 */}
                              <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                                <span className="truncate">
                                  {m.supplier || m.category} · {formatUnitQty(m.quantity ?? m.qty ?? 1, m.unit)}
                                </span>
                                <span className="tabular-nums shrink-0 inline-flex items-center gap-1">
                                  <span>{formatRp(m.unitPrice)}/unit</span>
                                  {delta && (
                                    <span
                                      className={cn(
                                        'rounded px-1 text-[12px] font-medium',
                                        delta.direction === 'up'
                                          ? 'bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)]'
                                          : 'bg-[var(--status-green-bg)] text-[var(--status-green-ink)]'
                                      )}
                                    >
                                      {delta.direction === 'up' ? '▲' : '▼'} {formatPercent(delta.pct)}
                                    </span>
                                  )}
                                </span>
                              </div>

                              {/* Line 3 */}
                              <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                                <span className="tabular-nums truncate">
                                  {formatDateShort(m.entryDate)} · {m.category}
                                </span>
                                <div className="inline-flex items-center gap-2.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMaterial(m);
                                      setIsMaterialModalOpen(true);
                                    }}
                                    aria-label={`Edit bahan baku ${m.materialName}`}
                                    className="touch-target-44 inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                  <RowMenu
                                    ariaLabel={`Menu aksi untuk ${m.materialName}`}
                                    items={[
                                      {
                                        id: 'delete',
                                        label: 'Hapus',
                                        icon: <Trash2 className="w-3.5 h-3.5" />,
                                        tone: 'danger',
                                        onSelect: () => handleSoftDeleteMaterial(m),
                                      },
                                    ]}
                                  />
                                </div>
                              </div>
                            </article>
                          );
                        }}
                      />
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {isCapexModalOpen && (
        <CapexFormModal
          entry={editingCapex}
          onClose={() => {
            setIsCapexModalOpen(false);
            setEditingCapex(null);
          }}
          onSave={handleSaveCapex}
        />
      )}

      {isMaterialModalOpen && (
        <RawMaterialFormModal
          entry={editingMaterial}
          onClose={() => {
            setIsMaterialModalOpen(false);
            setEditingMaterial(null);
          }}
          onSave={handleSaveMaterial}
        />
      )}
    </div>
  );
}
