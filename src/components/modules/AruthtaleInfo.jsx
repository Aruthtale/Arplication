import React, { useState } from 'react';
import { Shield, Cpu, ExternalLink, GitBranch, ArrowLeft, Check, Copy, Heart, Layers, Sparkles } from 'lucide-react';
import UpdateChecker from './UpdateChecker';
import { APP_VERSION } from '../../services/updater.js';

export default function AruthtaleInfo({ setActiveTab }) {
  const [copied, setCopied] = useState(false);

  const envInfo = [
    { label: 'Versi Aplikasi', value: `v${APP_VERSION}` },
    { label: 'Pengembang', value: 'Aruthtale Studio' },
    { label: 'Dukungan Platform', value: 'Android & Web Browser' },
    { label: 'Lisensi Perangkat Lunak', value: 'Sumber Terbuka (Open Source)' },
    { label: 'Modul Aktif', value: 'Arloader & ArNote' },
    { label: 'Modul Mendatang', value: 'Ardoro (Focus Timer)' },
  ];

  const repoUrl = 'https://github.com/Aruthtale/Arplication';

  const handleCopyRepo = () => {
    navigator.clipboard.writeText(repoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('home')}
          className="nb-btn px-3 py-1.5 bg-white text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 text-[#121212]" />
          <span>Kembali ke Beranda</span>
        </button>

        <span className="text-[10px] font-mono-code font-black px-2.5 py-1 rounded-full border-2 border-[#121212] bg-[#A076F9] text-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
          INFORMASI ARUTHTALE
        </span>
      </div>

      {/* Main Header Card */}
      <div className="nb-card p-6 bg-[#A076F9] space-y-3 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] overflow-hidden p-2 shrink-0">
            <img src="/logo.png" alt="Aruthtale Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">
              Tentang Aruthtale
            </h2>
            <p className="text-xs font-bold text-gray-900 leading-relaxed mt-0.5">
              Ruang eksplorasi digital dan pengembang suite perangkat lunak harian.
            </p>
          </div>
        </div>
      </div>

      {/* Story & Vision Card */}
      <div className="nb-card p-5 bg-white space-y-3 shadow-[3.5px_3.5px_0px_#121212]">
        <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#121212] pb-2">
          <Layers className="w-4 h-4 text-[#121212]" />
          <span>TENTANG APLIKASI & VSI</span>
        </h3>
        <p className="text-xs font-semibold text-gray-700 leading-relaxed">
          <strong>Arplication</strong> dirancang oleh Aruthtale sebagai pusat utilitas harian terpadu. Fokus utama aplikasi ini adalah menghadirkan alat-alat produktivitas personal yang cepat, intuitif, dan nyaman digunakan tanpa proses yang rumit.
        </p>
        <p className="text-xs font-semibold text-gray-700 leading-relaxed">
          Setiap modul di dalam Arplication dikembangkan secara bertahap untuk memenuhi kebutuhan pengunduhan media, manajemen sesi fokus produktif, serta pencatatan ide harian.
        </p>
      </div>

      {/* System Specifications Table */}
      <div className="nb-card p-4 bg-white space-y-3 shadow-[3.5px_3.5px_0px_#121212]">
        <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#121212] pb-2">
          <Cpu className="w-4 h-4 text-[#121212]" />
          <span>INFORMASI TEKNIS & RILIS</span>
        </h3>

        <div className="divide-y-2 divide-[#121212]/10 text-xs font-mono-code">
          {envInfo.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-gray-700">{item.label}</span>
              <span className="font-black text-[#121212] bg-[#F8F5EE] px-2.5 py-0.5 rounded border border-[#121212] shadow-[1px_1px_0px_#121212]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* In-App Updater (Metode B: GitHub Release APK) */}
      <UpdateChecker autoCheck={true} />

      {/* Creator & Contact Socials */}
      <div className="nb-card p-4 bg-white space-y-3 shadow-[3.5px_3.5px_0px_#121212]">
        <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#121212] pb-2">
          <Sparkles className="w-4 h-4 text-[#121212]" />
          <span>INFORMASI PEMBUAT & KANAL RESMI</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-code">
          <a
            href="https://github.com/Aruthtale"
            target="_blank"
            rel="noopener noreferrer"
            className="nb-btn p-3 bg-[#FFE600] text-[#121212] flex items-center justify-between no-underline"
          >
            <span className="font-black">GitHub Profile</span>
            <span className="font-bold">github.com/Aruthtale</span>
          </a>

          <a
            href="https://instagram.com/aruthtale"
            target="_blank"
            rel="noopener noreferrer"
            className="nb-btn p-3 bg-[#FF70A6] text-[#121212] flex items-center justify-between no-underline"
          >
            <span className="font-black">Instagram</span>
            <span className="font-bold">@aruthtale</span>
          </a>

          <a
            href="https://www.tiktok.com/@aruthtale"
            target="_blank"
            rel="noopener noreferrer"
            className="nb-btn p-3 bg-[#C4FAF8] text-[#121212] flex items-center justify-between no-underline"
          >
            <span className="font-black">TikTok</span>
            <span className="font-bold">@aruthtale</span>
          </a>

          <a
            href="mailto:aruthtale@gmail.com"
            className="nb-btn p-3 bg-[#38E54D] text-[#121212] flex items-center justify-between no-underline"
          >
            <span className="font-black">Email Kontak</span>
            <span className="font-bold">aruthtale@gmail.com</span>
          </a>
        </div>
      </div>
    </div>
  );
}
