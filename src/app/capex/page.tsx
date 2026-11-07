'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  ChevronDown,
  Search,
  X,
  Check,
  AlertCircle,
  Package,
  Wrench,
  Inbox,
} from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import {
  CapexEntry,
  CreateCapexInput,
  RawMaterialEntry,
  CreateRawMaterialInput,
  CapexCategory,
  RawMaterialCategory,
} from '@/types/capex';
import { capexService, rawMaterialService } from '@/lib/supabase';
import { formatRp, formatDateShort } from '@/lib/utils';
import {
  exportCapexToCSV,
  exportRawMaterialsToCSV,
  downloadCSVFile,
  exportCapexToExcel,
  exportRawMaterialsToExcel,
  downloadExcelFile,
  exportCapexToPDF,
  exportRawMaterialsToPDF,
} from '@/lib/csvExport';
import ExportMenuButton from '@/components/shared/ExportMenuButton';

const CAPEX_CATEGORIES: CapexCategory[] = [
  'Mesin & Peralatan',
  'Perlengkapan Workshop',
  'Elektronik & IT',
  'Renovasi Workshop',
  'Lainnya',
];

const RAW_MATERIAL_CATEGORIES: RawMaterialCategory[] = [
  'Akrilik & Aksesoris',
  'Tinta & Sablon',
  'Kemasan & Packaging',
  'Sparepart & Consumable',
  'Lainnya',
];

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'ALL') return 'Semua Bulan';
  if (!monthKey.includes('-')) return monthKey;
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${INDONESIAN_MONTHS[monthIdx]} ${yearStr}`;
  }
  return monthKey;
}

export default function CapexPage() {
  const {
    selectedMonth,
    setSelectedMonth,
    availableMonths = [],
  } = useOrders();

  const [capexList, setCapexList] = useState<CapexEntry[]>([]);
  const [rawMaterialsList, setRawMaterialsList] = useState<RawMaterialEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'CAPEX' | 'RAW_MATERIAL'>('ALL');

  // Modals state
  const [isCapexModalOpen, setIsCapexModalOpen] = useState<boolean>(false);
  const [editingCapex, setEditingCapex] = useState<CapexEntry | null>(null);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterialEntry | null>(null);

  const [deletingTarget, setDeletingTarget] = useState<{
    type: 'capex' | 'material';
    id: string;
    title: string;
  } | null>(null);

  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setFeedbackNotice({ type, message });
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Initial data fetch
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [capexData, materialsData] = await Promise.all([
          capexService.getCapexEntries(),
          rawMaterialService.getRawMaterialEntries(),
        ]);
        if (isMounted) {
          setCapexList(capexData);
          setRawMaterialsList(materialsData);
        }
      } catch (err) {
        console.error('Failed to load capex and materials:', err);
        if (isMounted) {
          showNotice('error', 'Gagal memuat data belanja.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered by selectedMonth and searchQuery
  const filteredCapex = useMemo(() => {
    return capexList.filter((item) => {
      const matchMonth =
        !selectedMonth || selectedMonth === 'ALL'
          ? true
          : item.entryDate.startsWith(selectedMonth);

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.itemName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchMonth && matchSearch;
    });
  }, [capexList, selectedMonth, searchQuery]);

  const filteredMaterials = useMemo(() => {
    return rawMaterialsList.filter((item) => {
      const matchMonth =
        !selectedMonth || selectedMonth === 'ALL'
          ? true
          : item.entryDate.startsWith(selectedMonth);

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.materialName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      return matchMonth && matchSearch;
    });
  }, [rawMaterialsList, selectedMonth, searchQuery]);

  // Financial KPI totals
  const totalCapexAmount = useMemo(() => {
    return filteredCapex.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredCapex]);

  const totalMaterialsAmount = useMemo(() => {
    return filteredMaterials.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  }, [filteredMaterials]);

  const totalSpending = totalCapexAmount + totalMaterialsAmount;
  const totalTransactions = filteredCapex.length + filteredMaterials.length;
  const averageSpending = totalTransactions > 0 ? Math.round(totalSpending / totalTransactions) : 0;

  // Month select options
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

  // Capex Mutations
  const handleSaveCapex = async (data: CreateCapexInput) => {
    if (editingCapex) {
      // Optimistic Update
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
      setCapexList((curr) => curr.map((c) => (c.id === editingCapex.id ? optimisticUpdated : c)));
      setIsCapexModalOpen(false);
      setEditingCapex(null);

      try {
        const result = await capexService.updateCapexEntry(editingCapex.id, data);
        if (result) {
          setCapexList((curr) => curr.map((c) => (c.id === editingCapex.id ? result : c)));
          showNotice('success', 'Capex berhasil diperbarui.');
        }
      } catch (err) {
        console.error('Error updating capex:', err);
        setCapexList(prev);
        showNotice('error', 'Gagal memperbarui capex.');
      }
    } else {
      // Optimistic Create
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
        showNotice('success', 'Capex berhasil ditambahkan.');
      } catch (err) {
        console.error('Error creating capex:', err);
        setCapexList((curr) => curr.filter((c) => c.id !== tempId));
        showNotice('error', 'Gagal menyimpan capex.');
      }
    }
  };

  // Raw Material Mutations
  const handleSaveMaterial = async (data: CreateRawMaterialInput) => {
    if (editingMaterial) {
      // Optimistic Update
      const prev = [...rawMaterialsList];
      const safeQty = Number(data.quantity) || 1;
      const safeUnitPrice = Number(data.unitPrice) || 0;
      const calcTotal = data.totalAmount ?? Math.round(safeQty * safeUnitPrice);

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
        curr.map((m) => (m.id === editingMaterial.id ? optimisticUpdated : m))
      );
      setIsMaterialModalOpen(false);
      setEditingMaterial(null);

      try {
        const result = await rawMaterialService.updateRawMaterialEntry(editingMaterial.id, data);
        if (result) {
          setRawMaterialsList((curr) =>
            curr.map((m) => (m.id === editingMaterial.id ? result : m))
          );
          showNotice('success', 'Bahan baku berhasil diperbarui.');
        }
      } catch (err) {
        console.error('Error updating material:', err);
        setRawMaterialsList(prev);
        showNotice('error', 'Gagal memperbarui bahan baku.');
      }
    } else {
      // Optimistic Create
      const tempId = `temp-mat-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const safeQty = Number(data.quantity) || 1;
      const safeUnitPrice = Number(data.unitPrice) || 0;
      const calcTotal = data.totalAmount ?? Math.round(safeQty * safeUnitPrice);

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
        setRawMaterialsList((curr) => curr.map((m) => (m.id === tempId ? created : m)));
        showNotice('success', 'Bahan baku berhasil dicatat.');
      } catch (err) {
        console.error('Error creating material:', err);
        setRawMaterialsList((curr) => curr.filter((m) => m.id !== tempId));
        showNotice('error', 'Gagal mencatat bahan baku.');
      }
    }
  };

  // Delete Mutation
  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    const { type, id } = deletingTarget;

    if (type === 'capex') {
      const prev = [...capexList];
      setCapexList((curr) => curr.filter((c) => c.id !== id));
      setDeletingTarget(null);

      try {
        await capexService.deleteCapexEntry(id);
        showNotice('success', 'Data capex dihapus.');
      } catch (err) {
        console.error('Error deleting capex:', err);
        setCapexList(prev);
        showNotice('error', 'Gagal menghapus capex.');
      }
    } else {
      const prev = [...rawMaterialsList];
      setRawMaterialsList((curr) => curr.filter((m) => m.id !== id));
      setDeletingTarget(null);

      try {
        await rawMaterialService.deleteRawMaterialEntry(id);
        showNotice('success', 'Data bahan baku dihapus.');
      } catch (err) {
        console.error('Error deleting material:', err);
        setRawMaterialsList(prev);
        showNotice('error', 'Gagal menghapus bahan baku.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Feedback Toast */}
      {feedbackNotice && (
        <div
          role="status"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold animate-fade-in-up ${
            feedbackNotice.type === 'success'
              ? 'bg-[#d9f3e1] text-[#0d5220] border border-[#a8e2b8]'
              : 'bg-[#ffe8d4] text-[#793400] border border-[#ffd1a9]'
          }`}
        >
          {feedbackNotice.type === 'success' ? (
            <Check className="w-4 h-4 text-[#0d5220]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#793400]" />
          )}
          <span>{feedbackNotice.message}</span>
        </div>
      )}

      {/* Notion Deep Navy Hero Banner */}
      <div className="relative overflow-hidden bg-[#0a1530] p-4 sm:p-5 md:p-6 rounded-xl border border-[#1a2a52] shadow-notion-hero animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Subtle decorative Notion sticky-note dots & radial blur */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#5645d4]/10 blur-2xl pointer-events-none" />
        <div className="absolute top-3 right-28 w-2 h-2 rounded-full bg-[#ffe8d4] opacity-80" />
        <div className="absolute top-6 right-20 w-1.5 h-1.5 rounded-full bg-[#d9f3e1] opacity-70" />
        <div className="absolute bottom-4 right-36 w-2 h-2 rounded-full bg-[#dcecfa] opacity-75" />
        <div className="absolute top-5 right-8 w-2 h-2 rounded-full bg-[#fde0ec] opacity-80" />
        <div className="absolute bottom-3 right-12 w-1.5 h-1.5 rounded-full bg-[#f9e79f] opacity-70" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#5645d4] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(86,69,212,0.4)] shrink-0">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Capex & Bahan
            </h1>
            <p className="text-xs text-white/85 mt-0.5">
              Biaya modal & bahan baku.
            </p>
          </div>
        </div>

        {/* Right side controls: Month Selector + Action buttons */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Notion-style Month Selector Dropdown */}
          <div className="relative flex items-center w-full sm:w-auto">
            <label htmlFor="capex-month-select" className="sr-only">
              Pilih Bulan Pengeluaran
            </label>
            <div className="absolute left-2.5 pointer-events-none text-[#5645d4]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              id="capex-month-select"
              aria-label="Pilih Bulan Pengeluaran"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 rounded-lg bg-white border border-[#d6d3cd] text-[#1a1a1a] text-xs font-semibold shadow-xs hover:border-[#5645d4] focus:outline-none focus:ring-2 focus:ring-[#5645d4] cursor-pointer min-h-[36px]"
            >
              <option value="ALL">Semua Bulan</option>
              {displayMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 pointer-events-none text-[#787671]">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Quick Stats Badge in Hero */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2a52] bg-[#070f24]/80 text-[#d6b6f6] text-xs font-semibold shrink-0">
            <span>{loading ? 'Memuat...' : `${totalTransactions} Transaksi`}</span>
          </div>
        </div>
      </div>

      {/* 4 Pastel KPI Summary Cards (WCAG AA Compliant >= 4.5:1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Sky Card: Total Belanja Bulan Ini */}
        <div className="rounded-xl p-4 sm:p-5 bg-[#dcecfa] shadow-notion-card transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#37352f]">
              Total Belanja
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white/70 text-[#004480]">
              Bulan Ini
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-[#1a1a1a] tracking-tight">
              {formatRp(totalSpending)}
            </div>
            <p className="text-[11px] font-medium text-[#37352f] mt-1">
              {totalTransactions} total transaksi tercatat
            </p>
          </div>
        </div>

        {/* Lavender Card: Belanja Modal (Capex) */}
        <div className="rounded-xl p-4 sm:p-5 bg-[#e6e0f5] shadow-notion-card transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#37352f]">
              Belanja Modal
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white/70 text-[#391c57]">
              Capex
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-[#1a1a1a] tracking-tight">
              {formatRp(totalCapexAmount)}
            </div>
            <p className="text-[11px] font-medium text-[#37352f] mt-1">
              {filteredCapex.length} aset modal workshop
            </p>
          </div>
        </div>

        {/* Mint Card: Bahan Baku Berulang */}
        <div className="rounded-xl p-4 sm:p-5 bg-[#d9f3e1] shadow-notion-card transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#37352f]">
              Bahan Baku
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white/70 text-[#0d5220]">
              Berulang
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-[#1a1a1a] tracking-tight">
              {formatRp(totalMaterialsAmount)}
            </div>
            <p className="text-[11px] font-medium text-[#37352f] mt-1">
              {filteredMaterials.length} nota pasokan bahan
            </p>
          </div>
        </div>

        {/* Peach Card: Rata-rata Pengeluaran */}
        <div className="rounded-xl p-4 sm:p-5 bg-[#ffe8d4] shadow-notion-card transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#37352f]">
              Rata-rata Biaya
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white/70 text-[#793400]">
              Rasio
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-[#1a1a1a] tracking-tight">
              {formatRp(averageSpending)}
            </div>
            <p className="text-[11px] font-medium text-[#37352f] mt-1">
              Per transaksi belanja
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, View Filter, & Primary Add CTAs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-[#e5e3df] shadow-notion-card">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#787671]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama barang, bahan, atau supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#f6f5f4] border border-transparent focus:border-[#5645d4] focus:bg-white text-xs text-[#1a1a1a] placeholder-[#787671] focus:outline-none focus:ring-1 focus:ring-[#5645d4] transition-all min-h-[38px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787671] hover:text-[#1a1a1a] p-1"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#f6f5f4] rounded-lg border border-[#e5e3df] text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-white text-[#1a1a1a] shadow-xs font-bold'
                : 'text-[#5d5b54] hover:text-[#1a1a1a]'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CAPEX')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'CAPEX'
                ? 'bg-white text-[#1a1a1a] shadow-xs font-bold'
                : 'text-[#5d5b54] hover:text-[#1a1a1a]'
            }`}
          >
            Capex ({filteredCapex.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RAW_MATERIAL')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'RAW_MATERIAL'
                ? 'bg-white text-[#1a1a1a] shadow-xs font-bold'
                : 'text-[#5d5b54] hover:text-[#1a1a1a]'
            }`}
          >
            Bahan Baku ({filteredMaterials.length})
          </button>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingCapex(null);
              setIsCapexModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#5645d4] hover:bg-[#4335a8] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[38px] active:scale-98 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Tambah Capex</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingMaterial(null);
              setIsMaterialModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0a1530] hover:bg-[#14234b] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[38px] active:scale-98 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#d9f3e1] shrink-0" />
            <span>Tambah Bahan</span>
          </button>
        </div>
      </div>

      {/* TABLE 1: CAPEX (Capital Expenditure / Belanja Modal) */}
      {(activeTab === 'ALL' || activeTab === 'CAPEX') && (
        <div className="bg-white rounded-xl border border-[#e5e3df] shadow-notion-card">
          {/* Table Section Header */}
          <div className="p-4 sm:p-5 border-b border-[#e5e3df] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fbfbfa] rounded-t-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-[#e6e0f5] text-[#391c57] flex items-center justify-center font-bold shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-[#1a1a1a] tracking-tight">
                    Belanja Modal (Capex)
                  </h2>
                  <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e6e0f5] text-[#391c57]">
                    {filteredCapex.length} item
                  </span>
                </div>
                <p className="text-[11px] text-[#787671] mt-0.5">
                  Aset workshop non-recurring dengan nilai investasi jangka panjang.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end shrink-0">
              <div className="text-xs font-semibold text-[#1a1a1a] sm:text-right whitespace-nowrap">
                Total Capex:{' '}
                <span className="font-bold text-[#5645d4]">{formatRp(totalCapexAmount)}</span>
              </div>
              <ExportMenuButton
                label="Unduh Laporan"
                ariaLabel="Unduh CSV Capex, Excel, atau PDF"
                variant="light-lavender"
                onExportExcel={() => {
                  const excelContent = exportCapexToExcel(
                    filteredCapex,
                    formatMonthLabel(selectedMonth)
                  );
                  downloadExcelFile(
                    `eganci-capex-owner-${selectedMonth || 'all'}.xls`,
                    excelContent
                  );
                }}
                onExportPDF={() => {
                  exportCapexToPDF(filteredCapex, formatMonthLabel(selectedMonth));
                }}
                onExportCSV={() => {
                  const csvContent = exportCapexToCSV(filteredCapex);
                  downloadCSVFile(`eganci-capex-ml-${selectedMonth || 'all'}.csv`, csvContent);
                }}
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f6f5f4] text-[#787671] border-b border-[#e5e3df] font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 w-28">Tanggal</th>
                  <th className="py-2.5 px-4">Nama Barang</th>
                  <th className="py-2.5 px-4 w-40">Kategori</th>
                  <th className="py-2.5 px-4 w-36 text-right">Biaya (Rp)</th>
                  <th className="py-2.5 px-4">Keterangan</th>
                  <th className="py-2.5 px-4 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e3df]">
                {filteredCapex.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#787671]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Inbox className="w-7 h-7 text-[#c8c4be]" />
                        <p className="font-medium text-xs">
                          Belum ada data belanja modal untuk bulan ini.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCapex(null);
                            setIsCapexModalOpen(true);
                          }}
                          className="mt-1 px-3 py-1.5 rounded-md bg-[#5645d4] text-white text-xs font-semibold cursor-pointer"
                        >
                          + Tambah Capex
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCapex.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#fbfbfa] transition-colors text-[#37352f]"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-[#787671] font-mono text-[11px]">
                        {formatDateShort(item.entryDate)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#1a1a1a]">
                        {item.itemName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f6f5f4] text-[#37352f] border border-[#e5e3df]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#1a1a1a] whitespace-nowrap">
                        {formatRp(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-[#5d5b54] max-w-xs truncate">
                        {item.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCapex(item);
                              setIsCapexModalOpen(true);
                            }}
                            className="p-1.5 rounded-md text-[#5d5b54] hover:text-[#5645d4] hover:bg-[#e6e0f5]/50 transition-colors cursor-pointer"
                            title="Edit capex"
                            aria-label={`Edit ${item.itemName}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingTarget({
                                type: 'capex',
                                id: item.id,
                                title: item.itemName,
                              })
                            }
                            className="p-1.5 rounded-md text-[#5d5b54] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus capex"
                            aria-label={`Hapus ${item.itemName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View */}
          <div className="md:hidden divide-y divide-[#e5e3df]">
            {filteredCapex.length === 0 ? (
              <div className="py-8 px-4 text-center text-[#787671]">
                <Inbox className="w-6 h-6 mx-auto mb-2 text-[#c8c4be]" />
                <p className="font-medium text-xs">Belum ada data belanja modal.</p>
              </div>
            ) : (
              filteredCapex.map((item) => (
                <div key={item.id} className="p-4 flex flex-col gap-2 hover:bg-[#fbfbfa]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-[#1a1a1a]">{item.itemName}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-[#787671]">
                          {formatDateShort(item.entryDate)}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f6f5f4] text-[#37352f] border border-[#e5e3df]">
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-bold text-xs text-[#1a1a1a]">
                      {formatRp(item.amount)}
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-[11px] text-[#5d5b54] bg-[#f6f5f4] p-2 rounded">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#f0eee9]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCapex(item);
                        setIsCapexModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold text-[#5645d4] hover:bg-[#e6e0f5]/50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeletingTarget({
                          type: 'capex',
                          id: item.id,
                          title: item.itemName,
                        })
                      }
                      className="px-2.5 py-1 rounded text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TABLE 2: RECURRING RAW MATERIALS (Bahan Baku Berulang) */}
      {(activeTab === 'ALL' || activeTab === 'RAW_MATERIAL') && (
        <div className="bg-white rounded-xl border border-[#e5e3df] shadow-notion-card">
          {/* Table Section Header */}
          <div className="p-4 sm:p-5 border-b border-[#e5e3df] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fbfbfa] rounded-t-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-[#d9f3e1] text-[#0d5220] flex items-center justify-center font-bold shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-[#1a1a1a] tracking-tight">
                    Bahan Baku Berulang
                  </h2>
                  <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#d9f3e1] text-[#0d5220]">
                    {filteredMaterials.length} item
                  </span>
                </div>
                <p className="text-[11px] text-[#787671] mt-0.5">
                  Pasokan workshop rutin seperti akrilik, ring, kemasan, dan tinta sablon.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end shrink-0">
              <div className="text-xs font-semibold text-[#1a1a1a] sm:text-right whitespace-nowrap">
                Total Bahan Baku:{' '}
                <span className="font-bold text-[#0d5220]">{formatRp(totalMaterialsAmount)}</span>
              </div>
              <ExportMenuButton
                label="Unduh Laporan"
                ariaLabel="Unduh CSV Bahan Baku, Excel, atau PDF"
                variant="light-mint"
                onExportExcel={() => {
                  const excelContent = exportRawMaterialsToExcel(
                    filteredMaterials,
                    formatMonthLabel(selectedMonth)
                  );
                  downloadExcelFile(
                    `eganci-bahan-baku-owner-${selectedMonth || 'all'}.xls`,
                    excelContent
                  );
                }}
                onExportPDF={() => {
                  exportRawMaterialsToPDF(
                    filteredMaterials,
                    formatMonthLabel(selectedMonth)
                  );
                }}
                onExportCSV={() => {
                  const csvContent = exportRawMaterialsToCSV(filteredMaterials);
                  downloadCSVFile(
                    `eganci-raw-materials-ml-${selectedMonth || 'all'}.csv`,
                    csvContent
                  );
                }}
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f6f5f4] text-[#787671] border-b border-[#e5e3df] font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 w-28">Tanggal</th>
                  <th className="py-2.5 px-4">Nama Bahan</th>
                  <th className="py-2.5 px-4 w-36">Kategori</th>
                  <th className="py-2.5 px-4 w-36">Supplier</th>
                  <th className="py-2.5 px-4 w-28 text-right">Volume</th>
                  <th className="py-2.5 px-4 w-28 text-right">Harga Satuan</th>
                  <th className="py-2.5 px-4 w-32 text-right">Total Biaya</th>
                  <th className="py-2.5 px-4 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e3df]">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#787671]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Inbox className="w-7 h-7 text-[#c8c4be]" />
                        <p className="font-medium text-xs">
                          Belum ada data belanja bahan baku untuk bulan ini.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMaterial(null);
                            setIsMaterialModalOpen(true);
                          }}
                          className="mt-1 px-3 py-1.5 rounded-md bg-[#0a1530] text-white text-xs font-semibold cursor-pointer"
                        >
                          + Tambah Bahan
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#fbfbfa] transition-colors text-[#37352f]"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-[#787671] font-mono text-[11px]">
                        {formatDateShort(item.entryDate)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#1a1a1a]">
                        <div>{item.materialName}</div>
                        {item.notes && (
                          <div className="text-[10px] text-[#787671] font-normal truncate max-w-xs">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f6f5f4] text-[#37352f] border border-[#e5e3df]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5d5b54]">{item.supplier || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium whitespace-nowrap">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-[#5d5b54] whitespace-nowrap font-mono text-[11px]">
                        {formatRp(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#1a1a1a] whitespace-nowrap">
                        {formatRp(item.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMaterial(item);
                              setIsMaterialModalOpen(true);
                            }}
                            className="p-1.5 rounded-md text-[#5d5b54] hover:text-[#5645d4] hover:bg-[#e6e0f5]/50 transition-colors cursor-pointer"
                            title="Edit bahan baku"
                            aria-label={`Edit ${item.materialName}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingTarget({
                                type: 'material',
                                id: item.id,
                                title: item.materialName,
                              })
                            }
                            className="p-1.5 rounded-md text-[#5d5b54] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus bahan baku"
                            aria-label={`Hapus ${item.materialName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View */}
          <div className="md:hidden divide-y divide-[#e5e3df]">
            {filteredMaterials.length === 0 ? (
              <div className="py-8 px-4 text-center text-[#787671]">
                <Inbox className="w-6 h-6 mx-auto mb-2 text-[#c8c4be]" />
                <p className="font-medium text-xs">Belum ada data belanja bahan baku.</p>
              </div>
            ) : (
              filteredMaterials.map((item) => (
                <div key={item.id} className="p-4 flex flex-col gap-2 hover:bg-[#fbfbfa]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-[#1a1a1a]">
                        {item.materialName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-[#787671]">
                          {formatDateShort(item.entryDate)}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f6f5f4] text-[#37352f] border border-[#e5e3df]">
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-bold text-xs text-[#1a1a1a]">
                      {formatRp(item.totalAmount)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#f6f5f4] p-2 rounded text-[#5d5b54]">
                    <div>
                      Supplier: <span className="font-semibold text-[#1a1a1a]">{item.supplier}</span>
                    </div>
                    <div className="text-right">
                      {item.quantity} {item.unit} @ {formatRp(item.unitPrice)}
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-[#787671] italic">
                      Catatan: {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#f0eee9]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMaterial(item);
                        setIsMaterialModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold text-[#5645d4] hover:bg-[#e6e0f5]/50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeletingTarget({
                          type: 'material',
                          id: item.id,
                          title: item.materialName,
                        })
                      }
                      className="px-2.5 py-1 rounded text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CAPEX */}
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

      {/* MODAL: ADD / EDIT RAW MATERIAL */}
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

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in-up"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-notion-deep border border-[#e5e3df]">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 id="delete-dialog-title" className="font-bold text-sm text-[#1a1a1a]">
                Hapus Pengeluaran Ini?
              </h3>
            </div>
            <p className="text-xs text-[#5d5b54] mb-4">
              Apakah Anda yakin ingin menghapus{' '}
              <strong className="text-[#1a1a1a]">{deletingTarget.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                className="px-3 py-2 rounded-lg border border-[#d6d3cd] text-xs font-semibold text-[#5d5b54] hover:bg-[#f6f5f4] cursor-pointer min-h-[36px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer min-h-[36px]"
              >
                Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Capex Form Modal Component
// ============================================================================

interface CapexFormModalProps {
  entry: CapexEntry | null;
  onClose: () => void;
  onSave: (data: CreateCapexInput) => Promise<void>;
}

function CapexFormModal({ entry, onClose, onSave }: CapexFormModalProps) {
  const [itemName, setItemName] = useState(entry?.itemName ?? '');
  const [category, setCategory] = useState<string>(entry?.category ?? 'Mesin & Peralatan');
  const [amount, setAmount] = useState<number>(entry?.amount ?? 0);
  const [entryDate, setEntryDate] = useState<string>(entry?.entryDate ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry?.entryDate) {
      setEntryDate(new Date().toISOString().split('T')[0]);
    }
  }, [entry?.entryDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setFormError('Nama barang wajib diisi.');
      return;
    }
    if (amount <= 0) {
      setFormError('Biaya capex harus lebih besar dari 0.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onSave({
        itemName: itemName.trim(),
        category,
        amount,
        entryDate,
        description: description.trim() || undefined,
      });
    } catch {
      setFormError('Gagal menyimpan data.');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="capex-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in-up"
    >
      <div className="bg-white rounded-xl max-w-md w-full shadow-notion-deep border border-[#e5e3df] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#e5e3df] flex items-center justify-between bg-[#fbfbfa]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#e6e0f5] text-[#391c57] flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <h3 id="capex-modal-title" className="font-bold text-sm text-[#1a1a1a]">
              {entry ? 'Edit Belanja Modal' : 'Tambah Belanja Modal'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#787671] hover:text-[#1a1a1a] hover:bg-[#ede9e4] transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
          {formError && (
            <div className="p-2.5 rounded-lg bg-[#ffe8d4] text-[#793400] text-xs font-semibold border border-[#ffd1a9]">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#37352f] mb-1">
              Nama Barang / Aset <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Mesin Laser Cutting 60W"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4] cursor-pointer"
              >
                {CAPEX_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Tanggal Pembelian
              </label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#37352f] mb-1">
              Biaya / Nilai Pembelian (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={amount === 0 ? '' : amount}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] font-mono font-semibold focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
            />
            <p className="text-[10px] text-[#787671] mt-1 font-mono">
              Format: {formatRp(amount)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#37352f] mb-1">
              Keterangan / Spesifikasi
            </label>
            <textarea
              rows={2}
              placeholder="Catatan garansi, vendor, atau spesifikasi barang..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0eee9]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-2 rounded-lg border border-[#d6d3cd] text-xs font-semibold text-[#5d5b54] hover:bg-[#f6f5f4] cursor-pointer min-h-[36px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#5645d4] hover:bg-[#4335a8] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[36px]"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Capex'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Raw Material Form Modal Component
// ============================================================================

interface RawMaterialFormModalProps {
  entry: RawMaterialEntry | null;
  onClose: () => void;
  onSave: (data: CreateRawMaterialInput) => Promise<void>;
}

function RawMaterialFormModal({ entry, onClose, onSave }: RawMaterialFormModalProps) {
  const [materialName, setMaterialName] = useState(entry?.materialName ?? '');
  const [category, setCategory] = useState<string>(entry?.category ?? 'Akrilik & Aksesoris');
  const [supplier, setSupplier] = useState(entry?.supplier ?? '');
  const [quantity, setQuantity] = useState<number>(entry?.quantity ?? 1);
  const [unit, setUnit] = useState(entry?.unit ?? 'pcs');
  const [unitPrice, setUnitPrice] = useState<number>(entry?.unitPrice ?? 0);
  const [entryDate, setEntryDate] = useState<string>(entry?.entryDate ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry?.entryDate) {
      setEntryDate(new Date().toISOString().split('T')[0]);
    }
  }, [entry?.entryDate]);

  const calculatedTotal = Math.round((Number(quantity) || 0) * (Number(unitPrice) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      setFormError('Nama bahan baku wajib diisi.');
      return;
    }
    if (quantity <= 0) {
      setFormError('Jumlah volume harus lebih besar dari 0.');
      return;
    }
    if (unitPrice < 0) {
      setFormError('Harga satuan tidak boleh negatif.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onSave({
        materialName: materialName.trim(),
        category,
        supplier: supplier.trim(),
        quantity,
        unit: unit.trim() || 'pcs',
        unitPrice,
        totalAmount: calculatedTotal,
        entryDate,
        notes: notes.trim() || undefined,
      });
    } catch {
      setFormError('Gagal mencatat bahan baku.');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in-up"
    >
      <div className="bg-white rounded-xl max-w-md w-full shadow-notion-deep border border-[#e5e3df] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#e5e3df] flex items-center justify-between bg-[#fbfbfa]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#d9f3e1] text-[#0d5220] flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
            <h3 id="material-modal-title" className="font-bold text-sm text-[#1a1a1a]">
              {entry ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#787671] hover:text-[#1a1a1a] hover:bg-[#ede9e4] transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
          {formError && (
            <div className="p-2.5 rounded-lg bg-[#ffe8d4] text-[#793400] text-xs font-semibold border border-[#ffd1a9]">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#37352f] mb-1">
              Nama Bahan Baku <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Lembaran Akrilik Bening 3mm"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4] cursor-pointer"
              >
                {RAW_MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Supplier / Toko
              </label>
              <input
                type="text"
                placeholder="Contoh: CV Sentosa"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Volume / Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] font-mono focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Satuan
              </label>
              <input
                type="text"
                required
                placeholder="pcs, lembar, kg"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Harga Satuan
              </label>
              <input
                type="number"
                min="0"
                required
                value={unitPrice === 0 ? '' : unitPrice}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] font-mono focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
              />
            </div>
          </div>

          <div className="p-3 bg-[#f6f5f4] rounded-lg border border-[#e5e3df] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5d5b54]">Total Biaya (Otomatis):</span>
            <span className="text-sm font-bold text-[#1a1a1a] font-mono">
              {formatRp(calculatedTotal)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Tanggal Pembelian
              </label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#37352f] mb-1">
                Catatan
              </label>
              <input
                type="text"
                placeholder="No nota / catatan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#d6d3cd] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0eee9]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-2 rounded-lg border border-[#d6d3cd] text-xs font-semibold text-[#5d5b54] hover:bg-[#f6f5f4] cursor-pointer min-h-[36px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#0a1530] hover:bg-[#14234b] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[36px]"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Bahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
