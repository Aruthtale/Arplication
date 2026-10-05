#!/usr/bin/env node
/**
 * scripts/build-worker.mjs — Bangun worker MapLibre menjadi bundle SELF-CONTAINED.
 *
 * KENAPA (root cause "peta putih" / blank map di HP Android):
 *   File worker resmi `maplibre-gl-worker.mjs` dari npm adalah ES module yang
 *   meng-`import { ... } from "./maplibre-gl-shared.mjs"`. Di WebView Android
 *   (Capacitor) dua hal membuat ini MATI:
 *     1. Request yang diinisiasi WORKER tidak dilayani `shouldInterceptRequest`
 *        (cara Capacitor menyajikan aset lokal) → import sibling 404 di dalam
 *        worker → worker gagal di import pertama → tidak ada tile termuat.
 *     2. WebView lama tidak mendukung module worker → MapLibre jatuh ke classic
 *        worker atas file `.mjs` yang berisi `import` →
 *        `SyntaxError: Cannot use import statement outside a module`.
 *   Gejala: peta "memuat…" lalu blank, canvas transparan, TANPA error di konsol
 *   page (error terjadi di dalam worker). `styleLoaded` bisa true tapi tak ada
 *   satu pun tile yang digambar.
 *
 * SOLUSI: bundel worker + shared-nya jadi SATU file IIFE (tanpa import/export),
 *   lalu tulis ke public/armaps/maplibre/maplibre-gl-worker.mjs. Worker jadi
 *   bebas dari mode kegagalan "worker fails on its first import".
 *
 * Dijalankan otomatis oleh `npm run build` (lihat package.json).
 */
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRY = path.join(ROOT, 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs');
const OUT_DIR = path.join(ROOT, 'public/armaps/maplibre');
const OUT_FILE = path.join(OUT_DIR, 'maplibre-gl-worker.mjs');
const TMP = path.join(ROOT, 'node_modules/.cache/armaps-worker');

if (!fs.existsSync(ENTRY)) {
  console.error(`✘ Sumber worker tidak ditemukan: ${ENTRY}`);
  console.error('  Jalankan "npm install" dulu.');
  process.exit(1);
}

fs.rmSync(TMP, { recursive: true, force: true });

await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    lib: {
      entry: ENTRY,
      formats: ['iife'],
      name: 'MapLibreWorker',
      fileName: () => 'worker.js',
    },
    outDir: TMP,
    emptyOutDir: true,
    minify: true,
    target: 'es2020',
  },
});

const src = fs.readFileSync(path.join(TMP, 'worker.js'), 'utf8');

// ── Guard: bundle HARUS benar-benar self-contained ───────────────────────────
// Kalau ini gagal, JANGAN tulis file rusak ke public/ — lebih baik build gagal
// terang-terangan daripada diam-diam mengirim worker yang tak bisa jalan.
const hasImport = /(^|\n)\s*import[\s{("'*]/.test(src);
const hasExport = /(^|\n)\s*export[\s{]/.test(src);
const hasImportMeta = /import\.meta/.test(src);
const importsShared = /from\s*["'`]\.\/maplibre-gl-shared/.test(src);

if (hasImport || hasExport || hasImportMeta || importsShared) {
  console.error('✘ Hasil bundle masih memuat import/export/import.meta — worker akan GAGAL di WebView.');
  console.error({ hasImport, hasExport, hasImportMeta, importsShared });
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, src);
fs.rmSync(TMP, { recursive: true, force: true });

console.log(
  `✔ Worker self-contained: ${path.relative(ROOT, OUT_FILE)} (${src.length} byte, tanpa import/export)`,
);
