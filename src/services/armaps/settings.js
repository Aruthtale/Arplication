/**
 * ArMaps — Pengaturan penyimpanan peta (PURE + storage helpers).
 *
 * Pengguna memilih lokasi penyimpanan file peta saat mengunduh:
 *   - 'internal' → Directory.Data (pribadi app, ikut terhapus saat uninstall)
 *   - 'external' → Directory.ExternalStorage (folder Download, terlihat di
 *                  File Manager, tetap ada walau app di-uninstall)
 *
 * Modul ini TIDAK mengimpor Capacitor agar bisa diuji di Node. Pemetaan ke
 * enum Directory dilakukan di layer storage (regionStore).
 */

export const ARMaps_SETTINGS_KEY = 'armaps_settings_v1';

/** Lokasi penyimpanan yang didukung. */
export const STORAGE_LOCATIONS = [
  {
    id: 'internal',
    label: 'Internal (pribadi app)',
    hint: 'Selalu bisa diakses. Ikut terhapus bila aplikasi di-uninstall.',
  },
  {
    id: 'external',
    label: 'Eksternal (folder Download)',
    hint: 'Terlihat di File Manager & tetap ada setelah uninstall.',
  },
];

export const DEFAULT_SETTINGS = {
  storageLocation: 'internal', // 'internal' | 'external'
  lastOpenedRegion: null,      // id wilayah terakhir dibuka (opsional)
  showLabels: true,            // tampilkan label nama tempat
};

/** Normalisasi objek pengaturan (murni). */
export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const loc = STORAGE_LOCATIONS.some((l) => l.id === s.storageLocation)
    ? s.storageLocation
    : DEFAULT_SETTINGS.storageLocation;
  return {
    storageLocation: loc,
    lastOpenedRegion: typeof s.lastOpenedRegion === 'string' ? s.lastOpenedRegion : null,
    showLabels: s.showLabels !== false,
  };
}

/** Baca pengaturan dari localStorage (aman bila tidak ada). */
export function loadSettings() {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    const raw = localStorage.getItem(ARMaps_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Simpan pengaturan (merge parsial). */
export function saveSettings(patch) {
  const merged = normalizeSettings({ ...loadSettings(), ...(patch || {}) });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ARMaps_SETTINGS_KEY, JSON.stringify(merged));
    }
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
  return merged;
}

/** Label lokasi untuk ditampilkan di UI. */
export function storageLocationLabel(id) {
  return STORAGE_LOCATIONS.find((l) => l.id === id)?.label || id;
}
