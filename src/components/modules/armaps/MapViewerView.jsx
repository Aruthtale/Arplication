import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft, RefreshCw, Trash2, LocateFixed, Loader2, AlertTriangle,
  Layers, X, WifiOff, MapPin, Compass,
} from 'lucide-react';
import { loadRegionForRender, removeRegion } from '../../../services/armaps/armapsService.js';
import {
  ensurePmtilesProtocol,
  registerBlobSource,
  unregisterBlobSource,
  createMap,
  bboxToCenter,
  getMapLibre,
} from '../../../services/armaps/mapEngine.js';
import { buildMapStyle } from '../../../services/armaps/mapStyle.js';
import {
  checkLocationPermission,
  requestLocationPermission,
  getCurrentPosition,
  watchPosition,
} from '../../../services/armaps/geolocation.js';
import { formatBytes, formatDataDate, MAPS_DATA_DATE } from '../../../services/armaps/catalog.js';

/**
 * ArMaps — Penampil peta (pakai wilayah yang SUDAH dipilih pengguna).
 *
 * Peta dirender dari Blob lokal (hindari bug HTTP Range WebView Android).
 * Titik "lokasi saya" memakai GPS perangkat; tanpa GPS tetap bisa menjelajah.
 */
export default function MapViewerView({
  regionId, region, showLabels = true, onBack, onUpdate, onDelete,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const sourceKeyRef = useRef(null);
  const watchStopRef = useRef(null);
  const markerRef = useRef(null);
  const userLocRef = useRef(null);

  const [phase, setPhase] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [locState, setLocState] = useState('off'); // off | requesting | on | denied | error
  const [showAttribution, setShowAttribution] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /** Hentikan pelacakan GPS. */
  const stopWatch = useCallback(() => {
    if (watchStopRef.current) {
      try { watchStopRef.current(); } catch { /* abaikan */ }
      watchStopRef.current = null;
    }
  }, []);

  // Muat peta dari Blob lokal
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPhase('loading');
      setError(null);
      try {
        const loaded = await loadRegionForRender(regionId);
        if (!loaded) throw new Error('File peta tidak ditemukan. Unduh ulang wilayah ini.');
        if (cancelled) return;

        await ensurePmtilesProtocol();
        const { key } = await registerBlobSource(loaded.blob, `${regionId}.pmtiles`);
        if (cancelled) { unregisterBlobSource(key); return; }
        sourceKeyRef.current = key;

        const style = buildMapStyle(key, { showLabels, attribution: '&copy; OpenStreetMap' });
        const { center, zoom } = bboxToCenter(region?.bbox);
        const map = await createMap(containerRef.current, style, { center, zoom });
        if (cancelled) { map.remove(); unregisterBlobSource(key); return; }
        mapRef.current = map;

        map.on('load', () => { if (!cancelled) setPhase('ready'); });
        map.on('error', (e) => {
          const msg = e?.error?.message || '';
          // Abaikan error tile individual (mis. di luar cakupan) agar peta tetap tampil.
          if (/not found|out of range|404/i.test(msg)) return;
          console.warn('[ArMaps] map error:', msg);
        });
      } catch (err) {
        if (!cancelled) {
          setPhase('error');
          setError(err?.message || 'Gagal memuat peta.');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopWatch();
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* abaikan */ }
        mapRef.current = null;
      }
      if (sourceKeyRef.current) {
        unregisterBlobSource(sourceKeyRef.current);
        sourceKeyRef.current = null;
      }
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  /** Perbarui/tampilkan titik lokasi pengguna. */
  const updateMarker = useCallback(async (pos) => {
    userLocRef.current = pos;
    const map = mapRef.current;
    if (!map) return;
    const lib = await getMapLibre();
    if (markerRef.current) {
      markerRef.current.setLngLat([pos.longitude, pos.latitude]);
    } else {
      const el = document.createElement('div');
      el.style.cssText = 'width:18px;height:18px;border-radius:9999px;background:#2b7fff;border:3px solid #fff;box-shadow:0 0 0 2px #121212,0 2px 6px rgba(0,0,0,.4)';
      markerRef.current = new lib.Marker({ element: el }).setLngLat([pos.longitude, pos.latitude]).addTo(map);
    }
  }, []);

  /** Nyalakan "lokasi saya". */
  const enableLocation = useCallback(async () => {
    setLocState('requesting');
    try {
      let perm = await checkLocationPermission();
      if (perm !== 'granted') perm = await requestLocationPermission();
      if (perm === 'denied') { setLocState('denied'); return; }

      const pos = await getCurrentPosition();
      await updateMarker(pos);
      mapRef.current?.flyTo({ center: [pos.longitude, pos.latitude], zoom: 15, duration: 900 });
      setLocState('on');

      // Ikuti pergerakan (hemat: update marker saja, tidak auto-follow).
      watchStopRef.current = await watchPosition((p) => { updateMarker(p); });
    } catch (err) {
      console.warn('[ArMaps] lokasi gagal:', err?.message);
      setLocState('error');
    }
  }, [updateMarker]);

  const toggleLocation = useCallback(() => {
    if (locState === 'on') {
      stopWatch();
      if (markerRef.current) {
        try { markerRef.current.remove(); } catch { /* abaikan */ }
        markerRef.current = null;
      }
      setLocState('off');
    } else {
      enableLocation();
    }
  }, [locState, enableLocation, stopWatch]);

  // Bersihkan GPS saat unmount
  useEffect(() => () => stopWatch(), [stopWatch]);

  /** Zoom ke titik lokasi (bila sudah ada). */
  const recenter = useCallback(() => {
    const pos = userLocRef.current;
    if (pos && mapRef.current) {
      mapRef.current.flyTo({ center: [pos.longitude, pos.latitude], zoom: 15, duration: 800 });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[45] bg-[#F8F5EE] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#F8F5EE] border-b-[3px] border-[#121212] z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs font-black"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Katalog</span>
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="font-black text-sm uppercase tracking-tight truncate leading-tight">
            {region?.name || regionId}
          </h2>
          <p className="text-[9.5px] font-mono-code font-bold text-gray-500 truncate">
            Data OSM {formatDataDate(MAPS_DATA_DATE)}
          </p>
        </div>

        <button
          onClick={onUpdate}
          title="Perbarui peta"
          className="p-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          title="Hapus peta"
          className="p-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Peta */}
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Status overlay */}
        {phase !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F8F5EE]">
            {phase === 'loading' && (
              <div className="flex flex-col items-center gap-2 text-center px-6">
                <Loader2 className="w-7 h-7 animate-spin text-[#121212]" />
                <p className="text-xs font-black uppercase tracking-wider">Memuat peta…</p>
                <p className="text-[10px] font-semibold text-gray-500">
                  Membaca berkas lokal {region ? formatBytes(region.sizeBytes) : ''} (tanpa internet)
                </p>
              </div>
            )}
            {phase === 'error' && (
              <div className="max-w-xs flex flex-col items-center gap-2 text-center px-6">
                <AlertTriangle className="w-7 h-7 text-[#FF70A6]" />
                <p className="text-xs font-black uppercase tracking-wider">Peta gagal dimuat</p>
                <p className="text-[11px] font-semibold text-gray-600">{error}</p>
                <button
                  onClick={onBack}
                  className="mt-1 px-3 py-1.5 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black"
                >
                  Kembali ke katalog
                </button>
              </div>
            )}
          </div>
        )}

        {/* Kontrol kanan bawah */}
        <div className="absolute right-3 bottom-24 flex flex-col items-end gap-2">
          <button
            onClick={toggleLocation}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs font-black ${
              locState === 'on' ? 'bg-[#2b7fff] text-white' : 'bg-white'
            }`}
          >
            {locState === 'requesting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            <span>
              {locState === 'on' ? 'Lokasi aktif' : locState === 'requesting' ? 'Mencari…' : 'Lokasi saya'}
            </span>
          </button>

          {locState === 'on' && (
            <button
              onClick={recenter}
              className="p-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              title="Pusatkan ke lokasi"
            >
              <Compass className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Info lokasi */}
        {locState === 'denied' && (
          <div className="absolute left-3 right-3 top-3 flex items-start gap-2 p-3 bg-[#FFFBDF] rounded-xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-gray-800 flex-1">
              Izin lokasi ditolak. Aktifkan lewat Pengaturan Android bila ingin memakai titik
              &ldquo;lokasi saya&rdquo;. Peta tetap bisa dijelajahi tanpa lokasi.
            </p>
            <button onClick={() => setLocState('off')} className="shrink-0"><X className="w-4 h-4" /></button>
          </div>
        )}
        {locState === 'error' && (
          <div className="absolute left-3 right-3 top-3 flex items-start gap-2 p-3 bg-[#FFEBF2] rounded-xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-gray-800 flex-1">
              Gagal membaca GPS. Pastikan GPS HP menyala, lalu coba lagi.
            </p>
            <button onClick={() => setLocState('off')} className="shrink-0"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Badge offline */}
        <div className="absolute left-3 bottom-24 flex items-center gap-1 px-2 py-1 bg-white/95 rounded-lg border border-[#121212] shadow-[1px_1px_0px_#121212] text-[9.5px] font-mono-code font-black">
          <WifiOff className="w-3 h-3 text-[#38E54D]" />
          OFFLINE
        </div>
      </div>

      {/* Atribusi (wajib ODbL) */}
      {showAttribution && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border-t-2 border-[#121212] text-[9.5px] font-mono-code font-bold text-gray-600">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            © OpenStreetMap contributors (ODbL)
          </span>
          <button onClick={() => setShowAttribution(false)} className="shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-sm bg-[#F8F5EE] rounded-3xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#FF70A6] border-2 border-[#121212] flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212]">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm uppercase tracking-tight">Hapus peta ini?</h3>
            </div>
            <p className="text-xs font-semibold text-gray-700 leading-snug">
              File {region?.name} akan dihapus dari perangkat dan kamu akan kembali ke katalog.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 px-3 py-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase">
                Batal
              </button>
              <button
                onClick={async () => { setConfirmDelete(false); await onDelete(); }}
                className="flex-1 px-3 py-2 bg-[#FF70A6] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
