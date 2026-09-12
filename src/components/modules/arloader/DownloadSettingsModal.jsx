import React, { useState, useEffect } from 'react';
import { Settings, Folder, Check, RotateCcw, X, Key, Eye, EyeOff, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getDownloadSettings, saveDownloadSettings, DEFAULT_DOWNLOAD_SETTINGS } from '../../../utils/download.js';

export default function DownloadSettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(DEFAULT_DOWNLOAD_SETTINGS);
  const [savedStatus, setSavedStatus] = useState(false);
  const [showSessionId, setShowSessionId] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getDownloadSettings());
      setSavedStatus(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveDownloadSettings(settings);
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setSettings(DEFAULT_DOWNLOAD_SETTINGS);
    saveDownloadSettings(DEFAULT_DOWNLOAD_SETTINGS);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 1000);
  };

  const cleanSubfolder = String(settings.subfolder || '').trim().replace(/^\/+|\/+$/g, '');
  const dirLabel = settings.directory === 'Documents' ? 'Documents' : 'Download';
  const previewPath = cleanSubfolder ? `${dirLabel}/${cleanSubfolder}/` : `${dirLabel}/`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#262B3B] bg-[#111319] text-white p-5 sm:p-6 shadow-2xl relative space-y-5 scrollbar-thin scrollbar-thumb-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262B3B] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#05C46B]/15 border border-[#05C46B]/30 flex items-center justify-center text-[#05C46B]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Pengaturan Penyimpanan & Fitur
              </h3>
              <p className="text-[11px] text-gray-400">
                Lokasi folder unduhan & opsi Instagram Session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-[#181B24] border border-[#262B3B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Directory Choice */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 block">
            Direktori Utama HP
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, directory: 'Downloads' }))}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                settings.directory === 'Downloads'
                  ? 'border-[#05C46B] bg-[#05C46B]/10 text-white shadow-sm'
                  : 'border-[#262B3B] bg-[#181B24] text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Folder className={`w-4 h-4 ${settings.directory === 'Downloads' ? 'text-[#05C46B]' : 'text-gray-400'}`} />
                {settings.directory === 'Downloads' && (
                  <Check className="w-3.5 h-3.5 text-[#05C46B]" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold block text-white">Folder Download</span>
                <span className="text-[10px] text-gray-400">Standar Pengelola File</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, directory: 'Documents' }))}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                settings.directory === 'Documents'
                  ? 'border-[#05C46B] bg-[#05C46B]/10 text-white shadow-sm'
                  : 'border-[#262B3B] bg-[#181B24] text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Folder className={`w-4 h-4 ${settings.directory === 'Documents' ? 'text-[#05C46B]' : 'text-gray-400'}`} />
                {settings.directory === 'Documents' && (
                  <Check className="w-3.5 h-3.5 text-[#05C46B]" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold block text-white">Folder Documents</span>
                <span className="text-[10px] text-gray-400">Penyimpanan Dokumen</span>
              </div>
            </button>
          </div>
        </div>

        {/* Subfolder configuration */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
            <span>Nama Subfolder / Folder Khusus</span>
            <span className="text-[10px] font-normal text-gray-400">Opsional</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={settings.subfolder}
              onChange={(e) => setSettings((s) => ({ ...s, subfolder: e.target.value }))}
              placeholder="Contoh: Arloader atau kosongkan"
              className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-[#262B3B] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#05C46B]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400 mr-1 self-center">Preset:</span>
            {['Arloader', 'Media', 'Music', ''].map((preset) => (
              <button
                key={preset || 'root'}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, subfolder: preset }))}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                  settings.subfolder === preset
                    ? 'border-[#05C46B] text-[#05C46B] bg-[#05C46B]/10'
                    : 'border-[#262B3B] text-gray-400 bg-[#181B24] hover:text-gray-200'
                }`}
              >
                {preset ? preset : 'Tanpa Subfolder (Root)'}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Path */}
        <div className="p-3 rounded-xl bg-[#0C0E13] border border-[#262B3B] space-y-1">
          <span className="text-[10px] font-mono uppercase text-gray-400 block">
            Jalur Simpan File:
          </span>
          <p className="text-xs font-mono text-[#05C46B] break-all">
            📁 /storage/emulated/0/{previewPath}nama_file
          </p>
        </div>

        {/* Filename Pattern */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 block">
            Pola Nama File
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { value: 'title_id', label: 'Judul + ID', example: 'Judul_Video_yt-video-mp4.mp4' },
              { value: 'author_title', label: 'Author + Judul', example: 'NamaAuthor_Judul_Video.mp4' },
              { value: 'platform_title_id', label: 'Platform + Judul + ID', example: 'tiktok_Judul_Video_v1.mp4' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, filenamePattern: opt.value }))}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                  (settings.filenamePattern || 'title_id') === opt.value
                    ? 'border-[#05C46B] bg-[#05C46B]/10 shadow-sm'
                    : 'border-[#262B3B] bg-[#181B24] hover:border-gray-600'
                }`}
              >
                <span>
                  <span className="text-xs font-bold block text-white">{opt.label}</span>
                  <span className="text-[10px] font-mono text-gray-400 block truncate">{opt.example}</span>
                </span>
                {(settings.filenamePattern || 'title_id') === opt.value && (
                  <Check className="w-3.5 h-3.5 text-[#05C46B] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Instagram Session ID Section */}
        <div className="p-3.5 rounded-xl bg-[#181B24] border border-[#262B3B] space-y-3.5">
          <div className="flex items-start gap-2.5">
            <Key className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-xs font-semibold text-white block">
                Instagram Cookie / Session ID (Opsional)
              </span>
              <p className="text-[10.5px] text-gray-400 leading-relaxed mt-0.5">
                Aplikasi telah dilengkapi cookie bawaan otomatis. Anda hanya perlu mengisi kolom ini jika ingin kecepatan lebih tinggi, unduh dari akun privat yang diikuti, atau mengatasi kendala pembatasan limit.
              </p>
            </div>
          </div>

          <div className="relative flex items-center">
            <input
              type={showSessionId ? 'text' : 'password'}
              value={settings.igSessionId || ''}
              onChange={(e) => setSettings((s) => ({ ...s, igSessionId: e.target.value }))}
              placeholder="sessionid=... atau format Netscape (Salin-Tempel)"
              className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#0C0E13] border border-[#262B3B] text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowSessionId((v) => !v)}
              className="absolute right-2.5 text-gray-400 hover:text-white"
            >
              {showSessionId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Tutorial Accordion */}
          <div className="border border-[#262B3B]/60 rounded-xl overflow-hidden bg-[#0C0E13]/50">
            <button
              type="button"
              onClick={() => setShowTutorial(!showTutorial)}
              className="w-full flex items-center justify-between p-2.5 text-left text-[11px] font-semibold text-purple-300 hover:text-purple-200 hover:bg-purple-500/5 transition-all"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                Cara Mendapatkan Cookie / Session ID
              </span>
              {showTutorial ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTutorial && (
              <div className="p-3 border-t border-[#262B3B]/40 text-[10px] text-gray-300 space-y-2 leading-relaxed bg-[#0C0E13]/80 animate-slideDown">
                <p className="font-semibold text-white">Metode Kiwi Browser (Mudah di Android / HP):</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Unduh dan buka <span className="text-[#05C46B]">Kiwi Browser</span> di Play Store.</li>
                  <li>Login akun Anda di <a href="https://instagram.com" target="_blank" rel="noreferrer" className="underline text-purple-400">instagram.com</a>.</li>
                  <li>Klik <span className="font-semibold text-white">Titik Tiga</span> di kanan atas → klik <span className="font-semibold text-white">Developer Tools</span>.</li>
                  <li>Pilih tab <span className="font-semibold text-white">Application</span> (atau <span className="font-semibold text-white">Storage</span>) di bilah atas Developer Tools.</li>
                  <li>Buka bagian <span className="font-semibold text-white">Cookies</span> → pilih <span className="text-[#05C46B]">instagram.com</span>.</li>
                  <li>Cari nama <span className="font-semibold text-white">sessionid</span> dan salin seluruh isinya.</li>
                  <li>Tempelkan ke dalam kotak input di atas.</li>
                </ol>
                <div className="pt-1.5 border-t border-[#262B3B]/30">
                  <p className="font-semibold text-white">💡 Tips Pintar:</p>
                  <p className="text-gray-400 mt-0.5">Anda juga bisa langsung menyalin file Cookie format <span className="font-semibold text-gray-300">Netscape</span> (didapat dari ekstensi Get Cookie di Kiwi Browser/Chrome) dan langsung menempelkannya di sini!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auto Share Toggle */}
        <div className="p-3 rounded-xl bg-[#181B24] border border-[#262B3B] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-white block">
              Menu "Buka dengan..." / Share
            </span>
            <p className="text-[10px] text-gray-400">
              Munculkan pop-up pemilihan aplikasi setelah file selesai terunduh
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.autoShare}
              onChange={(e) => setSettings((s) => ({ ...s, autoShare: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#0C0E13] border border-[#262B3B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#05C46B] peer-checked:border-[#05C46B]"></div>
          </label>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#262B3B]">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-[#181B24] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#05C46B] hover:bg-[#04ad5e] text-black font-semibold text-xs shadow-lg shadow-[#05C46B]/20 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{savedStatus ? 'Tersimpan!' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
