/**
 * ArMaps — Logika indeks wilayah terpasang (PURE, tanpa DOM/Capacitor).
 *
 * Indeks = catatan wilayah mana yang sudah diunduh, disimpan di localStorage
 * (kecil, hanya metadata). File peta berat disimpan di storage terpisah.
 *
 * Semua fungsi murni agar mudah diuji di Node.
 */

export const ARMaps_INDEX_KEY = 'armaps_index_v1';

/**
 * Bentuk indeks: { regions: { [id]: entry }, version: 1 }
 * entry: { id, file, sizeBytes, dataDate, installedAt, location, name }
 */

/** Buat indeks kosong. */
export function emptyIndex() {
  return { version: 1, regions: {} };
}

/** Normalisasi indeks dari JSON mentah (tahan data rusak). */
export function normalizeIndex(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.regions !== 'object' || raw.regions === null) {
    return emptyIndex();
  }
  const regions = {};
  for (const [id, entry] of Object.entries(raw.regions)) {
    if (!entry || typeof entry !== 'object') continue;
    if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) continue;
    regions[id] = {
      id,
      file: typeof entry.file === 'string' ? entry.file : `${id}.pmtiles`,
      sizeBytes: Number(entry.sizeBytes) || 0,
      dataDate: typeof entry.dataDate === 'string' ? entry.dataDate : '',
      installedAt: typeof entry.installedAt === 'string' ? entry.installedAt : '',
      location: entry.location === 'external' ? 'external' : 'internal',
      name: typeof entry.name === 'string' ? entry.name : id,
    };
  }
  return { version: 1, regions };
}

/** Bangun entry indeks untuk wilayah yang baru diunduh (murni). */
export function buildIndexEntry({ region, sizeBytes, location, dataDate, now }) {
  return {
    id: region.id,
    file: region.file || `${region.id}.pmtiles`,
    sizeBytes: Number(sizeBytes) || 0,
    dataDate: dataDate || '',
    installedAt: now || new Date().toISOString(),
    location: location === 'external' ? 'external' : 'internal',
    name: region.name || region.id,
  };
}

/** Tambah/ganti satu entry di indeks (murni, mengembalikan indeks baru). */
export function upsertIndex(index, entry) {
  const base = normalizeIndex(index);
  return {
    version: 1,
    regions: { ...base.regions, [entry.id]: { ...entry } },
  };
}

/** Hapus satu entry dari indeks (murni). */
export function removeIndexEntry(index, id) {
  const base = normalizeIndex(index);
  if (!base.regions[id]) return base;
  const regions = { ...base.regions };
  delete regions[id];
  return { version: 1, regions };
}

/** Apakah wilayah terpasang? */
export function isInstalled(index, id) {
  return Boolean(normalizeIndex(index).regions[id]);
}

/** Ambil entry wilayah atau null. */
export function getEntry(index, id) {
  return normalizeIndex(index).regions[id] || null;
}

/** Daftar entry wilayah terpasang sebagai array (urut nama). */
export function listInstalled(index) {
  return Object.values(normalizeIndex(index).regions).sort((a, b) =>
    String(a.name).localeCompare(String(b.name), 'id'),
  );
}

/** Total byte seluruh wilayah terpasang. */
export function totalInstalledBytes(index) {
  return listInstalled(index).reduce((sum, e) => sum + (Number(e.sizeBytes) || 0), 0);
}

/**
 * Tentukan apakah file hasil unduhan layak dipasang (menggantikan yang lama).
 * Murni — hanya keputusan, tanpa I/O.
 * @returns {{ swap: boolean, reason?: string }}
 */
export function shouldSwap({ downloadedBytes, minBytes = 1024 }) {
  if (!Number.isFinite(downloadedBytes) || downloadedBytes < minBytes) {
    return { swap: false, reason: 'File hasil unduhan terlalu kecil / rusak.' };
  }
  return { swap: true };
}

/** Baca indeks dari localStorage (aman). */
export function loadIndex() {
  try {
    if (typeof localStorage === 'undefined') return emptyIndex();
    const raw = localStorage.getItem(ARMaps_INDEX_KEY);
    if (!raw) return emptyIndex();
    return normalizeIndex(JSON.parse(raw));
  } catch {
    return emptyIndex();
  }
}

/** Tulis indeks ke localStorage. */
export function saveIndex(index) {
  const norm = normalizeIndex(index);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ARMaps_INDEX_KEY, JSON.stringify(norm));
    }
  } catch {
    /* abaikan */
  }
  return norm;
}
