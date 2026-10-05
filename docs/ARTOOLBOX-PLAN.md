# Rencana Implementasi Modul ArToolbox (Arplication)

## Tahap 1: Service & Storage Layer (`toolboxDb.js`)
- [x] Buat file `src/services/toolboxDb.js` untuk menyimpan, membaca, dan menghapus riwayat perkakas di LocalStorage.
- [x] Implementasikan pembatasan maksimal 100 riwayat terbaru agar storage tetap efisien.

## Tahap 2: Komponen Induk & Bento Grid (`ArToolboxModule.jsx` & `ToolboxBentoGrid.jsx`)
- [x] Buat `src/components/modules/artoolbox/ArToolboxModule.jsx` dengan state pengelola sub-view aktif.
- [x] Buat `src/components/modules/artoolbox/ToolboxBentoGrid.jsx` dengan layout bento neubrutalist untuk 4 alat utama + tombol riwayat.

## Tahap 3: Sub-View Perkakas (Individual Tools)
- [x] Buat `src/components/modules/artoolbox/tools/QrSuiteView.jsx` (QR Generator & Pemindai/Kamera/Unggah Gambar).
- [x] Buat `src/components/modules/artoolbox/tools/TextDevView.jsx` (Case Converter, Word Counter, Base64/Hash, JSON Formatter, Lorem Ipsum, Utak-atik Baris).
- [x] Buat `src/components/modules/artoolbox/tools/QuickCalcView.jsx` (Kalkulator Diskon/Pajak/PPN, Persen, Rasio Aspek, Konverter Unit, Umur & Selisih Tanggal, Bagi Tagihan).
- [x] Buat `src/components/modules/artoolbox/tools/ColorStudioView.jsx` (Color Picker, Canvas Palette Extractor, Format HEX/RGB/HSL).
- [x] Buat `src/components/modules/artoolbox/tools/ToolboxHistoryModal.jsx` (Panel Riwayat Lokal & Hapus Cepat).

## Tahap 3b: PDF Maker Lanjutan (v1.3.0)
- [x] Ekstrak generator PDF ke `src/utils/pdfBuilder.js` (pure, testable, tanpa library).
- [x] Dukung **halaman Teks** selain gambar di `PdfMakerView.jsx` (Teks → PDF, auto-paginasi).
- [x] Integrasi **ArNote → PDF** via `src/services/notePdfService.js` + `src/utils/notePdf.js`
      (ekspor satu catatan atau semua catatan sekaligus).

## Tahap 4: Integrasi Modul ke Aplikasi Utama
- [x] Tambahkan kartu ArToolbox di `src/components/modules/HomeHub.jsx`.
- [x] Tambahkan tab ArToolbox di `src/components/layout/Header.jsx` & `src/components/layout/BottomNav.jsx`.
- [x] Daftarkan tampilan modul ArToolbox di `src/App.jsx`.
- [x] Verifikasi build dan pengujian UI di layar Redmi Note 8.
