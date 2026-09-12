import React from 'react';
import { FileText, Lock, Search, Tag, CheckCircle2, ArrowLeft, Shield } from 'lucide-react';

export default function ArNotePlaceholder({ setActiveTab }) {
  return (
    <div className="space-y-4 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('home')}
          className="nb-btn px-3 py-1.5 bg-white text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 text-[#121212]" />
          <span>Kembali ke Hub</span>
        </button>

        <span className="text-[10px] font-mono-code font-black px-2.5 py-1 rounded-full border-2 border-[#121212] bg-[#C4FAF8] text-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
          MODUL ARNOTE
        </span>
      </div>

      {/* Main Header Card */}
      <div className="nb-card p-6 bg-[#C4FAF8] space-y-4 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] overflow-hidden p-2">
            <img src="/arnote.png" alt="ArNote Emblem" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">
              ArNote — Private Scratchpad
            </h2>
            <p className="text-xs font-bold text-gray-900">
              Catatan Markdown terenkripsi lokal dengan indeks pencarian cepat.
            </p>
          </div>
        </div>

        {/* Mockup Preview Card */}
        <div className="nb-card p-4 bg-white text-left font-mono-code text-xs text-[#121212] shadow-[3px_3px_0px_#121212]">
          <div className="flex items-center justify-between border-b-2 border-[#121212] pb-2 mb-3">
            <span className="font-black flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#38E54D]" />
              # quick-ideas.md
            </span>
            <span className="text-[10px] font-black bg-[#FFE600] px-2 py-0.5 rounded border border-[#121212] shadow-[1px_1px_0px_#121212]">
              ENCRYPTED OK
            </span>
          </div>
          <p className="font-bold text-gray-800 mb-2">## Features for Arplication v1.0</p>
          <p className="text-gray-700 font-medium">- [x] Neubrutalist bento architecture layout</p>
          <p className="text-gray-700 font-medium">- [x] Spotify full audio stream & playlist resolver</p>
          <p className="text-gray-700 font-medium">- [ ] Encrypted IndexedDB vault for markdown notes</p>
        </div>
      </div>

      {/* Planned Capabilities Grid */}
      <div className="nb-card p-4 bg-white space-y-3 shadow-[3.5px_3.5px_0px_#121212]">
        <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider border-b-2 border-[#121212] pb-2">
          FITUR DALAM PENGEMBANGAN
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="nb-card p-3 bg-[#F8F5EE] flex items-start gap-2.5 shadow-[2px_2px_0px_#121212]">
            <Lock className="w-4 h-4 text-[#38E54D] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212]">Vault Terenkripsi</p>
              <p className="text-[11px] font-semibold text-gray-600">Enkripsi AES-GCM berbasis kata sandi lokal.</p>
            </div>
          </div>

          <div className="nb-card p-3 bg-[#F8F5EE] flex items-start gap-2.5 shadow-[2px_2px_0px_#121212]">
            <Search className="w-4 h-4 text-[#0FB9B1] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212]">Pencarian Instan & Tag</p>
              <p className="text-[11px] font-semibold text-gray-600">Pencarian teks lengkap dalam memori secara real-time.</p>
            </div>
          </div>

          <div className="nb-card p-3 bg-[#F8F5EE] flex items-start gap-2.5 shadow-[2px_2px_0px_#121212]">
            <Tag className="w-4 h-4 text-[#FF70A6] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212]">Markdown & Code Syntax</p>
              <p className="text-[11px] font-semibold text-gray-600">Highlighting sintaks dan format teks rapi.</p>
            </div>
          </div>

          <div className="nb-card p-3 bg-[#F8F5EE] flex items-start gap-2.5 shadow-[2px_2px_0px_#121212]">
            <CheckCircle2 className="w-4 h-4 text-[#38E54D] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212]">Ekspor & Cadangan Data</p>
              <p className="text-[11px] font-semibold text-gray-600">Ekspor 1-klik ke format JSON atau file ZIP.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
