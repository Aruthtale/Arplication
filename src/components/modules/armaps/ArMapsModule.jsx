import React, { useState, useEffect, useRef, useCallback } from 'react';
import RegionCatalogView from './RegionCatalogView';
import MapViewerView from './MapViewerView';
import DownloadProgressSheet from './DownloadProgressSheet';
import ArMapsStorageSheet from './ArMapsStorageSheet';
import { listCatalog, findRegion } from '../../../services/armaps/catalog.js';
import { loadIndex } from '../../../services/armaps/regionIndex.js';
import { loadSettings, saveSettings } from '../../../services/armaps/settings.js';
import {
  downloadRegion,
  removeRegion,
  getInstalled,
} from '../../../services/armaps/armapsService.js';
import { registerBackHandler } from '../../../services/backHandler.js';

/**
 * ArMaps — modul peta offline.
 *
 * Alur: PILIH → UNDUH → PAKAI → PERBARUI → HAPUS.
 * TIDAK ADA wilayah default: sebelum pengguna memilih, layar hanya
 * menampilkan katalog pilihan.
 */
export default function ArMapsModule() {
  const [view, setView] = useState('catalog'); // 'catalog' | 'map'
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [index, setIndex] = useState(() => loadIndex());
  const [settings, setSettings] = useState(() => loadSettings());
  const [catalog] = useState(() => listCatalog());

  // Unduhan
  const [download, setDownload] = useState(null);
  // { region, isUpdate, pct, msg, received, total, error }

  const [storageOpen, setStorageOpen] = useState(false);

  const viewRef = useRef(view);
  const downloadRef = useRef(download);
  const storageRef = useRef(storageOpen);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { downloadRef.current = download; }, [download]);
  useEffect(() => { storageRef.current = storageOpen; }, [storageOpen]);

  const refresh = useCallback(() => setIndex(loadIndex()), []);

  // Handler tombol Back Android
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (downloadRef.current) return true; // unduhan tidak bisa di-back paksa
      if (storageRef.current) { setStorageOpen(false); return true; }
      if (viewRef.current === 'map') { setView('catalog'); return true; }
      return false;
    });
    return () => unregister();
  }, []);

  const installed = getInstalled();

  /** Mulai unduh (baru atau perbarui). */
  const startDownload = async (regionId, { isUpdate = false } = {}) => {
    const region = findRegion(regionId);
    if (!region) return;
    setDownload({ region, isUpdate, pct: 0, msg: 'Menyiapkan…', received: 0, total: 0, error: null });
    try {
      await downloadRegion(regionId, {
        isUpdate,
        onProgress: (pct, msg, bytes) => {
          setDownload((d) => (d ? { ...d, pct, msg, received: bytes?.received || 0, total: bytes?.total || 0 } : d));
        },
      });
      refresh();
      setDownload((d) => (d ? { ...d, pct: 100, msg: isUpdate ? 'Peta diperbarui.' : 'Peta siap dipakai.' } : d));
      // Tampilkan pesan sukses singkat lalu tutup.
      setTimeout(() => setDownload(null), 900);
    } catch (err) {
      setDownload((d) => (d ? { ...d, error: err?.message || 'Unduhan gagal.' } : d));
    }
  };

  /** Hapus wilayah terpasang. */
  const handleDelete = async (regionId) => {
    await removeRegion(regionId);
    refresh();
    if (activeRegionId === regionId) {
      setActiveRegionId(null);
      setView('catalog');
    }
  };

  const handleOpenMap = (regionId) => {
    setActiveRegionId(regionId);
    setView('map');
    saveSettings({ lastOpenedRegion: regionId });
    setSettings(loadSettings());
  };

  const handleStorageChange = (loc) => {
    const next = saveSettings({ storageLocation: loc });
    setSettings(next);
  };

  return (
    <div className="font-sans">
      {view === 'catalog' && (
        <RegionCatalogView
          catalog={catalog}
          index={index}
          installedBytes={installed.totalBytes}
          settings={settings}
          onDownload={(id) => startDownload(id, { isUpdate: false })}
          onOpenMap={handleOpenMap}
          onUpdate={(id) => startDownload(id, { isUpdate: true })}
          onDelete={handleDelete}
          onOpenStorage={() => setStorageOpen(true)}
        />
      )}

      {view === 'map' && activeRegionId && (
        <MapViewerView
          regionId={activeRegionId}
          region={findRegion(activeRegionId)}
          showLabels={settings.showLabels}
          onBack={() => setView('catalog')}
          onUpdate={() => startDownload(activeRegionId, { isUpdate: true })}
          onDelete={() => handleDelete(activeRegionId)}
        />
      )}

      {download && (
        <DownloadProgressSheet
          data={download}
          onClose={() => setDownload(null)}
          onRetry={() => startDownload(download.region.id, { isUpdate: download.isUpdate })}
        />
      )}

      {storageOpen && (
        <ArMapsStorageSheet
          current={settings.storageLocation}
          onChange={handleStorageChange}
          onClose={() => setStorageOpen(false)}
        />
      )}
    </div>
  );
}
