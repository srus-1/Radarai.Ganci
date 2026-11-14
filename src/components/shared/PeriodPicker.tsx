'use client';

import React, { useId } from 'react';
import { Calendar } from 'lucide-react';
import { cn, formatMonthLabel } from '@/lib/utils';

export interface PeriodPickerProps {
  value: string;
  onChange: (month: string) => void;
  months: string[];
  label?: string;
  includeAllOption?: boolean;
  allLabel?: string;
  id?: string;
  className?: string;
}

export default function PeriodPicker({
  value,
  onChange,
  months,
  label = 'Periode',
  includeAllOption = false,
  allLabel = 'Semua periode',
  id,
  className,
}: PeriodPickerProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <label
        htmlFor={selectId}
        className="text-[12px] font-medium text-[var(--text-muted)] whitespace-nowrap"
      >
        {label}
      </label>
      <div className="relative inline-flex items-center">
        <Calendar
          className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none"
          aria-hidden="true"
        />
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 min-h-[36px] pl-8 pr-7 rounded-lg border border-[var(--control-border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--text)] hover:border-[var(--text)] transition-colors cursor-pointer"
        >
          {includeAllOption && <option value="ALL">{allLabel}</option>}
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
