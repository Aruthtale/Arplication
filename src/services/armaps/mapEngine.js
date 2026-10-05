/**
 * ArMaps — Mesin peta (MapLibre + PMTiles), 100% offline.
 *
 * Strategi kritis (lihat docs/ARCMAPS-PLAN.md §7):
 *   File .pmtiles dibaca sebagai BLOB (dari Capacitor Filesystem), lalu
 *   dibungkus File → FileSource. Ini MENGHINDARI bug HTTP Range di WebView
 *   Android (Capacitor 7.x) yang membuat tile rusak/kosong.
 *
 * MapLibre & PMTiles dimuat dinamis (dynamic import) supaya tidak membebani
 * bundle awal aplikasi.
 */

let protocolRegistered = false;
let maplibreglRef = null;
let pmtilesRef = null;
let workerConfigured = false;

/**
 * Path worker MapLibre yang di-host sendiri (lihat public/armaps/maplibre/).
 * WAJIB: tanpa ini, MapLibre menebak URL worker dari import.meta.url, yang
 * GAGAL saat di-bundle Vite (module ada di .vite/deps/) → worker 404 →
 * `styleLoaded` tidak pernah true → PETA TIDAK RENDER. Jebakan "bundler
 * blind spot" ini terbukti saat uji runtime.
 */
export const MAPLIBRE_WORKER_PATH = 'armaps/maplibre/maplibre-gl-worker.mjs';

/** Konfigurasi URL worker MapLibre (sekali saja). */
function configureWorker(maplibregl) {
  if (workerConfigured) return;
  try {
    if (typeof maplibregl.setWorkerUrl === 'function' && typeof location !== 'undefined') {
      const url = new URL(MAPLIBRE_WORKER_PATH, location.href).href;
      maplibregl.setWorkerUrl(url);
      workerConfigured = true;
    }
  } catch {
    /* biarkan MapLibre memakai default (mode web dev langsung) */
  }
}

/** Muat MapLibre + PMTiles sekali saja. */
export async function loadMapLibs() {
  if (!maplibreglRef) {
    const maplibre = await import('maplibre-gl');
    // MapLibre ESM tidak selalu punya default export → pakai namespace.
    maplibreglRef = maplibre.default || maplibre;
    configureWorker(maplibreglRef);
    await import('maplibre-gl/dist/maplibre-gl.css');
  }
  if (!pmtilesRef) {
    pmtilesRef = await import('pmtiles');
  }
  return { maplibregl: maplibreglRef, pmtiles: pmtilesRef };
}

/**
 * Daftarkan protokol `pmtiles://` ke MapLibre (sekali saja).
 * @returns {Promise<{ maplibregl:any, Protocol:any }>}
 */
export async function ensurePmtilesProtocol() {
  const { maplibregl, pmtiles } = await loadMapLibs();
  if (!protocolRegistered) {
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    protocolRegistered = true;
    // Simpan agar bisa diakses pemanggil bila perlu.
    globalThis.__armapsProtocol = protocol;
  }
  return { maplibregl, Protocol: pmtiles.Protocol, protocol: globalThis.__armapsProtocol };
}

/**
 * Daftarkan sebuah Blob PMTiles ke protokol & kembalikan key-nya.
 * @param {Blob} blob
 * @param {string} name
 * @returns {Promise<{ key: string, header: Object }>}
 */
export async function registerBlobSource(blob, name = 'region.pmtiles') {
  const { Protocol, protocol } = await ensurePmtilesProtocol();
  const { FileSource, PMTiles } = pmtilesRef;
  const file = new File([blob], name, { type: 'application/octet-stream' });
  const source = new FileSource(file);
  const pm = new PMTiles(source);
  protocol.add(pm);
  const key = source.getKey();
  let header = null;
  try {
    header = await pm.getHeader();
  } catch {
    header = null;
  }
  return { key, header };
}

/** Ambil namespace MapLibre (tanpa default-export palsu). */
export async function getMapLibre() {
  const { maplibregl } = await loadMapLibs();
  return maplibregl;
}

/** Lepas sumber PMTiles dari protokol (hemat memori saat keluar peta). */
export function unregisterBlobSource(key) {
  try {
    const protocol = globalThis.__armapsProtocol;
    if (protocol && typeof protocol.remove === 'function') protocol.remove(key);
  } catch {
    /* abaikan */
  }
}

/**
 * Buat instance peta MapLibre.
 * @param {HTMLElement} container
 * @param {Object} style  hasil buildMapStyle()
 * @param {Object} [opts]  { center, zoom }
 * @returns {Promise<any>} map
 */
export async function createMap(container, style, { center = [106.8272, -6.1751], zoom = 11, minZoom = 1, maxZoom = 16 } = {}) {
  const { maplibregl } = await loadMapLibs();
  const map = new maplibregl.Map({
    container,
    style,
    center,
    zoom,
    minZoom,
    maxZoom,
    attributionControl: { compact: true },
    // Peta offline: tidak perlu sumber daya eksternal.
    transformRequest: (url) => {
      // Blokir permintaan jaringan http(s) — hanya izinkan lokal & pmtiles.
      if (/^https?:\/\//i.test(url) && !url.startsWith(location.origin)) {
        return null;
      }
      return { url };
    },
  });
  return map;
}

/** Hitung pusat + zoom awal dari bbox [w,s,e,n]. */
export function bboxToCenter(bbox, { padding = 0.9 } = {}) {
  if (!Array.isArray(bbox) || bbox.length !== 4) {
    return { center: [106.8272, -6.1751], zoom: 11 };
  }
  const [w, s, e, n] = bbox.map(Number);
  const center = [(w + e) / 2, (s + n) / 2];
  // Perkiraan zoom dari lebar bbox (kasar, cukup untuk titik awal).
  const span = Math.max(Math.abs(e - w), Math.abs(n - s)) * padding;
  let zoom = 12;
  if (span > 0.01) zoom = Math.log2(360 / span) - 1.2;
  zoom = Math.max(3, Math.min(14, zoom));
  return { center, zoom };
}
