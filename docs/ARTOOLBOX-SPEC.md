# Spesifikasi Desain Modul ArToolbox (Arplication)

## 1. Ringkasan Kesepahaman (Understanding Summary)

- **Nama Modul:** ArToolbox (Perkakas Serbaguna Ringkas)
- **Tujuan:** Menyediakan dasbor utilitas offline-first serbaguna di dalam Arplication (QR Suite, Text/Dev tools, Kalkulator praktis, & Color Studio) dengan tampilan neubrutalist yang cepat, mandiri, dan hemat RAM di Android (Redmi Note 8).
- **Target Pengguna:** Pengguna harian yang membutuhkan alat bantu cepat tanpa memasang banyak aplikasi terpisah atau bergantung pada koneksi internet/server eksternal.
- **Batasan Kunci:**
  - 100% Offline-first (tidak ada panggilan API eksternal).
  - Tampilan Neubrutalisme yang konsisten dengan estetika Arplication.
  - Penyimpanan riwayat lokal otomatis ke IndexedDB / LocalStorage dengan opsi pembersihan cepat.
  - Penggunaan resource kamera & canvas yang terisolasi untuk menghemat daya dan RAM.

---

## 2. Asumsi Teknis

1. Pustaka QR Code menggunakan pustaka JS client-side ringan (`qrcode` / `@zxing/browser` atau HTML5 Canvas Barcode API).
2. Modul diintegrasikan secara terisolasi di `src/components/modules/artoolbox/`.
3. Kompatibel penuh dengan Vite + React 19 + Capacitor 7 di perangkat Android (Redmi Note 8).

---

## 3. Log Keputusan (Decision Log)

| Topik Keputusan | Keputusan yang Diambil | Alternatif Dipertimbangkan | Alasan & Pertimbangan |
| :--- | :--- | :--- | :--- |
| **Pilihan Modul Baru** | Modul ArToolbox (Perkakas Serbaguna) | ArVault (Brankas), ArExpense (Keuangan), ArHabit (Kebiasaan) | Memenuhi kebutuhan harian paling variatif dalam satu dashboard bento ringkas. |
| **Ruang Cakup Fitur (MVP)** | Bento Toolbox Ringkas (QR, Text Tools, Quick Calc, Color Studio) | Fokus hanya 1-2 alat saja | Memberikan nilai kegunaan maksimal sejak versi pertama. |
| **Manajemen Riwayat** | Simpan Riwayat Lokal di Storage Perangkat | Stateless / Murni Tanpa Simpan | Pengguna dapat membuka kembali hasil scan QR, teks yang dikonversi, atau kalkulasi sebelumnya tanpa mengetik ulang. |
| **Arsitektur Tampilan** | Modular Bento Hub dengan Sub-View Layar Penuh | Segmented Tab Bar / Long Scroll Page | Menghemat penggunaan RAM & baterai di Redmi Note 8 karena kamera/proses berat hanya aktif saat sub-view dibuka. |

---

## 4. Spesifikasi Desain Akhir

### A. Komponen & Struktur File
```text
src/components/modules/artoolbox/
├── ArToolboxModule.jsx         # Induk modul & pengelola navigasi internal
├── ToolboxBentoGrid.jsx        # Dasbor bento utama (pilihan perkakas & ringkasan)
├── tools/
│   ├── QrSuiteView.jsx         # Pembuat & Pemindai QR Code / Barcode
│   ├── TextDevView.jsx         # Case converter, Word count, Base64/Hash, JSON
│   ├── QuickCalcView.jsx       # Kalkulator diskon, pajak, rasio, & konversi unit
│   ├── ColorStudioView.jsx     # Eyedropper, ekstraksi palet gambar, HEX/RGB/HSL
│   └── ToolboxHistoryModal.jsx # Panel riwayat lokal & pembersih data
└── services/
    └── toolboxDb.js            # Service LocalStorage / IndexedDB untuk riwayat
```

### B. Integrasi Utama
- **HomeHub & Header:** Menambahkan ArToolbox ke kartu dasbor `HomeHub.jsx` dan navigasi header/bottom nav.
- **Penyimpanan:** Kunci LocalStorage `artoolbox_history` memuat entri riwayat dengan batas maksimum 100 entri terbaru.

---

## 5. Kriteria Penyelesaian & Hand-off

Spesifikasi ini telah divalidasi dan disetujui untuk diimplementasikan.
