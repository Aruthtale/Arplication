# Changelog — Arplication

Semua perubahan penting pada proyek ini didokumentasikan di berkas ini.

Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-09-24

### 🎉 New
- **ArMusic Homescreen Widget**:
  - Widget rumah gaya neobrutalisme dengan judul lagu, artis, album, dan indikator status (MEMUTAR / JEDA / OFFLINE).
  - Tombol putar/jeda, lagu berikutnya, dan lagu sebelumnya langsung dari layar utama — bahkan saat aplikasi tertutup.
  - Klik bodi widget membuka aplikasi langsung ke tab ArMusic (deep-link `OPEN_ARMUSIC`).
  - Sinkron otomatis dengan `ArMusicService`; state kembali ke OFFLINE saat antrean berhenti atau service dihentikan.
- **ArGame (Tahap 1)**: Modul permainan baru dengan Sudoku, plus integrasi logo ArToolbox ke HomeHub.

### 🐛 Fixed
- **Pengujian scrapers**: Fixture `resolveSubfolderPath` diperbarui agar konsisten dengan pemindahan folder unduhan ke `Aruthtale/`.

### 📦 Build
- **versionCode**: 29 → **30**
- **versionName**: "1.0.0" → **"1.1.0"**

---

## [1.0.0] - 2026-09-21

### ⚡ Enhanced
- **Mori Dual-Engine YouTube Converter**:
  - Mengadopsi arsitektur converter dual-engine dari coflyn/Mori (`ytmp3.mobi` & `convert1s / ytmp3.gg`).
  - Timeout konversi Cloudflare diperlonggar hingga 30s dengan auto-retry.
  - Menambahkan platform custom download headers (`Origin` & `Referer`) agar stream download YouTube tidak ditolak CDN.

### 📦 Build
- **versionCode**: 21 → **22**
- **versionName**: "0.2.20" → **"0.2.21"**

---

## [0.2.20] - 2026-09-17

### 🐛 Fixed
- **DNS / Dead Host Resolution Error**:
  - Menghapus host mati (`pipedapi.mha.fi`, `pipedapi.tokhmi.xyz`, `pipedapi.garudalinux.org`) dari failover list.
  - Memetakan error DNS/jaringan (`unable to resolve host`) ke pesan ramah bahasa Indonesia.

### 📦 Build
- **versionCode**: 20 → **21**
- **versionName**: "0.2.19" → **"0.2.20"**

---

## [0.2.19] - 2026-09-17

### 🐛 Fixed
- **Root-Cause Fix YouTube 410 Gone**:
  - ymcdn converter kini menunggu polling progress hingga selesai (`progress === 3`) sebelum mengunduh link stream.
  - Opsi unduh YouTube di-resolve on-demand secara real-time saat user menekan tombol download dengan status progress visual.
- **Notifikasi Menumpuk (Spam Notification Tray)**:
  - Notifikasi download error & complete kini menggunakan ID tetap (fixed ID) dan auto-cancel notifikasi lama sehingga tidak menumpuk di status bar Android.

### 📦 Build
- **versionCode**: 19 → **20**
- **versionName**: "0.2.18" → **"0.2.19"**

---

## [0.2.18] - 2026-09-17

### 🐛 Fixed
- **YouTube HTTP 410 (Gone) Stream Expiration**:
  - Implementasi lazy & on-demand resolver saat tombol download ditekan agar URL stream YouTube selalu fresh.
  - Penanganan auto-retry otomatis jika URL stream kadaluarsa saat proses download berlangsung.
  - Deteksi dan pesan error ramah pengguna untuk status `410 Gone`.

### ✨ Added
- **YT-DLP Self-Hosted Server Support**:
  - Dukungan koneksi server yt-dlp remote pribadi melalui menu Pengaturan Arloader.
  - Endpoint resolver & stream downloader cadangan via yt-dlp backend.

### 📦 Build
- **versionCode**: 18 → **19**
- **versionName**: "0.2.17" → **"0.2.18"**

---

## [0.2.10] - 2026-09-15

### 🐛 Fixed
- **Arloader Spotify "Upstream HTML block page"** — Resolver Spotify kini memberi pesan Indonesia yang jelas (anti-bot, saran unduh satu per satu) alih-alih error teknis mentah:
  - `isBotBlockError()` di `src/services/scrapers/youtube.js` kini mendeteksi pola halaman blokir (`HTML error/block page`, `upstream server returned`, Cloudflare `attention required` / `just a moment`, `LOGIN_REQUIRED`, HTTP 502/525)
  - `formatResolverError()` memetakan error blokir ke pesan "YouTube/Piped sedang memblokir permintaan otomatis… unduh track satu per satu"
  - `formatDownloadError()` di `src/utils/download.js` memetakan halaman blokir ke panduan anti-bot Indonesia
- **Prune daftar instance Piped mati** — `PIPED_API_INSTANCES` dipangkas dari 14 → 2 instance yang terverifikasi hidup via curl (HTTP 200 + JSON valid):
  - ✅ `pipedapi.ducks.party` (primary), ✅ `api.piped.private.coffee` (failover)
  - ❌ Dihapus: kavin.rocks (525), adminforge.de (403), leptons.xyz (502), reallyaweso.me (502), nosebs.ru / privacy.com.de / api.piped.yt / drgns.space / codespace.cz / darkness.services (DNS mati), owo.si (timeout), orangenet.cc (502)
  - Dampak: failover Spotify→YouTube audio kini ~2 percobaan alih-alih 14 timeout beruntun

### 🧪 Tests
- 3 regression test baru di `tests/scrapers.test.js` (total 50/50 pass, lint 0 errors):
  - `formatResolverError` memetakan HTML block page → pesan "memblokir" + "satu per satu"
  - `PIPED_API_INSTANCES` bebas dari 12 host mati yang diketahui
  - `formatDownloadError` memetakan HTML block page → panduan anti-bot

### 📦 Build
- **versionCode**: 11 → **12**
- **versionName**: "0.2.9" → **"0.2.10"**

---

## [0.2.7] - 2026-09-15

### ✨ Added
- **Notification Permission UI** — Cek dan request izin notifikasi langsung dari Settings card
- **Background Timer Persistence** — Timer tetap berjalan saat navigasi antar modul atau app di-minimize
- **Android Foreground Service** — Service khusus untuk keep-alive timer di background dengan sticky notification
- **Dedicated Notification Channel** — Channel `ardoro_timer` dengan importance tinggi dan explicit sound

### 🐛 Fixed
- **Timer Reset on Navigation** — State timer sekarang di-persist ke localStorage (`ardoro_timer_state_v1`)
- **Timer Dies on Minimize** — Android Foreground Service keep-alive timer saat app background
- **Missing Notification Check** — Status permission (AKTIF/NONAKTIF/DITOLAK) kini terlihat di Settings
- **Notification Sound Missing** — Channel dan notifikasi sekarang explicitly request system sound

### 📦 Build
- **versionCode**: 8 → **9**
- **versionName**: "0.2.6" → **"0.2.7"**

---

## [0.2.6] - 2026-09-14

### ✨ Added
- Auto-update flow dengan native APK installer
- ArNote Module dengan sticky & list widgets
- Arloader support untuk TikTok, Instagram, YouTube

---

## [0.2.5] - 2026-09-10

### ✨ Added
- Initial release of Ardoro Focus Engine
- WebAudio offline chime sounds
- Local statistics tracking (today + 7-day history)
