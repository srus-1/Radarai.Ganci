'use client';

import React, { useState } from 'react';
import { MonthlyProfitData } from '@/types/order';
import { formatRp } from '@/lib/utils';
import { BarChart3, Info } from 'lucide-react';

interface MonthlyProfitChartProps {
  data: MonthlyProfitData[];
}

export default function MonthlyProfitChart({ data }: MonthlyProfitChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-[#e5e3df] text-center text-[#787671] text-xs">
        Belum ada data bulanan.
      </div>
    );
  }

  // SVG Chart Geometry calculations
  const maxVal = Math.max(...data.map((d) => Math.max(d.omzet, d.profit, 1000000)), 5000000);
  const roundedMax = Math.ceil(maxVal / 5000000) * 5000000;

  const chartWidth = 740;
  const chartHeight = 260;
  const paddingLeft = 65;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const barGroupWidth = usableWidth / data.length;
  const singleBarWidth = Math.min(24, (barGroupWidth - 20) / 2);

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const activeItem = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#d6d3cd] shadow-notion-panel flex flex-col gap-4 animate-fade-in-up delay-150">
      {/* Chart Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#e6e0f5] text-[#391c57] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#1a1a1a]">
              Tren Omzet & Laba
            </h3>
          </div>
          <p className="text-xs text-[#787671] mt-0.5">
            Perbandingan omzet dan laba per bulan.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#5645d4]"></span>
            <span className="text-[#37352f]">Omzet Bruto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#1aae39]"></span>
            <span className="text-[#37352f]">Laba Bersih</span>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Card Preview */}
      <div className="min-h-[48px] bg-[#f6f5f4] rounded-md p-2.5 border border-[#e5e3df] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all">
        {activeItem ? (
          <>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="px-2 py-0.5 rounded-sm bg-[#1a1a1a] text-white font-semibold text-xs">
                {activeItem.monthLabel}
              </span>
              <div>
                <span className="text-[#787671] mr-1">Omzet:</span>
                <strong className="text-[#1a1a1a]">{formatRp(activeItem.omzet)}</strong>
              </div>
              <span className="text-[#c8c4be] hidden sm:inline">•</span>
              <div>
                <span className="text-[#787671] mr-1">HPP:</span>
                <strong className="text-[#5d5b54]">{formatRp(activeItem.hpp)}</strong>
              </div>
              <span className="text-[#c8c4be] hidden sm:inline">•</span>
              <div>
                <span className="text-[#787671] mr-1">Laba:</span>
                <strong className="text-[#0d5220]">{formatRp(activeItem.profit)}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-1.5 py-0.2 rounded-sm bg-[#d9f3e1] text-[#0d5220] font-semibold text-[11px]">
                Margin {activeItem.marginPct}%
              </span>
              <span className="text-[#787671] text-[11px]">({activeItem.pcs} Pcs)</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-[#787671] text-xs">
            <Info className="w-3.5 h-3.5 text-[#5645d4]" />
            <span>Arahkan kursor atau sentuh diagram untuk rincian.</span>
          </div>
        )}
      </div>

      {/* Pure SVG Responsive Container */}
      <div
        className="w-full overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[620px] select-none"
        >
          {/* Background Grid Lines & Y-Axis Labels */}
          {yTicks.map((pct) => {
            const y = paddingTop + usableHeight * (1 - pct);
            const val = roundedMax * pct;
            const formatted = val >= 1000000 ? `${(val / 1000000).toFixed(0)} jt` : `0`;

            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#e5e3df"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#787671"
                  fontSize="11"
                  fontWeight="500"
                >
                  {formatted}
                </text>
              </g>
            );
          })}

          {/* Bar Groups */}
          {data.map((item, idx) => {
            const groupCenterX = paddingLeft + idx * barGroupWidth + barGroupWidth / 2;
            const omzetHeight = Math.max(4, (item.omzet / roundedMax) * usableHeight);
            const profitHeight = Math.max(4, (item.profit / roundedMax) * usableHeight);

            const omzetY = paddingTop + usableHeight - omzetHeight;
            const profitY = paddingTop + usableHeight - profitHeight;

            const omzetX = groupCenterX - singleBarWidth - 2;
            const profitX = groupCenterX + 2;

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={item.month}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                onTouchStart={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                className="cursor-pointer"
              >
                {/* Hover Background Highlight Box */}
                {isHovered && (
                  <rect
                    x={paddingLeft + idx * barGroupWidth + 4}
                    y={paddingTop}
                    width={barGroupWidth - 8}
                    height={usableHeight}
                    fill="#f6f5f4"
                    rx="4"
                    opacity="0.9"
                  />
                )}

                {/* Omzet Bar (Notion Purple #5645d4) */}
                <rect
                  x={omzetX}
                  y={omzetY}
                  width={singleBarWidth}
                  height={omzetHeight}
                  fill="#5645d4"
                  rx="3"
                  className="animate-bar-grow transition-all duration-300 ease-out hover:opacity-100 hover:brightness-110"
                  opacity={isHovered ? 1 : 0.88}
                />

                {/* Profit Bar (Notion Green #1aae39) */}
                <rect
                  x={profitX}
                  y={profitY}
                  width={singleBarWidth}
                  height={profitHeight}
                  fill="#1aae39"
                  rx="3"
                  className="animate-bar-grow delay-75 transition-all duration-300 ease-out hover:opacity-100 hover:brightness-110"
                  opacity={isHovered ? 1 : 0.88}
                />

                {/* Month Label on X-Axis */}
                <text
                  x={groupCenterX}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  fill={isHovered ? '#5645d4' : '#787671'}
                  fontWeight={isHovered ? '600' : '400'}
                  fontSize="11"
                >
                  {item.monthLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
