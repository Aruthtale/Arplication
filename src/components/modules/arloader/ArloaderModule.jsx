import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, History, Sparkles, ArrowLeft, Trash2 } from 'lucide-react';
import UrlInput from './UrlInput.jsx';
import MediaCard from './MediaCard.jsx';
import { resolveMediaUrl } from '../../../services/scrapers/index.js';

export default function ArloaderModule({ setActiveTab }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mediaResult, setMediaResult] = useState(null);
  const [history, setHistory] = useState([]);

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
  }, []);

  const saveToHistory = (item) => {
    try {
      const entry = {
        id: item.id,
        title: item.title,
        platform: item.platform,
        cover: item.cover,
        timestamp: Date.now(),
        data: item,
      };
      const updated = [entry, ...history.filter((h) => h.id !== item.id)].slice(0, 8);
      setHistory(updated);
      localStorage.setItem('arloader_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save history:', e);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('arloader_history');
  };

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await resolveMediaUrl(url);
      setMediaResult(res);
      saveToHistory(res);
    } catch (err) {
      console.error('Resolve failed:', err);
      setError(err.message || 'Failed to extract media from this URL.');
      setMediaResult(null);
    } finally {
      setLoading(false);
    }
  };

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
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border bg-[#05C46B]/10 text-[#05C46B] border-[#05C46B]/30">
            Arloader Active
          </span>
        </div>
      </div>

      {/* Input Section */}
      <div className="rounded-2xl border border-[#262B3B] bg-gradient-to-b from-[#181B24] to-[#111319] p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#05C46B]/20 border border-[#05C46B]/40 flex items-center justify-center">
            <Download className="w-4 h-4 text-[#05C46B]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Arloader Media Downloader
            </h2>
            <p className="text-xs text-gray-400">
              Download TikTok HD (no watermark) and YouTube (MP4 & MP3)
            </p>
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

      {/* Media Result Display */}
      {mediaResult && (
        <div>
          <MediaCard media={mediaResult} />
        </div>
      )}

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
              className="text-xs text-gray-500 hover:text-[#FF525E] flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => setMediaResult(item.data)}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[#181B24]/70 hover:bg-[#181B24] border border-[#262B3B] hover:border-[#05C46B]/40 cursor-pointer transition-all"
              >
                {item.cover && (
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="w-12 h-12 rounded-lg object-cover bg-black shrink-0 border border-[#262B3B]"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#0C0E13] text-[#05C46B] border border-[#262B3B]">
                      {item.platform}
                    </span>
                  </div>
                  <p className="text-xs text-white truncate font-medium">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
