import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Music, Video, Image as ImageIcon, Loader2, Share2, Eye, 
  Layers, RotateCcw, FileText, Check, Play, Pause, ListMusic, Sparkles, 
  ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { isNative, isLocalWeb } from '../../../services/http.js';
import { 
  downloadMedia, buildFilename, formatDownloadError, getDownloadSettings, 
  probeFileSize, formatFileSize, saveTextFile 
} from '../../../utils/download.js';
import { resolveSpotifyTrackAudio } from '../../../services/scrapers/spotify.js';
import PreviewModal from './PreviewModal.jsx';

export default function MediaCard({ media, onDownloadComplete }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadState, setDownloadState] = useState({});
  const [preview, setPreview] = useState(null);
  const [batch, setBatch] = useState(null); // { done, total, currentTitle }
  const [sizes, setSizes] = useState({});
  const [captionSaved, setCaptionSaved] = useState(false);
  const [ytCategory, setYtCategory] = useState('mp4'); // mp4 | mp3 | img
  
  // Audio preview playback state for tracks
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const audioRef = useRef(null);

  // Probe file sizes whenever a new media result arrives
  useEffect(() => {
    setSizes({});
    setCaptionSaved(false);
    setYtCategory('mp4');
    if (!media?.options?.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        media.options.map(async (opt) => {
          // Prefer backend-provided estimate; only probe when no size info exists.
          if (opt.bytes) return [opt.id, opt.bytes];
          if (opt.estimatedSize) return [opt.id, null];
          // Link halaman eksternal (ext 'url', cth. "Open in Spotify") bukan file
          // yang bisa di-download — mem-probe-nya via fetch selalu kena blokir CORS.
          if (opt.ext === 'url') return [opt.id, null];
          if (!opt.url) return [opt.id, null];
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

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const makeFilename = (option, customTitle = null) => {
    const settings = getDownloadSettings();
    return buildFilename({
      title: customTitle || media.title,
      author: media.author?.name || media.author?.username || '',
      platform: media.platform,
      optionId: option.id,
      ext: option.ext || 'mp3',
      pattern: settings.filenamePattern || 'title_id',
    });
  };

  const runDownload = async (option, customTitle = null) => {
    let targetUrl = option.url;

    // Dynamically resolve audio URL if query is provided (Spotify full MP3 fallback)
    if (!targetUrl && option.query) {
      targetUrl = await resolveSpotifyTrackAudio({ query: option.query });
    }

    if (!targetUrl) {
      throw new Error('URL download tidak dapat ditentukan.');
    }

    const filename = makeFilename(option, customTitle);
    const res = await downloadMedia({
      url: targetUrl,
      filename,
      platform: media?.platform || '',
      onProgress: (pct, msg) => {
        setDownloadState((prev) => ({
          ...prev,
          [option.id]: { ...(prev[option.id] || {}), progress: pct, message: msg, failed: false },
        }));
      },
    });
    return { res, filename };
  };

  const handleDownload = async (option, customTitle = null) => {
    // Link halaman eksternal (ext 'url', cth. "Open in Spotify") bukan file —
    // buka di tab baru, jangan di-fetch (kena blokir CORS).
    if (option.ext === 'url' && option.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setDownloadingId(option.id);
    setDownloadState((prev) => ({
      ...prev,
      [option.id]: { progress: 12, message: 'Menyiapkan unduhan...', failed: false },
    }));

    try {
      const { res, filename } = await runDownload(option, customTitle);
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
          title: customTitle || media.title,
          platform: media.platform,
          cover: media.cover,
          filename,
          filePath: res?.path || null,
          ext: option.ext || 'mp3',
          type: option.type || 'audio',
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

  // Batch download for single media options (e.g. all formats)
  const handleDownloadAll = async () => {
    if (batch) return;
    setBatch({ done: 0, total: media.options.length, currentTitle: media.title });
    for (const option of media.options) {
      // Lewati link halaman eksternal (ext 'url', cth. "Open in Spotify") —
      // bukan file yang bisa diunduh, jangan di-fetch (kena blokir CORS).
      if (option.ext === 'url') {
        setBatch((b) => (b ? { ...b, done: b.done + 1 } : b));
        continue;
      }
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

  // Batch download for Playlist/Album (all tracks sequentially, dengan jeda anti rate-limit)
  const handleDownloadPlaylistBatch = async () => {
    if (batch || !media.tracks?.length) return;
    const tracksToDownload = media.tracks;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    setBatch({ done: 0, total: tracksToDownload.length, currentTitle: tracksToDownload[0]?.title });

    for (let i = 0; i < tracksToDownload.length; i += 1) {
      const track = tracksToDownload[i];
      const optId = `track-${track.id || i}`;
      const opt = {
        id: optId,
        url: track.downloadUrl || null,
        query: `${track.artist} - ${track.title}`,
        ext: 'mp3',
        type: 'audio',
      };

      setBatch({ done: i, total: tracksToDownload.length, currentTitle: track.title });
      setDownloadingId(optId);
      // Jeda 1.5 dtk antar track agar tidak dihajar anti-bot/rate-limit Piped
      if (i > 0) {
        setDownloadState((prev) => ({
          ...prev,
          [optId]: { progress: 5, message: 'Menunggu jeda anti-blokir...', failed: false },
        }));
        await sleep(1500);
      }
      setDownloadState((prev) => ({
        ...prev,
        [optId]: { progress: 12, message: `Mengunduh track ${i + 1}/${tracksToDownload.length}...`, failed: false },
      }));

      try {
        const { res, filename } = await runDownload(opt, `${track.artist} - ${track.title}`);
        setDownloadState((prev) => ({
          ...prev,
          [optId]: {
            progress: 100,
            message: 'Tersimpan.',
            filePath: res?.path,
            filename,
            failed: false,
          },
        }));
        if (onDownloadComplete) {
          onDownloadComplete({
            title: `${track.artist} - ${track.title}`,
            platform: media.platform,
            cover: track.cover || media.cover,
            filename,
            filePath: res?.path || null,
            ext: 'mp3',
            type: 'audio',
            url: track.url,
          });
        }
      } catch (err) {
        console.error(`Gagal download track ${track.title}:`, err);
        setDownloadState((prev) => ({
          ...prev,
          [optId]: { progress: 0, message: formatDownloadError(err), failed: true },
        }));
      }
    }

    setBatch(null);
    setDownloadingId(null);
  };

  const handleTrackDownload = (track, idx) => {
    const optId = `track-${track.id || idx}`;
    const opt = {
      id: optId,
      url: track.downloadUrl || null,
      query: `${track.artist} - ${track.title}`,
      ext: 'mp3',
      type: 'audio',
    };
    handleDownload(opt, `${track.artist} - ${track.title}`);
  };

  const handleTogglePlay = async (track) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }

    setPlayingTrackId(track.id);
    let audioSrc = track.downloadUrl;
    if (!audioSrc && track.query) {
      try {
        audioSrc = await resolveSpotifyTrackAudio({ query: track.query });
      } catch (err) {
        console.warn('Failed to resolve full track audio, falling back to preview:', err);
      }
    }
    if (!audioSrc && track.previewUrl) {
      audioSrc = track.previewUrl;
    }

    if (audioRef.current && audioSrc) {
      audioRef.current.src = audioSrc;
      audioRef.current.play().catch((e) => {
        console.warn('Playback error:', e);
        if (track.previewUrl && audioSrc !== track.previewUrl) {
          audioRef.current.src = track.previewUrl;
          audioRef.current.play().catch(() => {});
        }
      });
    }
  };

  const openPreview = async (option, state) => {
    let playUrl = state?.filePath || option.url;
    if (!playUrl && option.query) {
      try {
        playUrl = await resolveSpotifyTrackAudio({ query: option.query });
      } catch (e) {
        console.warn('Failed to resolve audio for preview modal:', e);
      }
    }

    setPreview({
      option,
      filePath: state?.filePath || null,
      filename: state?.filename || makeFilename(option),
      url: playUrl || option.url,
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
      await saveTextFile({ text, filename: base, platform: media?.platform || '' });
      setCaptionSaved(true);
      setTimeout(() => setCaptionSaved(false), 4000);
    } catch (e) {
      console.warn('Save caption failed:', e);
    }
  };

  const getFormatIcon = (type) => {
    switch (type) {
      case 'audio':
        return <Music className="w-4 h-4 text-[#121212]" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-[#FF70A6]" />;
      default:
        return <Video className="w-4 h-4 text-[#121212]" />;
    }
  };

  const getPlatformBadge = (platform) => {
    switch (platform) {
      case 'tiktok':
        return { bg: 'bg-[#121212]', text: 'text-[#38E54D]', label: 'TIKTOK HD' };
      case 'youtube':
        return { bg: 'bg-[#FF525E]', text: 'text-white', label: 'YOUTUBE' };
      case 'instagram':
        return { bg: 'bg-[#FF70A6]', text: 'text-white', label: 'INSTAGRAM' };
      case 'spotify':
        return { bg: 'bg-[#1DB954]', text: 'text-black', label: 'SPOTIFY' };
      case 'x':
        return { bg: 'bg-[#121212]', text: 'text-[#4DEEEA]', label: 'TWITTER / X' };
      case 'pinterest':
        return { bg: 'bg-[#E11D48]', text: 'text-white', label: 'PINTEREST' };
      default:
        return { bg: 'bg-[#121212]', text: 'text-white', label: (platform || 'MEDIA').toUpperCase() };
    }
  };

  const badge = getPlatformBadge(media.platform);

  // YouTube: group options by category (mp4 | mp3 | img) for tabbed picking.
  const isYouTubeOptions =
    media.platform === 'youtube' && (media.options || []).some((o) => o.category);
  const ytCounts = isYouTubeOptions
    ? {
        mp4: media.options.filter((o) => o.category === 'mp4').length,
        mp3: media.options.filter((o) => o.category === 'mp3').length,
        img: media.options.filter((o) => o.category === 'img').length,
      }
    : { mp4: 0, mp3: 0, img: 0 };
  const visibleOptions = isYouTubeOptions
    ? media.options.filter((o) => (o.category || 'mp4') === ytCategory)
    : media.options;

  const displaySize = (option) => {
    if (sizes[option.id]) return formatFileSize(sizes[option.id]);
    if (option.estimatedSize) return option.estimatedSize;
    return null;
  };

  return (
    <div className="space-y-3 font-sans">
      <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} className="hidden" />

      {/* Global Batch Download Progress Card */}
      {batch && (
        <div className="nb-card p-3.5 bg-[#FFE600] space-y-2 animate-fadeIn" role="status" aria-live="polite">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#121212]" />
              <span className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider">
                BATCH DOWNLOADING
              </span>
            </div>
            <span className="font-mono-code font-black text-xs bg-black text-white px-2 py-0.5 rounded-md">
              {batch.done} / {batch.total} SELESAI
            </span>
          </div>
          <p className="text-[11px] font-bold text-[#121212] truncate">
            {batch.currentTitle || 'Memproses antrean file...'}
          </p>
          <div className="h-2.5 rounded-full bg-white border-2 border-black overflow-hidden">
            <div 
              className="h-full bg-[#121212] transition-all duration-300"
              style={{ width: `${Math.round((batch.done / Math.max(batch.total, 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Neubrutalist Bento Media Card */}
      <div className="nb-card overflow-hidden bg-white">
        {/* Header Bar with Platform Badge and Media Type */}
        <div className="px-4 py-2.5 bg-[#F8F5EE] border-b-[2.5px] border-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono-code font-black px-2 py-0.5 rounded border-2 border-black shadow-[1.5px_1.5px_0px_#121212] ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
            {media.isPlaylist && (
              <span className="text-[10px] font-mono-code font-black bg-[#FFE600] text-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#121212]">
                {media.type === 'album' ? 'ALBUM' : 'PLAYLIST'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-code text-[10px] font-extrabold text-emerald-800 bg-[#38E54D]/20 px-2 py-0.5 border border-black rounded">
              ● READY
            </span>
          </div>
        </div>

        {/* Media Presentation Info */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 border-b-[2.5px] border-[#121212]">
          {media.cover && (
            <div className="relative w-full sm:w-44 h-44 sm:h-36 rounded-xl overflow-hidden bg-[#121212] shrink-0 border-2 border-black shadow-[3px_3px_0px_#121212]">
              <img
                src={media.cover}
                alt={media.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {media.duration && (
                <span className="absolute bottom-2 right-2 text-[10px] font-mono-code font-black bg-black text-white px-1.5 py-0.5 rounded border border-white">
                  {media.duration}
                </span>
              )}
              {media.isPlaylist && media.tracks && (
                <span className="absolute top-2 left-2 text-[10px] font-mono-code font-black bg-[#FFE600] text-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#121212]">
                  {media.tracks.length} LAGU
                </span>
              )}
            </div>
          )}

          <div className="flex-1 flex flex-col justify-between space-y-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#121212] line-clamp-2 leading-snug">
                {media.title}
              </h3>

              {media.author && (
                <div className="flex items-center gap-2 text-xs text-gray-700 font-bold mt-1.5">
                  {media.author.avatar && (
                    <img
                      src={media.author.avatar}
                      alt={media.author.name}
                      className="w-5 h-5 rounded-full object-cover border border-black"
                    />
                  )}
                  <span>{media.author.name}</span>
                  {media.author.username && (
                    <span className="text-gray-500 font-mono-code text-[11px]">{media.author.username}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <button
                onClick={handleSaveCaption}
                className={`nb-btn px-3 py-1.5 text-[11px] flex items-center gap-1.5 ${
                  captionSaved ? 'bg-[#38E54D] text-black' : 'bg-white text-[#121212]'
                }`}
                title="Simpan judul dan info sebagai file teks"
              >
                {captionSaved ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{captionSaved ? 'Tersimpan!' : 'Simpan Info (.txt)'}</span>
              </button>

              {media.isPlaylist && (
                <button
                  onClick={handleDownloadPlaylistBatch}
                  disabled={!!batch}
                  className="nb-btn px-3 py-1.5 bg-[#FFE600] hover:bg-yellow-400 text-[#121212] text-[11px] flex items-center gap-1.5 shadow-[2.5px_2.5px_0px_#121212]"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>UNDUH SEMUA LAGU ({media.tracks?.length || 0})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CASE 1: PLAYLIST / ALBUM MULTI-TRACK VIEW */}
        {media.isPlaylist && media.tracks?.length > 0 ? (
          <div className="p-4 bg-[#F8F5EE] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#121212]" />
                <h4 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider">
                  DAFTAR LAGU ({media.tracks.length} TRACKS)
                </h4>
              </div>
              <span className="text-[10px] font-mono-code font-bold text-gray-600 bg-white px-2 py-0.5 border border-black rounded">
                FULL MP3 320K
              </span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {media.tracks.map((track, idx) => {
                const optId = `track-${track.id || idx}`;
                const isCurrent = downloadingId === optId;
                const trackState = downloadState[optId];
                const isPlaying = playingTrackId === track.id;

                return (
                  <div
                    key={track.id || idx}
                    className="nb-card p-2.5 sm:p-3 bg-white hover:bg-yellow-50/50 flex flex-col gap-2 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-[#F8F5EE] border border-black flex items-center justify-center font-mono-code text-[11px] font-black shrink-0">
                          {track.index || idx + 1}
                        </span>

                        <div className="min-w-0">
                          <h5 className="font-black text-xs text-[#121212] truncate">
                            {track.title}
                          </h5>
                          <p className="text-[10px] font-bold text-gray-600 truncate">
                            {track.artist || 'Artist'} {track.duration ? `• ${track.duration}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(track.previewUrl || track.downloadUrl || track.query) && (
                          <button
                            type="button"
                            onClick={() => handleTogglePlay(track)}
                            className="w-7 h-7 rounded-lg bg-[#C4FAF8] border border-black flex items-center justify-center text-[#121212] shadow-[1px_1px_0px_#121212] hover:bg-cyan-200"
                            title={isPlaying ? 'Pause' : 'Putar Lagu'}
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTrackDownload(track, idx)}
                          disabled={isCurrent}
                          className={`nb-btn px-2.5 py-1 text-[10px] flex items-center gap-1 shadow-[1.5px_1.5px_0px_#121212] ${
                            trackState?.progress === 100
                              ? 'bg-[#38E54D] text-black'
                              : 'bg-[#FFE600] text-black'
                          }`}
                        >
                          {isCurrent ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : trackState?.progress === 100 ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          <span>{trackState?.progress === 100 ? 'Selesai' : 'MP3'}</span>
                        </button>
                      </div>
                    </div>

                    {trackState && (
                      <div className="space-y-1 pt-1 border-t border-gray-200">
                        <div className="flex items-center justify-between text-[10px] font-mono-code font-bold">
                          <span className={trackState.failed ? 'text-red-600' : 'text-emerald-700'}>
                            {trackState.message}
                          </span>
                          {!trackState.failed && <span>{trackState.progress}%</span>}
                        </div>
                        {!trackState.failed && (
                          <div className="h-1.5 bg-gray-200 border border-black rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#38E54D] transition-all duration-300"
                              style={{ width: `${trackState.progress}%` }}
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
        ) : (
          /* CASE 2: SINGLE MEDIA AVAILABLE FORMATS */
          <div className="p-4 sm:p-5 bg-[#F8F5EE] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider">
                {isYouTubeOptions ? 'PILIH FORMAT' : `PILIHAN FORMAT (${media.options?.length || 0})`}
              </h4>
              {!isYouTubeOptions && media.options?.length > 1 && (
                <button
                  onClick={handleDownloadAll}
                  disabled={!!batch || !!downloadingId}
                  className="nb-btn px-3 py-1 bg-[#FFE600] text-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_#121212]"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Unduh Semua Format</span>
                </button>
              )}
            </div>

            {isYouTubeOptions && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setYtCategory('mp4')}
                  className={`nb-btn px-2 py-2 text-xs flex items-center justify-center gap-1.5 ${
                    ytCategory === 'mp4' ? 'bg-[#FF525E] text-white' : 'bg-white text-black'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span className="font-black">MP4</span>
                  <span className="font-mono-code text-[10px] opacity-80">{ytCounts.mp4}</span>
                </button>
                <button
                  onClick={() => setYtCategory('mp3')}
                  className={`nb-btn px-2 py-2 text-xs flex items-center justify-center gap-1.5 ${
                    ytCategory === 'mp3' ? 'bg-[#1DB954] text-white' : 'bg-white text-black'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  <span className="font-black">MP3</span>
                  <span className="font-mono-code text-[10px] opacity-80">{ytCounts.mp3}</span>
                </button>
                <button
                  onClick={() => setYtCategory('img')}
                  className={`nb-btn px-2 py-2 text-xs flex items-center justify-center gap-1.5 ${
                    ytCategory === 'img' ? 'bg-[#4D96FF] text-white' : 'bg-white text-black'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="font-black">IMG</span>
                  <span className="font-mono-code text-[10px] opacity-80">{ytCounts.img}</span>
                </button>
              </div>
            )}

            <div className="space-y-2.5">
              {visibleOptions?.map((option) => {
                const isCurrent = downloadingId === option.id;
                const currentDownload = downloadState[option.id];

                return (
                  <div
                    key={option.id}
                    className="nb-card p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2.5px_2.5px_0px_#121212]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#121212]">
                        {getFormatIcon(option.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[#121212]">{option.label}</span>
                          <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded bg-[#F8F5EE] text-black border border-black uppercase">
                            {option.ext}
                          </span>
                          {option.resolution && (
                            <span className="text-[10px] font-mono-code font-black px-1.5 py-0.2 rounded bg-[#FFE600] text-black border border-black">
                              {option.resolution}
                            </span>
                          )}
                          {displaySize(option) ? (
                            <span className="text-[10px] font-mono-code font-black px-1.5 py-0.2 rounded bg-[#38E54D]/30 text-emerald-800 border border-black">
                              {displaySize(option)}
                            </span>
                          ) : null}
                        </div>
                        {option.quality && (
                          <p className="text-[11px] font-bold text-gray-500 mt-0.5">{option.quality}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {option.url && option.ext !== 'url' && (
                        <button
                          onClick={() => openPreview(option, currentDownload)}
                          className="nb-btn px-3 py-1.5 bg-[#C4FAF8] text-black text-xs flex items-center gap-1 shadow-[1.5px_1.5px_0px_#121212]"
                          title="Lihat / Putar di aplikasi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </button>
                      )}

                      {option.ext === 'url' ? (
                        <button
                          onClick={() => window.open(option.url, '_blank', 'noopener,noreferrer')}
                          className="nb-btn px-3.5 py-1.5 bg-[#1DB954] text-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_#121212]"
                          title="Buka di Spotify / situs resmi"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka</span>
                        </button>
                      ) : currentDownload?.failed && !isCurrent ? (
                        <button
                          onClick={() => handleDownload(option)}
                          className="nb-btn px-3 py-1.5 bg-[#FF6B6B] text-white text-xs flex items-center gap-1 shadow-[1.5px_1.5px_0px_#121212]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Coba Lagi</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload(option)}
                          disabled={isCurrent}
                          className="nb-btn px-3.5 py-1.5 bg-[#38E54D] text-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_#121212] disabled:opacity-50"
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
                          className="nb-btn p-1.5 bg-white text-black shadow-[1.5px_1.5px_0px_#121212]"
                          title="Bagikan / Buka Berkas"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {currentDownload && (
                      <div className="space-y-1 sm:basis-full pt-1 border-t border-gray-100" role="status" aria-live="polite">
                        <div className="flex items-center justify-between gap-3 text-[11px] font-mono-code font-bold">
                          <span className={currentDownload.failed ? 'text-red-600' : 'text-emerald-800'}>
                            {currentDownload.message}
                          </span>
                          {!currentDownload.failed && <span>{currentDownload.progress}%</span>}
                        </div>
                        {!currentDownload.failed && (
                          <div className="h-2 overflow-hidden rounded-full bg-white border border-black">
                            <div
                              className="h-full bg-[#38E54D] transition-all duration-300"
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
        )}
      </div>

      <PreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
