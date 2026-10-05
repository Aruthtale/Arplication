import { registerPlugin } from '@capacitor/core';
import { isNative } from './http.js';

/**
 * Bridge native Ardoro Focus Lock (App Blocker).
 *
 * Service native (AccessibilityService) memantau aplikasi yang dibuka selama
 * sesi fokus Ardoro berjalan, menampilkan overlay, lalu melempar user ke Home.
 *
 * Semua fungsi aman dipanggil di web (mengembalikan nilai default / no-op).
 */

const AppBlocker = registerPlugin('AppBlocker');

export const DEFAULT_BLOCKER_CONFIG = {
  enabled: false,
  auto: true,
  mode: 'blacklist',
  packages: [],
  accessibilityEnabled: false,
  overlayGranted: false,
  strict: false,
  graceSeconds: 10,
};

/**
 * Ambil konfigurasi + status izin dari native.
 * @returns {Promise<object|null>} null bila bukan native / gagal.
 */
export async function getBlockerConfig() {
  if (!isNative()) return null;
  try {
    const c = await AppBlocker.getConfig();
    return { ...DEFAULT_BLOCKER_CONFIG, ...(c || {}) };
  } catch (e) {
    console.warn('AppBlocker getConfig gagal:', e);
    return null;
  }
}

/**
 * Simpan sebagian konfigurasi. Hanya key yang dikirim yang diubah.
 * @param {{enabled?: boolean, auto?: boolean, mode?: string, packages?: string[]}} patch
 * @returns {Promise<object|null>} konfigurasi terbaru, atau null bila gagal.
 */
export async function setBlockerConfig(patch = {}) {
  if (!isNative()) return null;
  try {
    const c = await AppBlocker.setConfig(patch);
    return { ...DEFAULT_BLOCKER_CONFIG, ...(c || {}) };
  } catch (e) {
    console.warn('AppBlocker setConfig gagal:', e);
    return null;
  }
}

/** Toggle status blokir runtime (manual). */
export async function setBlockerEnabled(enabled) {
  if (!isNative()) return false;
  try {
    await AppBlocker.setEnabled({ enabled: Boolean(enabled) });
    return true;
  } catch (e) {
    console.warn('AppBlocker setEnabled gagal:', e);
    return false;
  }
}

/** True bila Accessibility Service milik Arplication sedang aktif di sistem. */
export async function isAccessibilityEnabled() {
  if (!isNative()) return false;
  try {
    const r = await AppBlocker.isAccessibilityEnabled();
    return Boolean(r?.enabled);
  } catch {
    return false;
  }
}

/** Buka Settings → Accessibility agar user mengaktifkan "Arplication Fokus". */
export async function openAccessibilitySettings() {
  if (!isNative()) return false;
  try {
    await AppBlocker.openAccessibilitySettings();
    return true;
  } catch (e) {
    console.warn('AppBlocker openAccessibilitySettings gagal:', e);
    return false;
  }
}

/** Buka Settings → Izin overlay (SYSTEM_ALERT_WINDOW). */
export async function openOverlaySettings() {
  if (!isNative()) return false;
  try {
    await AppBlocker.openOverlaySettings();
    return true;
  } catch (e) {
    console.warn('AppBlocker openOverlaySettings gagal:', e);
    return false;
  }
}

/**
 * Daftar aplikasi yang bisa diluncurkan user.
 * @returns {Promise<Array<{packageName: string, label: string, system: boolean, icon?: string}>>}
 */
export async function getInstalledApps() {
  if (!isNative()) return [];
  try {
    const r = await AppBlocker.getInstalledApps();
    const apps = Array.isArray(r?.apps) ? r.apps : [];
    return apps
      .map((a) => ({
        packageName: String(a?.packageName || ''),
        label: String(a?.label || a?.packageName || ''),
        system: Boolean(a?.system),
        icon: a?.icon ? String(a.icon) : '',
      }))
      .filter((a) => a.packageName);
  } catch (e) {
    console.warn('AppBlocker getInstalledApps gagal:', e);
    return [];
  }
}

// ------------------------------------------------------------------ pure helpers

/**
 * Tentukan apakah sebuah package harus diblokir menurut konfigurasi.
 * Fungsi murni — dipakai UI & unit test.
 *
 * - blacklist: blokir bila package ADA di daftar.
 * - whitelist: blokir bila package TIDAK ada di daftar (daftar kosong = jangan blokir).
 *
 * @param {string} pkg
 * @param {{mode?: string, packages?: string[]}} config
 * @returns {boolean}
 */
export function isBlocked(pkg, config) {
  if (!pkg || !config) return false;
  const list = Array.isArray(config.packages) ? config.packages : [];
  const listed = list.includes(pkg);
  if (config.mode === 'whitelist') return list.length > 0 && !listed;
  return listed;
}

/**
 * Urutkan + filter daftar aplikasi untuk ditampilkan.
 * Fungsi murni — testable.
 */
export function filterApps(apps = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  const list = Array.isArray(apps) ? apps.slice() : [];
  const filtered = q
    ? list.filter((a) =>
        String(a?.label || '').toLowerCase().includes(q)
        || String(a?.packageName || '').toLowerCase().includes(q))
    : list;
  return filtered.sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), 'id'));
}
