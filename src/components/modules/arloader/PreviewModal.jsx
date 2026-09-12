import React from 'react';
import { X, Play } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { isNative } from '../../../services/http.js';

export function getPreviewKind(ext, type) {
  const e = String(ext || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(e)) return 'image';
  if (['mp4', 'webm', 'mov', 'mkv', '3gp'].includes(e)) return 'video';
  if (['mp3', 'm4a', 'ogg', 'wav', 'opus', 'flac'].includes(e)) return 'audio';
  if (type === 'image') return 'image';
  if (type === 'audio') return 'audio';
  return 'video';
}

export function toViewableSrc(filePath, fallbackUrl) {
  if (filePath && isNative()) {
    try {
      return Capacitor.convertFileSrc(filePath);
    } catch {
      return fallbackUrl;
    }
  }
  return fallbackUrl;
}

/**
 * Neubrutalist Preview Modal for image / video / audio.
 * preview: { filename, url, filePath?, ext?, type? } — null to hide.
 */
export default function PreviewModal({ preview, onClose }) {
  if (!preview) return null;
  const kind = getPreviewKind(preview.ext, preview.type);
  const src = preview.filePath ? toViewableSrc(preview.filePath, preview.url) : preview.url;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#F8F5EE] border-[3.5px] border-[#121212] rounded-3xl overflow-hidden shadow-[6px_6px_0px_#121212] font-sans text-[#121212]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-black bg-[#FFE600]">
          <p className="font-mono-code font-black text-xs text-[#121212] truncate">
            {preview.filename || 'PREVIEW MEDIA'}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-white nb-btn p-0 flex items-center justify-center font-black text-xs shrink-0"
            title="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3 bg-white">
          {kind === 'image' && (
            <img src={src} alt={preview.filename} className="w-full max-h-[60vh] object-contain rounded-2xl border-2 border-black shadow-[2px_2px_0px_#121212]" />
          )}
          {kind === 'video' && (
            <video src={src} controls playsInline preload="metadata" className="w-full max-h-[60vh] rounded-2xl border-2 border-black bg-black shadow-[2px_2px_0px_#121212]">
              Browser tidak mendukung video.
            </video>
          )}
          {kind === 'audio' && (
            <div className="flex flex-col items-center gap-3 py-4 bg-[#F8F5EE] rounded-2xl border-2 border-black p-4 shadow-[2px_2px_0px_#121212]">
              <div className="w-14 h-14 rounded-2xl bg-[#38E54D] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#121212]">
                <Play className="w-6 h-6 text-[#121212]" />
              </div>
              <audio src={src} controls preload="metadata" className="w-full">
                Browser tidak mendukung audio.
              </audio>
            </div>
          )}

          {preview.filePath ? (
            <p className="text-[10px] font-mono-code font-bold text-emerald-800 bg-[#38E54D]/20 px-2 py-1 rounded border border-black break-all">
              Memutar file yang tersimpan di perangkat.
            </p>
          ) : (
            <p className="text-[10px] font-mono-code font-bold text-gray-600 bg-[#F8F5EE] px-2 py-1 rounded border border-black">
              Streaming langsung dari server.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
