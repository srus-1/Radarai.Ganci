'use client';

import React, { useState } from 'react';
import { BuyerSummary } from '@/types/order';
import { formatRp } from '@/lib/utils';
import {
  MessageCircle,
  Trophy,
  TrendingUp,
  Search,
} from 'lucide-react';

interface BuyerProfitTableProps {
  buyers: BuyerSummary[];
}

export default function BuyerProfitTable({ buyers }: BuyerProfitTableProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredBuyers = buyers.filter(
    (b) =>
      b.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.buyerPhone.includes(searchTerm)
  );

  const getRankBadge = (rank?: number) => {
    if (rank === 1) {
      return (
        <span className="w-5 h-5 rounded-md bg-[#f9e79f] text-[#523410] font-bold text-xs flex items-center justify-center">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-5 h-5 rounded-md bg-[#f0eeec] text-[#37352f] font-bold text-xs flex items-center justify-center">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-5 h-5 rounded-md bg-[#ffe8d4] text-[#793400] font-bold text-xs flex items-center justify-center">
          3
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-md bg-[#f6f5f4] text-[#787671] font-medium text-xs flex items-center justify-center">
        {rank}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#d6d3cd] shadow-notion-panel flex flex-col gap-4 animate-fade-in-up delay-150">
      {/* Table Header & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#d9f3e1] text-[#0d5220] flex items-center justify-center shadow-xs">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#1a1a1a]">
              Ranking Pelanggan
            </h3>
          </div>
          <p className="text-xs text-[#787671] mt-0.5">
            Kontributor laba bersih tertinggi workshop.
          </p>
        </div>

        {/* Local Search Input */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#787671]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pelanggan..."
            className="w-full pl-8 pr-3 py-1.5 sm:py-1 text-xs bg-white focus:bg-white border border-[#c8c4be] rounded-md focus:outline-none focus:border-[#5645d4] min-h-[36px] sm:min-h-0"
          />
        </div>
      </div>

      {/* Mobile Card Stack View (< 768px) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredBuyers.length === 0 ? (
          <div className="py-8 text-center text-[#787671] text-xs bg-[#f6f5f4] rounded-lg border border-[#e5e3df]">
            Pelanggan tidak ditemukan.
          </div>
        ) : (
          filteredBuyers.map((buyer) => {
            const cleanPhone = buyer.buyerPhone.replace(/\D/g, '');
            const waNumber = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
            const waUrl = `https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(buyer.buyerName)}`;

            return (
              <div
                key={buyer.buyerName}
                className="p-3.5 rounded-xl border border-[#d6d3cd] bg-white card-bounce flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getRankBadge(buyer.rank)}
                    <h4 className="font-semibold text-sm text-[#1a1a1a]">{buyer.buyerName}</h4>
                  </div>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-medium ${
                      buyer.marginPct >= 35
                        ? 'bg-[#d9f3e1] text-[#0d5220]'
                        : buyer.marginPct >= 20
                        ? 'bg-[#dcecfa] text-[#004480]'
                        : 'bg-[#ffe8d4] text-[#793400]'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    {buyer.marginPct}% Margin
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-[#f6f5f4] p-2.5 rounded-md">
                  <div>
                    <span className="text-[11px] text-[#787671]">Pesanan / Pcs:</span>
                    <p className="font-medium text-[#1a1a1a]">{buyer.totalOrders}x • {buyer.totalPcs.toLocaleString('id-ID')} pcs</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#787671]">Omzet:</span>
                    <p className="font-medium text-[#1a1a1a]">{formatRp(buyer.totalOmzet)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#787671]">Total HPP:</span>
                    <p className="text-[#787671]">{formatRp(buyer.totalHpp)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#787671]">Laba Bersih:</span>
                    <p className="font-bold text-[#0d5220]">{formatRp(buyer.totalProfit)}</p>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline min-h-[36px] py-1"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>{buyer.buyerPhone}</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-md border border-[#e5e3df]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f6f5f4] text-[#787671] font-medium uppercase tracking-wider border-b border-[#e5e3df]">
            <tr>
              <th className="py-2.5 px-3 text-center w-12">Rank</th>
              <th className="py-2.5 px-3">Pelanggan</th>
              <th className="py-2.5 px-3 text-center">Pesanan</th>
              <th className="py-2.5 px-3 text-right">Total Pcs</th>
              <th className="py-2.5 px-3 text-right">Total Omzet</th>
              <th className="py-2.5 px-3 text-right">Total HPP</th>
              <th className="py-2.5 px-3 text-right font-semibold text-[#1a1a1a]">Laba Bersih</th>
              <th className="py-2.5 px-3 text-center">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e3df]">
            {filteredBuyers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#787671]">
                  Pelanggan tidak ditemukan.
                </td>
              </tr>
            ) : (
              filteredBuyers.map((buyer) => {
                const cleanPhone = buyer.buyerPhone.replace(/\D/g, '');
                const waNumber = cleanPhone.startsWith('0')
                  ? `62${cleanPhone.slice(1)}`
                  : cleanPhone;
                const waUrl = `https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(
                  buyer.buyerName
                )},%20terima%20kasih%20telah%20menjadi%20pelanggan%20setia%20di%20eganci`;

                return (
                  <tr
                    key={buyer.buyerName}
                    className="hover:bg-[#f6f5f4] transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">{getRankBadge(buyer.rank)}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1a1a1a]">{buyer.buyerName}</div>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline mt-0.5 min-h-[36px] py-1"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>{buyer.buyerPhone}</span>
                      </a>
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-[#37352f]">
                      {buyer.totalOrders}x
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#37352f]">
                      {buyer.totalPcs.toLocaleString('id-ID')} pcs
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#37352f]">
                      {formatRp(buyer.totalOmzet)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#787671]">
                      {formatRp(buyer.totalHpp)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#0d5220]">
                      {formatRp(buyer.totalProfit)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded-sm text-[11px] font-medium ${
                          buyer.marginPct >= 35
                            ? 'bg-[#d9f3e1] text-[#0d5220]'
                            : buyer.marginPct >= 20
                            ? 'bg-[#dcecfa] text-[#004480]'
                            : 'bg-[#ffe8d4] text-[#793400]'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3 mr-0.5" />
                        {buyer.marginPct}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
