# Rencana Implementasi Modul ArToolbox (Arplication)

## Tahap 1: Service & Storage Layer (`toolboxDb.js`)
- [ ] Buat file `src/services/toolboxDb.js` untuk menyimpan, membaca, dan menghapus riwayat perkakas di LocalStorage.
- [ ] Implementasikan pembatasan maksimal 100 riwayat terbaru agar storage tetap efisien.

## Tahap 2: Komponen Induk & Bento Grid (`ArToolboxModule.jsx` & `ToolboxBentoGrid.jsx`)
- [ ] Buat `src/components/modules/artoolbox/ArToolboxModule.jsx` dengan state pengelola sub-view aktif.
- [ ] Buat `src/components/modules/artoolbox/ToolboxBentoGrid.jsx` dengan layout bento neubrutalist untuk 4 alat utama + tombol riwayat.

## Tahap 3: Sub-View Perkakas (Individual Tools)
- [ ] Buat `src/components/modules/artoolbox/tools/QrSuiteView.jsx` (QR Generator & Pemindai/Kamera/Unggah Gambar).
- [ ] Buat `src/components/modules/artoolbox/tools/TextDevView.jsx` (Case Converter, Word Counter, Base64/Hash, JSON Formatter).
- [ ] Buat `src/components/modules/artoolbox/tools/QuickCalcView.jsx` (Kalkulator Diskon/Pajak, Rasio Aspek, Konverter Unit).
- [ ] Buat `src/components/modules/artoolbox/tools/ColorStudioView.jsx` (Color Picker, Canvas Palette Extractor, Format HEX/RGB/HSL).
- [ ] Buat `src/components/modules/artoolbox/tools/ToolboxHistoryModal.jsx` (Panel Riwayat Lokal & Hapus Cepat).

## Tahap 4: Integrasi Modul ke Aplikasi Utama
- [ ] Tambahkan kartu ArToolbox di `src/components/modules/HomeHub.jsx`.
- [ ] Tambahkan tab ArToolbox di `src/components/layout/Header.jsx` & `src/components/layout/BottomNav.jsx`.
- [ ] Daftarkan tampilan modul ArToolbox di `src/App.jsx`.
- [ ] Verifikasi build dan pengujian UI di layar Redmi Note 8.
