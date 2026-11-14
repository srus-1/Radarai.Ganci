'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  Eye,
  FileImage,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { DesignFile } from '@/types/order';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<DesignFile | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeDrawerOrder) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // Ignore if already open
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
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
        fileUrl,
        thumbnailUrl: ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext) ? fileUrl : undefined,
        isReadyToPrint: false,
        uploadedAt: new Date().toISOString(),
      };

      void addDesignFile(activeDrawerOrder.id, newDesignFile);
    });
  };

  const files = activeDrawerOrder.designFiles || [];

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        {...({ closedby: 'any' } as Record<string, string>)}
        onCancel={(e) => {
          e.preventDefault();
          setActiveDrawerOrder(null);
        }}
        className="m-auto w-full sm:max-w-lg max-h-[90vh] rounded-t-xl sm:rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] popover-shadow overflow-hidden"
      >
        <div className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="shrink-0 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id={titleId} className="text-[16px] font-semibold text-[var(--text)]">
                  Galeri desain
                </h2>
                <span className="inline-flex h-6 items-center rounded-full bg-[var(--accent-tint)] px-2 text-[12px] font-medium text-[var(--accent-ink)] tabular-nums">
                  {activeDrawerOrder.orderNumber}
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5 truncate">
                Customer: {activeDrawerOrder.buyerName}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveDrawerOrder(null)}
              aria-label="Tutup galeri desain"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              className={`border border-dashed rounded-lg p-5 text-center transition-colors ${
                isDragging
                  ? 'border-[var(--accent)] bg-[var(--accent-tint)]/60'
                  : 'border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".cdr,.ai,.psd,.pdf,.png,.jpg,.jpeg,.svg"
                className="visually-hidden"
                aria-label="Unggah berkas desain"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-tint)] text-[var(--accent-ink)] flex items-center justify-center mb-2">
                  <UploadCloud className="w-4 h-4" aria-hidden="true" />
                </div>
                <span className="text-[13px] font-semibold text-[var(--text)]">
                  Unggah berkas desain
                </span>
                <span className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  Format CDR, AI, PSD, PDF, PNG, JPG.
                </span>
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                <span className="font-medium">Daftar berkas ({files.length})</span>
                <span className="tabular-nums">
                  {files.filter((f) => f.isReadyToPrint).length} siap cetak
                </span>
              </div>

              {files.length === 0 ? (
                <div className="p-6 text-center bg-[var(--surface-muted)]/50 rounded-lg border border-[var(--border)]">
                  <FileImage className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-1.5" aria-hidden="true" />
                  <p className="text-[13px] text-[var(--text-muted)]">Belum ada berkas desain.</p>
                </div>
              ) : (
                files.map((file) => {
                  const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(
                    file.fileType.toUpperCase()
                  );

                  return (
                    <div
                      key={file.id}
                      className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)] flex flex-col gap-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
                          {isImage && file.fileUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={file.fileUrl}
                              alt={file.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[12px] font-semibold text-[var(--text)]">
                              {file.fileType}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-[13px] font-semibold text-[var(--text)] truncate"
                            title={file.fileName}
                          >
                            {file.fileName}
                          </h3>
                          <p className="text-[12px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                            {(file.fileSize / (1024 * 1024)).toFixed(2).replace('.', ',')} MB ({file.fileType})
                          </p>

                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                void toggleDesignReady(activeDrawerOrder.id, file.id)
                              }
                              className={`inline-flex h-6 items-center gap-1.5 px-2 rounded-full border text-[12px] font-medium cursor-pointer ${
                                file.isReadyToPrint
                                  ? 'bg-[var(--status-green-bg)] text-[var(--status-green-ink)] border-[var(--status-green-border)]'
                                  : 'bg-[var(--status-amber-bg)] text-[var(--status-amber-ink)] border-[var(--status-amber-border)]'
                              }`}
                            >
                              {file.isReadyToPrint ? (
                                <>
                                  <Check className="w-3 h-3" aria-hidden="true" />
                                  <span>Siap cetak</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                                  <span>Perlu setting</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLightboxFile(file)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 px-3 text-[12px] font-medium text-[var(--text)] bg-[var(--surface-muted)] hover:bg-[var(--border)]/60 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[var(--accent-ink)]" aria-hidden="true" />
                            <span>Inspeksi</span>
                          </button>

                          <a
                            href={file.fileUrl}
                            download={file.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[36px] items-center gap-1.5 px-3 text-[12px] font-medium text-[var(--text)] bg-[var(--surface-muted)] hover:bg-[var(--border)]/60 rounded-lg"
                          >
                            <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                            <span>Unduh</span>
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPendingDeleteFile(file)}
                          aria-label={`Hapus berkas ${file.fileName}`}
                          title="Hapus berkas"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--status-red-ink)] hover:bg-[var(--status-red-bg)] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)]/40 flex items-center justify-between text-[12px] text-[var(--text-muted)]">
            <span>Maksimal 50 MB per berkas.</span>
            <button
              type="button"
              onClick={() => setActiveDrawerOrder(null)}
              className="min-h-[36px] px-4 rounded-lg border border-[var(--control-border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </dialog>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteFile)}
        title="Hapus berkas desain?"
        description={`Berkas "${pendingDeleteFile?.fileName ?? ''}" akan dihapus dari pesanan ${activeDrawerOrder.orderNumber}.`}
        confirmLabel="Hapus berkas"
        onCancel={() => setPendingDeleteFile(null)}
        onConfirm={async () => {
          if (pendingDeleteFile) {
            await deleteDesignFile(activeDrawerOrder.id, pendingDeleteFile.id);
          }
          setPendingDeleteFile(null);
        }}
      />
    </>
  );
}
