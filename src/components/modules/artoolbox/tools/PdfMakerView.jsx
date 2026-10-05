import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Upload, FileText, Download, Trash2, ArrowUp, ArrowDown, 
  RotateCw, Plus, Check, Layers, Sparkles, FileCheck, Type, Image as ImageIcon
} from 'lucide-react';
import { addToolboxHistory } from '../../../../services/toolboxDb';
import { saveToolboxBlobFile } from '../../../../utils/download';
import { buildPdf, A4_WIDTH, A4_HEIGHT } from '../../../../utils/pdfBuilder';

// IndexedDB Helper for PDF Maker Drafts (survives Android OS memory kills)
const PDF_DB_NAME = 'artoolbox_pdf_maker_db';
const PDF_STORE_NAME = 'draft_pages';

function openPdfDb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(PDF_DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
          db.createObjectStore(PDF_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function loadSavedPages() {
  try {
    const db = await openPdfDb();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(PDF_STORE_NAME, 'readonly');
      const store = tx.objectStore(PDF_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function savePagesToDb(pages) {
  try {
    const db = await openPdfDb();
    if (!db) return;
    const tx = db.transaction(PDF_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PDF_STORE_NAME);
    store.clear();
    pages.forEach((p) => store.put(p));
  } catch (err) {
    console.warn('Gagal menyimpan draft PDF:', err);
  }
}

async function clearPagesFromDb() {
  try {
    const db = await openPdfDb();
    if (!db) return;
    const tx = db.transaction(PDF_STORE_NAME, 'readwrite');
    tx.objectStore(PDF_STORE_NAME).clear();
  } catch (err) {
    console.warn('Gagal membersihkan draft PDF:', err);
  }
}

/** Render gambar (dengan rotasi) → JPEG bytes + dimensi akhir. */
function renderImageToJpegBytes(dataUrl, rotation = 0) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const w = img.width;
      const h = img.height;
      const rot = rotation || 0;
      if (rot === 90 || rot === 270) {
        canvas.width = h;
        canvas.height = w;
      } else {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2);

      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      const binary = atob(jpegDataUrl.split(',')[1]);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
      resolve({ width: canvas.width, height: canvas.height, data: array });
    };
    img.src = dataUrl;
  });
}

export default function PdfMakerView({ onBack, onRefreshHistory }) {
  const [pages, setPages] = useState([]); // { id, type:'image', dataUrl, name, size, rotation } | { id, type:'text', text }
  const [pageSize, setPageSize] = useState('a4_portrait'); // 'a4_portrait' | 'a4_landscape' | 'fit'
  const [pdfTitle, setPdfTitle] = useState('Dokumen_Arplication');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfBlobUrl, setGeneratedPdfBlobUrl] = useState(null);
  const [textDraft, setTextDraft] = useState('');
  const [addMode, setAddMode] = useState('foto'); // 'foto' | 'teks'
  const isLoadedFromDbRef = useRef(false);

  // Restore saved pages on mount
  useEffect(() => {
    let isMounted = true;
    loadSavedPages().then((saved) => {
      if (isMounted && saved && saved.length > 0) {
        setPages(saved);
      }
      isLoadedFromDbRef.current = true;
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Save pages to IndexedDB whenever changed (after initial load)
  useEffect(() => {
    if (!isLoadedFromDbRef.current) return;
    savePagesToDb(pages);
  }, [pages]);

  const handleAddFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const item = {
          id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'image',
          dataUrl: event.target?.result,
          name: file.name,
          size: file.size,
          rotation: 0,
        };
        setPages((prev) => [...prev, item]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const addTextPage = () => {
    const t = textDraft.trim();
    if (!t) return;
    const item = {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'text',
      text: textDraft,
      name: t.split('\n')[0].slice(0, 24) || 'Halaman Teks',
    };
    setPages((prev) => [...prev, item]);
    setTextDraft('');
    addToolboxHistory({
      toolType: 'pdf',
      title: 'Tambah Halaman Teks',
      dataPayload: t.slice(0, 120),
    });
    if (onRefreshHistory) onRefreshHistory();
  };

  const movePage = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= pages.length) return;
    const copy = [...pages];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setPages(copy);
  };

  const rotatePage = (index) => {
    setPages((prev) => {
      const copy = [...prev];
      if (copy[index].type === 'image') {
        copy[index] = { ...copy[index], rotation: (copy[index].rotation + 90) % 360 };
      }
      return copy;
    });
  };

  const removePage = (index) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllPages = () => {
    setPages([]);
    setGeneratedPdfBlobUrl(null);
    clearPagesFromDb();
  };

  // Client-Side PDF Generator — gambar & teks (pure JS, via utils/pdfBuilder).
  const generatePdf = async () => {
    if (pages.length === 0) return;
    setIsGenerating(true);

    try {
      // Siapkan spec halaman (gambar di-render dulu ke JPEG bytes).
      const specs = [];
      for (const p of pages) {
        if (p.type === 'text') {
          specs.push({ type: 'text', text: p.text });
        } else {
          const imgInfo = await renderImageToJpegBytes(p.dataUrl, p.rotation || 0);
          specs.push({
            type: 'image',
            width: imgInfo.width,
            height: imgInfo.height,
            data: imgInfo.data,
            pageWidth: pageSize === 'a4_landscape' ? A4_HEIGHT : A4_WIDTH,
            pageHeight: pageSize === 'a4_landscape' ? A4_WIDTH : A4_HEIGHT,
          });
        }
      }

      let bytes;
      if (pageSize === 'fit') {
        // Untuk mode "fit", halaman gambar memakai ukuran gambarnya; halaman teks tetap A4.
        const fitSpecs = [];
        for (const p of pages) {
          if (p.type === 'text') {
            fitSpecs.push({ type: 'text', text: p.text });
          } else {
            const imgInfo = await renderImageToJpegBytes(p.dataUrl, p.rotation || 0);
            fitSpecs.push({
              type: 'image',
              width: imgInfo.width,
              height: imgInfo.height,
              data: imgInfo.data,
              pageWidth: imgInfo.width * 0.75,
              pageHeight: imgInfo.height * 0.75,
            });
          }
        }
        bytes = buildPdf(fitSpecs);
      } else {
        bytes = buildPdf(specs);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setGeneratedPdfBlobUrl(url);
      setIsGenerating(false);

      addToolboxHistory({
        toolType: 'pdf',
        title: `PDF: ${pdfTitle}.pdf (${pages.length} Halaman)`,
        dataPayload: `Ukuran: ${pageSize} | Total: ${pages.length} halaman (foto/teks)`,
      });
      if (onRefreshHistory) onRefreshHistory();
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
      setIsGenerating(false);
    }
  };

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const downloadPdf = async () => {
    if (!generatedPdfBlobUrl || downloading) return;
    try {
      setDownloading(true);
      const filename = `${pdfTitle.trim() || 'Dokumen'}.pdf`;
      await saveToolboxBlobFile({
        data: generatedPdfBlobUrl,
        filename,
        subfolder: 'Aruthtale/PDF',
        mimeType: 'application/pdf',
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Gagal mengunduh PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#FF70A6] rounded-2xl border-2 border-[#121212] shadow-[4px_4px_0px_#121212]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:shadow-[1px_1px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-[#121212]" />
        </button>
        <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">PDF Maker</h2>
        <div className="w-9" />
      </div>

      {/* Upload & Parameter Controls */}
      <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black uppercase text-[#121212]">Susun Dokumen PDF</h3>
            <p className="text-xs text-gray-600">Gabungkan foto & tulisan menjadi 1 file PDF rapi — tanpa internet.</p>
          </div>
        </div>

        {/* Mode tambah: Foto / Teks */}
        <div className="flex bg-[#FFE600] rounded-xl border-2 border-[#121212] p-1 gap-1">
          <button
            onClick={() => setAddMode('foto')}
            className={`flex-1 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              addMode === 'foto' ? 'bg-white shadow-[1px_1px_0px_#121212]' : 'text-[#121212]/70'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Tambah Foto
          </button>
          <button
            onClick={() => setAddMode('teks')}
            className={`flex-1 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              addMode === 'teks' ? 'bg-white shadow-[1px_1px_0px_#121212]' : 'text-[#121212]/70'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Tulis Teks
          </button>
        </div>

        {addMode === 'foto' ? (
          <label className="w-full px-3.5 py-3 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Pilih Foto dari Galeri ({pages.filter((p) => p.type !== 'text').length})</span>
            <input type="file" multiple accept="image/*" onChange={handleAddFiles} className="hidden" />
          </label>
        ) : (
          <div className="space-y-2">
            <textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Tulis atau tempel teks di sini… (otomatis dipaginasi bila panjang)"
              rows={5}
              className="w-full p-3 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-xs outline-none resize-y"
            />
            <button
              onClick={addTextPage}
              disabled={!textDraft.trim()}
              className="px-3.5 py-2 bg-[#C4FAF8] disabled:opacity-40 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Halaman Teks
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-black uppercase text-gray-700 mb-1">Nama File PDF</label>
            <input
              type="text"
              value={pdfTitle}
              onChange={(e) => setPdfTitle(e.target.value)}
              placeholder="Nama dokumen..."
              className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE]"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-gray-700 mb-1">Ukuran & Orientasi Kertas</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-black text-xs bg-[#FFE600] cursor-pointer"
            >
              <option value="a4_portrait">A4 Tegak (Portrait)</option>
              <option value="a4_landscape">A4 Mendatar (Landscape)</option>
              <option value="fit">Otomatis Pas Ukuran Foto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pages List */}
      {pages.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase text-[#121212]">
              Daftar Halaman ({pages.length} Halaman)
            </span>
            <button
              onClick={clearAllPages}
              className="text-xs font-bold text-red-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                className="p-3 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center gap-3"
              >
                {/* Thumbnail */}
                <div className="w-14 h-18 rounded-lg border border-[#121212] overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                  {p.type === 'text' ? (
                    <FileText className="w-6 h-6 text-gray-500" />
                  ) : (
                    <img
                      src={p.dataUrl}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-[#FFE600] border border-[#121212] rounded text-[10px] font-mono font-black">
                      Hal. {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#121212] truncate">
                      {p.type === 'text' ? `Teks: ${p.name}` : p.name}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 mt-1">
                    {p.type === 'text' ? 'Halaman Teks' : `Rotasi: ${p.rotation}°`}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => movePage(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 bg-[#F8F5EE] disabled:opacity-30 rounded border border-[#121212] cursor-pointer"
                      title="Pindah ke Atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePage(idx, 1)}
                      disabled={idx === pages.length - 1}
                      className="p-1 bg-[#F8F5EE] disabled:opacity-30 rounded border border-[#121212] cursor-pointer"
                      title="Pindah ke Bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => rotatePage(idx)}
                      disabled={p.type === 'text'}
                      className="p-1 bg-[#F8F5EE] disabled:opacity-30 rounded border border-[#121212] cursor-pointer"
                      title="Putar 90 Derajat"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removePage(idx)}
                      className="p-1 text-red-600 rounded border border-transparent hover:border-red-300 cursor-pointer ml-auto"
                      title="Hapus Halaman"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Generate & Download */}
          <div className="p-4 bg-[#C4FAF8] rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-2.5">
            <button
              onClick={generatePdf}
              disabled={isGenerating}
              className="w-full py-3 bg-[#FFE600] hover:bg-[#FFD700] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2.5px_2.5px_0px_#121212] text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isGenerating ? 'Memproses PDF...' : `Buat File PDF (${pages.length} Halaman)`}</span>
            </button>

            {generatedPdfBlobUrl && (
              <button
                onClick={downloadPdf}
                disabled={downloading}
                className="w-full py-2.5 bg-[#38E54D] hover:bg-[#30CC43] disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-green-800" />
                    <span>Tersimpan di Storage HP!</span>
                  </>
                ) : (
                  <>
                    <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                    <span>{downloading ? 'Menyimpan PDF...' : `Unduh ${pdfTitle || 'Dokumen'}.pdf`}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] text-center space-y-2">
          <FileText className="w-10 h-10 text-gray-400 mx-auto" />
          <h4 className="text-sm font-black uppercase text-[#121212]">Belum Ada Halaman</h4>
          <p className="text-xs text-gray-600 max-w-xs mx-auto">
            Tambahkan <strong>foto</strong> dari galeri atau <strong>tulis teks</strong> di atas untuk
            dijadikan PDF.
          </p>
        </div>
      )}
    </div>
  );
}
