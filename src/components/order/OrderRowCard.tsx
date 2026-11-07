'use client';

import React from 'react';
import {
  GripVertical,
  Calendar,
  MessageCircle,
  FileImage,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Package,
} from 'lucide-react';
import { Order, PaymentStatus, ProcessStatus } from '@/types/order';
import { formatRp, formatDateShort } from '@/lib/utils';
import { useOrders } from '@/context/OrderContext';

interface OrderRowCardProps {
  order: Order;
  index: number;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function OrderRowCardComponent({
  order,
  index,
  isDragging = false,
  dragHandleProps,
  isSelected: propIsSelected,
  onToggleSelect,
}: OrderRowCardProps) {
  const {
    openEditModal,
    deleteOrder,
    setActiveDrawerOrder,
    updateOrder,
    selectedOrderIds = [],
    toggleSelectOrder,
  } = useOrders();

  const isSelected =
    propIsSelected !== undefined
      ? propIsSelected
      : selectedOrderIds.includes(order.id);

  const handleToggleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(order.id);
    } else if (toggleSelectOrder) {
      toggleSelectOrder(order.id);
    }
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as PaymentStatus;
    updateOrder(order.id, { paymentStatus: newStatus });
  };

  const handleProcessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ProcessStatus;
    updateOrder(order.id, { processStatus: newStatus });
  };

  const cleanPhone = order.buyerPhone.replace(/\D/g, '');
  const waNumber = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
  const waUrl = `https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(
    order.buyerName
  )},%20update%20pesanan%20${encodeURIComponent(order.orderNumber)}%20di%20eganci`;

  const readyFilesCount = (order.designFiles || []).filter((f) => f.isReadyToPrint).length;
  const totalFilesCount = (order.designFiles || []).length;

  const isNegativeMargin = order.marginPct < 0;

  // Process Status Color Maps (Notion card tints)
  const processBadgeStyles: Record<ProcessStatus, { bg: string; text: string; label: string }> = {
    ANTREAN: { bg: 'bg-[#f6f5f4] border-[#e5e3df]', text: 'text-[#37352f]', label: '1. Antrean' },
    SETTING_DESAIN: {
      bg: 'bg-[#e6e0f5] border-[#d6b6f6]/60',
      text: 'text-[#391c57]',
      label: '2. Setting Desain',
    },
    PROSES_CETAK: {
      bg: 'bg-[#dcecfa] border-[#004480]/20',
      text: 'text-[#004480]',
      label: '3. Proses Cetak',
    },
    FINISHING: {
      bg: 'bg-[#ffe8d4] border-[#793400]/20',
      text: 'text-[#793400]',
      label: '4. Finishing',
    },
    SIAP_KIRIM: {
      bg: 'bg-[#fde0ec] border-[#7a1c4b]/20',
      text: 'text-[#7a1c4b]',
      label: '5. Siap Kirim',
    },
    SELESAI: {
      bg: 'bg-[#d9f3e1] border-[#0d5220]/20',
      text: 'text-[#0d5220]',
      label: '6. Selesai',
    },
  };

  // Payment Status Color Maps
  const paymentBadgeStyles: Record<PaymentStatus, { bg: string; text: string; label: string }> = {
    LUNAS: { bg: 'bg-[#d9f3e1] border-[#0d5220]/20', text: 'text-[#0d5220]', label: 'Lunas' },
    DP: { bg: 'bg-[#fef7d6] border-[#f9e79f]', text: 'text-[#793400]', label: 'DP Terbayar' },
    BELUM_LUNAS: { bg: 'bg-[#fde0ec] border-[#7a1c4b]/20', text: 'text-[#7a1c4b]', label: 'Belum Lunas' },
  };

  const currentProcess = processBadgeStyles[order.processStatus] || processBadgeStyles.ANTREAN;
  const currentPayment = paymentBadgeStyles[order.paymentStatus] || paymentBadgeStyles.BELUM_LUNAS;

  const hasSpecs = Boolean(order.specs && order.specs.trim());
  const hasNotes = Boolean(order.notes && order.notes.trim());

  return (
    <div
      className={`group relative rounded-xl border transition-all ${
        isSelected
          ? 'border-[#5645d4] ring-1 ring-[#5645d4]/40 bg-[#fcfbfe]'
          : 'bg-white border-[#d6d3cd]'
      } ${
        isDragging
          ? 'order-row-active scale-[1.01] z-30'
          : 'animate-fade-in-up card-bounce hover:border-[#5645d4]/50'
      }`}
    >
      <div className="p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4">
        {/* Header: queue + order number + deadline | actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-[#c8c4be] text-[#5645d4] accent-[#5645d4] focus:ring-[#5645d4] cursor-pointer"
              aria-label={`Pilih pesanan ${order.orderNumber}`}
            />
            <button
              {...dragHandleProps}
              className="p-2 -m-1 rounded-md text-[#787671] hover:text-[#1a1a1a] hover:bg-[#f6f5f4] cursor-grab active:cursor-grabbing transition-colors touch-none min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Atur Prioritas Antrean"
              aria-label="Atur Prioritas Antrean"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-md bg-[#0a1530] text-[11px] font-semibold text-white flex items-center justify-center shadow-notion-xs">
              {order.queueOrder || index + 1}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#1a1a1a] text-sm">{order.orderNumber}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f6f5f4] border border-[#e5e3df] text-[11px] text-[#5d5b54]">
              <Calendar className="w-3 h-3 shrink-0" />
              <span className="font-medium text-[#37352f]">{formatDateShort(order.deadline)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-70 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => openEditModal(order)}
              className="p-2 rounded-md text-[#787671] hover:text-[#1a1a1a] hover:bg-[#f6f5f4] min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors cursor-pointer"
              title="Edit Pesanan"
              aria-label="Edit Pesanan"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Hapus pesanan ${order.orderNumber}?`)) {
                  deleteOrder(order.id);
                }
              }}
              className="p-2 rounded-md text-[#787671] hover:text-rose-700 hover:bg-rose-50 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors cursor-pointer"
              title="Hapus Pesanan"
              aria-label="Hapus Pesanan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Body Layout (Desktop/Tablet: 7/5 Grid, Mobile: Stacking) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-stretch min-w-0">
          {/* Left Column: Buyer Info + 2x2 Stats Tiles (md:col-span-7) */}
          <div className="md:col-span-7 flex flex-col justify-between gap-3 min-w-0">
            {/* Buyer Name & WhatsApp Contact Pill */}
            <div className="flex flex-wrap items-center gap-2 pl-0.5">
              <h4
                className="font-semibold text-[#1a1a1a] text-sm sm:text-base truncate max-w-full sm:max-w-[260px]"
                title={order.buyerName}
              >
                {order.buyerName}
              </h4>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#d9f3e1] text-[11px] font-medium text-[#0d5220] hover:bg-[#c6ecd2] transition-colors shrink-0 min-h-[32px] sm:min-h-[28px]"
                title={`Kirim pesan WhatsApp ke ${order.buyerPhone}`}
              >
                <MessageCircle className="w-3 h-3" />
                <span>{order.buyerPhone}</span>
              </a>
            </div>

            {/* 4 Stats Tiles configured as a compact 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {/* Jumlah */}
              <div className="rounded-lg bg-[#f6f5f4] border border-[#e5e3df] shadow-notion-xs px-3 py-2 min-w-0">
                <p className="text-[11px] text-[#5d5b54]">Jumlah</p>
                <p className="text-sm font-bold text-[#1a1a1a] mt-0.5 truncate">
                  {order.qty.toLocaleString('id-ID')}{' '}
                  <span className="text-xs font-medium text-[#5d5b54]">pcs</span>
                </p>
                <p className="text-[11px] text-[#5d5b54] mt-0.5 truncate">
                  @{formatRp(order.pricePerPcs)}
                </p>
              </div>

              {/* Omzet */}
              <div className="rounded-lg bg-[#f6f5f4] border border-[#e5e3df] shadow-notion-xs px-3 py-2 min-w-0">
                <p className="text-[11px] text-[#5d5b54]">Omzet</p>
                <p className="text-sm font-bold text-[#1a1a1a] mt-0.5 truncate">
                  {formatRp(order.omzet)}
                </p>
              </div>

              {/* HPP */}
              <div className="rounded-lg bg-[#f6f5f4] border border-[#e5e3df] shadow-notion-xs px-3 py-2 min-w-0">
                <p className="text-[11px] text-[#5d5b54]">HPP</p>
                <p className="text-sm font-semibold text-[#37352f] mt-0.5 truncate">
                  {formatRp(order.hppBreakdown.totalHpp)}
                </p>
              </div>

              {/* Laba / Margin */}
              <div
                className={`rounded-lg border shadow-notion-xs px-3 py-2 min-w-0 ${
                  isNegativeMargin
                    ? 'bg-[#fde0ec] border-[#7a1c4b]/20'
                    : 'bg-[#d9f3e1] border-[#0d5220]/20'
                }`}
              >
                <p
                  className={`text-[11px] flex items-center gap-1 truncate ${
                    isNegativeMargin ? 'text-[#7a1c4b]' : 'text-[#0d5220]'
                  }`}
                >
                  {isNegativeMargin ? (
                    <TrendingDown className="w-3 h-3 shrink-0" />
                  ) : (
                    <TrendingUp className="w-3 h-3 shrink-0" />
                  )}
                  <span>Laba · {order.marginPct}%</span>
                </p>
                <p
                  className={`text-sm font-bold mt-0.5 truncate ${
                    isNegativeMargin ? 'text-[#7a1c4b]' : 'text-[#0d5220]'
                  }`}
                >
                  {formatRp(order.profit)}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Dedicated Notion Card Container for Order Details (md:col-span-5) */}
          <div className="md:col-span-5 min-w-0 flex flex-col">
            <div className="bg-[#fcfbf9] border border-[#e5e3df] rounded-lg p-3 flex-1 flex flex-col justify-between min-w-0 shadow-notion-xs">
              <div className="flex flex-col gap-1 min-w-0">
                {/* Header Label: Detail Pesanan */}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5d5b54] uppercase tracking-wider">
                  <Package className="w-3 h-3 text-[#5645d4] shrink-0" />
                  <span>Detail Pesanan</span>
                </div>

                {/* Product Name */}
                <h5
                  className="text-xs sm:text-sm font-semibold text-[#1a1a1a] line-clamp-1 break-words mt-0.5"
                  title={order.productName}
                >
                  {order.productName}
                </h5>

                {/* Specifications */}
                {hasSpecs ? (
                  <div
                    className="max-h-14 overflow-y-auto overflow-x-hidden pr-1 text-xs text-[#5d5b54] leading-relaxed break-words"
                    title={order.specs}
                  >
                    {order.specs}
                  </div>
                ) : (
                  <p className="text-xs text-[#5d5b54] italic">Spesifikasi standar</p>
                )}
              </div>

              {/* Notes: Yellow callout badge if present */}
              {hasNotes && (
                <div
                  className="mt-2.5 px-2.5 py-1.5 rounded-md bg-[#fef7d6] border border-[#f9e79f] text-[11px] text-[#523410] max-h-14 overflow-y-auto overflow-x-hidden pr-1 break-words leading-snug"
                  title={order.notes}
                >
                  <span className="font-semibold text-[#793400]">Catatan: </span>
                  <span>{order.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: statuses + design */}
      <div className="px-4 sm:px-5 py-3 bg-[#fafaf9] border-t border-[#e5e3df] rounded-b-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-4">
          <label className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[11px] text-[#5d5b54]">Pembayaran</span>
            <span className="relative flex-1 sm:flex-initial">
              <select
                value={order.paymentStatus}
                onChange={handlePaymentChange}
                className={`w-full sm:w-auto appearance-none pl-2.5 pr-6 py-1.5 rounded-md text-xs font-medium border shadow-notion-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#5645d4] transition-all min-h-[36px] ${currentPayment.bg} ${currentPayment.text}`}
              >
                <option value="LUNAS">Lunas</option>
                <option value="DP">DP (Uang Muka)</option>
                <option value="BELUM_LUNAS">Belum Lunas</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#787671]" />
            </span>
          </label>

          <label className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[11px] text-[#5d5b54]">Produksi</span>
            <span className="relative flex-1 sm:flex-initial">
              <select
                value={order.processStatus}
                onChange={handleProcessChange}
                className={`w-full sm:w-auto appearance-none pl-2.5 pr-6 py-1.5 rounded-md text-xs font-medium border shadow-notion-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#5645d4] transition-all min-h-[36px] ${currentProcess.bg} ${currentProcess.text}`}
              >
                <option value="ANTREAN">1. Antrean</option>
                <option value="SETTING_DESAIN">2. Setting Desain</option>
                <option value="PROSES_CETAK">3. Proses Cetak</option>
                <option value="FINISHING">4. Finishing</option>
                <option value="SIAP_KIRIM">5. Siap Kirim</option>
                <option value="SELESAI">6. Selesai</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#787671]" />
            </span>
          </label>
        </div>

        <button
          onClick={() => setActiveDrawerOrder(order)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md bg-white hover:bg-[#e6e0f5]/60 text-[#5645d4] border border-[#e5e3df] text-xs font-medium shadow-notion-xs btn-bounce cursor-pointer shrink-0 min-h-[36px]"
        >
          <FileImage className="w-3.5 h-3.5" />
          <span>Desain ({totalFilesCount})</span>
          {readyFilesCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#1aae39]" title="Siap Cetak"></span>
          )}
        </button>
      </div>
    </div>
  );
}

const OrderRowCard = React.memo(OrderRowCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.order === nextProps.order &&
    prevProps.index === nextProps.index &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isSelected === nextProps.isSelected
  );
});

export default OrderRowCard;
