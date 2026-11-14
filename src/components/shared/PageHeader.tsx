'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, summary, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-h-[56px] pb-4 mb-4 border-b border-[var(--border)]',
        className
      )}
    >
      <div className="min-w-0">
        <h1
          id="page-main-heading"
          tabIndex={-1}
          className="text-[20px] sm:text-[24px] leading-tight font-semibold tracking-tight text-[var(--text)]"
        >
          {title}
        </h1>
        {summary && (
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)] tabular-nums truncate">
            {summary}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
