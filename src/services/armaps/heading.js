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
 *
 * Anti-bug saat banyak gerak (penting):
 *   1. Hanya SATU sumber dipakai. Bila event absolut sudah pernah datang,
 *      event relatif (`deviceorientation` tanpa absolute) DIABAIKAN — kalau
 *      tidak, nilai relatif menimpa absolut dan kompas "loncat-loncat".
 *   2. Heading dihaluskan dengan rata-rata bergerak SIRKULAR (bukan linear),
 *      supaya lompatan 360°↔0° tidak membuat jarum berputar balik.
 *   3. Throttle berbasis selisih sudut terpendek, bukan selisih absolut.
 */

/** Normalkan sudut apa pun ke rentang [0, 360). */
export function normalizeHeading(deg) {
  if (typeof deg !== 'number' || Number.isNaN(deg)) return null;
  return ((deg % 360) + 360) % 360;
}

/**
 * Selisih sudut TERPENDEK dari `from` ke `to`, dalam rentang (-180, 180].
 * Ini yang membuat 350°→10° terbaca +20° (bukan -340°).
 */
export function shortestAngleDelta(from, to) {
  if (typeof from !== 'number' || typeof to !== 'number') return null;
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/**
 * Rata-rata bergerak sirkular: geser `prev` menuju `next` sejauh `alpha`.
 * `alpha` kecil = lebih halus tapi sedikit lambat (bagus untuk kompas berisik).
 * @param {number|null} prev  heading sebelumnya (null = pakai next langsung)
 * @param {number} next       heading baru
 * @param {number} [alpha=0.2]
 * @returns {number} heading terhaluskan di [0,360)
 */
export function smoothHeading(prev, next, alpha = 0.2) {
  const n = normalizeHeading(next);
  if (n == null) return prev;
  const p = normalizeHeading(prev);
  if (p == null) return n;
  const a = Math.max(0, Math.min(1, alpha));
  const d = shortestAngleDelta(p, n);
  return normalizeHeading(p + a * d);
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
 * Keputusan menerima sampel arah — mencegah nilai RELATIF menimpa ABSOLUT.
 * Bila absolut pernah datang baru-baru ini, sampel relatif dibuang; kalau
 * tidak, kompas "loncat-loncat" saat HP banyak bergerak (bug nyata).
 * @param {{absolute:boolean, gotAbsolute:boolean, lastAbsoluteAt:number, now:number, windowMs?:number}} s
 * @returns {boolean} true = pakai sampel ini
 */
export function acceptHeadingSample({ absolute, gotAbsolute, lastAbsoluteAt, now, windowMs = 1000 }) {
  if (absolute) return true;
  if (gotAbsolute && now - lastAbsoluteAt < windowMs) return false;
  return true;
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
 * Mulai memantau arah perangkat (dengan filter anti-lompatan).
 * @param {(heading:number, info:{absolute:boolean}) => void} onUpdate
 * @param {Object} [opts]
 * @param {number} [opts.minIntervalMs=60]  batas laju callback (anti-render-storm)
 * @param {number} [opts.smoothing=0.25]    alpha filter sirkular (0..1)
 * @param {number} [opts.minDeltaDeg=1.5]   abaikan perubahan < derajat ini
 * @param {(err:Error)=>void} [opts.onError]
 * @returns {() => void} stop()
 */
export function startHeadingWatch(onUpdate, {
  minIntervalMs = 60,
  smoothing = 0.25,
  minDeltaDeg = 1.5,
  onError,
} = {}) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }

  let lastAt = 0;
  let smoothed = null;      // heading terhaluskan
  let gotAbsolute = false;  // sudah pernah dapat event absolut?
  let lastAbsoluteAt = 0;   // kapan absolut terakhir datang (ms)

  const handler = (e) => {
    const absolute = isAbsoluteEvent(e);
    const raw = computeHeading(e);
    if (raw == null) return;

    const now = Date.now();
    if (absolute) {
      gotAbsolute = true;
      lastAbsoluteAt = now;
    } else if (!acceptHeadingSample({ absolute, gotAbsolute, lastAbsoluteAt, now })) {
      // Absolut lebih dipercaya; buang relatif yang datang beruntun.
      // Ini mencegah nilai relatif menimpa absolut → kompas "bug".
      return;
    }

    // Haluskan (rata-rata bergerak sirkular) supaya tak gemetar/lompat.
    const next = smoothHeading(smoothed, raw, smoothing);
    const delta = smoothed == null ? 999 : Math.abs(shortestAngleDelta(smoothed, next));

    // Throttle: kirim bila sudah lewat interval ATAU berubah cukup jelas.
    if (now - lastAt < minIntervalMs && delta < minDeltaDeg) return;
    lastAt = now;
    smoothed = next;
    onUpdate(next, { absolute });
  };

  const attach = () => {
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
