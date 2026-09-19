import React from 'react';
import { 
  QrCode, Sliders, FileText, Palette, History, 
  Sparkles, Zap, ArrowUpRight, ShieldCheck 
} from 'lucide-react';

export default function ToolboxBentoGrid({ onSelectTool, onOpenHistory, historyCount = 0 }) {
  const tools = [
    {
      id: 'qr',
      title: 'QR & Barcode Suite',
      badge: 'QR / Barcode',
      description: 'Buat & pindai QR Code atau Barcode instan via kamera atau galeri gambar.',
      color: '#38E54D', // Hijau Neon
      bgCard: 'bg-[#E8FCE8]',
      badgeBg: 'bg-[#38E54D]',
      icon: QrCode,
      tag: 'Kamera & File',
    },
    {
      id: 'image',
      title: 'Image Studio & HD',
      badge: 'Kompres & HD',
      description: 'Kompres foto, ubah format JPG/PNG/WEBP, resize, & penajam foto HD.',
      color: '#C4FAF8', // Biru Muda Neon
      bgCard: 'bg-[#EBFDFC]',
      badgeBg: 'bg-[#C4FAF8]',
      icon: Sliders,
      tag: 'Kompres & Tajamkan',
    },
    {
      id: 'pdf',
      title: 'PDF Maker',
      badge: 'Foto ke PDF',
      description: 'Gabungkan foto/dokumen menjadi PDF rapi, atur urutan halaman & rotasi.',
      color: '#FF70A6', // Coral Pink
      bgCard: 'bg-[#FFEBF2]',
      badgeBg: 'bg-[#FF70A6]',
      icon: FileText,
      tag: 'Dokumen & Cetak',
    },
    {
      id: 'color',
      title: 'Color Studio',
      badge: 'Warna & Palet',
      description: 'Pemilih warna (eyedropper), ekstraksi palet dari foto, & format HEX/RGB/HSL.',
      color: '#D8B4FE', // Ungu Pastel
      bgCard: 'bg-[#F5EEFE]',
      badgeBg: 'bg-[#D8B4FE]',
      icon: Palette,
      tag: 'Visual & Palet',
    },
  ];

  return (
    <div className="space-y-4 font-sans">
      {/* Hero Module Header */}
      <div className="p-4 sm:p-5 bg-[#C4FAF8] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
            <Sparkles className="w-3.5 h-3.5 text-[#121212]" />
            <span className="text-[10px] font-mono-code font-black uppercase tracking-wider text-[#121212]">
              ARTOOLBOX UTILITY
            </span>
          </div>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black"
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat ({historyCount})</span>
          </button>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#121212] uppercase leading-tight">
            Kumpulan Perkakas Ringkas
          </h1>
          <p className="text-xs font-bold text-gray-800 leading-relaxed mt-1">
            Solusi offline-first serbaguna: pembuatan QR code, pengolahan teks, kalkulator praktis, dan ekstraksi palet warna tanpa koneksi internet.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-mono-code font-bold">
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#121212] shadow-[1px_1px_0px_#121212]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#38E54D]" />
            <span>100% Offline Privasi</span>
          </div>
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#121212] shadow-[1px_1px_0px_#121212]">
            <Zap className="w-3.5 h-3.5 text-[#FFE600]" />
            <span>Proses Instan</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Tools (2x2 di desktop, 1x1 atau 2x2 di HP) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`group cursor-pointer p-4 rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] hover:shadow-[6px_6px_0px_#121212] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] transition-all flex flex-col justify-between ${tool.bgCard}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-[#121212]" />
                    </div>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-md border border-[#121212] text-[10px] font-mono-code font-black uppercase shadow-[1px_1px_0px_#121212] ${tool.badgeBg}`}>
                        {tool.badge}
                      </span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] flex items-center justify-center group-hover:bg-[#FFE600] transition-colors">
                    <ArrowUpRight className="w-4 h-4 text-[#121212]" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-[#121212] uppercase tracking-tight">
                    {tool.title}
                  </h3>
                  <p className="text-xs font-semibold text-gray-700 leading-snug mt-1">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-2 border-t-2 border-[#121212]/15 flex items-center justify-between text-[11px] font-mono-code font-bold text-gray-800">
                <span>Tag: {tool.tag}</span>
                <span className="group-hover:underline">Buka Perkakas →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
