'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Calculator, Package, Save, TrendingUp, X } from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { CreateOrderInput, Order, PaymentStatus, ProcessStatus } from '@/types/order';
import { calculateHPP, calculateMargin, formatPercent, formatRp } from '@/lib/utils';
import { useToast } from '@/components/shared/ToastProvider';

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
  const { showToast } = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const buyerNameId = useId();
  const buyerPhoneId = useId();
  const productNameId = useId();
  const deadlineId = useId();
  const specsId = useId();
  const qtyId = useId();
  const priceId = useId();
  const hppBahanId = useId();
  const hppTintaId = useId();
  const hppKerjaId = useId();
  const hppKemasanId = useId();
  const hppOverheadId = useId();
  const paymentStatusId = useId();
  const dpAmountId = useId();
  const processStatusId = useId();
  const notesId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        // Ignore if already open
      }
    }
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

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

  const [bahanBaku, setBahanBaku] = useState<number>(() => editingOrder?.hppBreakdown.bahanBaku ?? 0);
  const [tintaSablon, setTintaSablon] = useState<number>(
    () => editingOrder?.hppBreakdown.tintaSablon ?? 0
  );
  const [tenagaKerja, setTenagaKerja] = useState<number>(
    () => editingOrder?.hppBreakdown.tenagaKerja ?? 0
  );
  const [kemasan, setKemasan] = useState<number>(() => editingOrder?.hppBreakdown.kemasan ?? 0);
  const [overhead, setOverhead] = useState<number>(() => editingOrder?.hppBreakdown.overhead ?? 0);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

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

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerName.trim()) {
      setErrorMsg('Nama customer wajib diisi.');
      return;
    }
    if (!productName.trim()) {
      setErrorMsg('Nama produk wajib diisi.');
      return;
    }
    if (safeQty <= 0) {
      setErrorMsg('Kuantitas pesanan minimal 1 pcs.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const normalizedDp =
        paymentStatus === 'DP' ? dpAmount : paymentStatus === 'LUNAS' ? totalOmzet : 0;

      if (editingOrder) {
        await updateOrder(editingOrder.id, {
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          productName: productName.trim(),
          specs: specs.trim(),
          qty: safeQty,
          pricePerPcs: safePrice,
          deadline,
          paymentStatus,
          dpAmount: normalizedDp,
          processStatus,
          notes: notes.trim() || undefined,
          hppBreakdown: currentHpp,
        });
        showToast({ message: `Pesanan ${editingOrder.orderNumber} diperbarui`, tone: 'success' });
      } else {
        await createOrder({
          orderDate: new Date().toISOString().split('T')[0],
          deadline,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          productName: productName.trim(),
          specs: specs.trim() || 'Custom Sablon Presisi',
          qty: safeQty,
          pricePerPcs: safePrice,
          hppBreakdown: currentHpp,
          paymentStatus,
          dpAmount: normalizedDp,
          processStatus,
          designFiles: [],
          notes: notes.trim() || undefined,
        });
        showToast({ message: 'Pesanan baru disimpan', tone: 'success' });
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan pesanan. Periksa koneksi lalu coba lagi.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-full sm:max-w-3xl max-h-[92vh] rounded-t-xl sm:rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] popover-shadow overflow-hidden"
    >
      <div className="flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-tint)] text-[var(--accent-ink)]">
              <Package className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-[16px] font-semibold text-[var(--text)] truncate">
                {editingOrder ? `Edit pesanan ${editingOrder.orderNumber}` : 'Input pesanan'}
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">
                Lengkapi data pesanan dan rincian biaya HPP per pcs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form pesanan"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="order-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5"
        >
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-[var(--status-red-bg)] border border-[var(--status-red-border)] text-[var(--status-red-ink)] text-[13px] flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--text)]">Data customer & produk</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor={buyerNameId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Nama customer <span className="text-[var(--status-red-ink)]">*</span>
                </label>
                <input
                  id={buyerNameId}
                  type="text"
                  required
                  autoFocus
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nama customer"
                  className="w-full h-9 px-3 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg text-[var(--text)]"
                />
              </div>

              <div>
                <label
                  htmlFor={buyerPhoneId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  No. WhatsApp
                </label>
                <input
                  id={buyerPhoneId}
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full h-9 px-3 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg text-[var(--text)] tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor={productNameId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Nama produk <span className="text-[var(--status-red-ink)]">*</span>
                </label>
                <input
                  id={productNameId}
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ganci akrilik 2 sisi 5x5 cm"
                  className="w-full h-9 px-3 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg text-[var(--text)]"
                />
              </div>

              <div>
                <label
                  htmlFor={deadlineId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Deadline produksi
                </label>
                <input
                  id={deadlineId}
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg text-[var(--text)] tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor={specsId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Spesifikasi produk
                </label>
                <input
                  id={specsId}
                  type="text"
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  placeholder="Akrilik 3mm, sablon 3 warna"
                  className="w-full h-9 px-3 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg text-[var(--text)]"
                />
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--text)]">Volume & harga jual</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor={qtyId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Kuantitas (pcs)
                </label>
                <input
                  id={qtyId}
                  type="text"
                  inputMode="numeric"
                  placeholder="10"
                  value={qty > 0 ? String(qty) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setQty)}
                  className="w-full h-9 px-3 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--control-border)] rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor={priceId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Harga satuan (Rp)
                </label>
                <input
                  id={priceId}
                  type="text"
                  inputMode="numeric"
                  placeholder="6000"
                  value={pricePerPcs > 0 ? String(pricePerPcs) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setPricePerPcs)}
                  className="w-full h-9 px-3 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--control-border)] rounded-lg tabular-nums"
                />
              </div>

              <div>
                <span className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
                  Total omzet
                </span>
                <div className="h-9 px-3 flex items-center text-[14px] font-semibold text-[var(--accent-ink)] bg-[var(--accent-tint)] border border-[var(--border)] rounded-lg tabular-nums">
                  {formatRp(totalOmzet)}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: HPP Calculator */}
          <section className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/60 space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[var(--accent-ink)]" aria-hidden="true" />
              <h3 className="text-[13px] font-semibold text-[var(--text)]">Kalkulator HPP per pcs</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label
                  htmlFor={hppBahanId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Bahan baku
                </label>
                <input
                  id={hppBahanId}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={bahanBaku > 0 ? String(bahanBaku) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setBahanBaku)}
                  className="w-full h-8 px-2.5 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor={hppTintaId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Tinta sablon
                </label>
                <input
                  id={hppTintaId}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={tintaSablon > 0 ? String(tintaSablon) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setTintaSablon)}
                  className="w-full h-8 px-2.5 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor={hppKerjaId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Tenaga kerja
                </label>
                <input
                  id={hppKerjaId}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={tenagaKerja > 0 ? String(tenagaKerja) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setTenagaKerja)}
                  className="w-full h-8 px-2.5 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor={hppKemasanId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Kemasan
                </label>
                <input
                  id={hppKemasanId}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={kemasan > 0 ? String(kemasan) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setKemasan)}
                  className="w-full h-8 px-2.5 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor={hppOverheadId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Overhead
                </label>
                <input
                  id={hppOverheadId}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={overhead > 0 ? String(overhead) : ''}
                  onFocus={selectOnFocus}
                  onChange={(e) => handleNumericChange(e, setOverhead)}
                  className="w-full h-8 px-2.5 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg tabular-nums"
                />
              </div>
            </div>

            <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)] grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="block text-[12px] text-[var(--text-muted)]">HPP per pcs</span>
                <p className="text-[13px] font-semibold text-[var(--text)] tabular-nums">
                  {formatRp(currentHpp.totalHppPerPcs)}
                </p>
              </div>
              <div>
                <span className="block text-[12px] text-[var(--text-muted)]">
                  Total HPP ({safeQty} pcs)
                </span>
                <p className="text-[13px] font-semibold text-[var(--text)] tabular-nums">
                  {formatRp(totalHppDisplay)}
                </p>
              </div>
              <div>
                <span className="block text-[12px] text-[var(--text-muted)]">Estimasi laba</span>
                <p className="text-[13px] font-semibold text-[var(--text)] tabular-nums">
                  {formatRp(profit)}
                </p>
              </div>
              <div>
                <span className="block text-[12px] text-[var(--text-muted)]">Margin</span>
                <div className="mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 h-6 rounded-full border text-[12px] font-medium tabular-nums ${
                      marginPct >= 30
                        ? 'bg-[var(--status-green-bg)] text-[var(--status-green-ink)] border-[var(--status-green-border)]'
                        : marginPct >= 15
                          ? 'bg-[var(--status-blue-bg)] text-[var(--status-blue-ink)] border-[var(--status-blue-border)]'
                          : 'bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)] border-[var(--status-amber-border)]'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    {formatPercent(marginPct, 1)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--text)]">Status & catatan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor={paymentStatusId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Status pembayaran
                </label>
                <select
                  id={paymentStatusId}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg"
                >
                  <option value="LUNAS">Lunas</option>
                  <option value="DP">DP (uang muka)</option>
                  <option value="BELUM_LUNAS">Belum lunas</option>
                </select>
              </div>

              {paymentStatus === 'DP' ? (
                <div>
                  <label
                    htmlFor={dpAmountId}
                    className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                  >
                    Nominal DP (Rp)
                  </label>
                  <input
                    id={dpAmountId}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={dpAmount > 0 ? String(dpAmount) : ''}
                    onFocus={selectOnFocus}
                    onChange={(e) => handleNumericChange(e, setDpAmount)}
                    className="w-full h-9 px-3 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--control-border)] rounded-lg tabular-nums"
                  />
                  <p className="text-[12px] text-[var(--text-muted)] mt-1 tabular-nums">
                    Sisa: {formatRp(Math.max(0, totalOmzet - dpAmount))}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
                    Sisa piutang
                  </span>
                  <div className="h-9 px-3 flex items-center text-[13px] font-semibold bg-[var(--surface-muted)] text-[var(--text)] rounded-lg border border-[var(--border)] tabular-nums">
                    {paymentStatus === 'LUNAS' ? 'Rp 0' : formatRp(totalOmzet)}
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor={processStatusId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Status produksi
                </label>
                <select
                  id={processStatusId}
                  value={processStatus}
                  onChange={(e) => setProcessStatus(e.target.value as ProcessStatus)}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg"
                >
                  <option value="ANTREAN">1. Antrean</option>
                  <option value="SETTING_DESAIN">2. Setting desain</option>
                  <option value="PROSES_CETAK">3. Proses cetak</option>
                  <option value="FINISHING">4. Finishing</option>
                  <option value="SIAP_KIRIM">5. Siap kirim</option>
                  <option value="SELESAI">6. Selesai</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor={notesId}
                  className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Catatan produksi
                </label>
                <textarea
                  id={notesId}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan pengerjaan sablon atau finishing"
                  className="w-full px-3 py-2 text-[13px] bg-[var(--surface)] border border-[var(--control-border)] rounded-lg"
                />
              </div>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] px-4 rounded-lg border border-[var(--control-border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="order-form"
            disabled={saving}
            className="min-h-[36px] px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[13px] font-medium text-white flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>{saving ? 'Menyimpan...' : 'Simpan pesanan'}</span>
          </button>
        </div>
      </div>
    </dialog>
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
