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
  // Guard "bundler blind spot": worker + shared chunk HARUS ada di public/,
  // kalau tidak peta tidak akan render (worker 404).
  const { existsSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const base = fileURLToPath(new URL('../public/', import.meta.url));
  assert.ok(existsSync(base + MAPLIBRE_WORKER_PATH), 'worker MapLibre hilang di public/');
  assert.ok(
    existsSync(base + 'armaps/maplibre/maplibre-gl-shared.mjs'),
    'shared chunk MapLibre hilang di public/ (worker mengimpornya)',
  );
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
