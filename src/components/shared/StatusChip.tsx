'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Package,
  Palette,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  STATUS_STYLE,
  StatusIconName,
  StatusMeta,
  StatusStyleMode,
  StatusTone,
  isQuietNormalStatus,
} from '@/lib/status';
import { cn } from '@/lib/utils';

const TONE_CLASSES: Record<StatusTone, string> = {
  green:
    'bg-[var(--status-green-bg)] text-[var(--status-green-ink)] border-[var(--status-green-border)]',
  amber:
    'bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)] border-[var(--status-amber-border)]',
  blue:
    'bg-[var(--status-blue-bg)] text-[var(--status-blue-ink)] border-[var(--status-blue-border)]',
  red: 'bg-[var(--status-red-bg)] text-[var(--status-red-ink)] border-[var(--status-red-border)]',
  neutral:
    'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-ink)] border-[var(--status-neutral-border)]',
};

export function getStatusChipToneClasses(
  meta: StatusMeta,
  styleMode: StatusStyleMode = STATUS_STYLE
): string {
  if (styleMode === 'quiet-normal' && isQuietNormalStatus(meta.value)) {
    return 'bg-transparent border-transparent text-[var(--status-green-ink)] px-1.5 hover:bg-[var(--surface-muted)]';
  }
  if (meta.value === 'FINISHING' || meta.value === 'SIAP_KIRIM') {
    return 'bg-[var(--status-purple-bg)] text-[var(--status-purple-ink)] border-[var(--status-purple-border)]';
  }
  return TONE_CLASSES[meta.tone];
}

export function StatusIcon({
  name,
  className,
}: {
  name: StatusIconName;
  className?: string;
}) {
  const cls = cn('w-3 h-3 shrink-0', className);
  switch (name) {
    case 'check':
      return <CheckCircle2 className={cls} aria-hidden="true" />;
    case 'clock':
      return <Clock className={cls} aria-hidden="true" />;
    case 'alert':
      return <AlertTriangle className={cls} aria-hidden="true" />;
    case 'palette':
      return <Palette className={cls} aria-hidden="true" />;
    case 'printer':
      return <Printer className={cls} aria-hidden="true" />;
    case 'sparkles':
      return <Sparkles className={cls} aria-hidden="true" />;
    case 'package':
      return <Package className={cls} aria-hidden="true" />;
    default:
      return <HelpCircle className={cls} aria-hidden="true" />;
  }
}

export interface StatusChipProps {
  meta: StatusMeta;
  options?: StatusMeta[];
  onSelect?: (nextValue: string) => void;
  ariaLabel?: string;
  listboxLabel?: string;
  suffix?: string;
  styleMode?: StatusStyleMode;
  className?: string;
  disabled?: boolean;
}

export default function StatusChip({
  meta,
  options,
  onSelect,
  ariaLabel,
  listboxLabel = 'Pilih status',
  suffix,
  styleMode = STATUS_STYLE,
  className,
  disabled = false,
}: StatusChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  const isEditable = Boolean(options && options.length > 0 && onSelect && !disabled);

  const computeCoords = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 200;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const estimatedHeight = Math.min(240, (options?.length ?? 4) * 36 + 12);
    const spaceBelow = viewportHeight - rect.bottom;
    const placeAbove = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight + 12;
    const maxLeft = Math.max(12, viewportWidth - menuWidth - 12);
    const left = Math.min(Math.max(12, rect.left), maxLeft);
    const top = placeAbove ? rect.top - 4 : rect.bottom + 4;
    setCoords({ top, left, placeAbove });
  }, [options]);

  const openMenu = () => {
    if (!isEditable || !options) return;
    const currentIdx = Math.max(
      0,
      options.findIndex((o) => o.value === meta.value)
    );
    setActiveIndex(currentIdx);
    computeCoords();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const timer = requestAnimationFrame(() => {
      optionRefs.current[activeIndex]?.focus();
    });

    const handleOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => setIsOpen(false);

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      cancelAnimationFrame(timer);
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, activeIndex]);

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!options || options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (activeIndex + 1) % options.length;
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (activeIndex - 1 + options.length) % options.length;
      setActiveIndex(prev);
      optionRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      optionRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = options.length - 1;
      setActiveIndex(last);
      optionRefs.current[last]?.focus();
    }
  };

  const baseCls = cn(
    'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold whitespace-nowrap transition-all duration-150 ease-out shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
    getStatusChipToneClasses(meta, styleMode),
    className
  );

  if (!isEditable) {
    return (
      <span className={baseCls}>
        <StatusIcon name={meta.iconName} />
        <span>{meta.label}</span>
        {suffix && <span className="opacity-80 tabular-nums">{suffix}</span>}
      </span>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            setIsOpen(false);
          } else {
            openMenu();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-label={ariaLabel || `${meta.label}, ubah status`}
        className={cn(
          baseCls,
          'touch-target-44 cursor-pointer hover:brightness-[0.96] active:brightness-95'
        )}
      >
        <StatusIcon name={meta.iconName} />
        <span>{meta.label}</span>
        {suffix && <span className="opacity-80 tabular-nums">{suffix}</span>}
      </button>

      {isOpen &&
        options &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={listboxLabel}
            onKeyDown={handleListKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? undefined : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
            }}
            className="z-[100] min-w-[184px] max-w-[220px] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 popover-shadow"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === meta.value;
              return (
                <button
                  key={opt.value}
                  ref={(el) => {
                    optionRefs.current[idx] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setIsOpen(false);
                    if (opt.value !== meta.value) {
                      onSelect?.(opt.value);
                    }
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-[var(--accent-tint)] text-[var(--accent-ink)] font-semibold'
                      : 'text-[var(--text)] hover:bg-[var(--surface-muted)]'
                  )}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <StatusIcon name={opt.iconName} />
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
