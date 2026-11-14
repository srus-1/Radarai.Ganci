'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { DesignFile } from '@/types/order';
import { formatNumberId } from '@/lib/utils';

interface LightboxContentProps {
  file: DesignFile;
  onClose: () => void;
}

function LightboxContent({ file, onClose }: LightboxContentProps) {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        // Ignore if already open
      }
    }
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

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
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 h-screen max-h-none w-screen max-w-none border-0 bg-[#18181b]/95 p-0 text-white"
    >
      <div className="relative flex h-full w-full flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/15 bg-[#18181b] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-6 items-center rounded-full bg-[var(--accent)] px-2.5 text-[12px] font-medium text-white shrink-0">
              {file.fileType}
            </span>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-[14px] sm:text-[16px] font-semibold leading-tight truncate max-w-[180px] sm:max-w-md"
                title={file.fileName}
              >
                {file.fileName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-[12px] text-neutral-300 tabular-nums">
                <span>{(file.fileSize / (1024 * 1024)).toFixed(2).replace('.', ',')} MB</span>
                <span aria-hidden="true">/</span>
                {file.isReadyToPrint ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Siap cetak
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    Setting desain
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={file.fileUrl}
              download={file.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-3 text-[13px] font-medium text-white transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Unduh berkas</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau berkas"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.fileUrl}
              alt={file.fileName}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 150ms ease-out',
              }}
              className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg select-none"
            />
          ) : (
            <div
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 150ms ease-out',
              }}
              className="p-8 rounded-lg bg-[#27272a] border border-white/15 text-center max-w-md flex flex-col items-center justify-center select-none"
            >
              <div className="w-14 h-14 rounded-lg bg-[var(--accent)]/20 border border-[var(--accent)]/40 text-white flex items-center justify-center mb-4">
                <FileText className="w-7 h-7" aria-hidden="true" />
              </div>
              <h3 className="text-[16px] font-semibold text-white mb-1">{file.fileName}</h3>
              <p className="text-[13px] text-neutral-300 mb-5">
                Berkas desain {file.fileType} untuk proses separasi sablon.
              </p>
              <a
                href={file.fileUrl}
                download={file.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-4 text-[13px] font-medium text-white"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Unduh berkas
              </a>
            </div>
          )}
        </div>

        {/* Bottom zoom/rotate controls */}
        <div className="pb-[calc(1rem+env(safe-area-inset-bottom))] flex justify-center">
          <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#27272a] border border-white/15 text-white">
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Perkecil pratinjau"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 text-neutral-200 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-[12px] font-medium px-2 text-neutral-100 tabular-nums">
              {formatNumberId(Math.round(scale * 100))}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Perbesar pratinjau"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 text-neutral-200 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="w-px h-5 bg-white/15 mx-1" aria-hidden="true" />
            <button
              type="button"
              onClick={handleRotate}
              aria-label="Putar gambar 90 derajat"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 text-neutral-200 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-9 px-3 items-center justify-center rounded-md hover:bg-white/10 text-[12px] font-medium text-neutral-200 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </dialog>
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
