'use client';

import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  colWidth?: string;
  stickyRight?: boolean;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  headerClassName?: string;
  cellClassName?: string;
  renderCell: (row: T) => React.ReactNode;
}

export interface DataTableSecondaryGroup<T> {
  label: string;
  subtitle?: string;
  count: number;
  rows: T[];
  isOpen: boolean;
  onToggle: () => void;
  separateContainer?: boolean;
  getRowClassName?: (row: T) => string;
}

export interface DataTableProps<T> {
  caption: string;
  primaryGroupLabel?: string;
  primaryGroupSubtitle?: string;
  rows: T[];
  getRowId: (row: T) => string;
  columns: DataTableColumn<T>[];
  fixedLayout?: boolean;
  secondaryGroup?: DataTableSecondaryGroup<T>;
  primaryEmptyMessage?: string;
  cardHeaderSlot?: React.ReactNode;
  cardFooterSlot?: React.ReactNode;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (rowIds: string[]) => void;
  getSelectLabel?: (row: T) => string;
  expandedIds?: string[];
  onToggleExpand?: (id: string) => void;
  renderExpandedRow?: (row: T) => React.ReactNode;
  getRowClassName?: (row: T) => string;
  renderMobileCard?: (row: T, meta: { isSelected: boolean; isExpanded: boolean }) => React.ReactNode;
  stickyHeader?: boolean;
  emptySlot?: React.ReactNode;
  className?: string;
}

export default function DataTable<T>({
  caption,
  primaryGroupLabel,
  primaryGroupSubtitle,
  rows,
  getRowId,
  columns,
  fixedLayout = false,
  secondaryGroup,
  primaryEmptyMessage = 'Semua pekerjaan produksi aktif dan penagihan sudah selesai.',
  cardHeaderSlot,
  cardFooterSlot,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  getSelectLabel,
  expandedIds,
  onToggleExpand,
  renderExpandedRow,
  getRowClassName,
  renderMobileCard,
  stickyHeader = true,
  emptySlot,
  className,
}: DataTableProps<T>) {
  const secondaryRows = secondaryGroup ? secondaryGroup.rows : [];
  if (rows.length === 0 && secondaryRows.length === 0 && emptySlot) {
    return (
      <div
        className={cn(
          cardHeaderSlot || cardFooterSlot
            ? 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] card-shadow overflow-hidden'
            : '',
          className
        )}
      >
        {cardHeaderSlot}
        <div className={cardHeaderSlot ? 'px-5 sm:px-6 py-6' : undefined}>{emptySlot}</div>
        {cardFooterSlot}
      </div>
    );
  }

  const allRowIds = [
    ...rows.map(getRowId),
    ...(secondaryGroup ? secondaryRows.map(getRowId) : []),
  ];
  const hasSelection = Boolean(onToggleSelect && selectedIds);
  const hasExpand = Boolean(onToggleExpand && renderExpandedRow);
  const hasLeadCol = hasSelection || hasExpand;

  const totalColSpan = columns.length + (hasLeadCol ? 1 : 0);
  const isSplitContainers = Boolean(secondaryGroup?.separateContainer);

  const renderColGroup = () =>
    fixedLayout ? (
      <colgroup>
        {hasLeadCol && <col style={{ width: '56px' }} />}
        {columns.map((col) => (
          <col
            key={col.key}
            style={
              col.colWidth && col.colWidth !== 'auto'
                ? { width: col.colWidth }
                : undefined
            }
          />
        ))}
      </colgroup>
    ) : null;

  const renderTableHead = (subsetRowIds?: string[]) => {
    const targetIds = subsetRowIds ?? allRowIds;
    const subsetAllSelected =
      hasSelection && targetIds.length > 0 && targetIds.every((id) => selectedIds?.includes(id));

    return (
      <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
        <tr className="h-11">
          {hasLeadCol && (
            <th
              scope="col"
              className="w-[56px] bg-[#f4f7fb] rounded-l-xl py-2.5 pl-3.5 pr-1 align-middle"
            >
              {hasSelection && onToggleSelectAll ? (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={subsetAllSelected}
                    onChange={() => onToggleSelectAll(targetIds)}
                    aria-label={subsetAllSelected ? 'Batalkan pilih semua' : 'Pilih semua'}
                    className="h-4 w-4 rounded border-[var(--control-border)] accent-[var(--accent)] cursor-pointer"
                  />
                </div>
              ) : (
                <span className="visually-hidden">Rincian</span>
              )}
            </th>
          )}
          {columns.map((col) => {
            const ariaSortValue = col.sortable
              ? col.sortDirection === 'asc'
                ? 'ascending'
                : col.sortDirection === 'desc'
                  ? 'descending'
                  : 'none'
              : undefined;

            return (
              <th
                key={col.key}
                scope="col"
                aria-sort={ariaSortValue}
                className={cn(
                  'bg-[#f4f7fb] py-2.5 px-2.5 text-[12.5px] font-semibold text-[var(--text-muted)] whitespace-nowrap tracking-normal overflow-hidden',
                  !hasLeadCol && 'first:rounded-l-xl first:pl-4',
                  'last:rounded-r-xl last:pr-4',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.stickyRight && 'sticky right-0 z-10 bg-[#f4f7fb]',
                  col.headerClassName
                )}
              >
                {col.sortable && col.onSort ? (
                  <button
                    type="button"
                    onClick={col.onSort}
                    className={cn(
                      'group/sort inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 py-0.5 text-[12.5px] font-semibold transition-colors cursor-pointer hover:text-[var(--text)]',
                      col.sortDirection ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                      col.align === 'right' && 'ml-auto'
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortDirection === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    ) : col.sortDirection === 'desc' ? (
                      <ArrowDown className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    ) : (
                      <ArrowUpDown
                        className="w-3.5 h-3.5 opacity-60 group-hover/sort:opacity-100 transition-opacity shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
    );
  };

  const renderDesktopRow = (row: T, isSettledRow = false) => {
    const id = getRowId(row);
    const isSelected = Boolean(selectedIds?.includes(id));
    const isExpanded = Boolean(expandedIds?.includes(id));
    const customRowCls = isSettledRow
      ? secondaryGroup?.getRowClassName?.(row)
      : getRowClassName?.(row);

    return (
      <React.Fragment key={id}>
        <tr
          className={cn(
            'group/row h-[64px] transition-colors duration-150 ease-out hover:bg-[#f8fafc] focus-within:ring-2 focus-within:ring-inset focus-within:ring-[var(--accent)]',
            isSelected && 'bg-[var(--accent-tint)]/75 hover:bg-[var(--accent-tint)]',
            customRowCls
          )}
        >
          {hasLeadCol && (
            <td
              className={cn(
                'w-[56px] border-b border-[var(--border)] py-2.5 pl-3.5 pr-1 align-middle',
                isSelected && 'shadow-[inset_3px_0_0_0_var(--accent)]'
              )}
            >
              <div className="flex items-center gap-1">
                {hasSelection && onToggleSelect && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(id)}
                    aria-label={getSelectLabel ? getSelectLabel(row) : `Pilih baris ${id}`}
                    className="h-4 w-4 shrink-0 rounded border-[var(--control-border)] accent-[var(--accent)] cursor-pointer"
                  />
                )}
                {hasExpand && onToggleExpand && (
                  <button
                    type="button"
                    onClick={() => onToggleExpand(id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Tutup rincian baris' : 'Buka rincian baris'}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--border)]/50 hover:text-[var(--text)] cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            </td>
          )}

          {columns.map((col) => (
            <td
              key={col.key}
              className={cn(
                'border-b border-[var(--border)] py-2.5 px-2.5 align-middle text-[13px] min-w-0 overflow-hidden text-[var(--text)]',
                !hasLeadCol && 'first:pl-4',
                !hasLeadCol && isSelected && 'first:shadow-[inset_3px_0_0_0_var(--accent)]',
                'last:pr-4',
                col.align === 'right' && 'text-right tabular-nums',
                col.align === 'center' && 'text-center',
                col.stickyRight &&
                  cn(
                    'sticky right-0 z-10 transition-colors duration-150 ease-out shadow-[-1px_0_0_0_var(--border)]',
                    isSelected
                      ? 'bg-[#eff6ff] group-hover/row:bg-[#e6f0ff]'
                      : 'bg-[var(--surface)] group-hover/row:bg-[#f8fafc]'
                  ),
                col.cellClassName
              )}
            >
              {col.renderCell(row)}
            </td>
          ))}
        </tr>

        {hasExpand && isExpanded && renderExpandedRow && (
          <tr className="bg-[#f8fafc]">
            <td
              colSpan={totalColSpan}
              className="border-b border-[var(--border)] px-5 py-3.5 text-[13px] text-[var(--text)]"
            >
              {renderExpandedRow(row)}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const desktopVisibilityClass = renderMobileCard
    ? fixedLayout
      ? 'hidden @[1120px]:block'
      : 'hidden md:block'
    : 'block';
  const mobileVisibilityClass = fixedLayout ? 'block @[1120px]:hidden' : 'md:hidden';

  if (isSplitContainers) {
    const primaryIds = rows.map(getRowId);
    const secondaryIds = secondaryRows.map(getRowId);

    return (
      <div className={cn('@container min-w-0 space-y-6', className)}>
        {/* CONTAINER 1: Pesanan Belum Selesai / Perlu Tindakan */}
        <section
          aria-label={primaryGroupLabel || 'Pesanan Belum Selesai'}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] card-shadow overflow-hidden"
        >
          {cardHeaderSlot}

          {primaryGroupLabel && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 pt-4 pb-2.5 bg-[var(--surface)]">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--accent)]/15"
                  aria-hidden="true"
                />
                <h2 className="text-[14px] font-bold text-[var(--text)] tracking-tight">
                  {primaryGroupLabel}
                </h2>
                <span className="inline-flex items-center justify-center rounded-full bg-[var(--accent-tint)] border border-[var(--status-blue-border)] px-2.5 py-0.5 text-[11.5px] font-bold text-[var(--accent-ink)] tabular-nums">
                  {rows.length} pesanan
                </span>
              </div>
              {primaryGroupSubtitle && (
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                  {primaryGroupSubtitle}
                </span>
              )}
            </div>
          )}

          {/* Mobile cards for Container 1 */}
          {renderMobileCard && (
            <div
              className={cn(
                mobileVisibilityClass,
                'px-5 sm:px-6 pb-4 space-y-2.5',
                primaryGroupLabel ? 'pt-1' : 'pt-4'
              )}
            >
              {rows.length > 0 ? (
                rows.map((row) => {
                  const id = getRowId(row);
                  const isSelected = Boolean(selectedIds?.includes(id));
                  const isExpanded = Boolean(expandedIds?.includes(id));
                  return (
                    <React.Fragment key={id}>
                      {renderMobileCard(row, { isSelected, isExpanded })}
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 text-center text-[13px] font-medium text-[var(--text-muted)]">
                  {primaryEmptyMessage}
                </div>
              )}
            </div>
          )}

          {/* Desktop table for Container 1 */}
          <div
            className={cn(
              desktopVisibilityClass,
              'min-w-0 px-5 sm:px-6 pb-4',
              primaryGroupLabel ? 'pt-0.5' : 'pt-4'
            )}
          >
            <div
              className={cn(fixedLayout ? 'min-w-0 overflow-x-clip' : 'overflow-x-auto')}
              tabIndex={0}
              role="region"
              aria-label={primaryGroupLabel || caption}
            >
              <table
                className={cn(
                  'w-full text-left border-separate border-spacing-0',
                  fixedLayout && 'table-fixed'
                )}
              >
                <caption className="visually-hidden">{primaryGroupLabel || caption}</caption>
                {renderColGroup()}
                {renderTableHead(primaryIds)}
                <tbody
                  aria-label="Pesanan belum selesai"
                  className="[&>tr:last-child>td]:border-b-0"
                >
                  {rows.length > 0 ? (
                    rows.map((row) => renderDesktopRow(row, false))
                  ) : (
                    <tr className="h-14">
                      <td
                        colSpan={totalColSpan}
                        className="px-4 py-3 text-center text-[13px] font-medium text-[var(--text-muted)]"
                      >
                        {primaryEmptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {(!secondaryGroup || secondaryGroup.count === 0) && cardFooterSlot}
        </section>

        {/* CONTAINER 2: Pesanan Sudah Selesai */}
        {secondaryGroup && secondaryGroup.count > 0 && (
          <section
            aria-label={secondaryGroup.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] card-shadow overflow-hidden"
          >
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 bg-[var(--surface)]',
                secondaryGroup.isOpen ? 'pt-4 pb-2.5' : 'py-3.5'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--status-green-ink)] ring-4 ring-[var(--status-green-bg)]"
                  aria-hidden="true"
                />
                <h2 className="text-[14px] font-bold text-[var(--text)] tracking-tight">
                  {secondaryGroup.label}
                </h2>
                <span className="inline-flex items-center justify-center rounded-full bg-[var(--status-green-bg)] border border-[var(--status-green-border)] px-2.5 py-0.5 text-[11.5px] font-bold text-[var(--status-green-ink)] tabular-nums">
                  {secondaryGroup.count} selesai
                </span>
                {secondaryGroup.subtitle && (
                  <span className="hidden sm:inline text-[12px] font-medium text-[var(--text-muted)]">
                    · {secondaryGroup.subtitle}
                  </span>
                )}
              </div>

              <button
                type="button"
                aria-expanded={secondaryGroup.isOpen}
                onClick={secondaryGroup.onToggle}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)] control-shadow transition-all cursor-pointer"
              >
                {secondaryGroup.isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                )}
                <span>{secondaryGroup.isOpen ? 'Sembunyikan daftar' : 'Tampilkan daftar'}</span>
              </button>
            </div>

            {secondaryGroup.isOpen && (
              <>
                {renderMobileCard && (
                  <div className={cn(mobileVisibilityClass, 'px-5 sm:px-6 pt-1 pb-4 space-y-2.5')}>
                    {secondaryRows.map((row) => {
                      const id = getRowId(row);
                      const isSelected = Boolean(selectedIds?.includes(id));
                      const isExpanded = Boolean(expandedIds?.includes(id));
                      return (
                        <React.Fragment key={id}>
                          {renderMobileCard(row, { isSelected, isExpanded })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                <div className={cn(desktopVisibilityClass, 'min-w-0 px-5 sm:px-6 pt-0.5 pb-4')}>
                  <div
                    className={cn(fixedLayout ? 'min-w-0 overflow-x-clip' : 'overflow-x-auto')}
                    tabIndex={0}
                    role="region"
                    aria-label={secondaryGroup.label}
                  >
                    <table
                      className={cn(
                        'w-full text-left border-separate border-spacing-0',
                        fixedLayout && 'table-fixed'
                      )}
                    >
                      <caption className="visually-hidden">{secondaryGroup.label}</caption>
                      {renderColGroup()}
                      {renderTableHead(secondaryIds)}
                      <tbody
                        aria-label={secondaryGroup.label}
                        className="[&>tr:last-child>td]:border-b-0"
                      >
                        {secondaryRows.map((row) => renderDesktopRow(row, true))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {cardFooterSlot}
          </section>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        '@container min-w-0',
        cardHeaderSlot || cardFooterSlot
          ? 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] card-shadow overflow-hidden'
          : 'space-y-2',
        className
      )}
    >
      {cardHeaderSlot}

      {/* Card list when container < 1120px (fixedLayout) or < 768px (default) */}
      {renderMobileCard && (
        <div
          className={cn(
            mobileVisibilityClass,
            cardHeaderSlot ? 'px-5 sm:px-6 py-4 space-y-2.5' : 'space-y-2.5'
          )}
        >
          {rows.length > 0 ? (
            rows.map((row) => {
              const id = getRowId(row);
              const isSelected = Boolean(selectedIds?.includes(id));
              const isExpanded = Boolean(expandedIds?.includes(id));
              return (
                <React.Fragment key={id}>
                  {renderMobileCard(row, { isSelected, isExpanded })}
                </React.Fragment>
              );
            })
          ) : secondaryGroup && secondaryRows.length > 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-center text-[12px] text-[var(--text-muted)]">
              {primaryEmptyMessage}
            </div>
          ) : null}

          {secondaryGroup && secondaryGroup.count > 0 && (
            <div className="pt-1 space-y-2">
              <button
                type="button"
                aria-expanded={secondaryGroup.isOpen}
                onClick={secondaryGroup.onToggle}
                className="w-full min-h-[40px] flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  {secondaryGroup.isOpen ? (
                    <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {secondaryGroup.label} ({secondaryGroup.count})
                  </span>
                </span>
                <span className="font-normal">
                  {secondaryGroup.isOpen ? 'Sembunyikan' : 'Tampilkan'}
                </span>
              </button>

              {secondaryGroup.isOpen &&
                secondaryRows.map((row) => {
                  const id = getRowId(row);
                  const isSelected = Boolean(selectedIds?.includes(id));
                  const isExpanded = Boolean(expandedIds?.includes(id));
                  return (
                    <React.Fragment key={id}>
                      {renderMobileCard(row, { isSelected, isExpanded })}
                    </React.Fragment>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Desktop semantic table */}
      <div
        className={cn(
          desktopVisibilityClass,
          'min-w-0 px-5 sm:px-6 py-4',
          !cardHeaderSlot &&
            !cardFooterSlot &&
            'rounded-2xl border border-[var(--border)] bg-[var(--surface)] card-shadow overflow-hidden'
        )}
      >
        <div
          className={cn(fixedLayout ? 'min-w-0 overflow-x-clip' : 'overflow-x-auto')}
          tabIndex={0}
          role="region"
          aria-label={caption}
        >
          <table
            className={cn(
              'w-full text-left border-separate border-spacing-0',
              fixedLayout && 'table-fixed'
            )}
          >
            <caption className="visually-hidden">{caption}</caption>
            {renderColGroup()}
            {renderTableHead()}

            {/* Primary tbody: Perlu tindakan */}
            <tbody aria-label="Perlu tindakan" className="[&>tr:last-child>td]:border-b-0">
              {rows.length > 0 ? (
                rows.map((row) => renderDesktopRow(row, false))
              ) : secondaryGroup && secondaryRows.length > 0 ? (
                <tr className="h-12">
                  <td
                    colSpan={totalColSpan}
                    className="px-4 py-2.5 text-center text-[12px] text-[var(--text-muted)]"
                  >
                    {primaryEmptyMessage}
                  </td>
                </tr>
              ) : null}
            </tbody>

            {/* Secondary tbody fallback */}
            {secondaryGroup && secondaryGroup.count > 0 && (
              <tbody
                aria-label={secondaryGroup.label}
                className="[&>tr:last-child>td]:border-b-0"
              >
                <tr>
                  <td colSpan={totalColSpan} className="pt-3 pb-1 px-0">
                    <button
                      type="button"
                      aria-expanded={secondaryGroup.isOpen}
                      onClick={secondaryGroup.onToggle}
                      className="w-full h-10 px-3.5 flex items-center justify-between rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-left text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/35 transition-colors cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {secondaryGroup.isOpen ? (
                          <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {secondaryGroup.label} ({secondaryGroup.count})
                        </span>
                      </span>
                      <span className="font-normal text-[12px]">
                        {secondaryGroup.isOpen ? 'Sembunyikan' : 'Tampilkan'}
                      </span>
                    </button>
                  </td>
                </tr>
                {secondaryGroup.isOpen &&
                  secondaryRows.map((row) => renderDesktopRow(row, true))}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {cardFooterSlot}
    </div>
  );
}
