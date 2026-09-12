import React from 'react';
import { Download, Sparkles, Video, ArrowLeft, Layers } from 'lucide-react';

export default function ArloaderModule({ setActiveTab }) {
  return (
    <div className="space-y-6 pb-20 pt-2">
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
            Arloader v1.0 Engine
          </span>
        </div>
      </div>

      {/* Module Banner */}
      <div className="rounded-2xl border border-[#262B3B] bg-gradient-to-r from-[#181B24] via-[#111319] to-[#181B24] p-5 sm:p-6">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-[#05C46B]/20 border border-[#05C46B]/40 flex items-center justify-center">
                <Download className="w-4 h-4 text-[#05C46B]" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Arloader Media Downloader</h2>
            </div>
            <p className="text-xs text-gray-400">
              Download watermark-free videos, photos, and high-quality audio streams.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-400">
            <span className="px-2.5 py-1 rounded bg-[#0C0E13] border border-[#262B3B] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#05C46B]"></span>
              TikTok
            </span>
            <span className="px-2.5 py-1 rounded bg-[#0C0E13] border border-[#262B3B] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF525E]"></span>
              YouTube
            </span>
          </div>
        </div>
      </div>

      {/* Placeholder container where UI Downloader will plug in */}
      <div id="arloader-active-container" className="space-y-4">
        <div className="rounded-xl border border-[#262B3B] bg-[#111319] p-6 text-center text-xs text-gray-400">
          <p className="text-white font-medium mb-1">Downloader Engine Ready to Mount</p>
          <p>Configuring hybrid HTTP pipeline and scraper resolver...</p>
        </div>
      </div>
    </div>
  );
}
