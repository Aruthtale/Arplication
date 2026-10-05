/**
 * ArMaps — Skala jarak (scale bar), 100% offline.
 *
 * Menghitung panjang di layar ↔ jarak dunia nyata pada proyeksi Web Mercator,
 * lalu memilih angka "bulat" (1/2/5 × 10ⁿ) yang paling pas untuk bilah skala.
 *
 * Semua fungsi murni (tanpa DOM) supaya bisa diuji tanpa browser.
 */

/** Keliling bumi di ekuator (meter) — basis proyeksi Web Mercator. */
const EARTH_CIRCUMFERENCE = 40075016.686;

/**
 * Meter per piksel pada proyeksi Web Mercator.
 *
 * MapLibre memakai tile 512 px, jadi lebar dunia di zoom 0 = 512 px:
 *   m/px = keliling_bumi × cos(lintang) / (512 × 2^zoom)
 *
 * @param {number} latitude  lintang (derajat)
 * @param {number} zoom      tingkat zoom MapLibre
 * @param {number} [tileSize=512]
 * @returns {number|null}
 */
export function metersPerPixel(latitude, zoom, tileSize = 512) {
  const lat = Number(latitude);
  const z = Number(zoom);
  if (!Number.isFinite(lat) || !Number.isFinite(z)) return null;
  const denom = tileSize * Math.pow(2, z);
  if (!denom) return null;
  return (EARTH_CIRCUMFERENCE * Math.cos((lat * Math.PI) / 180)) / denom;
}

/** Angka "bulat" yang enak dibaca: 1, 2, 5, 10, 20, 50, 100, … */
const NICE_STEPS = [1, 2, 5];

/**
 * Pilih bilah skala terbaik untuk lebar maksimum tertentu.
 *
 * @param {number} mpp   meter per piksel (dari metersPerPixel)
 * @param {Object} [opts]
 * @param {number} [opts.maxPixels=96]  lebar maksimum bilah di layar (px CSS)
 * @returns {{ meters:number, pixels:number, label:string }|null}
 */
export function niceScaleBar(mpp, { maxPixels = 96 } = {}) {
  if (!Number.isFinite(mpp) || mpp <= 0 || !(maxPixels > 0)) return null;

  const maxMeters = mpp * maxPixels;
  const exp = Math.floor(Math.log10(maxMeters));
  let best = null;
  // Cari nilai bulat terbesar yang muat dalam maxMeters.
  for (let e = exp + 1; e >= exp - 3; e--) {
    for (const s of NICE_STEPS) {
      const d = s * Math.pow(10, e);
      if (d <= maxMeters && (best == null || d > best)) best = d;
    }
  }
  if (best == null) best = maxMeters;

  return {
    meters: best,
    pixels: best / mpp,
    label: formatScaleDistance(best),
  };
}

/**
 * Format jarak untuk label skala: "500 m", "2 km", "1,5 km".
 * @param {number} meters
 * @returns {string}
 */
export function formatScaleDistance(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m) || m <= 0) return '';
  if (m >= 1000) {
    const km = m / 1000;
    // 1,5 km (1 desimal untuk < 10 km), 20 km (bulat untuk >= 10 km)
    const txt = km < 10 ? km.toFixed(1).replace('.0', '').replace('.', ',') : String(Math.round(km));
    return `${txt} km`;
  }
  return `${Math.round(m)} m`;
}
