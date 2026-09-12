# Arplication

> **Modular Client-Side Utility Suite by Aruthtale**

Arplication is a high-performance, private, client-side personal utility platform designed for Web and Android. Built with React 19, Tailwind CSS v4, and CapacitorJS.

---

## 🚀 Integrated Modules

1. **Arloader** (Active Focus)
   - Universal media downloader for TikTok and YouTube.
   - Watermark-free HD video and high-bitrate MP3 audio extraction.
   - 100% on-device processing with hybrid CORS bypass.

2. **Ardoro** (Upcoming)
   - Minimalist Pomodoro focus technique companion with interval loops and ambient audio.

3. **ArNote** (Upcoming)
   - Encrypted local-first markdown scratchpad with full-text search.

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

# Build for Web production
npm run build
```

---

## 📱 Android Build with Capacitor

```bash
# Sync web build to Android native project
npm run build
npx cap sync android

# Open Android Studio to build APK
npx cap open android
```

---

## ⚖️ License

GNU General Public License v3.0 (GPL-3.0) — Created by Aruthtale.
