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
 * Shared preview modal for image / video / audio.
 * preview: { filename, url, filePath?, ext?, type? } — null to hide.
 */
export default function PreviewModal({ preview, onClose }) {
  if (!preview) return null;
  const kind = getPreviewKind(preview.ext, preview.type);
  const src = preview.filePath ? toViewableSrc(preview.filePath, preview.url) : preview.url;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[#262B3B] bg-[#111319] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#262B3B]">
          <p className="text-xs font-medium text-white truncate">{preview.filename}</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#181B24] border border-[#262B3B] text-gray-400 hover:text-white transition-colors"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 bg-[#0C0E13]">
          {kind === 'image' && (
            <img src={src} alt={preview.filename} className="w-full max-h-[60vh] object-contain rounded-xl border border-[#262B3B]" />
          )}
          {kind === 'video' && (
            <video src={src} controls playsInline preload="metadata" className="w-full max-h-[60vh] rounded-xl border border-[#262B3B] bg-black">
              Browser tidak mendukung video.
            </video>
          )}
          {kind === 'audio' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-[#05C46B]/15 border border-[#05C46B]/30 flex items-center justify-center">
                <Play className="w-7 h-7 text-[#05C46B]" />
              </div>
              <audio src={src} controls preload="metadata" className="w-full">
                Browser tidak mendukung audio.
              </audio>
            </div>
          )}
          {preview.filePath ? (
            <p className="mt-3 text-[11px] font-mono text-[#05C46B] break-all">Memutar file yang sudah diunduh.</p>
          ) : (
            <p className="mt-3 text-[11px] font-mono text-gray-400">Streaming dari URL — unduh dulu untuk putar offline.</p>
          )}
        </div>
      </div>
    </div>
  );
}
