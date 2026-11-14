'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  undoLabel?: string;
  onUndo?: () => void | Promise<void>;
}

interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
  durationMs: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const existing = timersRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const durationMs = options.durationMs ?? (options.onUndo ? 8000 : 4500);
      const item: ToastItem = {
        ...options,
        id,
        tone: options.tone ?? 'neutral',
        createdAt: Date.now(),
        durationMs,
      };

      setToasts((prev) => [...prev.slice(-3), item]);

      if (durationMs > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, durationMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    const map = timersRef.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-3 right-3 md:top-auto md:bottom-5 md:right-5 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-1.5rem)] sm:w-auto pointer-events-none"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'warning'
                ? AlertTriangle
                : toast.tone === 'error'
                  ? AlertCircle
                  : Info;

          const iconColor =
            toast.tone === 'success'
              ? 'text-[var(--status-green-ink)]'
              : toast.tone === 'warning'
                ? 'text-[var(--status-amber-ink)]'
                : toast.tone === 'error'
                  ? 'text-[var(--status-red-ink)]'
                  : 'text-[var(--accent-ink)]';

          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] text-[var(--text)] popover-shadow transition-opacity duration-150'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', iconColor)} aria-hidden="true" />
              <span className="flex-1 min-w-0 leading-snug">{toast.message}</span>

              {toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    const cb = toast.onUndo;
                    dismissToast(toast.id);
                    if (cb) void cb();
                  }}
                  className="inline-flex items-center gap-1 min-h-[32px] px-2 py-1 rounded-md bg-[var(--accent-tint)] text-[var(--accent-ink)] hover:bg-[var(--accent-tint)]/80 font-medium text-[12px] shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{toast.undoLabel ?? 'Urungkan'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Tutup notifikasi"
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
