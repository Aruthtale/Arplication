import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, CheckCircle2, AlertTriangle, ExternalLink, Loader2, ArrowUpCircle } from 'lucide-react';
import { checkForAppUpdate, startApkUpdateDownload, APP_VERSION } from '../../services/updater.js';

export default function UpdateChecker({ autoCheck = true }) {
  const [status, setStatus] = useState('idle'); // idle | checking | update | latest | error
  const [info, setInfo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const doCheck = async (silent = false) => {
    if (!silent) setStatus('checking');
    else setStatus((s) => (s === 'idle' ? 'checking' : s));
    try {
      const res = await checkForAppUpdate();
      setInfo(res);
      if (res.hasUpdate) setStatus('update');
      else if (res.error) setStatus('error');
      else setStatus('latest');
    } catch (e) {
      setInfo({ error: e?.message || 'Gagal memeriksa.' });
      setStatus('error');
    }
  };

  useEffect(() => {
    if (autoCheck) doCheck(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    if (!info?.downloadUrl) return;
    setDownloading(true);
    setProgress({ pct: 5, msg: 'Menyiapkan unduhan APK...' });
    try {
      const res = await startApkUpdateDownload({
        downloadUrl: info.downloadUrl,
        version: info.latestVersion,
        onProgress: (pct, msg) => setProgress({ pct, msg }),
      });
      setProgress({
        pct: 100,
        msg: res?.location
          ? `APK tersimpan di ${res.location}. Buka file untuk Install.`
          : 'APK dibuka di browser. Install untuk update.',
      });
    } catch (e) {
      setProgress({ pct: 0, msg: `Gagal: ${e?.message || 'error'}` });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="nb-card p-4 bg-white space-y-3 shadow-[3.5px_3.5px_0px_#121212]">
      <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#121212] pb-2">
        <ArrowUpCircle className="w-4 h-4 text-[#121212]" />
        <span>PEMBARUAN APLIKASI</span>
      </h3>

      <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono-code">
        <span className="font-bold text-gray-700">Versi Terpasang</span>
        <span className="font-black text-[#121212] bg-[#F8F5EE] px-2.5 py-0.5 rounded border border-[#121212] shadow-[1px_1px_0px_#121212]">
          v{APP_VERSION}
        </span>
      </div>

      {info?.latestVersion && status !== 'idle' && status !== 'checking' && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono-code">
          <span className="font-bold text-gray-700">Versi Terbaru</span>
          <span className="font-black text-[#121212] bg-[#FFE600] px-2.5 py-0.5 rounded border border-[#121212] shadow-[1px_1px_0px_#121212]">
            v{info.latestVersion}
          </span>
        </div>
      )}

      {status === 'checking' && (
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Memeriksa pembaruan dari GitHub...
        </div>
      )}

      {status === 'latest' && (
        <div className="nb-card p-3 bg-[#38E54D] flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#121212] shrink-0" />
          <p className="text-xs font-black text-[#121212]">Aplikasi sudah versi terbaru. Tidak ada update.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="nb-card p-3 bg-[#FF525E] flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-white shrink-0" />
          <p className="text-xs font-bold text-white">{info?.error || 'Gagal memeriksa pembaruan. Cek koneksi.'}</p>
        </div>
      )}

      {status === 'update' && info && (
        <div className="space-y-2.5">
          <div className="nb-card p-3 bg-[#FFE600] space-y-1.5">
            <p className="text-sm font-black text-[#121212] uppercase">Update v{info.latestVersion} Tersedia!</p>
            <p className="text-xs font-bold text-gray-800">{info.releaseName}</p>
            {info.releaseNotes && (
              <p className="text-[11px] font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap max-h-28 overflow-y-auto bg-white/60 rounded border border-[#121212] p-2">
                {String(info.releaseNotes).slice(0, 800)}
              </p>
            )}
            {info.apkAsset && (
              <p className="text-[10px] font-mono-code font-bold text-gray-700">
                {info.apkAsset.name} • {(info.apkAsset.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>

          {progress && (
            <div className="space-y-1">
              <div className="h-3 rounded-full border-2 border-[#121212] bg-[#F8F5EE] overflow-hidden">
                <div
                  className="h-full bg-[#38E54D] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progress.pct || 0))}%` }}
                />
              </div>
              <p className="text-[11px] font-bold text-gray-700">{progress.msg}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="nb-btn px-4 py-2.5 bg-[#121212] text-[#FFE600] text-xs flex items-center gap-2 disabled:opacity-60"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{downloading ? 'Mengunduh...' : 'Update Sekarang'}</span>
            </button>
            <a
              href={info.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nb-btn px-3 py-2.5 bg-white text-[#121212] text-xs flex items-center gap-1.5 no-underline"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Rilis</span>
            </a>
          </div>
          <p className="text-[10px] font-semibold text-gray-500 leading-relaxed">
            Setelah APK terunduh, buka file APK dari notifikasi / File Manager lalu ketuk Install untuk update.
          </p>
        </div>
      )}

      <button
        onClick={() => doCheck(false)}
        disabled={status === 'checking' || downloading}
        className="nb-btn px-3 py-2 bg-[#C4FAF8] text-[#121212] text-xs flex items-center gap-2 w-full justify-center disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
        <span>{status === 'checking' ? 'Memeriksa...' : 'Periksa Update'}</span>
      </button>
    </div>
  );
}
