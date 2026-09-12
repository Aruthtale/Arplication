import React from 'react';
import { FileText, Lock, Search, Tag, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ArNotePlaceholder({ setActiveTab }) {
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

        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border bg-[#0FB9B1]/10 text-[#0FB9B1] border-[#0FB9B1]/30">
          Module ArNote
        </span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-[#262B3B] bg-[#111319] p-6 text-center relative overflow-hidden">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0FB9B1]/15 border border-[#0FB9B1]/30 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-[#0FB9B1]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">ArNote — Private Scratchpad</h2>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Ultra-lightweight markdown notes with instant full-text search and client-side encryption. Never leaves your hardware.
        </p>

        {/* Mockup Preview */}
        <div className="my-6 max-w-md mx-auto rounded-xl border border-[#262B3B] bg-[#0C0E13] p-4 text-left font-mono text-xs text-gray-400">
          <div className="flex items-center justify-between border-b border-[#262B3B] pb-2 mb-3">
            <span className="text-white font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#05C46B]" />
              # quick-ideas.md
            </span>
            <span className="text-[10px] text-gray-400">Saved locally</span>
          </div>
          <p className="text-gray-400 mb-2">## Features for Arplication v1.0</p>
          <p className="text-gray-400">- [x] Modular architecture with unified bottom nav</p>
          <p className="text-gray-400">- [x] Hybrid CapacitorHttp for CORS-free downloads</p>
          <p className="text-gray-400">- [ ] Encrypted IndexedDB vault for notes</p>
        </div>
      </div>

      {/* Planned Capabilities */}
      <div className="rounded-xl border border-[#262B3B] bg-[#111319] p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Planned Capabilities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#181B24]/60 border border-[#262B3B]/60">
            <Lock className="w-4 h-4 text-[#05C46B] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Client-Side Vault</p>
              <p className="text-gray-400 text-[11px]">AES-GCM encryption with local master passphrase.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#181B24]/60 border border-[#262B3B]/60">
            <Search className="w-4 h-4 text-[#0FB9B1] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Instant Search & Tags</p>
              <p className="text-gray-400 text-[11px]">Fast in-memory index across all stored notes.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#181B24]/60 border border-[#262B3B]/60">
            <Tag className="w-4 h-4 text-[#FF525E] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Markdown & Code Blocks</p>
              <p className="text-gray-400 text-[11px]">Full syntax highlighting and clean rendering.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#181B24]/60 border border-[#262B3B]/60">
            <CheckCircle2 className="w-4 h-4 text-[#05C46B] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Export & Backup</p>
              <p className="text-gray-400 text-[11px]">One-click JSON or ZIP export of all your notes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
