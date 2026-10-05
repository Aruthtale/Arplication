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

### ⚠️ JEBAKAN KRITIS #2 — Worker MapLibre 404 di bawah bundler (terbukti runtime)

Saat uji runtime dengan Vite, peta **tidak render**: `styleLoaded` tetap
`false`, event `load`/`idle` tidak pernah menyala, walau Blob PMTiles sudah
terdaftar (`source.loaded=true`, `hasTile=true`).

**Penyebab:** MapLibre menebak URL worker dari `import.meta.url` →
`new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Di prototipe kita
mengimpor `dist/maplibre-gl.mjs` langsung (worker ketemu). Lewat bundler,
module hidup di `.vite/deps/` sehingga worker **404** →
`Error: Worker failed to load`. Peta butuh worker untuk memproses tile, jadi
tanpa worker = canvas kosong. Ini pola *bundler blind spot*.

**Solusi (terbukti):** host worker sendiri + arahkan MapLibre ke sana:
1. Salin `maplibre-gl-worker.mjs` **dan** `maplibre-gl-shared.mjs` (worker
   mengimpor yang kedua) ke `public/armaps/maplibre/`.
2. Panggil `maplibregl.setWorkerUrl(new URL('armaps/maplibre/maplibre-gl-worker.mjs', location.href).href)`
   sekali sebelum membuat `Map`. Lihat `src/services/armaps/mapEngine.js`.

**Bukti:** setelah fix, `phase=idle`, `layers=9`, `canvas 1280×633`,
`permintaan jaringan non-lokal: 0`, `error: none`, dan peta Jabodetabek
tampil penuh (label Jakarta/Bekasi/Bogor/Depok/Bandung) — terverifikasi
lewat screenshot, bukan asumsi.

### ⚠️ JEBAKAN #3 — Uji di tab latar belakang = peta "macet" (jebakan harness)

MapLibre menunda pemuatan style lewat `requestAnimationFrame`
(`frameAsync`). Browser **men-throttle rAF di tab yang tidak aktif**
(terlihat: `document.hidden=true`, hanya 1 tick rAF dalam 2 detik), sehingga
style tidak pernah dimuat → `styleLoaded=false` selamanya, seolah ada bug.
**Ini artefak harness, bukan bug aplikasi.** Saat tab dibawa ke depan
(`Page.bringToFront`), rAF berjalan (241 tick/2 dtk) dan peta langsung
render. **Aturan uji:** selalu pastikan tab uji **aktif/foreground** sebelum
menyimpulkan peta gagal.

### ⚠️ JEBAKAN #4 — Peta stuck "Memuat peta…" di HP: sentinel `readFileInChunks` (terbukti di perangkat)

**Gejala (dilaporkan di HP asli):** setelah meng-install wilayah, membuka peta
hanya menampilkan "Memuat peta… Membaca berkas lokal…" **selamanya** — peta
tak pernah tampil, tanpa pesan error.

**Akar masalah:** `Filesystem.readFileInChunks` menandai **selesai** dengan
memanggil callback berisi **data kosong** `{ data: "" }` — lihat
`@capacitor/filesystem` `FilesystemPlugin.kt`:
`onCompletion { call.sendSuccess(createReadResultObject("")) }`.
Kode menunggu `chunk === null` (perilaku web) sehingga **promise tidak pernah
resolve** → pembacaan file menggantung → peta stuck "memuat".

**Solusi:** perlakukan **`null` MAUPUN data kosong** sebagai penanda selesai.
Diimplementasikan sebagai helper murni `interpretChunk()` di `regionStore.js`,
dipakai di ketiga tempat (`readRegionBlob`, `verifyRegionFile`,
`verifyFileHeaderAt`). Guard tes: `tests/armaps.test.js` (terbukti gagal bila
helper dikembalikan ke cek `null` saja).

**Pelajaran:** jangan asumsi kontrak callback plugin native sama dengan web —
**baca sumber platform** (`node_modules/@capacitor/*/android/.../*.kt`).

### ⚠️ JEBAKAN #5 — GPS gagal walau GPS HP menyala: `cap copy` ≠ `cap sync` (terbukti di perangkat)

**Gejala (dilaporkan di HP asli):** GPS HP sudah dinyalakan, tapi ArMaps tetap
menampilkan "Gagal membaca GPS. Pastikan GPS HP menyala, lalu coba lagi."

**Akar masalah:** `@capacitor/geolocation` ada di `node_modules` dan dipanggil
dari JS, **tapi tidak terdaftar** di `android/capacitor.settings.gradle` /
`android/app/capacitor.build.gradle` → plugin native-nya **tidak masuk APK**.
Penyebab: script `build` memakai `cap copy android` (hanya menyalin aset web),
**bukan** `cap sync android` (mendaftarkan plugin native).

**Solusi:** ubah `package.json` `build` → `vite build && cap sync android`;
plugin geolocation kini terdaftar. Bukti verifikasi di APK:
`unzip -p app-release.apk 'classes*.dex' | strings | grep -c GeolocationPlugin`
→ **0** di APK lama, **25** di APK baru. Guard tes: `tests/armaps.test.js`
("semua plugin Capacitor terdaftar di gradle Android", terbukti gagal bila
baris gradle dihapus).

**Pelajaran:** setiap kali menambah plugin Capacitor, build **wajib** `cap sync`
dan verifikasi **isi APK** (dex / `capacitor.plugins.json`) — build hijau +
log "Copying web assets" **bukan** bukti plugin native ikut terpasang.

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

---

## 8. Status Tahap 1 — ✅ SELESAI & DIRILIS (v1.6.0)

Modul ArMaps Tahap 1 sudah **diuji runtime nyata** dan **dirilis**:

- **Kode**: katalog (9 wilayah, tanpa default), unduh/perbarui/hapus
  (atomic swap), render Blob→FileSource, GPS "lokasi saya", pengaturan
  lokasi simpan, backup settings (indeks TIDAK ikut).
- **Uji runtime (bukan asumsi)**: kode asli `mapEngine.js` + `mapStyle.js`
  dirender di dev **dan** artifact produksi ter-bundle → `phase=idle`,
  `layers=9`, `styleLoaded=true`, **0 permintaan jaringan non-lokal**,
  peta Jabodetabek tampil penuh (Jakarta/Bekasi/Bogor/Depok/Bandung/Cianjur).
- **Bug ditemukan & diperbaiki saat uji**: worker MapLibre 404 di bawah
  bundler (lihat JEBAKAN #2) — tanpa fix ini peta kosong walau semua tes hijau.
- **Aset rilis `maps-20261004`**: 9 file `.pmtiles` (±117 MB) terunggah,
  terverifikasi HTTP 206 (Range), header PMTiles valid, **sha256 cocok**.
- **Rilis v1.6.0**: APK 50 MB di GitHub Release (Aruthtale + Zenixu),
  versionCode 38, worker + font ter-bundel di dalam APK (diverifikasi).
- **Uji perangkat nyata (HP) menemukan 2 bug → fix v1.6.1** (lihat JEBAKAN #4 & #5):
  1. Peta stuck "Memuat peta…" — sentinel `readFileInChunks` native = `{data:''}`,
     bukan `null` (promise menggantung).
  2. GPS selalu gagal — plugin `@capacitor/geolocation` tak terdaftar di gradle
     karena build memakai `cap copy`, bukan `cap sync`.
  - **Rilis v1.6.1**: versionCode 39, APK 15 MB (APK v1.6.0 tanpa sengaja
    memuat file uji 37 MB), **192 tes lulus** (termasuk 2 guard baru yang
    terbukti gagal bila fix dibalik). Diverifikasi di APK: `GeolocationPlugin`
    25 ref (v1.6.0 = 0) + kode fix peta ter-bundle.

**Sisa (Tahap 2+)**: indeks pencarian POI per wilayah, navigasi rute.
