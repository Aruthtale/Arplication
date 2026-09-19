import React from 'react';
import { 
  Download, Timer, FileText, Info, ArrowRight, Zap, Sparkles, 
  Layers, Smartphone, CheckCircle2
} from 'lucide-react';
import { APP_VERSION } from '../../services/updater.js';

export default function HomeHub({ setActiveTab }) {
  const modules = [
    {
      id: 'arloader',
      title: 'Arloader',
      tagline: 'Media Downloader',
      description: 'Unduh video & audio MP3 dari YouTube, Spotify, TikTok, & IG.',
      iconUrl: '/arloader.png',
      status: 'Aktif',
      statusColor: 'bg-[#38E54D]',
      cardBg: 'bg-[#FFFFFF]',
      accentColor: '#38E54D',
      badgeBg: 'bg-[#38E54D]',
      actionLabel: 'Buka',
      isReady: true,
    },
    {
      id: 'arnote',
      title: 'ArNote',
      tagline: 'Bento Notes & Widget',
      description: 'Catatan offline-first, checklist interaktif, & widget homescreen.',
      iconUrl: '/arnote.png',
      status: 'Aktif',
      statusColor: 'bg-[#FFE600]',
      cardBg: 'bg-[#FFFFFF]',
      accentColor: '#FFE600',
      badgeBg: 'bg-[#FFE600]',
      actionLabel: 'Buka',
      isReady: true,
    },
    {
      id: 'ardoro',
      title: 'Ardoro',
      tagline: 'Focus & Pomodoro',
      description: 'Timer Pomodoro offline dengan interval kustom & statistik sesi.',
      iconUrl: '/ardoro.png',
      status: 'Aktif',
      statusColor: 'bg-[#FF70A6]',
      cardBg: 'bg-[#FFFFFF]',
      accentColor: '#FF70A6',
      badgeBg: 'bg-[#FF70A6]',
      actionLabel: 'Buka',
      isReady: true,
    },
    {
      id: 'armusic',
      title: 'ArMusic',
      tagline: 'Pemutar Lokal',
      description: 'Putar lagu dari storage HP — hasil unduhan Arloader & file musik, offline.',
      iconUrl: '/armusic.png',
      status: 'Aktif',
      statusColor: 'bg-[#D8B4FE]',
      cardBg: 'bg-[#FFFFFF]',
      accentColor: '#D8B4FE',
      badgeBg: 'bg-[#D8B4FE]',
      actionLabel: 'Buka',
      isReady: true,
    },
    {
      id: 'artoolbox',
      title: 'ArToolbox',
      tagline: 'Perkakas Praktis',
      description: 'QR scanner/generator, dev text tools, kalkulator praktis, & color studio.',
      iconUrl: '/logo.png',
      status: 'Aktif',
      statusColor: 'bg-[#C4FAF8]',
      cardBg: 'bg-[#FFFFFF]',
      accentColor: '#C4FAF8',
      badgeBg: 'bg-[#C4FAF8]',
      actionLabel: 'Buka',
      isReady: true,
    },
    {
      id: 'aruthtale',
      title: 'Aruthtale',
      tagline: 'Info & Diagnostik',
      description: 'Status sistem, diagnostik perangkat, & info versi studio.',
      iconUrl: '/logo.png',
      status: 'Siap',
      statusColor: 'bg-[#A076F9]',
      cardBg: 'bg-[#FFFFFF]',
      accentColor: '#A076F9',
      badgeBg: 'bg-[#A076F9]',
      actionLabel: 'Lihat',
      isReady: true,
    },
  ];

  return (
    <div className="space-y-3.5 sm:space-y-5 font-sans">
      {/* Hero Welcome Banner */}
      <div className="p-4 sm:p-5 bg-[#FFE600] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
            <img src="/logo.png" alt="Aruthtale Emblem" className="w-3.5 h-3.5 object-contain" />
            <span className="text-[10px] font-mono-code font-black uppercase tracking-wider text-[#121212]">
              ARUTHTALE STUDIO
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono-code text-[10px] font-black bg-white px-2 py-0.5 rounded-md border border-[#121212] shadow-[1px_1px_0px_#121212]">
            <span className="w-2 h-2 rounded-full bg-[#38E54D] border border-[#121212] animate-pulse" />
            <span>v{APP_VERSION} BETA</span>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#121212] uppercase leading-tight">
            Ruang Utilitas Terpadu
          </h1>
          <p className="text-xs font-bold text-gray-800 leading-relaxed mt-1">
            Utilitas harian offline-first: pengunduh media, pemutar musik lokal, pencatatan bento dengan widget homescreen, dan fokus timer.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-mono-code font-bold">
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
            <Zap className="w-3 h-3 text-[#121212]" />
            <span>Cepat & Hemat</span>
          </div>
          <div className="flex items-center gap-1 bg-[#C4FAF8] px-2.5 py-1 rounded-lg border border-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
            <Layers className="w-3 h-3 text-[#121212]" />
            <span>Widget Native</span>
          </div>
          <div className="flex items-center gap-1 bg-[#38E54D] px-2.5 py-1 rounded-lg border border-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
            <Smartphone className="w-3 h-3 text-[#121212]" />
            <span>100% Offline</span>
          </div>
        </div>
      </div>

      {/* Modules Bento Grid (1 baris = 2 kotak di mobile!) */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#121212] flex items-center gap-1.5">
            <span>DAFTAR MODUL APLIKASI</span>
          </h2>
          <span className="text-[9.5px] font-mono-code font-black bg-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#121212]">
            6 MODUL
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {modules.map((mod) => (
            <div
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              className={`p-3 sm:p-4 rounded-xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] hover:shadow-[4px_4px_0px_#121212] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] transition-all flex flex-col justify-between cursor-pointer select-none ${mod.cardBg}`}
            >
              <div>
                {/* Icon & Status Pill */}
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div
                    className="w-9 h-9 rounded-xl border-2 border-[#121212] flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212] overflow-hidden p-1 shrink-0"
                    style={{ backgroundColor: mod.accentColor }}
                  >
                    <img src={mod.iconUrl} alt={mod.title} className="w-full h-full object-contain" />
                  </div>

                  <span className={`text-[9px] font-mono-code font-black px-2 py-0.5 rounded-md border border-[#121212] shadow-[1px_1px_0px_#121212] ${mod.statusColor} text-[#121212] shrink-0`}>
                    {mod.status}
                  </span>
                </div>

                <h3 className="font-black text-sm sm:text-base text-[#121212] uppercase tracking-tight leading-tight">
                  {mod.title}
                </h3>
                <p className="text-[10px] font-mono-code font-bold text-gray-500 mb-1 truncate">
                  {mod.tagline}
                </p>
                <p className="text-[11px] font-medium text-gray-700 leading-snug line-clamp-2">
                  {mod.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#121212]/15 flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-[#121212]">
                  {mod.actionLabel}
                </span>
                <div
                  className="w-5 h-5 rounded-md border border-[#121212] flex items-center justify-center shadow-[1px_1px_0px_#121212]"
                  style={{ backgroundColor: mod.accentColor }}
                >
                  <ArrowRight className="w-3 h-3 text-[#121212]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
