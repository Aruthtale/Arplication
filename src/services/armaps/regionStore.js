/**
 * ArMaps — Penyimpanan file wilayah (I/O: Capacitor Filesystem / Web).
 *
 * Prinsip (lihat docs/ARCMAPS-PLAN.md §7):
 *  1. ATOMIC SWAP — unduh ke `<id>.pmtiles.tmp`, verifikasi, baru ganti file
 *     lama. Gagal di tengah = peta lama tetap utuh.
 *  2. Hemat memori — baca file per-chunk (readFileInChunks) menjadi Blob,
 *     bukan menahan base64 seluruh file sekaligus.
 *  3. Tidak ada wilayah default — hanya yang dipilih pengguna.
 *
 * Di Web (dev/preview) file disimpan di cache memori agar alur UI bisa diuji.
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNative } from '../http.js';
import {
  buildRegionUrl,
  regionFileName,
  isValidRegionId,
  validatePmtilesHeader,
  MIN_PMTILES_BYTES,
} from './catalog.js';
import { loadSettings } from './settings.js';

/** Sub-folder relatif tempat file peta disimpan. */
export const ARMaps_DIR = 'armaps';

/** Ukuran chunk saat membaca file (256 KB) — hemat memori. */
const READ_CHUNK = 256 * 1024;

/** Cache memori untuk web (dev). Tidak dipakai di native. */
const webCache = new Map(); // id -> { blob, meta }

/** Petakan lokasi pengguna → enum Directory Capacitor. */
export function directoryEnumFor(location) {
  return location === 'external' ? Directory.ExternalStorage : Directory.Data;
}

/** Path relatif file final di dalam storage. */
export function regionPath(id, { location = 'internal' } = {}) {
  if (!isValidRegionId(id)) throw new Error(`ID wilayah tidak valid: ${id}`);
  const file = regionFileName(id);
  if (location === 'external') {
    // ExternalStorage menunjuk /storage/emulated/0 → simpan di Download/ArMaps
    return `Download/ArMaps/${file}`;
  }
  return `${ARMaps_DIR}/${file}`;
}

/** Path relatif file sementara (untuk atomic swap). */
export function regionTempPath(id, { location = 'internal' } = {}) {
  const final = regionPath(id, { location });
  return `${final}.tmp`;
}

/** Decode base64 → Uint8Array (aman untuk chunk besar). */
export function base64ToBytes(b64) {
  const clean = String(b64 || '').replace(/^data:[^;]+;base64,/, '');
  const bin = atob(clean);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Baca file wilayah sebagai Blob — memori-hemat (per-chunk) di native.
 * @returns {Promise<{ blob: Blob, sizeBytes: number } | null>}
 */
export async function readRegionBlob(id, { location, onProgress } = {}) {
  const loc = location || loadSettings().storageLocation;

  if (!isNative()) {
    const cached = webCache.get(id);
    if (!cached) return null;
    return { blob: cached.blob, sizeBytes: cached.blob.size };
  }

  const path = regionPath(id, { location: loc });
  const dir = directoryEnumFor(loc);

  const chunks = [];
  let total = 0;
  await new Promise((resolve, reject) => {
    Filesystem.readFileInChunks(
      { path, directory: dir, chunkSize: READ_CHUNK },
      (chunkRead, err) => {
        if (err) return reject(err);
        if (chunkRead === null) return resolve(); // selesai
        const data = chunkRead?.data;
        if (!data) return;
        const bytes = base64ToBytes(data);
        chunks.push(bytes);
        total += bytes.length;
        if (onProgress) onProgress(total);
      },
    ).catch(reject);
  });

  const blob = new Blob(chunks, { type: 'application/octet-stream' });
  return { blob, sizeBytes: blob.size };
}

/**
 * Baca hanya header PMTiles (byte awal) untuk verifikasi.
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function verifyRegionFile(id, { location } = {}) {
  const loc = location || loadSettings().storageLocation;
  if (!isNative()) {
    const cached = webCache.get(id);
    if (!cached) return { ok: false, reason: 'File tidak ada.' };
    const head = new Uint8Array(await cached.blob.slice(0, 16).arrayBuffer());
    return validatePmtilesHeader(head);
  }

  const path = regionPath(id, { location: loc });
  const dir = directoryEnumFor(loc);
  let head = null;
  await new Promise((resolve, reject) => {
    Filesystem.readFileInChunks(
      { path, directory: dir, chunkSize: READ_CHUNK },
      (chunkRead, err) => {
        if (err) return reject(err);
        if (chunkRead === null) return resolve();
        if (!head && chunkRead?.data) {
          const bytes = base64ToBytes(chunkRead.data);
          head = bytes.slice(0, 16);
        }
        // cukup chunk pertama — sisanya diabaikan
        if (head) return resolve();
      },
    ).catch(reject);
  });
  if (!head) return { ok: false, reason: 'File kosong.' };
  return validatePmtilesHeader(head);
}

/**
 * Baca hanya header PMTiles dari file pada path tertentu (untuk verifikasi
 * file .tmp sebelum atomic swap).
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function verifyFileHeaderAt(path, { location } = {}) {
  const loc = location || loadSettings().storageLocation;
  if (!isNative()) {
    const cached = webCache.get(path);
    if (!cached) return { ok: false, reason: 'Berkas sementara hilang.' };
    const head = new Uint8Array(await cached.blob.slice(0, 16).arrayBuffer());
    return validatePmtilesHeader(head);
  }

  const dir = directoryEnumFor(loc);
  let head = null;
  await new Promise((resolve, reject) => {
    Filesystem.readFileInChunks(
      { path, directory: dir, chunkSize: READ_CHUNK },
      (chunkRead, err) => {
        if (err) return reject(err);
        if (chunkRead === null) return resolve();
        if (!head && chunkRead?.data) {
          head = base64ToBytes(chunkRead.data).slice(0, 16);
          return resolve();
        }
      },
    ).catch(reject);
  });
  if (!head) return { ok: false, reason: 'Berkas kosong.' };
  return validatePmtilesHeader(head);
}

/** Statistik file di storage (native) atau cache (web).
 * @returns {Promise<{ exists: boolean, sizeBytes: number }>}
 */
export async function statRegionFile(id, { location } = {}) {
  const loc = location || loadSettings().storageLocation;
  if (!isNative()) {
    const cached = webCache.get(id);
    return cached ? { exists: true, sizeBytes: cached.blob.size } : { exists: false, sizeBytes: 0 };
  }
  try {
    const info = await Filesystem.stat({
      path: regionPath(id, { location: loc }),
      directory: directoryEnumFor(loc),
    });
    return { exists: true, sizeBytes: Number(info?.size) || 0 };
  } catch {
    return { exists: false, sizeBytes: 0 };
  }
}

/** Pastikan folder induk ada (native). */
async function ensureDir(location) {
  if (!isNative()) return;
  const dir = directoryEnumFor(location);
  const folder = location === 'external' ? 'Download/ArMaps' : ARMaps_DIR;
  await Filesystem.mkdir({ path: folder, directory: dir, recursive: true }).catch(() => {});
}

/**
 * Unduh wilayah ke file `.tmp` lalu verifikasi (TANPA menyentuh file lama).
 * @returns {Promise<{ tempPath: string, sizeBytes: number, location: string }>}
 */
export async function downloadRegionToTemp(id, { region, location, onProgress, signal } = {}) {
  const loc = location || loadSettings().storageLocation;
  const url = buildRegionUrl(region);

  if (!isNative()) {
    // Web (dev): fetch dengan progres → simpan sementara di memori
    const blob = await fetchWithProgress(url, onProgress, signal);
    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const check = validatePmtilesHeader(head);
    if (!check.ok) throw new Error(`Berkas peta tidak valid: ${check.reason}`);
    webCache.set(`${id}__tmp`, { blob, meta: { url, sizeBytes: blob.size } });
    return { tempPath: `${id}__tmp`, sizeBytes: blob.size, location: loc, __web: true };
  }

  await ensureDir(loc);
  const tempPath = regionTempPath(id, { location: loc });
  const dir = directoryEnumFor(loc);

  let progressListener = null;
  if (typeof onProgress === 'function') {
    try {
      progressListener = await Filesystem.addListener('progress', (status) => {
        const bytes = Number(status?.bytes || 0);
        const total = Number(status?.contentLength || 0);
        onProgress(bytes, total);
      });
    } catch {
      /* progres opsional */
    }
  }

  try {
    // Bersihkan sisa .tmp dari percobaan sebelumnya
    await Filesystem.deleteFile({ path: tempPath, directory: dir }).catch(() => {});
    await Filesystem.downloadFile({
      url,
      path: tempPath,
      directory: dir,
      recursive: true,
      progress: true,
    });
  } finally {
    if (progressListener && typeof progressListener.remove === 'function') {
      progressListener.remove().catch(() => {});
    }
  }

  const stat = await Filesystem.stat({ path: tempPath, directory: dir });
  const sizeBytes = Number(stat?.size) || 0;
  if (sizeBytes < MIN_PMTILES_BYTES) {
    await Filesystem.deleteFile({ path: tempPath, directory: dir }).catch(() => {});
    throw new Error('Unduhan tidak lengkap (berkas terlalu kecil).');
  }
  return { tempPath, sizeBytes, location: loc };
}

/**
 * Tukar file `.tmp` menjadi file final (ATOMIC SWAP).
 * Unduh sudah diverifikasi sebelum ini; di sini hanya mengganti.
 */
export async function commitTempFile(id, { tempResult, location } = {}) {
  const loc = location || tempResult?.location || loadSettings().storageLocation;

  if (!isNative() || tempResult?.__web) {
    const tmp = webCache.get(`${id}__tmp`);
    if (!tmp) throw new Error('Berkas sementara hilang.');
    webCache.set(id, tmp);
    webCache.delete(`${id}__tmp`);
    return { sizeBytes: tmp.blob.size, location: loc };
  }

  const dir = directoryEnumFor(loc);
  const finalPath = regionPath(id, { location: loc });
  const tempPath = tempResult.tempPath;

  // Hapus file lama (bila ada) SETELAH unduhan baru sukses.
  await Filesystem.deleteFile({ path: finalPath, directory: dir }).catch(() => {});
  await Filesystem.rename({ from: tempPath, to: finalPath, directory: dir });
  return { sizeBytes: tempResult.sizeBytes, location: loc };
}

/** Hapus file wilayah (native: final + tmp; web: cache). */
export async function deleteRegionFile(id, { location } = {}) {
  const loc = location || loadSettings().storageLocation;
  if (!isNative()) {
    webCache.delete(id);
    webCache.delete(`${id}__tmp`);
    return;
  }
  const dir = directoryEnumFor(loc);
  await Filesystem.deleteFile({ path: regionPath(id, { location: loc }), directory: dir }).catch(() => {});
  await Filesystem.deleteFile({ path: regionTempPath(id, { location: loc }), directory: dir }).catch(() => {});
}

/** Bersihkan file sementara yang gagal (dipanggil setelah error). */
export async function cleanupTemp(id, { location } = {}) {
  const loc = location || loadSettings().storageLocation;
  if (!isNative()) {
    webCache.delete(`${id}__tmp`);
    return;
  }
  const dir = directoryEnumFor(loc);
  await Filesystem.deleteFile({ path: regionTempPath(id, { location: loc }), directory: dir }).catch(() => {});
}

/** Fetch dengan progres (dipakai di web/dev). */
async function fetchWithProgress(url, onProgress, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Unduhan gagal (HTTP ${res.status}).`);
  const total = Number(res.headers.get('content-length') || 0);
  if (!res.body || typeof ReadableStream === 'undefined') {
    return res.blob();
  }
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (onProgress) onProgress(received, total);
  }
  return new Blob(chunks, { type: 'application/octet-stream' });
}

/** Hanya untuk pengujian/dev: akses cache web. */
export function __webCache() {
  return webCache;
}
