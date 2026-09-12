import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, History, ArrowLeft, Trash2, Settings, Folder, ClipboardPaste, RotateCcw, Loader2 } from 'lucide-react';
import UrlInput, { extractLinks } from './UrlInput.jsx';
import MediaCard from './MediaCard.jsx';
import DownloadHistory from './DownloadHistory.jsx';
import DownloadSettingsModal from './DownloadSettingsModal.jsx';
import { getDownloadSettings } from '../../../utils/download.js';
import { getDownloadHistory, addDownloadRecord } from '../../../utils/history.js';
import { readClipboard } from '../../../utils/clipboard.js';
import { resolveMediaUrl } from '../../../services/scrapers/index.js';

const SUPPORTED_LINK_RE = /https?:\/\/[^\s]+/i;

export default function ArloaderModule({ setActiveTab }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mediaResult, setMediaResult] = useState(null);
  const [queue, setQueue] = useState([]); // [{ link, status: 'pending'|'loading'|'done'|'error', result?, error? }]
  const [queueActive, setQueueActive] = useState(false);
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [clipSuggestion, setClipSuggestion] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(getDownloadSettings());

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arloader_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
    setDownloads(getDownloadHistory());
  }, []);

  // Auto-detect supported link in clipboard on open
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = (await readClipboard()).trim();
      if (!text || cancelled) return;
      const match = text.match(SUPPORTED_LINK_RE);
      if (match && /tiktok|youtube|youtu\.be|instagram|spotify|twitter|x\.com|pinterest|facebook|fb\.|dailymotion|vimeo|soundcloud|twitch|reddit/i.test(match[0])) {
        setClipSuggestion((prev) => prev || match[0].slice(0, 300));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    setCurrentSettings(getDownloadSettings());
  };

  const saveToHistory = (item) => {
    setHistory((prev) => {
      try {
        const entry = {
          id: item.id,
          title: item.title,
          platform: item.platform,
          cover: item.cover,
          timestamp: Date.now(),
          data: item,
        };
        const updated = [entry, ...prev.filter((h) => h.id !== item.id)].slice(0, 8);
        localStorage.setItem('arloader_history', JSON.stringify(updated));
        return updated;
      } catch (e) {
        console.warn('Failed to save history:', e);
        return prev;
      }
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('arloader_history');
  };

  const processQueueItem = async (link) => {
    const res = await resolveMediaUrl(link);
    // attach source link so caption saver can reference it
    res.sourceUrl = res.sourceUrl || link;
    saveToHistory(res);
    return res;
  };

  const runQueue = async (items) => {
    setQueueActive(true);
    let ok = 0;
    let fail = 0;
    let firstSuccess = null;
    for (let i = 0; i < items.length; i += 1) {
      setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'loading', error: null } : q)));
      try {
        const res = await processQueueItem(items[i]);
        if (!firstSuccess) firstSuccess = res;
        ok += 1;
        setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'done', result: res } : q)));
      } catch (err) {
        fail += 1;
        const msg = err?.message || 'Gagal mengekstrak media.';
        setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'error', error: msg } : q)));
      }
    }
    setQueueActive(false);
    setLoading(false);
    if (firstSuccess) {
      setMediaResult(firstSuccess);
      setError(fail > 0 ? `${ok} berhasil, ${fail} gagal. Klik item antrean untuk detail.` : null);
    } else {
      setMediaResult(null);
      setError(fail > 0 ? `Semua ${fail} link gagal diproses.` : 'Gagal mengekstrak media.');
    }
  };

  const retryQueueFailures = () => {
    const failedLinks = queue.filter((q) => q.status === 'error').map((q) => q.link);
    if (!failedLinks.length || queueActive) return;
    // reset failed to pending then re-run only those
    const remaining = queue.map((q) => (q.status === 'error' ? { ...q, status: 'pending', error: null } : q));
    const failedIdx = [];
    remaining.forEach((q, idx) => { if (q.status === 'pending' && failedLinks.includes(q.link)) failedIdx.push(idx); });
    setLoading(true);
    setError(null);
    (async () => {
      setQueueActive(true);
      let ok = 0;
      let fail = 0;
      for (const i of failedIdx) {
        setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'loading', error: null } : q)));
        try {
          const res = await processQueueItem(remaining[i].link);
          ok += 1;
          setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'done', result: res } : q)));
        } catch (err) {
          fail += 1;
          const msg = err?.message || 'Gagal mengekstrak media.';
          setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'error', error: msg } : q)));
        }
      }
      setQueueActive(false);
      setLoading(false);
      if (fail > 0) setError(`${ok} berhasil diulang, ${fail} masih gagal.`);
      else setError(null);
    })();
  };

  const handleFetch = async () => {
    const links = extractLinks(url);
    if (!links.length) return;
    setLoading(true);
    setError(null);

    // Multi-link: process as queue
    if (links.length > 1) {
      setMediaResult(null);
      setQueue(links.map((link) => ({ link, status: 'pending', result: null, error: null })));
      await runQueue(links);
      return;
    }

    // Single link: classic flow
    setQueue([]);
    try {
      const res = await processQueueItem(links[0]);
      setMediaResult(res);
    } catch (err) {
      console.error('Resolve failed:', err);
      setError(err.message || 'Failed to extract media from this URL.');
      setMediaResult(null);
    } finally {
      setLoading(false);
    }
  };

  const sub = String(currentSettings.subfolder || '').trim().replace(/^\/+|\/+$/g, '');
  const dirLabel = currentSettings.directory === 'Documents' ? 'Documents' : 'Download';
  const folderBadgeText = sub ? `${dirLabel}/${sub}` : dirLabel;

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* Module Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#111319] border border-[#262B3B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hub</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Storage folder badge & button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#181B24] hover:bg-[#202430] border border-[#262B3B] text-gray-300 hover:text-[#05C46B] transition-colors"
            title="Ubah Folder Penyimpanan"
          >
            <Folder className="w-3.5 h-3.5 text-[#05C46B]" />
            <span>{folderBadgeText}</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-[#111319] hover:bg-[#181B24] border border-[#262B3B] text-gray-400 hover:text-white transition-colors"
            title="Pengaturan Download"
          >
            <Settings className="w-4 h-4 text-gray-400 hover:text-[#05C46B]" />
          </button>

          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border bg-[#05C46B]/10 text-[#05C46B] border-[#05C46B]/30 hidden sm:inline-block">
            Arloader Active
          </span>
        </div>
      </div>

      {/* Input Section */}
      <div className="rounded-2xl border border-[#262B3B] bg-gradient-to-b from-[#181B24] to-[#111319] p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between gap-2.5 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#05C46B]/20 border border-[#05C46B]/40 flex items-center justify-center">
              <Download className="w-4 h-4 text-[#05C46B]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Arloader Media Downloader
              </h2>
              <p className="text-xs text-gray-400">
                Download TikTok HD, YouTube, Instagram Reels/Post/Carousel, Spotify, X, dan Pinterest
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <UrlInput
            url={url}
            setUrl={setUrl}
            onFetch={handleFetch}
            loading={loading}
          />
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FF525E]/10 border border-[#FF525E]/30 flex items-start gap-2 text-xs text-[#FF525E]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Queue panel (multi-link) */}
      {queue.length > 1 && (
        <div className="rounded-2xl border border-[#262B3B] bg-[#111319] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Antrean ({queue.filter((q) => q.status === 'done').length}/{queue.length} selesai)
            </h3>
            {queue.some((q) => q.status === 'error') && !queueActive && (
              <button
                onClick={retryQueueFailures}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF525E]/10 hover:bg-[#FF525E]/20 border border-[#FF525E]/30 text-[#FF525E] text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ulangi yang gagal</span>
              </button>
            )}
          </div>
          {queueActive && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#0C0E13] border border-[#262B3B]">
              <div
                className="h-full rounded-full bg-[#0FB9B1] transition-all duration-500"
                style={{ width: `${Math.round((queue.filter((q) => q.status === 'done' || q.status === 'error').length / Math.max(queue.length, 1)) * 100)}%` }}
              />
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {queue.map((q, idx) => (
              <button
                key={`${idx}_${q.link}`}
                disabled={q.status !== 'done'}
                onClick={() => {
                  if (q.result) {
                    setMediaResult(q.result);
                    setError(null);
                  }
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                  q.status === 'done'
                    ? 'bg-[#181B24] border-[#262B3B] hover:border-[#05C46B]/50 cursor-pointer'
                    : q.status === 'error'
                      ? 'bg-[#FF525E]/5 border-[#FF525E]/25 cursor-default'
                      : q.status === 'loading'
                        ? 'bg-[#0FB9B1]/5 border-[#0FB9B1]/30 cursor-default'
                        : 'bg-[#0C0E13] border-[#262B3B]/60 cursor-default'
                }`}
              >
                <span className="shrink-0">
                  {q.status === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0FB9B1]" />
                  ) : q.status === 'done' ? (
                    <span className="w-4 h-4 rounded-full bg-[#05C46B]/20 border border-[#05C46B]/50 text-[#05C46B] text-[10px] font-bold flex items-center justify-center">✓</span>
                  ) : q.status === 'error' ? (
                    <span className="w-4 h-4 rounded-full bg-[#FF525E]/15 border border-[#FF525E]/50 text-[#FF525E] text-[10px] font-bold flex items-center justify-center">!</span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-[#181B24] border border-[#262B3B] text-gray-500 text-[10px] flex items-center justify-center">{idx + 1}</span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-[11px] font-medium text-white truncate block">
                    {q.result?.title || q.link.slice(0, 80)}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 truncate block">
                    {q.status === 'error' ? q.error : q.result ? `${q.result.platform} • ${q.result.options?.length || 0} format` : q.link.slice(0, 90)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media Result Display */}
      {mediaResult && (
        <div>
          <MediaCard
            media={mediaResult}
            onDownloadComplete={(record) => setDownloads(addDownloadRecord(record))}
          />
        </div>
      )}

      {/* Clipboard suggestion banner */}
      {clipSuggestion && !mediaResult && (
        <button
          onClick={() => {
            setUrl(clipSuggestion);
            setClipSuggestion('');
          }}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 hover:border-[#38BDF8]/60 text-left transition-all"
        >
          <ClipboardPaste className="w-5 h-5 text-[#38BDF8] shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-white block">Link terdeteksi di clipboard</span>
            <span className="text-[11px] font-mono text-gray-400 truncate block">{clipSuggestion}</span>
          </span>
          <span className="text-[11px] font-semibold text-[#38BDF8] shrink-0">Tempel</span>
        </button>
      )}

      {/* Download history (files already saved) */}
      <DownloadHistory items={downloads} onChange={setDownloads} />

      {/* Recent History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-[#262B3B] bg-[#111319] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Recent Extractions
              </h3>
            </div>
            <button
              onClick={clearHistory}
              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#FF525E] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setMediaResult(item.data);
                  setError(null);
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#181B24] border border-[#262B3B] hover:border-[#05C46B]/50 cursor-pointer transition-all hover:scale-[1.01]"
              >
                {item.cover ? (
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="w-12 h-12 rounded-lg object-cover bg-[#0C0E13] shrink-0 border border-[#262B3B]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#0C0E13] flex items-center justify-center shrink-0 border border-[#262B3B]">
                    <Download className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <span className="text-[10px] font-mono uppercase text-[#05C46B] block">
                    {item.platform}
                  </span>
                  <p className="text-xs font-medium text-white truncate">{item.title}</p>
                  <span className="text-[10px] text-gray-400">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storage Settings Modal */}
      <DownloadSettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />
    </div>
  );
}
