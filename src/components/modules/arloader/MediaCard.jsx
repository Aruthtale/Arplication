import React, { useState } from 'react';
import { Download, Music, Video, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react';
import { downloadMedia } from '../../../utils/download.js';

export default function MediaCard({ media }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadState, setDownloadState] = useState({});

  const handleDownload = async (option) => {
    setDownloadingId(option.id);
    setDownloadState((prev) => ({
      ...prev,
      [option.id]: { progress: 12, message: 'Menyiapkan unduhan...' },
    }));

    try {
      const sanitizedTitle = (media.title || 'media').slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${sanitizedTitle}_${option.id}.${option.ext}`;

      await downloadMedia({
        url: option.url,
        filename,
        onProgress: (pct, msg) => {
          setDownloadState((prev) => ({
            ...prev,
            [option.id]: { progress: pct, message: msg },
          }));
        },
      });

      setDownloadState((prev) => ({
        ...prev,
        [option.id]: { progress: 100, message: 'Selesai.' },
      }));
      setTimeout(() => {
        setDownloadingId((curr) => (curr === option.id ? null : curr));
      }, 3000);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadState((prev) => ({
        ...prev,
        [option.id]: { progress: 0, message: 'Unduhan gagal. Membuka tautan...' },
      }));
      window.open(option.url, '_blank');
      setDownloadingId(null);
    }
  };

  const getFormatIcon = (type) => {
    switch (type) {
      case 'audio':
        return <Music className="w-4 h-4 text-[#0FB9B1]" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-purple-400" />;
      default:
        return <Video className="w-4 h-4 text-[#05C46B]" />;
    }
  };

  const getPlatformBadgeClass = (platform) => {
    switch (platform) {
      case 'tiktok':
        return 'bg-black/80 text-[#05C46B] border border-[#05C46B]/40';
      case 'youtube':
        return 'bg-black/80 text-[#FF525E] border border-[#FF525E]/40';
      case 'instagram':
        return 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white border border-white/20';
      case 'spotify':
        return 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40';
      case 'x':
        return 'bg-black/80 text-[#38BDF8] border border-[#38BDF8]/40';
      case 'pinterest':
        return 'bg-black/80 text-[#E11D48] border border-[#E11D48]/40';
      default:
        return 'bg-black/80 text-gray-300 border border-[#262B3B]';
    }
  };

  return (
    <div className="rounded-2xl border border-[#262B3B] bg-[#111319] overflow-hidden shadow-xl shadow-black/50 transition-all">
      {/* Header info & cover */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 border-b border-[#262B3B]/60">
        {media.cover && (
          <div className="relative w-full sm:w-44 h-44 sm:h-32 rounded-xl overflow-hidden bg-[#0C0E13] shrink-0 border border-[#262B3B]">
            <img
              src={media.cover}
              alt={media.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <span
              className={`absolute top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getPlatformBadgeClass(
                media.platform
              )}`}
            >
              {media.platform}
            </span>
            {media.duration && (
              <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/80 text-gray-200 px-1.5 py-0.5 rounded">
                {media.duration}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-2 mb-2 leading-snug">
              {media.title}
            </h3>

            {media.author && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                {media.author.avatar && (
                  <img
                    src={media.author.avatar}
                    alt={media.author.name}
                    className="w-5 h-5 rounded-full object-cover border border-[#262B3B]"
                  />
                )}
                <span className="font-medium text-gray-300">{media.author.name}</span>
                {media.author.username && (
                  <span className="text-gray-500 font-mono text-[11px]">{media.author.username}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-gray-400">
            <span className="px-2 py-0.5 rounded bg-[#181B24] border border-[#262B3B]">
              ID: {media.id}
            </span>
            <span className="text-[#05C46B]">● Ready to stream</span>
          </div>
        </div>
      </div>

      {/* Available Download Streams */}
      <div className="p-4 sm:p-5 bg-[#0C0E13]/40">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Available Formats ({media.options.length})
        </h4>

        <div className="space-y-2.5">
          {media.options.map((option) => {
            const isCurrent = downloadingId === option.id;
            const currentDownload = downloadState[option.id];

            return (
              <div
                key={option.id}
                className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#181B24] border border-[#262B3B] hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#111319] border border-[#262B3B] flex items-center justify-center shrink-0">
                    {getFormatIcon(option.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{option.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0C0E13] text-gray-400 border border-[#262B3B] uppercase">
                        {option.ext}
                      </span>
                    </div>
                    {option.quality && (
                      <p className="text-[11px] text-gray-400">{option.quality}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleDownload(option)}
                    disabled={isCurrent}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#05C46B]/15 hover:bg-[#05C46B]/25 border border-[#05C46B]/30 text-[#05C46B] text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download</span>
                  </button>

                  <a
                    href={option.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-[#111319] hover:bg-[#222634] border border-[#262B3B] text-gray-400 hover:text-white transition-colors"
                    title="Direct Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                {currentDownload && (
                  <div className="space-y-1.5 sm:basis-full" role="status" aria-live="polite">
                    <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-[#05C46B]">
                      <span>{currentDownload.message}</span>
                      <span>{currentDownload.progress}%</span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-[#0C0E13] border border-[#262B3B]"
                      role="progressbar"
                      aria-label="Progress unduhan"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={currentDownload.progress}
                    >
                      <div
                        className={`h-full rounded-full bg-[#05C46B] transition-all duration-500 ${
                          isCurrent && currentDownload.progress < 72 ? 'animate-pulse' : ''
                        }`}
                        style={{ width: `${Math.max(currentDownload.progress, isCurrent ? 18 : 0)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
