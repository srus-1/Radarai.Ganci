'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { DesignFile } from '@/types/order';

interface LightboxContentProps {
  file: DesignFile;
  onClose: () => void;
}

function LightboxContent({ file, onClose }: LightboxContentProps) {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes(
    file.fileType.toUpperCase()
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
    >
      {/* Top Bar with File Meta & Actions */}
      <div className="absolute top-0 inset-x-0 p-4 md:px-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent text-white z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-[#5645d4] text-white shrink-0">
            {file.fileType}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-semibold leading-tight max-w-[180px] sm:max-w-md truncate" title={file.fileName}>
              {file.fileName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>{(file.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
              <span>•</span>
              {file.isReadyToPrint ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Siap Cetak
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Setting Desain
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={file.fileUrl}
            download={file.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-md bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium shadow-md transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unduh Berkas</span>
          </a>

          <button
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Inspection Canvas */}
      <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.fileUrl}
            alt={file.fileName}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="max-h-[80vh] max-w-[85vw] object-contain rounded-lg shadow-2xl select-none"
          />
        ) : (
          <div
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="p-8 rounded-lg bg-slate-900 border border-slate-700/80 text-center max-w-md flex flex-col items-center justify-center shadow-2xl select-none"
          >
            <div className="w-16 h-16 rounded-md bg-[#5645d4]/20 border border-[#5645d4]/40 text-[#5645d4] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[#5645d4]" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">{file.fileName}</h4>
            <p className="text-xs text-slate-400 mb-5">
              Berkas desain {file.fileType} untuk proses separasi sablon.
            </p>
            <a
              href={file.fileUrl}
              download={file.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-md bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-semibold flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Unduh Berkas
            </a>
          </div>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="absolute bottom-4 sm:bottom-6 pb-[env(safe-area-inset-bottom)] inset-x-0 flex justify-center z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-900/90 border border-slate-700/80 text-white backdrop-blur-md shadow-2xl pointer-events-auto">
          <button
            onClick={handleZoomOut}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Perkecil"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2 text-slate-200">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Perbesar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-700 mx-1" />
          <button
            onClick={handleRotate}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Putar 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="min-h-[40px] px-3 py-2 text-xs font-medium rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LightboxModal() {
  const { lightboxFile, setLightboxFile } = useOrders();

  if (!lightboxFile) return null;

  return (
    <LightboxContent
      key={lightboxFile.id}
      file={lightboxFile}
      onClose={() => setLightboxFile(null)}
    />
  );
}
