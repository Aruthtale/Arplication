import { registerPlugin } from '@capacitor/core';
import { isNative } from './http.js';

/**
 * Bridge native mode Jangan Ganggu (Do Not Disturb) Android untuk Ardoro.
 *
 * Saat sesi fokus Ardoro berjalan, DND dinyalakan otomatis (hening) lalu
 * dipulihkan ke kondisi asli user saat jeda/selesai. Semua fungsi aman
 * dipanggil di web (mengembalikan nilai default / no-op).
 *
 * CATATAN IZIN: Android mewajibkan "Akses Jangan Ganggu" yang TIDAK bisa
 * diminta lewat popup. UI harus menyediakan tombol `openDndSettings()` agar
 * user mengaktifkannya manual di Pengaturan sistem.
 */

const Dnd = registerPlugin('Dnd');

export const DEFAULT_DND_STATE = {
  supported: false,
  granted: false,
  active: false,
  auto: true,
};

/** Ambil status DND + izin dari native. */
export async function getDndState() {
  if (!isNative()) return { ...DEFAULT_DND_STATE };
  try {
    const s = await Dnd.getState();
    return { ...DEFAULT_DND_STATE, ...(s || {}) };
  } catch (e) {
    console.warn('Dnd getState gagal:', e);
    return { ...DEFAULT_DND_STATE };
  }
}

/** Simpan preferensi "DND otomatis saat fokus". */
export async function setDndAuto(auto) {
  if (!isNative()) return null;
  try {
    const s = await Dnd.setAuto({ auto: Boolean(auto) });
    return { ...DEFAULT_DND_STATE, ...(s || {}) };
  } catch (e) {
    console.warn('Dnd setAuto gagal:', e);
    return null;
  }
}

/**
 * Nyalakan/matikan DND manual.
 * @returns {Promise<object|null>} status terbaru, atau null bila gagal.
 *   Bila `needsPermission` true, UI harus memanggil openDndSettings().
 */
export async function setDndEnabled(enabled) {
  if (!isNative()) return null;
  try {
    const s = await Dnd.setEnabled({ enabled: Boolean(enabled) });
    return { ...DEFAULT_DND_STATE, ...(s || {}) };
  } catch (e) {
    console.warn('Dnd setEnabled gagal:', e);
    return null;
  }
}

/** Buka Settings → Akses Jangan Ganggu. */
export async function openDndSettings() {
  if (!isNative()) return false;
  try {
    await Dnd.openSettings();
    return true;
  } catch (e) {
    console.warn('Dnd openSettings gagal:', e);
    return false;
  }
}

// --------------------------------------------------------------- pure helpers

/**
 * Tentukan apakah DND seharusnya menyala untuk sebuah fase timer.
 * Fungsi murni — dipakai UI & unit test (cermin dari DndStore.applyForPhase).
 * @param {string} phase 'focus' | 'short' | 'long'
 * @param {boolean} auto preferensi user
 * @returns {boolean}
 */
export function shouldEnableDnd(phase, auto) {
  return Boolean(auto) && phase === 'focus';
}

/**
 * Teks status DND untuk ditampilkan di UI.
 * @param {{supported?:boolean, granted?:boolean, active?:boolean, auto?:boolean}} s
 * @returns {string}
 */
export function dndStatusLabel(s = {}) {
  if (!s.supported) return 'TIDAK DIDUKUNG';
  if (!s.granted) return 'PERLU IZIN';
  if (!s.auto) return 'MANUAL';
  return s.active ? 'HENING AKTIF' : 'SIAP';
}
