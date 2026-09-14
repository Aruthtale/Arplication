# Changelog — Arplication

Semua perubahan penting pada proyek ini didokumentasikan di berkas ini.

Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
