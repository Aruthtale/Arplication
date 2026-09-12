import React, { useState } from 'react';
import { History, Trash2, Eye, Music, Video, Image as ImageIcon } from 'lucide-react';
import PreviewModal from './PreviewModal.jsx';
import { removeDownloadRecord, clearDownloadHistory } from '../../../utils/history.js';

function kindIcon(type, ext) {
  const e = String(ext || '').toLowerCase();
  if (type === 'audio' || ['mp3', 'm4a', 'ogg', 'wav', 'opus', 'flac'].includes(e)) {
    return <Music className="w-4 h-4 text-[#0FB9B1]" />;
  }
  if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) {
    return <ImageIcon className="w-4 h-4 text-purple-400" />;
  }
  return <Video className="w-4 h-4 text-[#05C46B]" />;
}

export default function DownloadHistory({ items, onChange }) {
  const [preview, setPreview] = useState(null);

  if (!items || items.length === 0) return null;

  const handleRemove = (key) => {
    onChange(removeDownloadRecord(key));
  };

  const handleClear = () => {
    onChange(clearDownloadHistory());
  };

  return (
    <div className="rounded-xl border border-[#262B3B] bg-[#111319] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Riwayat Unduhan ({items.length})
          </h3>
        </div>
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#FF525E] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus Semua</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#181B24] border border-[#262B3B] hover:border-[#05C46B]/50 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-[#0C0E13] flex items-center justify-center shrink-0 border border-[#262B3B]">
              {kindIcon(item.type, item.ext)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono uppercase text-[#05C46B] block">
                {item.platform}
              </span>
              <p className="text-xs font-medium text-white truncate">{item.filename || item.title}</p>
              <span className="text-[10px] text-gray-400">
                {new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setPreview(item)}
                className="p-1.5 rounded-lg bg-[#111319] hover:bg-[#222634] border border-[#262B3B] text-gray-400 hover:text-[#38BDF8] transition-colors"
                title="Lihat / Putar"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleRemove(item.key)}
                className="p-1.5 rounded-lg bg-[#111319] hover:bg-[#222634] border border-[#262B3B] text-gray-400 hover:text-[#FF525E] transition-colors"
                title="Hapus dari riwayat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <PreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
