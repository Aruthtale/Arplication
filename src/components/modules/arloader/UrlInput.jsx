import React from 'react';
import { Clipboard, ArrowRight, X, Loader2 } from 'lucide-react';
import { readClipboard } from '../../../utils/clipboard.js';

export default function UrlInput({ url, setUrl, onFetch, loading }) {
  const handlePaste = async () => {
    const text = await readClipboard();
    if (text) {
      setUrl(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && url.trim()) {
      onFetch();
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative flex items-center">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste TikTok or YouTube video link here..."
          className="w-full bg-[#111319] border border-[#262B3B] focus:border-[#05C46B] focus:ring-2 focus:ring-[#05C46B]/20 text-white placeholder-gray-500 rounded-xl py-3.5 pl-4 pr-28 text-sm outline-none transition-all font-sans"
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {url && (
            <button
              onClick={() => setUrl('')}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#181B24] transition-colors"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePaste}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#181B24] hover:bg-[#222634] border border-[#262B3B] text-xs font-medium text-gray-300 hover:text-white transition-colors"
            title="Paste from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5 text-[#05C46B]" />
            <span className="hidden sm:inline">Paste</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span>Supported:</span>
          <span className="font-mono text-gray-400">TikTok</span>
          <span>•</span>
          <span className="font-mono text-gray-400">YouTube</span>
        </div>

        <button
          onClick={onFetch}
          disabled={loading || !url.trim()}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-lg ${
            loading || !url.trim()
              ? 'bg-[#181B24] text-gray-500 border border-[#262B3B] cursor-not-allowed'
              : 'bg-[#05C46B] hover:bg-[#0BE881] text-[#0C0E13] shadow-[#05C46B]/20 active:scale-95'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Fetch Media</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
