# Rencana: Modul Peta Offline — **ArMaps** (Arplication)

> Status: **RENCANA + PROTOTIPE** (belum diintegrasikan ke aplikasi)
> Tanggal: 2026-10-06
> Ringkasan: peta offline berbasis OpenStreetMap, mirip Google Maps **untuk peta
> dasar, pencarian, GPS, & rute** — TANPA satelit/Street View/macet live.

---

## 1. Kenyataan yang harus diterima (jangan dijanjikan berlebihan)

| Lapisan | Bisa offline? | Catatan |
|---|---|---|
| Peta dasar (jalan, nama, batas, sungai) | ✅ Ya | Inti fitur |
| Lokasi saya (titik GPS) | ✅ Ya | GPS HP, tanpa kuota |
| Cari tempat (kota/POI) | ✅ Bisa | Perlu index (ukurannya besar) |
| Rute belok-belok | ⚠️ Berat | Mesin routing + graph per wilayah |
| Citra satelit | ❌ Tidak praktis | Puluhan–ratusan GB |
| Street View | ❌ Tidak | Milik Google, dilarang |
| Lalu lintas / macet live | ❌ **Mustahil** | Butuh server online |

**Kesimpulan jujur:** peta offline = **"snapshot terbaru saat diunduh"**, BUKAN live.
Data OSM diperbarui **harian** (Protomaps/Geofabrik), jadi "terbaru" = tanggal unduh.

---

## 2. Ukuran data (angka nyata)

- Planet penuh (Protomaps PMTiles): **~107–120 GB** → mustahil di HP.
- Indonesia (OSM mentah, Geofabrik): total **~1,6 GB**
  - Jawa 854 MB • Sumatra 269 MB • Nusa Tenggara 165 MB • Sulawesi 150 MB
  - Kalimantan 140 MB • Papua 34 MB • Maluku 25 MB
- **Strategi: unduh per-wilayah (bbox), bukan seluruh negara.**
  Satu kota (mis. Jabodetabek, zoom ≤14) = **puluhan MB**. Bisa diperluas zoom
  lebih tinggi (≤16–17) bila butuh detail jalan kecil.

---

## 3. Lisensi

- **OpenStreetMap (ODbL)**: bebas dipakai, **wajib** cantumkan
  "© OpenStreetMap contributors".
- **Google Maps**: **DILARANG** cache/simpan tile (melanggar ToS). Tidak bisa
  dipakai untuk offline. Bangun di atas OSM.

---

## 4. Arsitektur (Capacitor 7 + React 19 + Vite)

| Komponen | Teknologi | Status |
|---|---|---|
| Mesin render peta | **MapLibre GL JS** (WebGL, gratis) | Perlu ditambah |
| Format offline | **PMTiles** (1 file) / MBTiles | Prototipe sudah dibuat |
| Baca file lokal di Android | Plugin `maplibre-gl-capacitor-offline` / fetch via `Capacitor Filesystem` | Riset lanjut |
| Simpan file wilayah | **Capacitor Filesystem** (`Directory.Data`) | Sudah dipakai Arloader |
| Lokasi saya | **Capacitor Geolocation** + GPS HP | Perlu ditambah |
| Pencarian tempat | Index SQLite offline (Pelias/Osmunda) | Tahap 2 |
| Routing | GraphHopper / Valhalla | Tahap 3 (berat) |
| Sumber data | Protomaps `build.protomaps.com/<tanggal>.pmtiles` | Terverifikasi |

### Struktur file wilayah (usulan)
```
<Directory.Data>/armaps/
  jabodetabek.pmtiles
  bandung.pmtiles
  index.json     # daftar wilayah + tanggal data + ukuran
```

---

## 5. Tahapan

### Tahap 1 — MVP "peta offline yang berguna" (TARGET PROTOTIPE INI)
- [x] Ekstrak 1 wilayah (Jabodetabek) → `jabodetabek.pmtiles` (terbukti)
- [x] Render offline dengan MapLibre GL + protokol `pmtiles://` (terbukti)
- [ ] Lokasi saya (GPS) + tombol "ke lokasi"
- [ ] UI: pilih & unduh wilayah, daftar wilayah tersimpan, hapus
- [ ] Tampilkan tanggal data ("Data OSM: 4 Okt 2026") + tombol "Perbarui"
- [ ] Penanda/pin simpan sendiri (localStorage/IndexedDB)

### Tahap 2 — Pencarian tempat offline
- Index nama kota/POI per wilayah (SQLite). Country-wide bisa ratusan MB.

### Tahap 3 — Navigasi rute
- GraphHopper/Valhalla offline. Graph per wilayah ratusan MB. Proyek besar.

---

## 6. Verifikasi prototipe (bukti, bukan asumsi)

1. `pmtiles extract ... --bbox=106.35,-6.75,107.15,-6.05 --maxzoom=14`
   → file `.pmtiles` jadi.
2. `pmtiles show jabodetabek.pmtiles` → tampilkan jumlah tile & bounds.
3. Serve file lokal + MapLibre GL → render peta.
4. **Bukti offline**: tile diambil dari file lokal, bukan jaringan
   (matikan akses jaringan / cek tidak ada request ke host tile).

### ✅ HASIL VERIFIKASI (2026-10-06) — PROTOTIPE BERHASIL

Prototipe di `/tmp/arcmaps-proto/` **terbukti render peta Jabodetabek
100% offline**:

- **Data**: `jabodetabek.pmtiles` — 37 MB, **1.672 tile**, bbox
  106.35,-6.75 → 107.15,-6.05, maxzoom 14, data OSM **4 Okt 2026**.
- **Render**: MapLibre GL 6.12 + `pmtiles` 4.5, protokol `pmtiles://`
  membaca tile dari **file lokal**. Tampil jalan, laut, sungai, dan label
  (Jakarta, Bekasi, Tangerang, Depok, Bogor, Menteng, Tebet, …).
- **Uji offline sejati**: semua host internet **diblokir** (CDP
  `Network.setBlockedURLs`, `https://*/*`), peta **tetap tampil penuh**;
  `Request jaringan non-lokal: 0`; **0 warning glyph** (font lokal).
- **Atribusi**: `© OpenStreetMap` tampil (wajib, ODbL).

### Jebakan yang ditemukan (penting untuk implementasi Android nanti)

1. **Byte serving wajib**: `python3 -m http.server` **tidak** mendukung
   HTTP Range → PMTiles gagal ("storage backend supports HTTP Byte
   Serving"). Server harus mendukung **HTTP 206 Partial Content**.
   → Di Android, baca file via `Capacitor Filesystem` / plugin WebView
   yang mendukung Range, jangan server statis naif.
2. **Import ESM**: `maplibre-gl.mjs` **tidak punya default export**
   → pakai `import * as maplibregl`. `pmtiles` ESM butuh bare specifier
   `fflate` → pasang **import map**.
3. **Glyph/font label**: template `glyphs` default menunjuk URL online
   (`protomaps.github.io`). Harus **dilokal-kan** (`./fonts/{fontstack}/{range}.pbf`)
   + `text-font: ['Noto Sans Regular']` agar benar-benar nol jaringan.
   Fontstack yang tersedia: **Noto Sans Regular** (bukan "Open Sans").

### File prototipe
```
/tmp/arcmaps-proto/
  index.html          # peta offline (MapLibre + pmtiles + import map)
  range_server.py     # server statis dgn HTTP Range (byte serving)
  jabodetabek.pmtiles # 37 MB, data OSM 2026-10-04
  fonts/Noto Sans Regular/*.pbf  # glyph label (offline)
  node_modules/       # maplibre-gl 6.12, pmtiles 4.5, fflate
```
