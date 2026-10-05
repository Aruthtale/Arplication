/**
 * ArNote → PDF (integrasi).
 *
 * Mengubah catatan ArNote (judul, isi, tag, tanggal) menjadi dokumen teks yang
 * siap dibangun oleh utils/pdfBuilder. Fungsi murni → mudah diuji.
 */

/** Bersihkan sintaks markdown ringan agar enak dibaca di PDF. */
export function stripMarkdown(text) {
  return String(text ?? '')
    .replace(/^#{1,6}\s+/gm, '')          // heading
    .replace(/\*\*(.+?)\*\*/g, '$1')      // bold
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2') // italic
    .replace(/`([^`]+)`/g, '$1')          // inline code
    .replace(/^\s*[-*]\s+\[ \]\s*/gm, '[ ] ')
    .replace(/^\s*[-*]\s+\[[xX]\]\s*/gm, '[x] ')
    .replace(/^\s*[-*]\s+/gm, '• ')       // bullet
    .replace(/^\s*>\s?/gm, '');
}

/** Format tanggal ISO → string Indonesia singkat. */
export function formatNoteDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Bangun satu blok teks dokumen dari sebuah catatan.
 * @param {{title?:string, content?:string, tags?:string[], createdAt?:string, updatedAt?:string}} note
 * @returns {string}
 */
export function noteToDocumentText(note = {}) {
  const title = String(note.title || 'Catatan Tanpa Judul').trim();
  const body = stripMarkdown(note.content || '').trim();
  const tags = Array.isArray(note.tags) ? note.tags.filter(Boolean) : [];
  const date = formatNoteDate(note.updatedAt || note.createdAt);

  const header = [];
  header.push(title.toUpperCase());
  header.push('='.repeat(Math.min(60, Math.max(6, title.length))));
  const meta = [];
  if (date) meta.push(`Tanggal: ${date}`);
  if (tags.length) meta.push(`Tag: ${tags.map((t) => `#${t}`).join(' ')}`);
  if (meta.length) header.push(meta.join('   |   '));

  const parts = [header.join('\n')];
  if (body) parts.push(body);
  parts.push(`— Dibuat dengan Arplication (ArNote) —`);
  return parts.join('\n\n');
}

/**
 * Bangun spec halaman PDF dari daftar catatan (masing-masing mulai halaman baru).
 * @param {Array} notes
 * @returns {Array<{type:'text', text:string}>}
 */
export function notesToPdfSpecs(notes = []) {
  return notes
    .filter(Boolean)
    .map((n) => ({ type: 'text', text: noteToDocumentText(n) }));
}
