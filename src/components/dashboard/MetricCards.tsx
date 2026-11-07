'use client';

import React from 'react';
import {
  Package,
  Wallet,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { DashboardMetrics } from '@/types/order';
import { formatRp } from '@/lib/utils';

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export default function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      title: 'Total Produksi',
      value: `${metrics.totalPcs.toLocaleString('id-ID')} Pcs`,
      subtext: `${metrics.activeOrdersCount} aktif • ${metrics.completedOrdersCount} selesai`,
      icon: Package,
      badge: 'Volume',
      cardBg: 'bg-[#dcecfa]',
      badgeColor: 'bg-white/80 text-[#004480] border border-[#004480]/20',
      iconBg: 'bg-white/90 text-[#004480]',
    },
    {
      title: 'Total Omzet',
      value: formatRp(metrics.totalOmzet),
      subtext: 'Akumulasi bruto pesanan.',
      icon: Wallet,
      badge: 'Omzet',
      cardBg: 'bg-[#e6e0f5]',
      badgeColor: 'bg-white/80 text-[#391c57] border border-[#391c57]/20',
      iconBg: 'bg-white/90 text-[#391c57]',
    },
    {
      title: 'Laba Bersih',
      value: formatRp(metrics.totalProfit),
      subtext: `Rata-rata margin ${metrics.averageMarginPct}%.`,
      icon: TrendingUp,
      badge: `${metrics.averageMarginPct}% Margin`,
      cardBg: 'bg-[#d9f3e1]',
      badgeColor: 'bg-white/80 text-[#0d5220] border border-[#0d5220]/20',
      iconBg: 'bg-white/90 text-[#0d5220]',
    },
    {
      title: 'Total Piutang',
      value: formatRp(metrics.totalPiutangDp),
      subtext: 'Sisa tagihan belum lunas.',
      icon: AlertCircle,
      badge: metrics.totalPiutangDp > 0 ? 'Perlu Ditagih' : 'Semua Lunas',
      cardBg: metrics.totalPiutangDp > 0 ? 'bg-[#ffe8d4]' : 'bg-[#d9f3e1]',
      badgeColor:
        metrics.totalPiutangDp > 0
          ? 'bg-white/80 text-[#793400] border border-[#793400]/20'
          : 'bg-white/80 text-[#0d5220] border border-[#0d5220]/20',
      iconBg:
        metrics.totalPiutangDp > 0
          ? 'bg-white/90 text-[#793400]'
          : 'bg-white/90 text-[#0d5220]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const delayClass =
          idx === 1
            ? 'delay-75'
            : idx === 2
            ? 'delay-150'
            : idx === 3
            ? 'delay-225'
            : '';
        return (
          <div
            key={idx}
            className={`${card.cardBg} ${delayClass} animate-fade-in-up card-bounce rounded-xl p-3.5 sm:p-4 border border-black/10 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-[#37352f]">
                  {card.title}
                </span>
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 shadow-xs ${card.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1a1a1a]">
                {card.value}
              </h3>
            </div>

            <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-xs">
              <span className="text-[#37352f] flex-1 min-w-0 mr-2 truncate" title={card.subtext}>
                {card.subtext}
              </span>
              <span
                className={`shrink-0 px-1.5 py-0.2 rounded-sm text-[10px] font-semibold border ${card.badgeColor}`}
              >
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
