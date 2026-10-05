import React from 'react';
import { HardDrive, Check, X, Info } from 'lucide-react';
import { STORAGE_LOCATIONS } from '../../../services/armaps/settings.js';

/** ArMaps — Sheet pemilihan lokasi penyimpanan file peta. */
export default function ArMapsStorageSheet({ current, onChange, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#F8F5EE] rounded-t-3xl sm:rounded-3xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#C4FAF8] border-2 border-[#121212] flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212]">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="font-black text-sm uppercase tracking-tight">Lokasi Simpan Peta</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg border-2 border-[#121212] bg-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] font-semibold text-gray-600 leading-snug">
          Berlaku untuk unduhan berikutnya. Wilayah yang sudah terpasang tetap di lokasinya.
        </p>

        <div className="space-y-2">
          {STORAGE_LOCATIONS.map((loc) => {
            const active = current === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => { onChange(loc.id); onClose(); }}
                className={`w-full text-left p-3 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${
                  active ? 'bg-[#FFE600]' : 'bg-white hover:bg-[#FFFBDF]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-xs uppercase tracking-tight">{loc.label}</span>
                  {active && <Check className="w-4 h-4 shrink-0" />}
                </div>
                <p className="text-[10px] font-semibold text-gray-600 mt-0.5">{loc.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2 p-2.5 bg-white rounded-xl border border-[#121212]">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-500" />
          <p className="text-[10px] font-semibold text-gray-600 leading-snug">
            Pilih <b>Eksternal</b> bila ingin peta tetap ada setelah aplikasi di-uninstall atau
            ingin menyalinnya ke perangkat lain.
          </p>
        </div>
      </div>
    </div>
  );
}
