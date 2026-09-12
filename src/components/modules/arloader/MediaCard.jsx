import React, { useState, useEffect } from 'react';
import { Download, Music, Video, Image as ImageIcon, Loader2, Share2, Eye, Layers, RotateCcw, FileText, Check } from 'lucide-react';
import { Share } from '@capacitor/share';
import { isNative } from '../../../services/http.js';
import { downloadMedia, buildFilename, formatDownloadError, getDownloadSettings, probeFileSize, formatFileSize, saveTextFile } from '../../../utils/download.js';
import PreviewModal from './PreviewModal.jsx';

export default function MediaCard({ media, onDownloadComplete }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadState, setDownloadState] = useState({});
  const [preview, setPreview] = useState(null); // { option, filePath, filename, url, ext, type }
  const [batch, setBatch] = useState(null); // { done, total }
  const [sizes, setSizes] = useState({}); // optionId -> bytes | null
  const [captionSaved, setCaptionSaved] = useState(false);

  // Probe file sizes whenever a new media result arrives
  useEffect(() => {
    setSizes({});
    setCaptionSaved(false);
    if (!media?.options?.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        media.options.map(async (opt) => {
          try {
            const bytes = await probeFileSize(opt.url);
            return [opt.id, bytes];
          } catch {
            return [opt.id, null];
          }
        })
      );
      if (!cancelled) {
        const map = {};
        entries.forEach(([id, bytes]) => { map[id] = bytes; });
        setSizes(map);
      }
    })();
    return () => { cancelled = true; };
  }, [media?.id]);

  const makeFilename = (option) => {
    const settings = getDownloadSettings();
    return buildFilename({
      title: media.title,
      author: media.author?.name || media.author?.username || '',
      platform: media.platform,
      optionId: option.id,
      ext: option.ext,
      pattern: settings.filenamePattern || 'title_id',
    });
  };

  const runDownload = async (option) => {
    const filename = makeFilename(option);
    const res = await downloadMedia({
      url: option.url,
      filename,
      onProgress: (pct, msg) => {
        setDownloadState((prev) => ({
          ...prev,
          [option.id]: { ...(prev[option.id] || {}), progress: pct, message: msg, failed: false },
        }));
      },
    });
    return { res, filename };
  };

  const handleDownload = async (option) => {
    setDownloadingId(option.id);
    setDownloadState((prev) => ({
      ...prev,
      [option.id]: { progress: 12, message: 'Menyiapkan unduhan...', failed: false },
    }));

    try {
      const { res, filename } = await runDownload(option);
      setDownloadState((prev) => ({
        ...prev,
        [option.id]: {
          progress: 100,
          message: res?.location ? `Tersimpan di ${res.location}` : 'Selesai.',
          filePath: res?.path,
          filename,
          failed: false,
        },
      }));
      if (onDownloadComplete) {
        onDownloadComplete({
          title: media.title,
          platform: media.platform,
          cover: media.cover,
          filename,
          filePath: res?.path || null,
          ext: option.ext,
          type: option.type,
          url: option.url,
        });
      }
      setTimeout(() => {
        setDownloadingId((curr) => (curr === option.id ? null : curr));
      }, 4000);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadState((prev) => ({
        ...prev,
        [option.id]: { progress: 0, message: formatDownloadError(err), failed: true },
      }));
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (batch) return;
    setBatch({ done: 0, total: media.options.length });
    for (const option of media.options) {
      setDownloadingId(option.id);
      setDownloadState((prev) => ({
        ...prev,
        [option.id]: { progress: 12, message: 'Menyiapkan unduhan...', failed: false },
      }));
      try {
        const { res, filename } = await runDownload(option);
        setDownloadState((prev) => ({
          ...prev,
          [option.id]: {
            progress: 100,
            message: res?.location ? `Tersimpan di ${res.location}` : 'Selesai.',
            filePath: res?.path,
            filename,
            failed: false,
          },
        }));
        if (onDownloadComplete) {
          onDownloadComplete({
            title: media.title,
            platform: media.platform,
            cover: media.cover,
            filename,
            filePath: res?.path || null,
            ext: option.ext,
            type: option.type,
            url: option.url,
          });
        }
      } catch (err) {
        console.error('Batch download error:', option.id, err);
        setDownloadState((prev) => ({
          ...prev,
          [option.id]: { progress: 0, message: formatDownloadError(err), failed: true },
        }));
      }
      setBatch((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    setDownloadingId(null);
    setBatch(null);
  };

  const openPreview = (option, state) => {
    setPreview({
      option,
      filePath: state?.filePath || null,
      filename: state?.filename || makeFilename(option),
      url: option.url,
      ext: option.ext,
      type: option.type,
    });
  };

  const handleManualShare = async (state) => {
    if (!state?.filePath || !isNative()) return;
    try {
      await Share.share({
        title: state.filename || 'Media',
        text: `Arloader Media: ${state.filename || 'Media'}`,
        url: state.filePath,
        dialogTitle: 'Buka atau Bagikan Media',
      });
    } catch (e) {
      console.warn('Share cancelled or failed:', e);
    }
  };

  const handleSaveCaption = async () => {
    const authorName = media.author?.name || media.author?.username || '';
    const lines = [
      media.title || 'Media',
      '',
      `Platform: ${media.platform || '-'}`,
      authorName ? `Author: ${authorName}` : null,
      media.sourceUrl ? `Sumber: ${media.sourceUrl}` : null,
      `Diunduh: ${new Date().toLocaleString()}`,
      '',
      media.description && media.description !== media.title ? media.description : null,
    ].filter((l) => l !== null);
    const text = lines.join('\n');
    const settings = getDownloadSettings();
    const base = buildFilename({
      title: media.title,
      author: authorName,
      platform: media.platform,
      optionId: 'caption',
      ext: 'txt',
      pattern: settings.filenamePattern || 'title_id',
    });
    try {
      await saveTextFile({ text, filename: base });
      setCaptionSaved(true);
      setTimeout(() => setCaptionSaved(false), 4000);
    } catch (e) {
      console.warn('Save caption failed:', e);
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

  const activeOption = media.options.find((o) => o.id === downloadingId);
  const activeState = activeOption ? downloadState[activeOption.id] : null;
  const showGlobalBar = batch || downloadingId;

  return (
    <div className="rounded-2xl border border-[#262B3B] bg-[#111319] overflow-hidden shadow-xl shadow-black/50 transition-all">
      {/* Global download manager bar */}
      {showGlobalBar && (
        <div className="px-4 py-2.5 bg-[#05C46B]/10 border-b border-[#05C46B]/25 flex items-center gap-3" role="status" aria-live="polite">
          <Loader2 className="w-4 h-4 animate-spin text-[#05C46B] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono text-[#05C46B] truncate">
              {batch
                ? `Unduh semua: ${batch.done}/${batch.total} selesai`
                : `${activeOption?.label || 'Mengunduh...'} — ${activeState?.message || ''}`}
            </p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#0C0E13] border border-[#05C46B]/20">
              <div
                className="h-full rounded-full bg-[#05C46B] transition-all duration-500"
                style={{ width: batch ? `${Math.round((batch.done / Math.max(batch.total, 1)) * 100)}%` : `${Math.max(activeState?.progress || 12, 12)}%` }}
              />
            </div>
          </div>
        </div>
      )}

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

          <div className="pt-2">
            <button
              onClick={handleSaveCaption}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95 border ${
                captionSaved
                  ? 'bg-[#05C46B]/15 border-[#05C46B]/40 text-[#05C46B]'
                  : 'bg-[#181B24] hover:bg-[#222634] border-[#262B3B] text-gray-300 hover:text-white'
              }`}
              title="Simpan judul + info sebagai file .txt"
            >
              {captionSaved ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{captionSaved ? 'Caption Tersimpan' : 'Simpan Caption (.txt)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Available Download Streams */}
      <div className="p-4 sm:p-5 bg-[#0C0E13]/40">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Available Formats ({media.options.length})
          </h4>
          {media.options.length > 1 && (
            <button
              onClick={handleDownloadAll}
              disabled={!!batch || !!downloadingId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0FB9B1]/15 hover:bg-[#0FB9B1]/25 border border-[#0FB9B1]/30 text-[#0FB9B1] text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              title="Unduh semua format sekaligus"
            >
              {batch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              <span>{batch ? `${batch.done}/${batch.total}` : 'Unduh Semua'}</span>
            </button>
          )}
        </div>

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white">{option.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0C0E13] text-gray-400 border border-[#262B3B] uppercase">
                        {option.ext}
                      </span>
                      {sizes[option.id] ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#05C46B]/10 text-[#05C46B] border border-[#05C46B]/25">
                          {formatFileSize(sizes[option.id])}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-gray-600">…</span>
                      )}
                    </div>
                    {option.quality && (
                      <p className="text-[11px] text-gray-400">{option.quality}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => openPreview(option, currentDownload)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-medium transition-all active:scale-95"
                    title="Lihat / Putar di aplikasi"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </button>

                  {currentDownload?.failed && !isCurrent ? (
                    <button
                      onClick={() => handleDownload(option)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF525E]/15 hover:bg-[#FF525E]/25 border border-[#FF525E]/30 text-[#FF525E] text-xs font-medium transition-all active:scale-95"
                      title="Coba unduh lagi"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Coba Lagi</span>
                    </button>
                  ) : (
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
                  )}

                  {currentDownload?.filePath && isNative() && (
                    <button
                      onClick={() => handleManualShare(currentDownload)}
                      className="p-1.5 rounded-lg bg-[#111319] hover:bg-[#222634] border border-[#262B3B] text-gray-400 hover:text-[#05C46B] transition-colors"
                      title="Bagikan / Buka Berkas"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {currentDownload && (
                  <div className={`space-y-1.5 sm:basis-full ${currentDownload.failed ? '' : ''}`} role="status" aria-live="polite">
                    <div className={`flex items-center justify-between gap-3 text-[11px] font-mono ${currentDownload.failed ? 'text-[#FF525E]' : 'text-[#05C46B]'}`}>
                      <span>{currentDownload.message}</span>
                      {!currentDownload.failed && <span>{currentDownload.progress}%</span>}
                    </div>
                    {!currentDownload.failed && (
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
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <PreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
