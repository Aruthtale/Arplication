import React from 'react';
import { 
  Download, Timer, FileText, Info, ArrowRight, Shield, Zap, Sparkles, 
  CheckCircle2, Music, Video, HardDrive, Smartphone, Radio, Layers
} from 'lucide-react';

export default function HomeHub({ setActiveTab }) {
  const modules = [
    {
      id: 'arloader',
      title: 'Arloader',
      subtitle: 'Universal Media Downloader',
      description: 'Unduh video HD tanpa watermark & audio full MP3 dari YouTube, Spotify, TikTok, Instagram & SoundCloud.',
      iconUrl: '/arloader.png',
      status: 'Aktif',
      statusBg: 'bg-[#38E54D]',
      cardBg: 'bg-white hover:bg-yellow-50/50',
      iconBg: 'bg-[#38E54D]',
      actionLabel: 'Buka Downloader',
      isReady: true,
    },
    {
      id: 'ardoro',
      title: 'Ardoro',
      subtitle: 'Focus & Pomodoro Timer',
      description: 'Timer produktivitas & Pomodoro untuk menemani sesi belajar dan kerja mendalam dengan interval fleksibel.',
      iconUrl: '/ardoro.png',
      status: 'Segera Hadir',
      statusBg: 'bg-[#FF70A6]',
      cardBg: 'bg-white hover:bg-pink-50/50',
      iconBg: 'bg-[#FF70A6]',
      actionLabel: 'Lihat Konsep',
      isReady: false,
    },
    {
      id: 'arnote',
      title: 'ArNote',
      subtitle: 'Markdown Scratchpad',
      description: 'Catatan cepat dengan format Markdown untuk merapikan ide, draf teks, dan daftar tugas harian.',
      iconUrl: '/arnote.png',
      status: 'Segera Hadir',
      statusBg: 'bg-[#C4FAF8]',
      cardBg: 'bg-white hover:bg-cyan-50/50',
      iconBg: 'bg-[#C4FAF8]',
      actionLabel: 'Lihat Konsep',
      isReady: false,
    },
    {
      id: 'aruthtale',
      title: 'Aruthtale',
      subtitle: 'Informasi & Pengembang',
      description: 'Informasi rilis, profil pengembang Aruthtale, dan status modul di dalam aplikasi.',
      iconUrl: '/logo.png',
      status: 'Siap',
      statusBg: 'bg-[#A076F9]',
      cardBg: 'bg-white hover:bg-purple-50/50',
      iconBg: 'bg-[#A076F9]',
      actionLabel: 'Lihat Informasi',
      isReady: true,
    },
  ];

  return (
    <div className="space-y-4 font-sans">
      {/* Hero Welcome Bento Banner */}
      <div className="nb-card p-5 sm:p-6 bg-[#FFE600] space-y-4 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
            <img src="/logo.png" alt="Aruthtale Emblem" className="w-4 h-4 rounded-full object-contain" />
            <span className="text-[11px] font-mono-code font-black uppercase tracking-wider text-[#121212]">
              ARUTHTALE STUDIO
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono-code text-[10px] font-black bg-white px-2.5 py-0.5 rounded-md border border-[#121212] shadow-[1px_1px_0px_#121212]">
            <span className="w-2 h-2 rounded-full bg-[#38E54D] border border-black animate-pulse" />
            <span>VERSI v0.2.0</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#121212] uppercase leading-tight">
            Ruang Utilitas Terpadu
          </h1>
          <p className="text-xs sm:text-sm font-bold text-gray-800 max-w-xl leading-relaxed mt-1">
            Kumpulan alat produktivitas harian untuk pengunduhan media, manajemen sesi fokus, dan pencatatan ide dalam satu aplikasi yang cepat dan nyaman.
          </p>
        </div>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono-code font-bold">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212]">
            <Zap className="w-3.5 h-3.5 text-[#121212]" />
            <span>Cepat & Ringan</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#C4FAF8] px-3 py-1.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212]">
            <Layers className="w-3.5 h-3.5 text-[#121212]" />
            <span>Dukungan Multi-Format</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#38E54D] px-3 py-1.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212]">
            <Smartphone className="w-3.5 h-3.5 text-[#121212]" />
            <span>Android & Web</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Arloader Callout */}
      <div 
        onClick={() => setActiveTab('arloader')}
        className="nb-card p-4 bg-[#38E54D] flex items-center justify-between cursor-pointer group shadow-[3.5px_3.5px_0px_#121212]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] group-hover:scale-105 transition-transform overflow-hidden p-1">
            <img src="/arloader.png" alt="Arloader Emblem" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base uppercase tracking-tight text-[#121212]">
                Arloader Downloader
              </span>
              <span className="text-[9px] font-mono-code font-black bg-white px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#121212]">
                POPULER
              </span>
            </div>
            <p className="text-[11px] font-bold text-gray-800">
              Unduh Spotify full MP3 & Playlist, YouTube Video/Audio, TikTok & Instagram
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] group-hover:translate-x-1 transition-transform">
          <ArrowRight className="w-4 h-4 text-[#121212]" />
        </div>
      </div>

      {/* Modules Grid Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#121212] flex items-center gap-2">
            <span>DAFTAR MODUL APLIKASI</span>
          </h2>
          <span className="text-[10px] font-mono-code font-black bg-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#121212]">
            4 MODUL
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {modules.map((mod) => {
            return (
              <div
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`nb-card p-4.5 flex flex-col justify-between cursor-pointer group transition-all ${mod.cardBg}`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${mod.iconBg} border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] group-hover:scale-105 transition-transform overflow-hidden p-1`}>
                      <img src={mod.iconUrl} alt={mod.title} className="w-full h-full object-contain" />
                    </div>
                    <span className={`text-[10px] font-mono-code font-black px-2.5 py-0.5 rounded-full border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] ${mod.statusBg} text-[#121212]`}>
                      {mod.status}
                    </span>
                  </div>

                  <h3 className="font-black text-base text-[#121212] uppercase tracking-tight">
                    {mod.title}
                  </h3>
                  <p className="text-[11px] font-mono-code font-bold text-gray-600 mb-2">
                    {mod.subtitle}
                  </p>
                  <p className="text-xs font-semibold text-gray-700 leading-relaxed line-clamp-2">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-[#121212]/20 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#121212] group-hover:underline">
                    {mod.actionLabel}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-[#FFE600] border border-[#121212] flex items-center justify-center shadow-[1px_1px_0px_#121212] group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5 text-[#121212]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
