import React from 'react';
import { Timer, Play, RotateCcw, Coffee, Bell, CheckCircle2, ArrowLeft, Flame } from 'lucide-react';

export default function ArdoroPlaceholder({ setActiveTab }) {
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

        <span className="text-[10px] font-mono-code font-black px-2.5 py-1 rounded-full border-2 border-[#121212] bg-[#FF70A6] text-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
          MODUL ARDORO
        </span>
      </div>

      {/* Main Focus Card */}
      <div className="nb-card p-6 bg-[#FF70A6] space-y-4 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] overflow-hidden p-2">
            <img src="/ardoro.png" alt="Ardoro Emblem" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">
              Ardoro — Focus Engine
            </h2>
            <p className="text-xs font-bold text-gray-900">
              Timer produktivitas Pomodoro dengan desain Neubrutalist tanpa distraksi.
            </p>
          </div>
        </div>

        {/* Neubrutalist Timer Display */}
        <div className="nb-card p-6 bg-white flex flex-col items-center justify-center space-y-4 shadow-[3px_3px_0px_#121212]">
          <div className="w-48 h-48 rounded-full border-[4px] border-[#121212] bg-[#FFE600] flex flex-col items-center justify-center shadow-[4px_4px_0px_#121212]">
            <span className="text-4xl font-mono-code font-black text-[#121212] tracking-wider">
              25:00
            </span>
            <span className="text-[10px] font-mono-code font-black bg-white text-[#121212] px-2 py-0.5 rounded border border-[#121212] mt-2 shadow-[1px_1px_0px_#121212]">
              DEEP FOCUS MODE
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              disabled
              className="nb-btn px-5 py-2.5 bg-[#38E54D] text-[#121212] text-xs flex items-center gap-2 opacity-70 cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>Mulai Sesi (Segera)</span>
            </button>
            <button
              disabled
              className="nb-btn p-2.5 bg-white text-[#121212] opacity-70 cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Planned Capabilities Grid */}
      <div className="nb-card p-4 bg-white space-y-3 shadow-[3.5px_3.5px_0px_#121212]">
        <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider border-b-2 border-[#121212] pb-2">
          FITUR DALAM PENGEMBANGAN
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="nb-card p-3 bg-[#F8F5EE] flex items-start gap-2.5 shadow-[2px_2px_0px_#121212]">
            <CheckCircle2 className="w-4 h-4 text-[#38E54D] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212]">Loop Interval Custom</p>
              <p className="text-[11px] font-semibold text-gray-600">Cycle 25/5 Klasik, 50/10 Deep, atau siklus kustom.</p>
            </div>
          </div>

          <div className="nb-card p-3 bg-[#F8F5EE] flex items-start gap-2.5 shadow-[2px_2px_0px_#121212]">
            <Coffee className="w-4 h-4 text-[#FF70A6] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212]">Ambient Soundscapes</p>
              <p className="text-[11px] font-semibold text-gray-600">Suara hujan, cafe ambience, dan binaural beats.</p>
            </div>
          </div>

          <div className="nb-card p-3 bg-[#F8F5EE] flex items-start gap-2.5 shadow-[2px_2px_0px_#121212]">
            <Bell className="w-4 h-4 text-[#0FB9B1] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212]">Notifikasi Sistem & Getar</p>
              <p className="text-[11px] font-semibold text-gray-600">Peringatan chime dan getaran native Android.</p>
            </div>
          </div>

          <div className="nb-card p-3 bg-[#F8F5EE] flex items-start gap-2.5 shadow-[2px_2px_0px_#121212]">
            <Flame className="w-4 h-4 text-[#FFE600] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#121212]">Analistik Sesi Lokal</p>
              <p className="text-[11px] font-semibold text-gray-600">Catatan waktu fokus harian tanpa data telemetri.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
