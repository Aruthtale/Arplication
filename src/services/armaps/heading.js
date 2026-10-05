/**
 * ArMaps — Arah/kompas perangkat (heading), 100% offline.
 *
 * Membaca sensor orientasi WebView (magnetometer + akselerometer):
 *   - Android: event `deviceorientationabsolute` (atau `deviceorientation`
 *     dengan `absolute:true`) memberi `alpha` absolut terhadap utara.
 *   - iOS: `event.webkitCompassHeading` (bila ada).
 *
 * TIDAK butuh plugin native maupun izin runtime. Bila sensor tak tersedia
 * (mis. desktop/headless), watch cukup tidak memanggil callback — UI tetap jalan.
 *
 * Heading 0° = Utara, 90° = Timur, 180° = Selatan, 270° = Barat.
 */

/** Normalkan sudut apa pun ke rentang [0, 360). */
export function normalizeHeading(deg) {
  if (typeof deg !== 'number' || Number.isNaN(deg)) return null;
  return ((deg % 360) + 360) % 360;
}

/** Label 8 arah (Indonesia): U, TL, T, TG, S, BD, B, BL. */
const CARDINALS_8 = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];

/** Label 4 arah untuk mawar kompas: U (atas), T (kanan), S (bawah), B (kiri). */
const CARDINALS_4 = ['U', 'T', 'S', 'B'];

/** Nama arah 8-penjuru dari sudut heading (mis. 90 → 'T'). */
export function headingToCardinal8(deg) {
  const n = normalizeHeading(deg);
  if (n == null) return null;
  return CARDINALS_8[Math.round(n / 45) % 8];
}

/** Nama arah 4-penjuru (mis. 90 → 'T'). */
export function headingToCardinal4(deg) {
  const n = normalizeHeading(deg);
  if (n == null) return null;
  return CARDINALS_4[Math.round(n / 90) % 4];
}

/**
 * Rotasi CSS (derajat) untuk mawar kompas agar huruf U selalu menunjuk
 * utara sebenarnya saat HP diputar. Arah hadap HP = tetap di ATAS widget.
 */
export function roseRotation(deg) {
  const n = normalizeHeading(deg);
  if (n == null) return 0;
  return n === 0 ? 0 : -n;
}

/** Apakah event ini memberi arah absolut (bukan relatif)? */
export function isAbsoluteEvent(e) {
  if (!e) return false;
  if (typeof e.webkitCompassHeading === 'number') return true;
  if (e.absolute === true) return true;
  return e.type === 'deviceorientationabsolute';
}

/**
 * Hitung heading (derajat, 0=U) dari sebuah event orientasi.
 * @returns {number|null}
 */
export function computeHeading(e) {
  if (!e) return null;
  if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
    return normalizeHeading(e.webkitCompassHeading);
  }
  if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
    // `alpha` bertambah berlawanan arah jarum jam dari utara → heading = 360 - alpha.
    return normalizeHeading(360 - e.alpha);
  }
  return null;
}

/**
 * Mulai memantau arah perangkat.
 * @param {(heading:number, info:{absolute:boolean}) => void} onUpdate
 * @param {Object} [opts]
 * @param {number} [opts.minIntervalMs=60]  batas laju callback (anti-render-storm)
 * @param {(err:Error)=>void} [opts.onError]
 * @returns {() => void} stop()
 */
export function startHeadingWatch(onUpdate, { minIntervalMs = 60, onError } = {}) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }

  let lastAt = 0;
  let lastVal = null;

  const handler = (e) => {
    const h = computeHeading(e);
    if (h == null) return;
    const now = Date.now();
    // Throttle: kirim bila berubah cukup jelas atau sudah lewat interval.
    if (now - lastAt < minIntervalMs && lastVal != null && Math.abs(h - lastVal) < 2) return;
    lastAt = now;
    lastVal = h;
    onUpdate(h, { absolute: isAbsoluteEvent(e) });
  };

  const attach = () => {
    // absolute dulu (utara sejati), lalu fallback relatif.
    window.addEventListener('deviceorientationabsolute', handler, true);
    window.addEventListener('deviceorientation', handler, true);
  };

  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    // iOS: butuh gesture pengguna; pemanggil sebaiknya memanggil dari klik.
    DOE.requestPermission()
      .then((res) => { if (res === 'granted') attach(); else if (onError) onError(new Error('Izin sensor arah ditolak.')); })
      .catch((err) => { if (onError) onError(err); });
  } else {
    attach();
  }

  return () => {
    window.removeEventListener('deviceorientationabsolute', handler, true);
    window.removeEventListener('deviceorientation', handler, true);
  };
}
