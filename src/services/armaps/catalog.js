/**
 * ArMaps — Katalog wilayah peta offline (PURE, tanpa DOM/Capacitor).
 *
 * File .pmtiles di-host sebagai aset GitHub Release dengan tag khusus
 * (mis. `maps-20261004`). Aplikasi hanya mengunduh file yang DIPILIH
 * pengguna — TIDAK ada wilayah default yang otomatis disiapkan.
 *
 * Semua fungsi di sini murni agar mudah diuji di Node.
 */

/** Tag rilis tempat file peta di-host (aset GitHub Release). */
export const MAPS_RELEASE_TAG = 'maps-20261004';

/** Tanggal data OSM untuk build ini (dipakai di UI: "Data OSM: ..."). */
export const MAPS_DATA_DATE = '2026-10-04';

/** Repo sumber aset peta. */
export const MAPS_REPO = 'Aruthtale/Arplication';

/** Ukuran file maksimum yang diizinkan diunduh (guard sanity, 2 GB). */
export const MAX_REGION_BYTES = 2 * 1024 * 1024 * 1024;

/** Ukuran minimum file .pmtiles yang valid (header PMTiles ~16 KB). */
export const MIN_PMTILES_BYTES = 127;

/**
 * Katalog wilayah siap-pilih. `file` = nama aset di GitHub Release.
 * `bbox` = [minLon, minLat, maxLon, maxLat].
 * `maxzoom` mempengaruhi ukuran file.
 */
export const REGION_CATALOG = [
  {
    id: 'jabodetabek',
    name: 'Jabodetabek',
    description: 'Jakarta, Bogor, Depok, Tangerang, Bekasi',
    bbox: [106.35, -6.75, 107.15, -6.05],
    maxzoom: 14,
    sizeBytes: 37246093,
    file: 'jabodetabek.pmtiles',
  },
  {
    id: 'bandung',
    name: 'Bandung Raya',
    description: 'Kota & Kabupaten Bandung, Cimahi',
    bbox: [107.35, -7.10, 107.85, -6.70],
    maxzoom: 14,
    sizeBytes: 11758463,
    file: 'bandung.pmtiles',
  },
  {
    id: 'cianjur',
    name: 'Cianjur',
    description: 'Kabupaten Cianjur & sekitarnya',
    bbox: [106.85, -7.75, 107.45, -6.55],
    maxzoom: 14,
    sizeBytes: 13352975,
    file: 'cianjur.pmtiles',
  },
  {
    id: 'surabaya',
    name: 'Surabaya',
    description: 'Surabaya & sekitarnya (Gerbangkertosusila)',
    bbox: [112.45, -7.45, 112.95, -7.05],
    maxzoom: 14,
    sizeBytes: 8626352,
    file: 'surabaya.pmtiles',
  },
  {
    id: 'yogyakarta',
    name: 'Yogyakarta',
    description: 'Kota Yogyakarta & Sleman, Bantul',
    bbox: [110.15, -8.05, 110.65, -7.60],
    maxzoom: 14,
    sizeBytes: 12345754,
    file: 'yogyakarta.pmtiles',
  },
  {
    id: 'semarang',
    name: 'Semarang',
    description: 'Semarang & sekitarnya',
    bbox: [110.15, -7.20, 110.70, -6.80],
    maxzoom: 14,
    sizeBytes: 11923115,
    file: 'semarang.pmtiles',
  },
  {
    id: 'medan',
    name: 'Medan',
    description: 'Medan & sekitarnya',
    bbox: [98.45, 3.35, 98.90, 3.80],
    maxzoom: 14,
    sizeBytes: 7710040,
    file: 'medan.pmtiles',
  },
  {
    id: 'makassar',
    name: 'Makassar',
    description: 'Makassar & sekitarnya',
    bbox: [119.15, -5.35, 119.65, -4.95],
    maxzoom: 14,
    sizeBytes: 5688610,
    file: 'makassar.pmtiles',
  },
  {
    id: 'bali',
    name: 'Bali',
    description: 'Pulau Bali (Denpasar, Kuta, Ubud)',
    bbox: [114.85, -8.95, 115.65, -8.15],
    maxzoom: 14,
    sizeBytes: 12992440,
    file: 'bali.pmtiles',
  },
];

/** URL unduh aset untuk sebuah region (GitHub Release). */
export function buildRegionUrl(region, { tag = MAPS_RELEASE_TAG, repo = MAPS_REPO } = {}) {
  const file = region?.file || `${region?.id}.pmtiles`;
  return `https://github.com/${repo}/releases/download/${tag}/${file}`;
}

/** Cari region dari katalog berdasarkan id. */
export function findRegion(id) {
  return REGION_CATALOG.find((r) => r.id === id) || null;
}

/** Validasi id region (untuk mencegah path traversal saat dipakai sebagai nama file). */
export function isValidRegionId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id);
}

/** Nama file .pmtiles untuk sebuah region. */
export function regionFileName(id) {
  if (!isValidRegionId(id)) throw new Error(`ID wilayah tidak valid: ${id}`);
  return `${id}.pmtiles`;
}

/** Format byte ke string ringkas (KB/MB/GB). */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Format tanggal ISO ke teks Indonesia ringkas ("4 Okt 2026"). */
export function formatDataDate(iso) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso || '—');
  const [, y, mo, d] = m;
  const mi = Number(mo) - 1;
  if (mi < 0 || mi > 11) return String(iso);
  return `${Number(d)} ${MONTHS[mi]} ${y}`;
}

/**
 * Validasi header PMTiles dari 127 byte pertama.
 * Header PMTiles diawali magic "PMTiles" (7 byte) + versi.
 * @param {Uint8Array} bytes
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validatePmtilesHeader(bytes) {
  if (!bytes || bytes.length < 16) {
    return { ok: false, reason: 'File terlalu kecil untuk PMTiles.' };
  }
  const magic = 'PMTiles';
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic.charCodeAt(i)) {
      return { ok: false, reason: 'Header bukan format PMTiles.' };
    }
  }
  const version = bytes[7];
  if (version < 2 || version > 3) {
    return { ok: false, reason: `Versi PMTiles tidak dikenal (${version}).` };
  }
  return { ok: true };
}

/**
 * Perkirakan ukuran unduhan untuk sebuah bbox+maxzoom (kasar).
 * Dipakai sebagai petunjuk di UI, bukan janji pasti.
 * @returns {number} byte (0 bila tidak diketahui)
 */
export function estimateRegionBytes(bbox, maxzoom) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return 0;
  const [w, s, e, n] = bbox.map(Number);
  if ([w, s, e, n].some((v) => !Number.isFinite(v))) return 0;
  // Luas (derajat persegi), di-clamp ke nilai wajar.
  const area = Math.max(0, (e - w)) * Math.max(0, (n - s));
  // Empiris: Jabodetabek (~0.53 deg², zoom 14) ≈ 37 MB → ~70 MB per deg².
  const base = area * 70 * 1024 * 1024;
  const zoomFactor = Math.pow(1.35, Math.max(0, Number(maxzoom) - 14));
  return Math.round(base * zoomFactor);
}

/** Ambil semua region katalog (salinan). */
export function listCatalog() {
  return REGION_CATALOG.map((r) => ({ ...r }));
}
