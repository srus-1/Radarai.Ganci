'use client';

import React, { useId, useMemo, useState } from 'react';
import { MessageCircle, Search, X } from 'lucide-react';
import { BuyerSummary } from '@/types/order';
import {
  buildWhatsAppUrl,
  formatPercent,
  formatRp,
  formatUnitQty,
} from '@/lib/utils';

export interface BuyerProfitTableProps {
  buyers: BuyerSummary[];
}

export default function BuyerProfitTable({ buyers }: BuyerProfitTableProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAll, setShowAll] = useState<boolean>(false);
  const headingId = useId();
  const searchId = useId();

  const filteredBuyers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return buyers;
    return buyers.filter(
      (b) =>
        b.buyerName.toLowerCase().includes(q) ||
        b.buyerPhone.toLowerCase().includes(q)
    );
  }, [buyers, searchTerm]);

  const isFiltering = searchTerm.trim().length > 0;
  const visibleBuyers =
    isFiltering || showAll ? filteredBuyers : filteredBuyers.slice(0, 5);
  const canToggleMore = !isFiltering && filteredBuyers.length > 5;

  const maxProfit = useMemo(
    () => Math.max(...buyers.map((b) => Math.max(0, b.totalProfit)), 1),
    [buyers]
  );

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 id={headingId} className="text-[14px] font-semibold text-[var(--text)]">
            Pelanggan terbaik
          </h2>
          <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
            ({buyers.length})
          </span>
        </div>

        <div className="relative w-full sm:w-56">
          <label htmlFor={searchId} className="visually-hidden">
            Cari pelanggan terbaik
          </label>
          <Search
            className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pelanggan..."
            className="h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] pl-8 pr-7 text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Hapus pencarian pelanggan"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {filteredBuyers.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-[var(--text-muted)]">
            {searchTerm.trim()
              ? 'Tidak ada pelanggan yang cocok dengan pencarian.'
              : 'Belum ada data pelanggan pada periode ini.'}
          </p>
          {searchTerm.trim() && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="mt-2 inline-flex min-h-[32px] items-center rounded-md border border-[var(--control-border)] px-3 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
            >
              Reset pencarian
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[var(--border)]">
            {visibleBuyers.map((buyer, idx) => {
              const rank = buyer.rank ?? idx + 1;
              const waUrl = buildWhatsAppUrl(buyer.buyerPhone);
              const barWidthPct =
                maxProfit > 0
                  ? Math.max(
                      buyer.totalProfit > 0 ? 4 : 0,
                      Math.min(100, Math.round((Math.max(0, buyer.totalProfit) / maxProfit) * 100))
                    )
                  : 0;

              return (
                <li
                  key={`${buyer.buyerName}-${rank}`}
                  className="px-4 py-2.5 hover:bg-[var(--surface-muted)]/60 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-[12px] font-medium text-[var(--text-muted)] tabular-nums shrink-0">
                        {rank}.
                      </span>
                      <span
                        className="font-medium text-[13px] text-[var(--text)] truncate"
                        title={buyer.buyerName}
                      >
                        {buyer.buyerName}
                      </span>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={buyer.buyerPhone}
                          aria-label={`Hubungi ${buyer.buyerName} via WhatsApp`}
                          className="touch-target-44 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--status-green-bg)] hover:text-[var(--status-green-ink)] transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      )}
                      <span className="text-[12px] text-[var(--text-muted)] tabular-nums shrink-0">
                        {buyer.totalOrders}x · {formatUnitQty(buyer.totalPcs, 'pcs')}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2.5 text-[12px] tabular-nums ml-auto">
                      <span className="text-[var(--text-muted)]">
                        Omzet {formatRp(buyer.totalOmzet)}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        Margin {formatPercent(buyer.marginPct)}
                      </span>
                      <span className="text-[13px] font-semibold text-[var(--text)]">
                        Laba {formatRp(buyer.totalProfit)}
                      </span>
                    </div>
                  </div>

                  {/* Thin proportional profit share bar */}
                  <div
                    aria-hidden="true"
                    className="mt-1.5 ml-7 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {canToggleMore && (
            <div className="border-t border-[var(--border)] px-4 py-2 text-center">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="inline-flex min-h-[36px] items-center justify-center rounded-md px-3 text-[12px] font-medium text-[var(--accent-ink)] hover:bg-[var(--accent-tint)]/60 cursor-pointer"
              >
                {showAll
                  ? 'Tampilkan 5 teratas'
                  : `Lihat semua (${filteredBuyers.length} pelanggan)`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
