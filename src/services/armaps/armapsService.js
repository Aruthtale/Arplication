/**
 * ArMaps — Orkestrasi unduh / perbarui / hapus wilayah.
 *
 * Menyatukan katalog + penyimpanan + indeks menjadi alur yang dipakai UI.
 * Alur "Perbarui" memakai ATOMIC SWAP: unduh ke .tmp → verifikasi → baru
 * ganti file lama (peta lama tetap utuh bila unduhan gagal).
 */

import {
  findRegion,
  MAPS_DATA_DATE,
  estimateRegionBytes,
} from './catalog.js';
import {
  downloadRegionToTemp,
  commitTempFile,
  deleteRegionFile,
  cleanupTemp,
  statRegionFile,
  verifyRegionFile,
  verifyFileHeaderAt,
  readRegionBlob,
} from './regionStore.js';
import {
  loadIndex,
  saveIndex,
  upsertIndex,
  removeIndexEntry,
  buildIndexEntry,
  listInstalled,
  getEntry,
  totalInstalledBytes,
} from './regionIndex.js';
import { loadSettings, saveSettings } from './settings.js';

/** Ambil status wilayah: terpasang? ukuran? (dipakai untuk tombol UI). */
export function getRegionStatus(id) {
  const index = loadIndex();
  const entry = getEntry(index, id);
  return {
    installed: Boolean(entry),
    entry,
    index,
  };
}

/** Daftar wilayah terpasang + total ukuran. */
export function getInstalled() {
  const index = loadIndex();
  return { list: listInstalled(index), totalBytes: totalInstalledBytes(index) };
}

/**
 * Unduh wilayah (atau perbarui bila sudah ada) — atomic swap.
 * @param {string} id
 * @param {Object} opts
 * @param {(pct:number, msg:string, bytes?:{received:number,total:number})=>void} opts.onProgress
 * @param {boolean} opts.isUpdate  true = perbarui (file lama diganti)
 * @param {AbortSignal} opts.signal
 */
export async function downloadRegion(id, { onProgress, isUpdate = false, signal } = {}) {
  const region = findRegion(id);
  if (!region) throw new Error(`Wilayah tidak dikenal: ${id}`);

  const settings = loadSettings();
  const location = settings.storageLocation;
  const expected = Number(region.sizeBytes) || estimateRegionBytes(region.bbox, region.maxzoom);

  const report = (pct, msg, bytes) => {
    if (typeof onProgress === 'function') onProgress(pct, msg, bytes);
  };

  report(1, isUpdate ? 'Menyiapkan pembaruan…' : 'Menyiapkan unduhan…', { received: 0, total: expected });

  let tempResult;
  try {
    tempResult = await downloadRegionToTemp(id, {
      region,
      location,
      signal,
      onProgress: (received, total) => {
        const denom = total || expected || 0;
        const pct = denom > 0 ? Math.min(97, Math.max(2, Math.round((received / denom) * 97))) : 50;
        report(pct, `Mengunduh… ${(received / 1048576).toFixed(1)} MB`, { received, total: denom });
      },
    });
  } catch (err) {
    // Gagal → bersihkan .tmp, file lama TIDAK disentuh.
    await cleanupTemp(id, { location }).catch(() => {});
    throw new Error(`Unduhan gagal: ${err?.message || err}`);
  }

  report(98, 'Memverifikasi berkas…');
  // Verifikasi header PMTiles dari file hasil unduhan (.tmp) sebelum swap.
  const check = await verifyFileHeaderAt(tempResult.tempPath, { location });
  if (!check.ok) {
    await cleanupTemp(id, { location }).catch(() => {});
    throw new Error(`Berkas peta tidak valid: ${check.reason || 'header rusak'}`);
  }

  report(99, 'Memasang peta…');
  const committed = await commitTempFile(id, { tempResult, location });

  // Update indeks (metadata kecil) SETELAH file benar-benar terpasang.
  const index = loadIndex();
  const entry = buildIndexEntry({
    region,
    sizeBytes: committed.sizeBytes,
    location,
    dataDate: MAPS_DATA_DATE,
    now: new Date().toISOString(),
  });
  saveIndex(upsertIndex(index, entry));
  saveSettings({ lastOpenedRegion: id });

  report(100, isUpdate ? 'Peta diperbarui.' : 'Peta siap dipakai.', {
    received: committed.sizeBytes,
    total: committed.sizeBytes,
  });

  return { success: true, entry, location };
}

/**
 * Hapus wilayah: file dulu, baru indeks (urutan aman).
 */
export async function removeRegion(id) {
  const entry = getEntry(loadIndex(), id);
  if (!entry) return { success: false, reason: 'Wilayah tidak terpasang.' };
  await deleteRegionFile(id, { location: entry.location });
  saveIndex(removeIndexEntry(loadIndex(), id));
  return { success: true };
}

/**
 * Muat Blob wilayah untuk dirender (memori-hemat).
 * @returns {Promise<{ blob: Blob, entry: Object } | null>}
 */
export async function loadRegionForRender(id) {
  const entry = getEntry(loadIndex(), id);
  if (!entry) return null;
  const res = await readRegionBlob(id, { location: entry.location });
  if (!res) return null;
  return { blob: res.blob, entry };
}

/** Cek apakah file wilayah masih ada di storage (deteksi file hilang). */
export async function verifyInstalledFile(id) {
  const entry = getEntry(loadIndex(), id);
  if (!entry) return { installed: false, exists: false };
  const stat = await statRegionFile(id, { location: entry.location });
  if (!stat.exists) return { installed: true, exists: false, entry };
  const check = await verifyRegionFile(id, { location: entry.location });
  return { installed: true, exists: true, ok: check.ok, reason: check.reason, entry };
}

/** Perkiraan ukuran unduhan untuk ditampilkan di katalog. */
export function estimateBytes(region) {
  return Number(region?.sizeBytes) || estimateRegionBytes(region?.bbox, region?.maxzoom);
}

export { MAPS_DATA_DATE };
