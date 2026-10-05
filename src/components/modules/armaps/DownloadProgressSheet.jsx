import React from 'react';
import { Loader2, Check, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { formatBytes } from '../../../services/armaps/catalog.js';

/** ArMaps — Sheet progres unduh / perbarui wilayah. */
export default function DownloadProgressSheet({ data, onClose, onRetry }) {
  if (!data) return null;
  const { region, isUpdate, pct, msg, received, total, error } = data;
  const isError = Boolean(error);
  const isDone = !isError && pct >= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full max-w-md bg-[#F8F5EE] rounded-t-3xl sm:rounded-3xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl border-2 border-[#121212] flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212] ${isError ? 'bg-[#FF70A6]' : isDone ? 'bg-[#38E54D]' : 'bg-[#C4FAF8]'}`}>
            {isError ? <AlertTriangle className="w-4 h-4" />
              : isDone ? <Check className="w-4 h-4" />
              : <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-sm uppercase tracking-tight truncate">
              {isError ? 'Unduhan gagal' : isUpdate ? 'Memperbarui' : 'Mengunduh'} {region?.name}
            </h3>
            <p className="text-[10px] font-mono-code font-bold text-gray-500 truncate">{msg}</p>
          </div>
          {isError && (
            <button onClick={onClose} className="p-1 rounded-lg border-2 border-[#121212] bg-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!isError && (
          <div className="space-y-1">
            <div className="h-3 rounded-full bg-white border-2 border-[#121212] overflow-hidden">
              <div
                className="h-full bg-[#38E54D] transition-all duration-300"
                style={{ width: `${Math.max(2, Math.min(100, pct || 0))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-code font-bold text-gray-600">
              <span>{pct || 0}%</span>
              {total > 0 && <span>{formatBytes(received)} / {formatBytes(total)}</span>}
            </div>
          </div>
        )}

        {isError && (
          <>
            <p className="text-[11px] font-semibold text-gray-700 leading-snug">{error}</p>
            <p className="text-[10px] font-semibold text-gray-500 leading-snug">
              Peta lama (bila ada) tidak terhapus — file baru hanya dipasang bila unduhan berhasil.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={onClose} className="flex-1 px-3 py-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase">
                Tutup
              </button>
              <button onClick={onRetry} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase">
                <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
              </button>
            </div>
          </>
        )}

        {!isError && !isDone && (
          <p className="text-[10px] font-semibold text-gray-500 leading-snug">
            Jangan tutup aplikasi. Unduhan berjalan di latar — peta lama tetap utuh sampai
            proses selesai.
          </p>
        )}
      </div>
    </div>
  );
}
