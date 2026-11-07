'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileImage,
  AlertCircle,
  Eye,
  Download,
  Trash2,
  Check,
} from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { DesignFile } from '@/types/order';

export default function OrderDesignDrawer() {
  const {
    activeDrawerOrder,
    setActiveDrawerOrder,
    addDesignFile,
    toggleDesignReady,
    deleteDesignFile,
    setLightboxFile,
  } = useOrders();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Lock body scroll when drawer is open, restore on close/unmount
  useEffect(() => {
    if (!activeDrawerOrder) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeDrawerOrder]);

  if (!activeDrawerOrder) return null;

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const fileUrl = URL.createObjectURL(file);

      const newDesignFile: DesignFile = {
        id: `df-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orderId: activeDrawerOrder.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: ext,
        fileUrl: fileUrl,
        thumbnailUrl: ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext) ? fileUrl : undefined,
        isReadyToPrint: false,
        uploadedAt: new Date().toISOString(),
      };

      addDesignFile(activeDrawerOrder.id, newDesignFile);
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const files = activeDrawerOrder.designFiles || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-xs overscroll-contain transition-opacity animate-in fade-in"
    >
      {/* Backdrop click to close */}
      <div
        className="fixed inset-0"
        onClick={() => setActiveDrawerOrder(null)}
        aria-hidden="true"
      />

      {/* Modal/Drawer Container: Bottom-Sheet (<640px) & Centered Modal (sm+) */}
      <aside className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] bg-white rounded-t-2xl sm:rounded-xl overflow-hidden shadow-notion-modal flex flex-col z-10 border border-[#e5e3df] animate-fade-in-up">
        {/* Mobile drag indicator pill */}
        <div className="sm:hidden w-10 h-1 bg-[#c8c4be] rounded-full mx-auto my-2 shrink-0" />

        {/* Sticky Header - Notion deep navy hero band */}
        <div className="sticky top-0 z-20 shrink-0 bg-[#0a1530] text-white p-4 border-b border-[#1a2a52] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#5645d4] text-white shadow-xs">
                {activeDrawerOrder.orderNumber}
              </span>
              <h3 className="text-sm font-semibold text-white">Galeri Desain</h3>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              Pembeli: <strong className="text-white">{activeDrawerOrder.buyerName}</strong>
            </p>
          </div>
          <button
            onClick={() => setActiveDrawerOrder(null)}
            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4">
          {/* File Upload Zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#5645d4] bg-[#e6e0f5]/40'
                : 'border-[#c8c4be] hover:border-[#5645d4] hover:bg-[#f6f5f4]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".cdr,.ai,.psd,.pdf,.png,.jpg,.jpeg,.svg"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <div className="w-10 h-10 mx-auto rounded-md bg-[#f6f5f4] border border-[#e5e3df] flex items-center justify-center text-[#5645d4] mb-2">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#1a1a1a]">
              Unggah Berkas Desain
            </p>
            <p className="text-[11px] text-[#787671] mt-1">
              Format CDR, AI, PSD, PDF, PNG, JPG.
            </p>
          </div>

          {/* Files List */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#787671] uppercase tracking-wider">
                Daftar Berkas ({files.length})
              </span>
              <span className="text-xs text-[#5d5b54]">
                {files.filter((f) => f.isReadyToPrint).length} Siap Cetak
              </span>
            </div>

            {files.length === 0 ? (
              <div className="p-6 text-center bg-[#f6f5f4] rounded-lg border border-[#e5e3df]">
                <FileImage className="w-6 h-6 text-[#787671] mx-auto mb-1.5" />
                <p className="text-xs text-[#787671]">
                  Belum ada berkas desain.
                </p>
              </div>
            ) : (
              files.map((file) => {
                const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(
                  file.fileType.toUpperCase()
                );

                return (
                  <div
                    key={file.id}
                    className="p-3 bg-white rounded-lg border border-[#e5e3df] hover:border-[#c8c4be] shadow-xs flex flex-col gap-2 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail or File Type Badge */}
                      <div className="w-12 h-12 rounded-md bg-[#f6f5f4] border border-[#e5e3df] overflow-hidden flex items-center justify-center shrink-0">
                        {isImage && file.fileUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.fileUrl}
                            alt={file.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-[#37352f] uppercase">
                            {file.fileType}
                          </span>
                        )}
                      </div>

                      {/* File Details */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-xs font-semibold text-[#1a1a1a] truncate"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </h4>
                        <p className="text-[11px] text-[#787671] mt-0.5">
                          {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • {file.fileType}
                        </p>

                        {/* Ready to Print Toggle */}
                        <div className="mt-2">
                          <button
                            onClick={() =>
                              toggleDesignReady(activeDrawerOrder.id, file.id)
                            }
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border ${
                              file.isReadyToPrint
                                ? 'bg-[#d9f3e1] text-[#0d5220] border-[#0d5220]/20'
                                : 'bg-[#fef7d6] text-[#793400] border-[#f9e79f]'
                            }`}
                          >
                            {file.isReadyToPrint ? (
                              <>
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                <span>Siap Cetak</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                                <span>Perlu Setting</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions for File */}
                    <div className="pt-2 border-t border-[#e5e3df] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Inspection / Lightbox Button */}
                        <button
                          onClick={() => setLightboxFile(file)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#37352f] bg-[#f6f5f4] hover:bg-[#ede9e4] rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-[#5645d4]" />
                          <span>Inspeksi</span>
                        </button>

                        {/* Download Button */}
                        <a
                          href={file.fileUrl}
                          download={file.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#37352f] bg-[#f6f5f4] hover:bg-[#ede9e4] rounded-md transition-colors"
                        >
                          <Download className="w-4 h-4 text-[#787671]" />
                          <span>Unduh</span>
                        </a>
                      </div>

                      {/* Delete File Button */}
                      <button
                        onClick={() => {
                          if (confirm(`Hapus file ${file.fileName}?`)) {
                            deleteDesignFile(activeDrawerOrder.id, file.id);
                          }
                        }}
                        className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md text-[#787671] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus berkas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-20 shrink-0 p-3.5 border-t border-[#e5e3df] bg-[#f6f5f4] flex items-center justify-between text-xs text-[#787671]">
          <span>Maksimal 50MB per berkas.</span>
          <button
            onClick={() => setActiveDrawerOrder(null)}
            className="min-h-[40px] px-4 py-2 bg-[#1a1a1a] hover:bg-black text-white text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center"
          >
            Tutup
          </button>
        </div>
      </aside>
    </div>
  );
}
