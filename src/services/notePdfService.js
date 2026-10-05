/**
 * Layanan ekspor ArNote → PDF.
 * Memakai utils/pdfBuilder (pure) + utils/download untuk menyimpan file.
 */
import { buildPdf } from '../utils/pdfBuilder';
import { notesToPdfSpecs } from '../utils/notePdf';
import { saveToolboxBlobFile } from '../utils/download';

/**
 * Ekspor satu atau beberapa catatan menjadi file PDF.
 * @param {object|object[]} notes catatan tunggal atau array catatan
 * @param {string} [filename] nama file tanpa .pdf
 * @returns {Promise<{success:boolean, fileName?:string, pages?:number, error?:string}>}
 */
export async function exportNotesToPdf(notes, filename = 'ArNote') {
  try {
    const list = Array.isArray(notes) ? notes : [notes];
    if (list.length === 0) return { success: false, error: 'Tidak ada catatan untuk diekspor.' };

    const specs = notesToPdfSpecs(list);
    const bytes = buildPdf(specs);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const safeName = String(filename || 'ArNote').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'ArNote';
    await saveToolboxBlobFile({
      data: url,
      filename: `${safeName}.pdf`,
      subfolder: 'Aruthtale/ArNote',
      mimeType: 'application/pdf',
    });

    // Bebaskan memori blob URL setelah disimpan.
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    return { success: true, fileName: `${safeName}.pdf`, pages: specs.length };
  } catch (e) {
    console.error('Gagal ekspor ArNote ke PDF:', e);
    return { success: false, error: String(e?.message || e) };
  }
}
