# Arplication

> **Modular Client-Side Utility Suite by Aruthtale**

Arplication is a high-performance, private, client-side personal utility platform designed for Web and Android. Built with React 19, Tailwind CSS v4, and CapacitorJS.

---

## 🚀 Integrated Modules

1. **Arloader** (Active Focus)
   - Universal media downloader for TikTok, YouTube, Instagram (Post/Reel/Story/Highlight), Spotify, X, and Pinterest.
   - Watermark-free HD video and high-bitrate MP3 audio extraction.
   - 100% on-device processing with hybrid CORS bypass.

2. **Ardoro** (Upcoming)
   - Minimalist Pomodoro focus technique companion with interval loops and ambient audio.

3. **ArNote** (Active)
   - Local-first notes with full-text search, file sync, and Android home-screen widgets (list + sticky note).

4. **Aruthtale**
   - Ecosystem overview, diagnostics, and developer documentation.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide Icons
- **Design System**: Neon Protocol (`#0C0E13` canvas, `#111319` surface, Mint `#05C46B`, Coral `#FF525E`)
- **Mobile Bridge**: CapacitorJS (`@capacitor/core`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/clipboard`, `@capacitor/share`)
- **Network Engine**: Hybrid native HTTP (CapacitorHttp on Android, fallback proxy on Web)

---

## 💻 Development Setup

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# In another terminal, start the local YouTube download service
npm run downloader

# Build for Web production
npm run build
```

### Local YouTube downloads

For local development, Arloader uses the `yt-dlp` and `ffmpeg` programs installed on your computer. Start `npm run downloader` before using a YouTube link; it only listens on `127.0.0.1:8787` and accepts HTTPS YouTube URLs. The Vite development server proxies browser requests to it, so both commands must remain running while downloading.

---

## 📱 Android Build with Capacitor

```bash
# Sync web build to Android native project (vite build + cap copy, otomatis)
npm run build

# Build APK release
cd android && ./gradlew :app:assembleRelease
```

> **Penting:** `npm run build` sudah menjalankan `cap copy android`, jadi APK selalu berisi web terbaru. Jangan hanya `vite build` — tanpa `cap copy`, APK akan memakai aset web lama.

---

## 🚀 Rilis Otomatis

Satu perintah untuk bump versi, build, commit, tag, push ke **semua remote**, dan membuat GitHub Release + upload APK di **setiap repo**:

```bash
scripts/release.sh patch     # 1.2.0 -> 1.2.1
scripts/release.sh minor     # 1.2.0 -> 1.3.0
scripts/release.sh major     # 1.2.0 -> 2.0.0
scripts/release.sh 1.5.0     # versi eksplisit
```

Yang otomatis diperbarui: `package.json`, `package-lock.json`, `src/services/updater.js` (`APP_VERSION`), `android/app/build.gradle` (`versionCode` +1, `versionName`), dan `CHANGELOG.md`.

Opsi berguna: `--dry-run` (lihat rencana), `--notes <file.md>` (catatan rilis kustom), `--title "<teks>"`, `--no-push`, `--skip-build`, `--force-tag`, `-y`. Lihat `scripts/release.sh --help`.

---

## ⚖️ License

GNU General Public License v3.0 (GPL-3.0) — Created by Aruthtale.
