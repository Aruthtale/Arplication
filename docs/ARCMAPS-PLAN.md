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
- [x] Render offline dengan MapLibre GL + `FileSource` dari Blob (terbukti)
- [x] Ekstrak **8 wilayah** (jabodetabek, bandung, surabaya, yogyakarta,
      semarang, medan, makassar, bali) → total ≈ 105 MB (maxzoom 14,
      data OSM 2026-10-04). **Belum di-hosting.**
- [~] **Pilih wilayah**: katalog siap-pilih (8 wilayah) — UI jadi, tes hijau.
      Opsi "gambar kotak sendiri" menyusul (Tahap 1.5).
- [~] **Unduh** wilayah (dari GitHub Releases) → simpan ke storage pilihan user
      — kode jadi (atomic swap, Blob, verifikasi header). **Belum diuji
      end-to-end** karena aset belum di-upload ke Release.
- [~] **Hapus** wilayah — kode jadi + konfirmasi. Belum diuji di perangkat.
- [~] **Perbarui** wilayah — **atomic swap** (unduh `.tmp` → verifikasi →
      ganti). Kode jadi. Belum diuji di perangkat. Lihat §7.
- [~] Lokasi saya (GPS) + tombol "ke lokasi" — kode jadi
      (`@capacitor/geolocation`). Belum diuji di perangkat nyata.
- [x] Tampilkan tanggal data ("Data OSM: 4 Okt 2026")
- [ ] Penanda/pin simpan sendiri (localStorage/IndexedDB) — Tahap 1.5

> **Status jujur (2026-10-06):** semua kode Tahap 1 sudah ditulis di branch
> `feat/armaps`; **186 tes lulus** & **build produksi hijau**, tapi alur
> runtime (unduh → render → GPS) **belum diuji** — baik di browser maupun di
> HP Android asli — karena (a) file `.pmtiles` belum di-hosting ke GitHub
> Release, dan (b) solusi Blob/FileSource baru terbukti di prototipe desktop.
> Jangan anggap "selesai" sebelum uji runtime nyata.

### Tahap 2 — Pencarian tempat offline
- Index nama kota/POI per wilayah (SQLite). Country-wide bisa ratusan MB.

### Tahap 3 — Navigasi rute
- GraphHopper/Valhalla offline. Graph per wilayah ratusan MB. Proyek besar.

---

## 7. Keputusan desain (dipilih pengguna)

| Aspek | Keputusan |
|---|---|
| Cara pilih wilayah | **Katalog siap-pilih + opsi gambar kotak sendiri** |
| Lokasi simpan file | **Pengguna pilih saat mengunduh** (internal/external) |
| Detail default | **Zoom 14** (Jabodetabek ≈ 37 MB) |
| Hosting file wilayah | **GitHub Releases** (gratis) |

### Aturan "ringan & hemat memori" (WAJIB dipatuhi)

1. **Atomic update (jangan tabrak/hapus dulu)**:
   `unduh ke <nama>.tmp` → cek utuh (header PMTiles valid + ukuran) →
   baru `hapus lama` → `rename .tmp → final`. Gagal di tengah = peta lama
   aman; berhasil = tidak menumpuk. Kekurangan: butuh ruang **2× sesaat**.
2. **File peta disimpan di storage**, **bukan** di dalam bundle APK
   → ukuran aplikasi tetap kecil.
3. **Hanya 1 peta dimuat ke memori** pada satu waktu (jangan buka banyak
   PMTiles sekaligus). PMTiles sudah hemat: dibaca per-tile dari Blob.
4. **`index.json` kecil** berisi daftar wilayah: nama, tanggal data, ukuran,
   path. Dipakai untuk daftar/unduh/hapus tanpa memuat file peta.
5. **Deteksi ruang kosong sebelum unduh**; tolak bila tidak cukup
   (butuh ≥ 2× ukuran file untuk swap).

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

1. **⚠️ KRITIS — JANGAN andalkan HTTP Range di WebView Android.**
   `@capacitor/android` 7.6.9 punya **bug Range request** yang persis
   mematahkan PMTiles (issue publik: #8371 "HTTP Range Responses not
   within spec"; terkait #8357/#8369/#8418). Di
   `WebViewLocalServer.handleLocalRequest()` cabang `Range`:
   - **tidak** memanggil `skip()` → stream dikirim **dari byte 0**, padahal
     header `Content-Range` menyebut offset lain → **data meleset**;
   - **tidak** memotong stream di ujung range → `Content-Length` bohong.
   PMTiles **membaca header untuk tahu berapa byte diterima**, jadi ini
   bikin peta rusak/kosong.
   **SOLUSI YANG TERBUKTI (diuji)**: **jangan pakai Range** — muat file
   `.pmtiles` sebagai **Blob** (via `Capacitor Filesystem.readFile` atau
   `fetch` file lokal), bungkus jadi `File`, lalu pakai **`FileSource`**
   dari `pmtiles` (bukan `FetchSource`). Di prototipe: peta Jakarta
   ter-render **penuh** dari Blob, **0 request jaringan**, kualitas identik.
   Ini menghindari seluruh jalur bug Capacitor.
2. **Byte serving di server dev**: `python3 -m http.server` **tidak**
   mendukung HTTP Range → PMTiles gagal ("storage backend supports HTTP
   Byte Serving"). Untuk uji di desktop, pakai server yang balas **206
   Partial Content** (lihat `range_server.py`). **Catatan**: di Android
   justru kita **tidak** mau lewat jalur Range ini (lihat poin 1).
3. **Import ESM**: `maplibre-gl.mjs` **tidak punya default export**
   → pakai `import * as maplibregl`. `pmtiles` ESM butuh bare specifier
   `fflate` → pasang **import map**.
4. **Glyph/font label**: template `glyphs` default menunjuk URL online
   (`protomaps.github.io`). Harus **dilokal-kan** (`./fonts/{fontstack}/{range}.pbf`)
   + `text-font: ['Noto Sans Regular']` agar benar-benar nol jaringan.
   Fontstack yang tersedia: **Noto Sans Regular** (bukan "Open Sans").

### 🔑 Keputusan arsitektur final (karena temuan #1)

**Baca PMTiles lewat `Capacitor Filesystem` → Blob → `FileSource`.**
Bukan lewat URL `pmtiles://` + HTTP server/WebView Range. Ini yang akan
dipakai di aplikasi, dan sudah terbukti jalan di prototipe
(`blobtest.html`).

### File prototipe
```
/tmp/arcmaps-proto/
  index.html          # prototipe awal (lewat HTTP Range — hanya utk dev)
  blobtest.html       # ✅ CARA YANG DIPAKAI: Blob + FileSource (tanpa Range)
  range_server.py     # server statis dgn HTTP Range (byte serving)
  jabodetabek.pmtiles # 37 MB, data OSM 2026-10-04
  fonts/Noto Sans Regular/*.pbf  # glyph label (offline)
  node_modules/       # maplibre-gl 6.12, pmtiles 4.5, fflate
```
