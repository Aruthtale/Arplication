import React, { useEffect } from 'react';
import { Coffee, Timer, AlertTriangle, X, Play } from 'lucide-react';

/**
 * Modal konfirmasi saat berpindah fase (Fokus <-> Istirahat) ketika timer
 * sedang berjalan. Mencegah satu ketukan tak sengaja menghentikan sesi fokus.
 */
export default function PhaseSwitchConfirmModal({ isOpen, onClose, onConfirm, fromPhase, toPhase, fromLabel, toLabel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLeavingFocus = fromPhase === 'focus';
  const ToIcon = toPhase === 'focus' ? Timer : Coffee;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none"
    >
      <div
        className="w-full max-w-sm bg-[#F8F5EE] border-[2.5px] border-[#121212] shadow-[6px_6px_0px_#121212] rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FFE600] border-b-[2.5px] border-[#121212]">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white rounded-md border border-[#121212] shadow-[1px_1px_0px_#121212]">
              <AlertTriangle className="w-4 h-4 text-[#121212]" />
            </div>
            <h3 className="font-black text-sm uppercase tracking-wider text-[#121212]">
              Pindah Fase?
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

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3">
          <p className="text-xs sm:text-sm font-bold text-[#121212] leading-relaxed">
            {isLeavingFocus
              ? 'Sesi fokus sedang berjalan. Berpindah sekarang akan menghentikan sesi ini dan mengulang dari awal.'
              : 'Waktu istirahat sedang berjalan. Yakin mau berpindah fase sekarang?'}
          </p>

          <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212]">
            <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-[#F1EFE9] border border-[#121212]">
              {fromLabel}
            </span>
            <span className="font-black text-[#121212]">→</span>
            <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-[#C4FAF8] border border-[#121212] flex items-center gap-1">
              <ToIcon className="w-3 h-3" />
              {toLabel}
            </span>
          </div>

          <p className="text-[11px] font-medium text-gray-600 italic">
            Progres fokus yang belum selesai tidak akan dihitung ke statistik.
          </p>
        </div>

        {/* Footer */}
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
            className="flex items-center gap-1.5 px-4 py-2 bg-[#38E54D] text-[#121212] font-black text-xs rounded-xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] hover:bg-[#2fd142] active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] cursor-pointer transition-all"
          >
            <Play className="w-3.5 h-3.5 text-[#121212]" />
            Ya, Pindah
          </button>
        </div>
      </div>
    </div>
  );
}
