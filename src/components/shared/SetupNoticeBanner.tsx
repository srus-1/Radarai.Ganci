'use client';

import React from 'react';
import { Database, Copy, Check, AlertCircle, X } from 'lucide-react';
import { useOrders } from '@/context/OrderContext';

export default function SetupNoticeBanner() {
  const { isConfigured, configReason, error, clearError } = useOrders();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(
      'NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Configuration guide banner */}
      {!isConfigured && (
        <div className="w-full bg-[#fef7d6] border-b border-[#f9e79f] px-4 py-2.5 text-xs text-[#37352f]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-[#f9e79f] text-[#523410]">
                <Database className="w-3 h-3" />
                Mode Standby
              </span>
              <p className="font-medium text-[#37352f] line-clamp-1">
                {configReason || 'Supabase belum terhubung. Isi kredensial di file .env.local.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#e5e3df] text-[#37352f] hover:bg-[#f6f5f4] transition-colors font-medium text-[11px] cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#787671]" />}
                <span>{copied ? 'Tersalin' : 'Salin Contoh'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operator error notification toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 p-3.5 bg-white border border-[#c8c4be] shadow-lg rounded-md text-xs text-[#37352f] max-w-md animate-in slide-in-from-bottom-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            onClick={clearError}
            className="p-1 hover:bg-[#f6f5f4] rounded-md text-[#787671] cursor-pointer"
            title="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
