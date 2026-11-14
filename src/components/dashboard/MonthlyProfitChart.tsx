'use client';

import React, { useId, useMemo, useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { MonthlyProfitData, Order } from '@/types/order';
import {
  formatMonthLabel,
  formatNumberId,
  formatPercent,
  formatRp,
  formatUnitQty,
  parseLocalDate,
} from '@/lib/utils';

export interface MonthlyProfitChartProps {
  data: MonthlyProfitData[];
  orders?: Order[];
  selectedMonth?: string;
}

interface ChartPoint {
  key: string;
  label: string;
  shortLabel: string;
  omzet: number;
  hpp: number;
  profit: number;
  marginPct: number;
  pcs: number;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function computeNiceScale(maxValue: number): { max: number; step: number } {
  const safeMax = Math.max(maxValue, 10000);
  const rawStep = safeMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;

  let niceMultiplier = 10;
  if (residual <= 1) niceMultiplier = 1;
  else if (residual <= 1.5) niceMultiplier = 1.5;
  else if (residual <= 2) niceMultiplier = 2;
  else if (residual <= 2.5) niceMultiplier = 2.5;
  else if (residual <= 5) niceMultiplier = 5;

  const step = niceMultiplier * magnitude;
  return { step, max: step * 4 };
}

function formatAxisTick(value: number): string {
  if (value <= 0) return '0';
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted = Number.isInteger(millions)
      ? String(millions)
      : formatNumberId(millions, 1);
    return `${formatted} jt`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    const formatted = Number.isInteger(thousands)
      ? formatNumberId(thousands, 0)
      : formatNumberId(thousands, 1);
    return `${formatted} rb`;
  }
  return formatNumberId(value, 0);
}

export function buildAdaptiveSeries(
  data: MonthlyProfitData[],
  orders?: Order[],
  selectedMonth?: string
): { points: ChartPoint[]; title: string } {
  // Use monthly series when 3 or more distinct months have history
  if (data.length >= 3 || !orders || orders.length === 0) {
    return {
      title: 'Omzet dan laba per bulan',
      points: data.map((d) => ({
        key: d.month,
        label: d.monthLabel,
        shortLabel: d.monthLabel,
        omzet: d.omzet,
        hpp: d.hpp,
        profit: d.profit,
        marginPct: d.marginPct,
        pcs: d.pcs,
      })),
    };
  }

  // Filter orders to selectedMonth when available, otherwise use all orders in this <3-month view
  const scopedOrders = selectedMonth
    ? orders.filter((o) => {
        const d = parseLocalDate(o.orderDate || o.createdAt);
        if (!d) return false;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return ym === selectedMonth;
      })
    : orders;

  const sourceOrders = scopedOrders.length > 0 ? scopedOrders : orders;
  const periodTitleSuffix = selectedMonth ? `, ${formatMonthLabel(selectedMonth)}` : '';

  const dailyMap = new Map<string, ChartPoint>();
  for (const o of sourceOrders) {
    const d = parseLocalDate(o.orderDate || o.createdAt);
    if (!d) continue;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const shortLabel = `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;

    const curr = dailyMap.get(iso) || {
      key: iso,
      label: shortLabel,
      shortLabel,
      omzet: 0,
      hpp: 0,
      profit: 0,
      marginPct: 0,
      pcs: 0,
    };
    curr.omzet += o.omzet;
    curr.hpp += o.hppBreakdown.totalHpp;
    curr.profit += o.profit;
    curr.pcs += o.qty;
    dailyMap.set(iso, curr);
  }

  const dailyPoints = Array.from(dailyMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((pt) => ({
      ...pt,
      marginPct: pt.omzet > 0 ? Math.round(((pt.profit / pt.omzet) * 100) * 10) / 10 : 0,
    }));

  // Group into weekly buckets if a single month has more than 14 active dates
  if (dailyPoints.length > 14) {
    const weekMap = new Map<number, ChartPoint>();
    for (const pt of dailyPoints) {
      const dayNum = Number(pt.key.slice(8, 10)) || 1;
      const weekIdx = Math.min(5, Math.ceil(dayNum / 7));
      const curr = weekMap.get(weekIdx) || {
        key: `w-${weekIdx}`,
        label: `Minggu ${weekIdx}${periodTitleSuffix}`,
        shortLabel: `Mg ${weekIdx}`,
        omzet: 0,
        hpp: 0,
        profit: 0,
        marginPct: 0,
        pcs: 0,
      };
      curr.omzet += pt.omzet;
      curr.hpp += pt.hpp;
      curr.profit += pt.profit;
      curr.pcs += pt.pcs;
      weekMap.set(weekIdx, curr);
    }

    const weeklyPoints = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, pt]) => ({
        ...pt,
        marginPct:
          pt.omzet > 0 ? Math.round(((pt.profit / pt.omzet) * 100) * 10) / 10 : 0,
      }));

    return {
      title: `Omzet dan laba per minggu${periodTitleSuffix}`,
      points: weeklyPoints,
    };
  }

  return {
    title: `Omzet dan laba per hari${periodTitleSuffix}`,
    points: dailyPoints,
  };
}

export default function MonthlyProfitChart({
  data,
  orders,
  selectedMonth,
}: MonthlyProfitChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState<boolean>(false);
  const groupRefs = React.useRef<(SVGGElement | null)[]>([]);
  const headingId = useId();

  const { title, points } = useMemo(
    () => buildAdaptiveSeries(data, orders, selectedMonth),
    [data, orders, selectedMonth]
  );

  const summary = useMemo(() => {
    const totalOmzet = points.reduce((s, p) => s + p.omzet, 0);
    const totalProfit = points.reduce((s, p) => s + p.profit, 0);
    return { totalOmzet, totalProfit };
  }, [points]);

  if (points.length === 0) {
    return (
      <section
        aria-labelledby={headingId}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-center"
      >
        <h2 id={headingId} className="text-[14px] font-semibold text-[var(--text)]">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Belum ada data transaksi pada periode ini untuk ditampilkan pada grafik.
        </p>
      </section>
    );
  }

  const maxDataVal = Math.max(
    ...points.map((p) => Math.max(p.omzet, p.profit, 0)),
    10000
  );
  const { max: niceMax } = computeNiceScale(maxDataVal);

  const isCompactMobileFit = points.length <= 7;
  const chartWidth = points.length <= 4 ? 480 : 720;
  const chartHeight = 200;
  const padLeft = 58;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 30;
  const usableW = chartWidth - padLeft - padRight;
  const usableH = chartHeight - padTop - padBottom;

  const groupW = usableW / points.length;
  const barW = Math.max(12, Math.min(28, (groupW - 20) / 2));
  const yFractions = [0, 0.25, 0.5, 0.75, 1];
  const activePoint = activeIdx !== null ? points[activeIdx] : null;

  const handleBarKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(points.length - 1, idx + 1);
      setActiveIdx(next);
      groupRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(0, idx - 1);
      setActiveIdx(prev);
      groupRefs.current[prev]?.focus();
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 mb-4"
    >
      {/* Compact Header + Inline Legend + Accessible Table Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
        <div className="min-w-0">
          <h2 id={headingId} className="text-[14px] font-semibold text-[var(--text)]">
            {title}
          </h2>
          {activePoint ? (
            <p
              aria-live="polite"
              className="mt-0.5 text-[12px] text-[var(--text)] tabular-nums"
            >
              <span className="font-semibold">{activePoint.label}</span>: Omzet{' '}
              <span className="font-medium">{formatRp(activePoint.omzet)}</span> · HPP{' '}
              <span className="text-[var(--text-muted)]">{formatRp(activePoint.hpp)}</span> · Laba{' '}
              <span className="font-medium text-[var(--status-green-ink)]">
                {formatRp(activePoint.profit)}
              </span>{' '}
              ({formatPercent(activePoint.marginPct)} · {formatUnitQty(activePoint.pcs, 'pcs')})
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)] tabular-nums">
              {points.length} titik data · Total omzet {formatRp(summary.totalOmzet)} · Laba{' '}
              {formatRp(summary.totalProfit)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Compact Inline Legend */}
          <div className="flex items-center gap-3 text-[12px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-xs bg-[var(--accent)]"
                aria-hidden="true"
              />
              <span>Omzet</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-xs bg-[var(--status-green-ink)]"
                aria-hidden="true"
              />
              <span>Laba</span>
            </span>
          </div>

          <button
            type="button"
            aria-pressed={showTable}
            onClick={() => setShowTable((prev) => !prev)}
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-[var(--control-border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            {showTable ? (
              <>
                <BarChart3 className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                <span>Tampilkan grafik</span>
              </>
            ) : (
              <>
                <Table2 className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                <span>Tampilkan tabel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Accessible Semantic Data Table View */}
      {showTable ? (
        <div className="mt-3 overflow-x-auto rounded-md border border-[var(--border)]">
          <table className="w-full text-left border-collapse">
            <caption className="visually-hidden">{title}</caption>
            <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
              <tr>
                <th scope="col" className="py-2 px-3 text-[12px] font-medium text-[var(--text-muted)]">
                  Periode
                </th>
                <th scope="col" className="py-2 px-3 text-[12px] font-medium text-[var(--text-muted)] text-right">
                  Volume
                </th>
                <th scope="col" className="py-2 px-3 text-[12px] font-medium text-[var(--text-muted)] text-right">
                  Omzet
                </th>
                <th scope="col" className="py-2 px-3 text-[12px] font-medium text-[var(--text-muted)] text-right">
                  HPP
                </th>
                <th scope="col" className="py-2 px-3 text-[12px] font-medium text-[var(--text-muted)] text-right">
                  Laba
                </th>
                <th scope="col" className="py-2 px-3 text-[12px] font-medium text-[var(--text-muted)] text-right">
                  Margin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[13px]">
              {points.map((pt) => (
                <tr key={pt.key} className="hover:bg-[var(--surface-muted)]/50">
                  <td className="py-2 px-3 font-medium text-[var(--text)]">{pt.label}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text)]">
                    {formatUnitQty(pt.pcs, 'pcs')}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium text-[var(--text)]">
                    {formatRp(pt.omzet)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-muted)]">
                    {formatRp(pt.hpp)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium text-[var(--text)]">
                    {formatRp(pt.profit)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-muted)]">
                    {formatPercent(pt.marginPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={isCompactMobileFit ? 'mt-3 w-full' : 'mt-3 w-full overflow-x-auto'}>
          <svg
            role="img"
            aria-label={`${title}. Total omzet ${formatRp(summary.totalOmzet)}, laba ${formatRp(summary.totalProfit)}.`}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className={
              isCompactMobileFit
                ? 'w-full h-[210px] select-none overflow-visible'
                : 'w-full h-[210px] min-w-[640px] select-none overflow-visible'
            }
          >
            {/* Horizontal grid lines & auto-scaled Y ticks */}
            {yFractions.map((frac) => {
              const y = padTop + usableH * (1 - frac);
              const val = niceMax * frac;
              return (
                <g key={frac}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#e3e2de"
                    strokeDasharray={frac === 0 ? undefined : '3 3'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#57554f"
                    fontSize="12"
                    className="tabular-nums"
                  >
                    {formatAxisTick(val)}
                  </text>
                </g>
              );
            })}

            {/* Bar groups with keyboard & pointer inspection */}
            {points.map((pt, idx) => {
              const cx = padLeft + idx * groupW + groupW / 2;
              const omzetH = pt.omzet > 0 ? Math.max(4, (pt.omzet / niceMax) * usableH) : 0;
              const profitH = pt.profit > 0 ? Math.max(4, (pt.profit / niceMax) * usableH) : 0;
              const omzetY = padTop + usableH - omzetH;
              const profitY = padTop + usableH - profitH;
              const omzetX = cx - barW - 2;
              const profitX = cx + 2;
              const isActive = activeIdx === idx;

              return (
                <g
                  key={pt.key}
                  ref={(el) => {
                    groupRefs.current[idx] = el;
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${pt.label}: Omzet ${formatRp(pt.omzet)}, Laba ${formatRp(pt.profit)}, Margin ${formatPercent(pt.marginPct)}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx((curr) => (curr === idx ? null : curr))}
                  onFocus={() => setActiveIdx(idx)}
                  onBlur={() => setActiveIdx((curr) => (curr === idx ? null : curr))}
                  onClick={() => setActiveIdx((curr) => (curr === idx ? null : idx))}
                  onKeyDown={(e) => handleBarKeyDown(e, idx)}
                  className="cursor-pointer focus:outline-none"
                >
                  {/* Transparent full-height hit target */}
                  <rect
                    x={padLeft + idx * groupW + 2}
                    y={padTop}
                    width={Math.max(24, groupW - 4)}
                    height={usableH}
                    fill={isActive ? '#f1f0ed' : 'transparent'}
                    rx="4"
                    stroke={isActive ? '#5645d4' : 'none'}
                    strokeWidth={isActive ? '1.5' : '0'}
                    strokeOpacity="0.65"
                  />

                  <rect
                    x={omzetX}
                    y={omzetY}
                    width={barW}
                    height={omzetH}
                    fill="#5645d4"
                    rx="3"
                    opacity={isActive ? 1 : 0.9}
                  />

                  <rect
                    x={profitX}
                    y={profitY}
                    width={barW}
                    height={profitH}
                    fill="#15803d"
                    rx="3"
                    opacity={isActive ? 1 : 0.9}
                  />

                  <text
                    x={cx}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    fill={isActive ? '#18181b' : '#57554f'}
                    fontWeight={isActive ? '600' : '400'}
                    fontSize="12"
                    className="tabular-nums"
                  >
                    {pt.shortLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
