# Rencana Implementasi Modul ArToolbox (Arplication)

## Tahap 1: Service & Storage Layer (`toolboxDb.js`)
- [x] Buat file `src/services/toolboxDb.js` untuk menyimpan, membaca, dan menghapus riwayat perkakas di LocalStorage.
- [x] Implementasikan pembatasan maksimal 100 riwayat terbaru agar storage tetap efisien.

## Tahap 2: Komponen Induk & Bento Grid (`ArToolboxModule.jsx` & `ToolboxBentoGrid.jsx`)
- [x] Buat `src/components/modules/artoolbox/ArToolboxModule.jsx` dengan state pengelola sub-view aktif.
- [x] Buat `src/components/modules/artoolbox/ToolboxBentoGrid.jsx` dengan layout bento neubrutalist untuk 4 alat utama + tombol riwayat.

## Tahap 3: Sub-View Perkakas (Individual Tools)
- [x] Buat `src/components/modules/artoolbox/tools/QrSuiteView.jsx` (QR Generator & Pemindai/Kamera/Unggah Gambar).
- [x] Buat `src/components/modules/artoolbox/tools/TextDevView.jsx` (Case Converter, Word Counter, Base64/Hash, JSON Formatter).
- [x] Buat `src/components/modules/artoolbox/tools/QuickCalcView.jsx` (Kalkulator Diskon/Pajak, Rasio Aspek, Konverter Unit).
- [x] Buat `src/components/modules/artoolbox/tools/ColorStudioView.jsx` (Color Picker, Canvas Palette Extractor, Format HEX/RGB/HSL).
- [x] Buat `src/components/modules/artoolbox/tools/ToolboxHistoryModal.jsx` (Panel Riwayat Lokal & Hapus Cepat).

## Tahap 4: Integrasi Modul ke Aplikasi Utama
- [x] Tambahkan kartu ArToolbox di `src/components/modules/HomeHub.jsx`.
- [x] Tambahkan tab ArToolbox di `src/components/layout/Header.jsx` & `src/components/layout/BottomNav.jsx`.
- [x] Daftarkan tampilan modul ArToolbox di `src/App.jsx`.
- [x] Verifikasi build dan pengujian UI di layar Redmi Note 8.
