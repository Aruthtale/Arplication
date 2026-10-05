/**
 * Ardoro Focus Lock — Mode Ketat Level 3 (Jeda Wajib / Grace Period).
 *
 * Fungsi murni (tanpa DOM) agar bisa diuji di Node dan dipakai UI.
 *
 * Aturan: saat Mode Ketat aktif DAN sesi fokus sedang berjalan, user tidak bisa
 * langsung mematikan blokir. Ia harus menunggu hitungan mundur (jeda wajib)
 * sebelum tombol "Matikan" boleh ditekan. Tujuannya memberi jeda refleksi,
 * bukan mengunci permanen.
 */

export const DEFAULT_STRICT = {
  strict: false,      // Mode Ketat ON/OFF
  graceSeconds: 10,   // lama jeda wajib (detik)
};

export const GRACE_MIN = 3;
export const GRACE_MAX = 60;

/** Batasi lama jeda wajib ke rentang wajar. */
export function clampGrace(n) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_STRICT.graceSeconds;
  return Math.min(GRACE_MAX, Math.max(GRACE_MIN, v));
}

/**
 * Apakah aksi ini butuh jeda wajib?
 *
 * Hanya berlaku bila:
 *  - Mode Ketat aktif,
 *  - sesi fokus sedang berjalan,
 *  - dan user mencoba MEMATIKAN sesuatu (enabled/auto → false).
 *
 * @param {{strict?: boolean}} config
 * @param {{focusRunning?: boolean, nextValue?: boolean}} ctx
 */
export function needsGrace(config, { focusRunning = false, nextValue = false } = {}) {
  return Boolean(config?.strict) && Boolean(focusRunning) && nextValue === false;
}

/**
 * Pesan peringatan kontekstual sesuai sudah berapa lama user fokus.
 * @param {number} focusElapsedSec detik fokus yang sudah berjalan
 */
export function graceWarningText(focusElapsedSec = 0) {
  const m = Math.floor(Math.max(0, Number(focusElapsedSec) || 0) / 60);
  if (m >= 20) return `Fokusmu sudah ${m} menit. Sungguh mau berhenti sekarang?`;
  if (m >= 5) return `Fokusmu baru ${m} menit. Masih ingin mematikan blokir?`;
  if (m >= 1) return `Kamu baru fokus ${m} menit. Yakin mau mematikannya?`;
  return 'Kamu baru saja mulai fokus. Yakin mau mematikannya?';
}

/** Format hitungan mundur (detik → "10" / "1:05"). */
export function formatCountdown(sec) {
  const s = Math.max(0, Math.ceil(Number(sec) || 0));
  if (s < 60) return String(s);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** Ringkasan label status Mode Ketat untuk badge UI. */
export function strictLabel(config) {
  if (!config?.strict) return 'NONAKTIF';
  return `AKTIF · ${clampGrace(config.graceSeconds)}s`;
}
