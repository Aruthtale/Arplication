import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REGION_CATALOG,
  MAPS_RELEASE_TAG,
  MAPS_DATA_DATE,
  buildRegionUrl,
  findRegion,
  isValidRegionId,
  regionFileName,
  formatBytes,
  formatDataDate,
  validatePmtilesHeader,
  estimateRegionBytes,
  listCatalog,
} from '../src/services/armaps/catalog.js';

import {
  emptyIndex,
  normalizeIndex,
  buildIndexEntry,
  upsertIndex,
  removeIndexEntry,
  isInstalled,
  getEntry,
  listInstalled,
  totalInstalledBytes,
  shouldSwap,
} from '../src/services/armaps/regionIndex.js';

import {
  normalizeSettings,
  DEFAULT_SETTINGS,
  STORAGE_LOCATIONS,
  storageLocationLabel,
} from '../src/services/armaps/settings.js';

import { interpretChunk } from '../src/services/armaps/regionStore.js';

// ─────────────────── Kontrak readFileInChunks (bug runtime HP) ────────────────
// Bug nyata: peta stuck "Memuat peta…" di Android karena kode menunggu `null`
// sebagai penanda selesai, padahal native Android mengirim `{ data: "" }`
// (lihat FilesystemPlugin.kt). Tes ini mengunci kontrak tsb agar tak regresi.

test('interpretChunk: chunk akhir native {data:""} = SELESAI (bukan gantung)', () => {
  assert.equal(interpretChunk({ data: '' }).done, true);
  assert.equal(interpretChunk({ data: '' }).bytes, null);
});

test('interpretChunk: null/undefined juga = SELESAI (web/beberapa platform)', () => {
  assert.equal(interpretChunk(null).done, true);
  assert.equal(interpretChunk(undefined).done, true);
});

test('interpretChunk: chunk berisi data = lanjut, byte ter-decode benar', () => {
  const b64 = Buffer.from('PMTiles').toString('base64');
  const r = interpretChunk({ data: b64 });
  assert.equal(r.done, false);
  assert.equal(Buffer.from(r.bytes).toString(), 'PMTiles');
});

// ───────────────────────────── Katalog ─────────────────────────────

test('katalog: TIDAK ada wilayah default — daftar murni untuk dipilih pengguna', () => {
  const cat = listCatalog();
  assert.ok(cat.length >= 5, 'katalog harus punya beberapa wilayah');
  // Tidak ada flag "default" yang memaksa wilayah tertentu dipakai.
  assert.ok(!cat.some((r) => r.isDefault === true));
  // Setiap wilayah punya id unik + file .pmtiles
  const ids = new Set();
  for (const r of cat) {
    assert.ok(isValidRegionId(r.id), `id tidak valid: ${r.id}`);
    assert.ok(!ids.has(r.id), `id duplikat: ${r.id}`);
    ids.add(r.id);
    assert.match(r.file, /\.pmtiles$/);
    assert.equal(r.bbox.length, 4);
  }
});

test('katalog: Cianjur ada dengan ukuran nyata & bbox valid', () => {
  const c = findRegion('cianjur');
  assert.ok(c, 'Cianjur harus ada di katalog');
  assert.equal(c.file, 'cianjur.pmtiles');
  assert.equal(c.sizeBytes, 13352975);
  assert.equal(c.bbox.length, 4);
  assert.ok(c.sizeBytes > 0);
});

test('worker MapLibre: path stabil & file benar-benar ada di public/', async () => {
  const { MAPLIBRE_WORKER_PATH } = await import('../src/services/armaps/mapEngine.js');
  assert.equal(MAPLIBRE_WORKER_PATH, 'armaps/maplibre/maplibre-gl-worker.mjs');
  // Guard "bundler blind spot": worker HARUS ada di public/,
  // kalau tidak peta tidak akan render (worker 404).
  const { existsSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const base = fileURLToPath(new URL('../public/', import.meta.url));
  assert.ok(existsSync(base + MAPLIBRE_WORKER_PATH), 'worker MapLibre hilang di public/');
});

// ─────────────── Kontrak worker self-contained (bug "peta putih" HP) ──────────
// Bug nyata: worker resmi MapLibre adalah ES module yang meng-import
// "./maplibre-gl-shared.mjs". Di WebView Android, request yang diinisiasi worker
// tidak dilayani `shouldInterceptRequest` → import sibling 404 → worker gagal →
// peta blank TANPA error di konsol page. WebView lama juga jatuh ke classic
// worker atas file `.mjs` berisi `import` → "Cannot use import statement outside
// a module". FIX: worker wajib self-contained (tanpa import/export top-level).
// Tes ini mengunci kontrak itu: kalau ada yang menaruh worker ESM lagi, tes GAGAL.
test('worker MapLibre: SELF-CONTAINED (tanpa import/export/import.meta)', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const base = fileURLToPath(new URL('../public/', import.meta.url));
  const workerPath = base + 'armaps/maplibre/maplibre-gl-worker.mjs';
  assert.ok(existsSync(workerPath), 'worker MapLibre hilang di public/');

  const src = readFileSync(workerPath, 'utf8');
  assert.ok(!/(^|\n)\s*import[\s{("'*]/.test(src), 'worker memuat import top-level (ESM) — akan gagal di WebView Android');
  assert.ok(!/(^|\n)\s*export[\s{]/.test(src), 'worker memuat export top-level — bukan worker valid');
  assert.ok(!/import\.meta/.test(src), 'worker memuat import.meta — tidak didukung di classic worker');
  assert.ok(!/from\s*["'`]\.\/maplibre-gl-shared/.test(src), 'worker masih meng-import sibling shared.mjs — akan 404 di WebView');
  assert.ok(/self\.worker\s*=/.test(src) || /new\s+\w+\(self\)/.test(src), 'worker tidak punya bootstrap (self.worker)');
});

// ───────── Kontrak ukuran container peta (bug "peta putih" sebenarnya) ────────
// Bug nyata (terbukti di HP Redmi Note 8, WebView 153): container peta
// (`ref={containerRef}`) hanya diberi `absolute inset-0`. `maplibre-gl.css`
// di-import dinamis SETELAH Tailwind dan mendefinisikan
//   .maplibregl-map { position: relative }
// Spesifisitas sama dengan utilitas Tailwind `absolute`, tapi urutan file
// belakangan menang → `inset-0` (top/right/bottom/left) TIDAK berlaku lagi, dan
// karena canvas-nya `position:absolute` (tidak menyumbang tinggi), container
// kolaps jadi TINGGI 0. Peta sudah ter-render di canvas tapi tak terlihat sama
// sekali (layar tampak kosong berwarna latar app, TANPA error apa pun).
// FIX: beri ukuran eksplisit `w-full h-full` supaya container tetap terukur
// walau `position` ditimpa jadi relative.
// Tes ini mengunci kontrak tsb: container peta WAJIB punya h-full/w-full.
test('MapViewerView: container peta punya ukuran eksplisit (w-full h-full)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const base = fileURLToPath(new URL('..', import.meta.url));
  const src = readFileSync(base + 'src/components/modules/armaps/MapViewerView.jsx', 'utf8');

  // Temukan baris container peta (yang memakai ref={containerRef}).
  const line = src.split('\n').find((l) => /ref=\{containerRef\}/.test(l));
  assert.ok(line, 'tidak menemukan div container peta (ref={containerRef}) di MapViewerView.jsx');
  assert.ok(/\bh-full\b/.test(line), 'container peta TIDAK punya `h-full` — akan kolaps jadi tinggi 0 di WebView (maplibre-gl.css menimpa `absolute`)');
  assert.ok(/\bw-full\b/.test(line), 'container peta TIDAK punya `w-full` — ukuran tidak dijamin');
});

test('semua plugin Capacitor terdaftar di gradle Android (guard cap copy vs sync)', async () => {
  // Bug nyata: GPS gagal total di HP karena @capacitor/geolocation ada di
  // node_modules tapi TIDAK terdaftar di capacitor.settings.gradle /
  // capacitor.build.gradle — akibat `npm run build` memakai `cap copy`
  // (hanya salin aset web) alih-alih `cap sync` (daftarkan plugin native).
  // Guard ini memastikan setiap @capacitor/* (kecuali cli/android/core) punya
  // modul gradle-nya.
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const pkg = JSON.parse(readFileSync(root + 'package.json', 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const settings = readFileSync(root + 'android/capacitor.settings.gradle', 'utf8');
  const build = readFileSync(root + 'android/app/capacitor.build.gradle', 'utf8');

  const skip = new Set(['@capacitor/cli', '@capacitor/core', '@capacitor/android']);
  const plugins = Object.keys(deps).filter((k) => k.startsWith('@capacitor/') && !skip.has(k));
  assert.ok(plugins.includes('@capacitor/geolocation'), 'geolocation harus jadi dependensi');

  for (const p of plugins) {
    const mod = 'capacitor-' + p.replace('@capacitor/', '');
    assert.match(settings, new RegExp(`:${mod}'`), `${p} tidak ada di capacitor.settings.gradle`);
    assert.match(build, new RegExp(`:${mod}'`), `${p} tidak ada di capacitor.build.gradle`);
  }
});

test('buildRegionUrl menyusun URL GitHub Release dengan tag & file benar', () => {
  const jab = findRegion('jabodetabek');
  const url = buildRegionUrl(jab);
  assert.equal(
    url,
    `https://github.com/Aruthtale/Arplication/releases/download/${MAPS_RELEASE_TAG}/jabodetabek.pmtiles`,
  );
});

test('isValidRegionId menolak path traversal & karakter aneh', () => {
  assert.equal(isValidRegionId('jabodetabek'), true);
  assert.equal(isValidRegionId('bali-2'), true);
  assert.equal(isValidRegionId('../etc/passwd'), false);
  assert.equal(isValidRegionId('a/b'), false);
  assert.equal(isValidRegionId('Upper'), false);
  assert.equal(isValidRegionId(''), false);
  assert.equal(isValidRegionId('a'.repeat(70)), false);
});

test('regionFileName melempar untuk id tidak valid', () => {
  assert.equal(regionFileName('bali'), 'bali.pmtiles');
  assert.throws(() => regionFileName('../x'), /tidak valid/);
});

test('formatBytes & formatDataDate', () => {
  assert.equal(formatBytes(0), '—');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(37246093), '35.5 MB');
  assert.equal(formatDataDate('2026-10-04'), '4 Okt 2026');
  assert.equal(formatDataDate('bukan-tanggal'), 'bukan-tanggal');
});

test('validatePmtilesHeader menerima magic benar & menolak yang salah', () => {
  const good = new Uint8Array(20);
  'PMTiles'.split('').forEach((c, i) => { good[i] = c.charCodeAt(0); });
  good[7] = 3; // versi
  assert.equal(validatePmtilesHeader(good).ok, true);

  const bad = new Uint8Array(20);
  'NotTile'.split('').forEach((c, i) => { bad[i] = c.charCodeAt(0); });
  assert.equal(validatePmtilesHeader(bad).ok, false);

  assert.equal(validatePmtilesHeader(new Uint8Array(4)).ok, false);
  assert.equal(validatePmtilesHeader(null).ok, false);
});

test('estimateRegionBytes memberi nilai wajar & nol bila bbox invalid', () => {
  const est = estimateRegionBytes([106.35, -6.75, 107.15, -6.05], 14);
  assert.ok(est > 20 * 1024 * 1024 && est < 60 * 1024 * 1024, `estimasi aneh: ${est}`);
  assert.equal(estimateRegionBytes([1, 2], 14), 0);
  assert.equal(estimateRegionBytes(['a', 'b', 'c', 'd'], 14), 0);
});

// ───────────────────────────── Indeks ─────────────────────────────

test('normalizeIndex menolak data rusak & membersihkan entry', () => {
  assert.deepEqual(normalizeIndex(null), emptyIndex());
  assert.deepEqual(normalizeIndex({ regions: null }), emptyIndex());
  assert.deepEqual(normalizeIndex({ regions: 'x' }), emptyIndex());

  const cleaned = normalizeIndex({
    regions: {
      jabodetabek: { file: 'jabodetabek.pmtiles', sizeBytes: '123', location: 'external', name: 'Jabodetabek' },
      '../evil': { file: 'x' },        // id tidak valid → dibuang
      bad2: 'not-an-object',            // bukan objek → dibuang
    },
  });
  assert.ok(cleaned.regions.jabodetabek);
  assert.equal(cleaned.regions.jabodetabek.sizeBytes, 123);
  assert.equal(cleaned.regions.jabodetabek.location, 'external');
  assert.equal(cleaned.regions['../evil'], undefined);
  assert.equal(cleaned.regions.bad2, undefined);
});

test('upsert / remove / query indeks', () => {
  const jab = findRegion('jabodetabek');
  const entry = buildIndexEntry({
    region: jab,
    sizeBytes: 37246093,
    location: 'internal',
    dataDate: MAPS_DATA_DATE,
    now: '2026-10-06T00:00:00.000Z',
  });
  let idx = upsertIndex(emptyIndex(), entry);
  assert.equal(isInstalled(idx, 'jabodetabek'), true);
  assert.equal(getEntry(idx, 'jabodetabek').sizeBytes, 37246093);
  assert.equal(getEntry(idx, 'jabodetabek').installedAt, '2026-10-06T00:00:00.000Z');

  // upsert lagi (perbarui) tidak menggandakan
  const entry2 = buildIndexEntry({ region: jab, sizeBytes: 40000000, location: 'internal', now: '2026-10-07T00:00:00.000Z' });
  idx = upsertIndex(idx, entry2);
  assert.equal(listInstalled(idx).length, 1);
  assert.equal(getEntry(idx, 'jabodetabek').sizeBytes, 40000000);

  idx = removeIndexEntry(idx, 'jabodetabek');
  assert.equal(isInstalled(idx, 'jabodetabek'), false);
  assert.equal(listInstalled(idx).length, 0);
});

test('totalInstalledBytes menjumlahkan semua wilayah', () => {
  let idx = emptyIndex();
  idx = upsertIndex(idx, buildIndexEntry({ region: findRegion('jabodetabek'), sizeBytes: 37246093 }));
  idx = upsertIndex(idx, buildIndexEntry({ region: findRegion('bali'), sizeBytes: 12992440 }));
  assert.equal(totalInstalledBytes(idx), 37246093 + 12992440);
});

test('shouldSwap menolak berkas terlalu kecil (guard atomic swap)', () => {
  assert.equal(shouldSwap({ downloadedBytes: 37246093 }).swap, true);
  assert.equal(shouldSwap({ downloadedBytes: 10 }).swap, false);
  assert.equal(shouldSwap({ downloadedBytes: NaN }).swap, false);
});

// ───────────────────────────── Pengaturan ─────────────────────────────

test('normalizeSettings memakai default & menolak nilai tak dikenal', () => {
  assert.deepEqual(normalizeSettings(null), { ...DEFAULT_SETTINGS });
  assert.equal(normalizeSettings({ storageLocation: 'kiamat' }).storageLocation, 'internal');
  assert.equal(normalizeSettings({ storageLocation: 'external' }).storageLocation, 'external');
  assert.equal(normalizeSettings({ showLabels: false }).showLabels, false);
  assert.equal(normalizeSettings({ showLabels: 'ya' }).showLabels, true);
});

test('storageLocationLabel & daftar lokasi konsisten', () => {
  assert.equal(storageLocationLabel('internal'), STORAGE_LOCATIONS[0].label);
  assert.ok(STORAGE_LOCATIONS.some((l) => l.id === 'external'));
});
