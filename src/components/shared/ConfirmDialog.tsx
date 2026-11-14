'use client';

import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  tone = 'danger',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
          cancelBtnRef.current?.focus();
        } catch {
          // Ignore if already open or DOM node detached
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Progressive fallback for browsers lacking <dialog closedby="any">
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

    const handleDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const handleUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && !isPending) {
        onCancel();
      }
    };

    dialog.addEventListener('pointerdown', handleDown);
    dialog.addEventListener('pointerup', handleUp);
    return () => {
      dialog.removeEventListener('pointerdown', handleDown);
      dialog.removeEventListener('pointerup', handleUp);
    };
  }, [onCancel, isPending]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      // React 19 passes unknown attributes cleanly when cast
      {...({ closedby: isPending ? 'none' : 'any' } as Record<string, string>)}
      onCancel={(e) => {
        if (isPending) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        onCancel();
      }}
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = '';
        }
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] popover-shadow backdrop:bg-[#18181b]/45"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                tone === 'danger'
                  ? 'bg-[var(--status-red-bg)] border-[var(--status-red-border)] text-[var(--status-red-ink)]'
                  : 'bg-[var(--accent-tint)] border-[var(--accent-tint)] text-[var(--accent-ink)]'
              )}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="text-[16px] font-semibold text-[var(--text)]">
                {title}
              </h2>
              <p id={descId} className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            autoFocus
            className="min-h-[36px] rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isPending}
            className={cn(
              'min-h-[36px] rounded-lg px-3.5 text-[13px] font-medium text-white transition-colors disabled:opacity-50 cursor-pointer',
              tone === 'danger'
                ? 'bg-[var(--status-red-ink)] hover:opacity-90'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
            )}
          >
            {isPending ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
