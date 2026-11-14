'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Package, Wrench, X } from 'lucide-react';
import {
  CapexCategory,
  CapexEntry,
  CreateCapexInput,
  CreateRawMaterialInput,
  RawMaterialCategory,
  RawMaterialEntry,
} from '@/types/capex';
import { formatRp } from '@/lib/utils';

export const CAPEX_CATEGORIES: CapexCategory[] = [
  'Mesin & Peralatan',
  'Perlengkapan Workshop',
  'Elektronik & IT',
  'Renovasi Workshop',
  'Lainnya',
];

export const RAW_MATERIAL_CATEGORIES: RawMaterialCategory[] = [
  'Akrilik & Aksesoris',
  'Tinta & Sablon',
  'Kemasan & Packaging',
  'Sparepart & Consumable',
  'Lainnya',
];

function useDialogLifecycle(onClose: () => void, disabled = false) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && !disabled) {
        onClose();
      }
    };

    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, [onClose, disabled]);

  return dialogRef;
}

export interface CapexFormModalProps {
  entry: CapexEntry | null;
  onClose: () => void;
  onSave: (data: CreateCapexInput) => Promise<void>;
}

export function CapexFormModal({ entry, onClose, onSave }: CapexFormModalProps) {
  const [itemName, setItemName] = useState(entry?.itemName ?? '');
  const [category, setCategory] = useState<string>(entry?.category ?? 'Mesin & Peralatan');
  const [amount, setAmount] = useState<number>(entry?.amount ?? 0);
  const [entryDate, setEntryDate] = useState<string>(
    () => entry?.entryDate || new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState(entry?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dialogRef = useDialogLifecycle(onClose, submitting);
  const titleId = useId();
  const nameId = useId();
  const catId = useId();
  const dateId = useId();
  const amountId = useId();
  const descId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setFormError('Nama barang atau aset wajib diisi.');
      return;
    }
    if (amount <= 0) {
      setFormError('Nilai pembelian capex harus lebih besar dari 0.');
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
      setFormError('Gagal menyimpan data capex.');
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: submitting ? 'none' : 'any' } as Record<string, string>)}
      onCancel={(e) => {
        if (submitting) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] popover-shadow overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-tint)] text-[var(--accent-ink)]">
            <Wrench className="w-4 h-4" aria-hidden="true" />
          </div>
          <h2 id={titleId} className="text-[15px] font-semibold text-[var(--text)] truncate">
            {entry ? 'Edit belanja modal' : 'Tambah capex'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Tutup dialog belanja modal"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-3.5">
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--status-red-border)] bg-[var(--status-red-bg)] px-3 py-2 text-[12px] font-medium text-[var(--status-red-ink)]"
          >
            {formError}
          </div>
        )}

        <div>
          <label
            htmlFor={nameId}
            className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
          >
            Nama barang atau aset <span className="text-[var(--status-red-ink)]">*</span>
          </label>
          <input
            id={nameId}
            type="text"
            required
            autoFocus
            placeholder="Mesin pemanas pin atau rak display"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={catId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Kategori
            </label>
            <select
              id={catId}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] cursor-pointer"
            >
              {CAPEX_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={dateId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Tanggal pembelian
            </label>
            <input
              id={dateId}
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] tabular-nums"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={amountId}
            className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
          >
            Nilai pembelian (Rp) <span className="text-[var(--status-red-ink)]">*</span>
          </label>
          <input
            id={amountId}
            type="number"
            min={0}
            required
            value={amount === 0 ? '' : amount}
            placeholder="0"
            onFocus={(e) => e.target.select()}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] tabular-nums"
          />
          <p className="mt-1 text-[12px] text-[var(--text-muted)] tabular-nums">
            {formatRp(amount)}
          </p>
        </div>

        <div>
          <label
            htmlFor={descId}
            className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
          >
            Keterangan
          </label>
          <textarea
            id={descId}
            rows={2}
            placeholder="Catatan vendor, garansi, atau spesifikasi singkat..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[36px] rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[36px] rounded-lg bg-[var(--accent)] px-4 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Menyimpan...' : 'Simpan capex'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export interface RawMaterialFormModalProps {
  entry: RawMaterialEntry | null;
  onClose: () => void;
  onSave: (data: CreateRawMaterialInput) => Promise<void>;
}

export function RawMaterialFormModal({
  entry,
  onClose,
  onSave,
}: RawMaterialFormModalProps) {
  const [materialName, setMaterialName] = useState(entry?.materialName ?? '');
  const [category, setCategory] = useState<string>(
    entry?.category ?? 'Akrilik & Aksesoris'
  );
  const [supplier, setSupplier] = useState(entry?.supplier ?? '');
  const [quantity, setQuantity] = useState<number>(entry?.quantity ?? 1);
  const [unit, setUnit] = useState(entry?.unit ?? 'pcs');
  const [unitPrice, setUnitPrice] = useState<number>(entry?.unitPrice ?? 0);
  const [entryDate, setEntryDate] = useState<string>(
    () => entry?.entryDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dialogRef = useDialogLifecycle(onClose, submitting);
  const titleId = useId();
  const nameId = useId();
  const catId = useId();
  const supplierId = useId();
  const qtyId = useId();
  const unitId = useId();
  const priceId = useId();
  const dateId = useId();
  const notesId = useId();

  const calculatedTotal = Math.round(
    (Number(quantity) || 0) * (Number(unitPrice) || 0)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      setFormError('Nama bahan baku wajib diisi.');
      return;
    }
    if (quantity <= 0) {
      setFormError('Volume pembelian harus lebih besar dari 0.');
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
      setFormError('Gagal menyimpan catatan bahan baku.');
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: submitting ? 'none' : 'any' } as Record<string, string>)}
      onCancel={(e) => {
        if (submitting) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] popover-shadow overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-tint)] text-[var(--accent-ink)]">
            <Package className="w-4 h-4" aria-hidden="true" />
          </div>
          <h2 id={titleId} className="text-[15px] font-semibold text-[var(--text)] truncate">
            {entry ? 'Edit bahan baku' : 'Tambah bahan baku'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Tutup dialog bahan baku"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-3.5">
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--status-red-border)] bg-[var(--status-red-bg)] px-3 py-2 text-[12px] font-medium text-[var(--status-red-ink)]"
          >
            {formError}
          </div>
        )}

        <div>
          <label
            htmlFor={nameId}
            className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
          >
            Nama bahan baku <span className="text-[var(--status-red-ink)]">*</span>
          </label>
          <input
            id={nameId}
            type="text"
            required
            autoFocus
            placeholder="Gantungan Kunci Akrilik polos Segi 8"
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={catId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Kategori
            </label>
            <select
              id={catId}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] cursor-pointer"
            >
              {RAW_MATERIAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={supplierId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Supplier atau toko
            </label>
            <input
              id={supplierId}
              type="text"
              placeholder="CV Sentosa atau toko marketplace"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label
              htmlFor={qtyId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Volume <span className="text-[var(--status-red-ink)]">*</span>
            </label>
            <input
              id={qtyId}
              type="number"
              min={0.1}
              step="any"
              required
              value={quantity}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] tabular-nums"
            />
          </div>

          <div>
            <label
              htmlFor={unitId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Satuan
            </label>
            <input
              id={unitId}
              type="text"
              required
              placeholder="pcs, gram, lembar"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)]"
            />
          </div>

          <div>
            <label
              htmlFor={priceId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Harga satuan
            </label>
            <input
              id={priceId}
              type="number"
              min={0}
              required
              value={unitPrice === 0 ? '' : unitPrice}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] tabular-nums"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
          <span className="text-[12px] font-medium text-[var(--text-muted)]">
            Total biaya
          </span>
          <span className="text-[14px] font-semibold text-[var(--text)] tabular-nums">
            {formatRp(calculatedTotal)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={dateId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Tanggal pembelian
            </label>
            <input
              id={dateId}
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] tabular-nums"
            />
          </div>

          <div>
            <label
              htmlFor={notesId}
              className="block text-[12px] font-medium text-[var(--text-muted)] mb-1"
            >
              Catatan
            </label>
            <input
              id={notesId}
              type="text"
              placeholder="No nota atau keterangan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[36px] rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[36px] rounded-lg bg-[var(--accent)] px-4 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Menyimpan...' : 'Simpan bahan'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
