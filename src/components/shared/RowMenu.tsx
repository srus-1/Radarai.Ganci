'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RowMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onSelect: () => void;
}

export interface RowMenuProps {
  items: RowMenuItem[];
  ariaLabel: string;
  align?: 'left' | 'right';
  className?: string;
}

export default function RowMenu({
  items,
  ariaLabel,
  align = 'right',
  className,
}: RowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const actionableItems = items.filter((item) => !item.disabled);

  const computePosition = useCallback(() => {
    if (!buttonRef.current || typeof window === 'undefined') return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 208;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const estHeight = Math.min(260, items.length * 38 + 16);
    const spaceBelow = viewportHeight - rect.bottom;
    const placeAbove = spaceBelow < estHeight + 12 && rect.top > estHeight + 12;
    const rawLeft = align === 'right' ? rect.right - menuWidth : rect.left;
    const left = Math.min(Math.max(12, rawLeft), Math.max(12, viewportWidth - menuWidth - 12));
    const top = placeAbove ? rect.top - 4 : rect.bottom + 4;
    setCoords({ top, left, placeAbove });
  }, [align, items.length]);

  useEffect(() => {
    if (!isOpen) return;

    const raf = requestAnimationFrame(() => {
      const firstEnabledIdx = items.findIndex((i) => !i.disabled);
      if (firstEnabledIdx >= 0) {
        setActiveIndex(firstEnabledIdx);
        itemRefs.current[firstEnabledIdx]?.focus();
      }
    });

    const handleOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleViewportChange = () => setIsOpen(false);

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, items]);

  const moveFocus = (dir: 1 | -1) => {
    if (actionableItems.length === 0) return;
    let cursor = activeIndex;
    for (let i = 0; i < items.length; i += 1) {
      cursor = (cursor + dir + items.length) % items.length;
      if (!items[cursor].disabled) {
        setActiveIndex(cursor);
        itemRefs.current[cursor]?.focus();
        break;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = items.findIndex((i) => !i.disabled);
      if (first >= 0) {
        setActiveIndex(first);
        itemRefs.current[first]?.focus();
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      for (let i = items.length - 1; i >= 0; i -= 1) {
        if (!items[i].disabled) {
          setActiveIndex(i);
          itemRefs.current[i]?.focus();
          break;
        }
      }
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            setIsOpen(false);
          } else {
            computePosition();
            setIsOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          'touch-target-44 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] transition-colors cursor-pointer',
          isOpen && 'bg-[var(--surface-muted)] text-[var(--text)] border-[var(--border)]',
          className
        )}
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={ariaLabel}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? undefined : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
            }}
            className="z-[100] w-[208px] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 popover-shadow"
          >
            {items.map((item, idx) => {
              const isDangerFirst =
                item.tone === 'danger' && idx > 0 && items[idx - 1]?.tone !== 'danger';

              return (
                <React.Fragment key={item.id}>
                  {isDangerFirst && (
                    <div role="separator" className="my-1 h-px bg-[var(--border)]" />
                  )}
                  <button
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      setIsOpen(false);
                      item.onSelect();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                      item.tone === 'danger'
                        ? 'text-[var(--status-red-ink)] hover:bg-[var(--status-red-bg)]'
                        : 'text-[var(--text)] hover:bg-[var(--surface-muted)]'
                    )}
                  >
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span className="truncate">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
