'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  TrendingUp,
  Package,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { PaymentStatus, ProcessStatus, Order, CreateOrderInput } from '@/types/order';
import { calculateHPP, calculateMargin, formatRp } from '@/lib/utils';

interface OrderFormContentProps {
  editingOrder: Order | null;
  onClose: () => void;
  createOrder: (data: CreateOrderInput) => Promise<Order>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<Order | null>;
}

function OrderFormContent({
  editingOrder,
  onClose,
  createOrder,
  updateOrder,
}: OrderFormContentProps) {
  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Form Fields initialized from editingOrder or defaults
  const [buyerName, setBuyerName] = useState<string>(() => editingOrder?.buyerName ?? '');
  const [buyerPhone, setBuyerPhone] = useState<string>(() => editingOrder?.buyerPhone ?? '');
  const [productName, setProductName] = useState<string>(() => editingOrder?.productName ?? '');
  const [specs, setSpecs] = useState<string>(() => editingOrder?.specs ?? '');
  const [qty, setQty] = useState<number>(() => editingOrder?.qty ?? 0);
  const [pricePerPcs, setPricePerPcs] = useState<number>(() => editingOrder?.pricePerPcs ?? 0);
  const [deadline, setDeadline] = useState<string>(() => {
    if (editingOrder?.deadline) return editingOrder.deadline;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 4);
    return nextDate.toISOString().split('T')[0];
  });
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    () => editingOrder?.paymentStatus ?? 'DP'
  );
  const [dpAmount, setDpAmount] = useState<number>(() => editingOrder?.dpAmount ?? 0);
  const [processStatus, setProcessStatus] = useState<ProcessStatus>(
    () => editingOrder?.processStatus ?? 'ANTREAN'
  );
  const [notes, setNotes] = useState<string>(() => editingOrder?.notes ?? '');

  // HPP Breakdown Inputs (per pcs)
  const [bahanBaku, setBahanBaku] = useState<number>(() => editingOrder?.hppBreakdown.bahanBaku ?? 0);
  const [tintaSablon, setTintaSablon] = useState<number>(() => editingOrder?.hppBreakdown.tintaSablon ?? 0);
  const [tenagaKerja, setTenagaKerja] = useState<number>(() => editingOrder?.hppBreakdown.tenagaKerja ?? 0);
  const [kemasan, setKemasan] = useState<number>(() => editingOrder?.hppBreakdown.kemasan ?? 0);
  const [overhead, setOverhead] = useState<number>(() => editingOrder?.hppBreakdown.overhead ?? 0);

  const [errorMsg, setErrorMsg] = useState<string>('');

  // Real-time calculations (qty 0 => totals 0)
  const safeQty = Math.max(0, qty || 0);
  const safePrice = Math.max(0, pricePerPcs || 0);
  const totalOmzet = safeQty * safePrice;

  const currentHpp = calculateHPP(
    {
      bahanBaku,
      tintaSablon,
      tenagaKerja,
      kemasan,
      overhead,
    },
    Math.max(1, safeQty)
  );
  const totalHppDisplay = safeQty > 0 ? currentHpp.totalHpp : 0;

  const { profit, marginPct } = calculateMargin(totalOmzet, totalHppDisplay);

  // Select whole number on focus so typing replaces the default 0
  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  // Strip non-digits and leading zeros so leading '0' can never stick in any field
  const handleNumericChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const cleaned = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    if (e.target.value !== cleaned) {
      e.target.value = cleaned;
    }
    setter(cleaned === '' ? 0 : Number(cleaned));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerName.trim()) {
      setErrorMsg('Nama pembeli wajib diisi.');
      return;
    }
    if (!productName.trim()) {
      setErrorMsg('Nama produk wajib diisi.');
      return;
    }
    if (safeQty <= 0) {
      setErrorMsg('Kuantitas pesanan minimal 1.');
      return;
    }

    if (editingOrder) {
      updateOrder(editingOrder.id, {
        buyerName,
        buyerPhone,
        productName,
        specs,
        qty: safeQty,
        pricePerPcs: safePrice,
        deadline,
        paymentStatus,
        dpAmount: paymentStatus === 'DP' ? dpAmount : paymentStatus === 'LUNAS' ? totalOmzet : 0,
        processStatus,
        notes,
        hppBreakdown: currentHpp,
      });
    } else {
      createOrder({
        orderDate: new Date().toISOString().split('T')[0],
        deadline,
        buyerName,
        buyerPhone: buyerPhone || '08120000000',
        productName,
        specs: specs || 'Custom Sablon Presisi',
        qty: safeQty,
        pricePerPcs: safePrice,
        hppBreakdown: currentHpp,
        paymentStatus,
        dpAmount: paymentStatus === 'DP' ? dpAmount : paymentStatus === 'LUNAS' ? totalOmzet : 0,
        processStatus,
        designFiles: [],
        notes,
      });
    }

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs overscroll-contain transition-opacity"
    >
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container: Mobile Bottom-Sheet (<640px) & Centered Modal (sm+) */}
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-xl shadow-notion-modal border-t sm:border border-[#e5e3df] flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-fade-in-up z-10">
        {/* Mobile drag indicator pill */}
        <div className="sm:hidden w-10 h-1 bg-[#c8c4be] rounded-full mx-auto my-2 shrink-0" />

        {/* Sticky Header - Notion deep navy hero band */}
        <div className="sticky top-0 z-20 shrink-0 px-5 py-3.5 sm:px-6 sm:py-4 bg-[#0a1530] border-b border-[#1a2a52] flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#5645d4] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(86,69,212,0.4)]">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {editingOrder ? `Edit Pesanan #${editingOrder.orderNumber}` : 'Input Pesanan'}
              </h3>
              <p className="text-xs text-white/80">
                Isi data order dan kalkulasi HPP otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="order-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 flex flex-col gap-5 sm:gap-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Data Pembeli & Produk */}
          <div>
            <h4 className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-3">
              1. Data Pembeli
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Nama Pembeli <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nama pembeli atau instansi"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ganci Akrilik 2 Sisi 5x5 cm"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Spesifikasi Produk
                </label>
                <input
                  type="text"
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  placeholder="Akrilik 3mm, Sablon 3 Warna"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Kuantitas & Harga Jual */}
          <div>
            <h4 className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-3">
              2. Volume & Harga
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Kuantitas (Pcs)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={qty > 0 ? String(qty) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setQty)}
                  className="w-full px-3 py-2 text-sm font-semibold bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Harga Satuan (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={pricePerPcs > 0 ? String(pricePerPcs) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setPricePerPcs)}
                  className="w-full px-3 py-2 text-sm font-semibold bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] focus:ring-1 focus:ring-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Total Omzet
                </label>
                <div className="px-3 py-2 text-sm font-bold text-[#5645d4] bg-[#e6e0f5]/40 border border-[#e5e3df] rounded-md">
                  {formatRp(totalOmzet)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Real-time Automatic HPP Calculator */}
          <div className="p-4 bg-[#f6f5f4] rounded-lg border border-[#e5e3df]">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-[#5645d4]" />
              <h4 className="text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                3. Kalkulator HPP
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#5d5b54] mb-1">
                  Bahan Baku
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={bahanBaku > 0 ? String(bahanBaku) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setBahanBaku)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5d5b54] mb-1">
                  Tinta Sablon
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={tintaSablon > 0 ? String(tintaSablon) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setTintaSablon)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5d5b54] mb-1">
                  Tenaga Kerja
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={tenagaKerja > 0 ? String(tenagaKerja) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setTenagaKerja)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5d5b54] mb-1">
                  Kemasan
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={kemasan > 0 ? String(kemasan) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setKemasan)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5d5b54] mb-1">
                  Overhead
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={overhead > 0 ? String(overhead) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setOverhead)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                />
              </div>
            </div>

            {/* Live Profit & Margin Indicator Box */}
            <div className="mt-4 p-3.5 bg-white rounded-md border border-[#e5e3df] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-[10px] text-[#787671] font-medium">HPP per Pcs</span>
                <p className="text-xs font-semibold text-[#1a1a1a]">
                  {formatRp(currentHpp.totalHppPerPcs)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-[#787671] font-medium">Total HPP ({safeQty} pcs)</span>
                <p className="text-xs font-semibold text-[#1a1a1a]">
                  {formatRp(totalHppDisplay)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-[#787671] font-medium">Estimasi Laba</span>
                <p className="text-xs font-bold text-[#0d5220]">
                  {formatRp(profit)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-[#787671] font-medium">Margin Profit</span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold ${
                      marginPct >= 30
                        ? 'bg-[#d9f3e1] text-[#0d5220]'
                        : marginPct >= 15
                        ? 'bg-[#dcecfa] text-[#004480]'
                        : 'bg-[#ffe8d4] text-[#793400]'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    {marginPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Pembayaran & Alur Proses */}
          <div>
            <h4 className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-3">
              4. Status Pesanan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Status Pembayaran
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                >
                  <option value="LUNAS">Lunas</option>
                  <option value="DP">DP (Uang Muka)</option>
                  <option value="BELUM_LUNAS">Belum Lunas</option>
                </select>
              </div>

              {paymentStatus === 'DP' ? (
                <div>
                  <label className="block text-xs font-medium text-[#37352f] mb-1">
                    Nominal DP (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={dpAmount > 0 ? String(dpAmount) : ''}
                    onFocus={selectOnFocus}
                    onChange={(e) => handleNumericChange(e, setDpAmount)}
                    className="w-full px-3 py-2 text-sm font-semibold bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                  />
                  <p className="text-[11px] text-[#787671] mt-1">
                    Sisa: {formatRp(Math.max(0, totalOmzet - dpAmount))}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[#37352f] mb-1">
                    Sisa Piutang
                  </label>
                  <div className="px-3 py-2 text-sm font-semibold bg-[#f6f5f4] text-[#37352f] rounded-md border border-[#e5e3df]">
                    {paymentStatus === 'LUNAS' ? 'Rp 0' : formatRp(totalOmzet)}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Status Produksi
                </label>
                <select
                  value={processStatus}
                  onChange={(e) => setProcessStatus(e.target.value as ProcessStatus)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                >
                  <option value="ANTREAN">1. Antrean</option>
                  <option value="SETTING_DESAIN">2. Setting Desain</option>
                  <option value="PROSES_CETAK">3. Proses Cetak</option>
                  <option value="FINISHING">4. Finishing</option>
                  <option value="SIAP_KIRIM">5. Siap Kirim</option>
                  <option value="SELESAI">6. Selesai</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-[#37352f] mb-1">
                  Catatan Produksi
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan pengerjaan sablon atau finishing"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4]"
                />
              </div>
            </div>
          </div>

        </form>

        {/* Sticky Footer Action Bar */}
        <div className="sticky bottom-0 z-20 shrink-0 px-5 py-3 sm:px-6 sm:py-3.5 bg-white/95 backdrop-blur-xs border-t border-[#e5e3df] flex items-center justify-end gap-3 shadow-[0_-4px_12px_rgba(15,15,15,0.04)]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-[#37352f] hover:bg-[#e5e3df] rounded-md transition-colors cursor-pointer flex items-center justify-center"
          >
            Batal
          </button>
          <button
            type="submit"
            form="order-form"
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#5645d4] hover:bg-[#4534b3] rounded-md shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pesanan</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderFormModal() {
  const {
    isFormModalOpen,
    setIsFormModalOpen,
    editingOrder,
    createOrder,
    updateOrder,
  } = useOrders();

  if (!isFormModalOpen) return null;

  return (
    <OrderFormContent
      key={editingOrder?.id ?? 'create'}
      editingOrder={editingOrder}
      onClose={() => setIsFormModalOpen(false)}
      createOrder={createOrder}
      updateOrder={updateOrder}
    />
  );
}
