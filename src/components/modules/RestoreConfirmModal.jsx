import React, { useEffect } from 'react';
import { Upload, AlertTriangle, X, FileText } from 'lucide-react';
import { formatBytes } from '../../services/backupService';

/**
 * Modal konfirmasi sebelum menimpa data dengan hasil restore.
 * Menampilkan ringkasan isi backup agar user sadar apa yang akan dipulihkan.
 */
export default function RestoreConfirmModal({ isOpen, onClose, onConfirm, summary }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rows = [
    ['Pengaturan & data', `${summary?.keys ?? 0} kunci`],
    ['Catatan (ArNote)', `${summary?.notes ?? 0} catatan`],
    ['Draf PDF (ArToolbox)', `${summary?.drafts ?? 0} halaman`],
    ['Ukuran file', formatBytes(summary?.bytes || 0)],
    ['Versi backup', summary?.version ? `v${summary.version}` : '-'],
  ];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none"
    >
      <div
        className="w-full max-w-sm bg-[#F8F5EE] border-[2.5px] border-[#121212] shadow-[6px_6px_0px_#121212] rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#FF9F1C] border-b-[2.5px] border-[#121212]">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white rounded-md border border-[#121212] shadow-[1px_1px_0px_#121212]">
              <AlertTriangle className="w-4 h-4 text-[#121212]" />
            </div>
            <h3 className="font-black text-sm uppercase tracking-wider text-[#121212]">
              Pulihkan Data?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] hover:bg-gray-100 active:translate-y-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-[#121212]" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <p className="text-xs sm:text-sm font-bold text-[#121212] leading-relaxed">
            Data yang ada saat ini akan <span className="text-[#FF525E]">ditimpa</span> oleh isi file
            cadangan. Pastikan kamu sudah mencadangkan data terbaru.
          </p>

          <div className="p-3 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-[#121212]" />
              <span className="text-[10px] font-mono font-black text-gray-500 uppercase">
                Isi Cadangan
              </span>
            </div>
            {rows.map(([label, val]) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-600">{label}</span>
                <span className="font-black text-[#121212]">{val}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] font-medium text-gray-600 italic">
            Aplikasi akan dimuat ulang setelah pemulihan selesai.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-4 py-3 bg-[#F1EFE9] border-t-2 border-[#121212]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white text-[#121212] font-black text-xs rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:bg-gray-100 active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] cursor-pointer transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#38E54D] text-[#121212] font-black text-xs rounded-xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] hover:bg-[#2FCC42] active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] cursor-pointer transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Ya, Pulihkan
          </button>
        </div>
      </div>
    </div>
  );
}
