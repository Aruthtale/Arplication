import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripMarkdown, formatNoteDate, noteToDocumentText, notesToPdfSpecs,
} from '../src/utils/notePdf.js';

test('stripMarkdown membersihkan sintaks ringan', () => {
  assert.equal(stripMarkdown('# Judul'), 'Judul');
  assert.equal(stripMarkdown('**tebal**'), 'tebal');
  assert.equal(stripMarkdown('`kode`'), 'kode');
  assert.equal(stripMarkdown('- item satu'), '• item satu');
  assert.equal(stripMarkdown('- [ ] tugas'), '[ ] tugas');
  assert.equal(stripMarkdown('- [x] selesai'), '[x] selesai');
});

test('formatNoteDate tanggal Indonesia', () => {
  const s = formatNoteDate('2025-01-15T10:00:00.000Z');
  assert.ok(/2025/.test(s));
  assert.equal(formatNoteDate('bad'), '');
  assert.equal(formatNoteDate(undefined), '');
});

test('noteToDocumentText menyusun header + isi', () => {
  const doc = noteToDocumentText({
    title: 'Resep Kopi',
    content: '# Langkah\n\n- [ ] Panaskan air\n- [x] Seduh',
    tags: ['dapur', 'minuman'],
    updatedAt: '2025-03-10T00:00:00.000Z',
  });
  assert.match(doc, /RESEP KOPI/);
  assert.match(doc, /Tag: #dapur #minuman/);
  assert.match(doc, /\[ \] Panaskan air/);
  assert.match(doc, /\[x\] Seduh/);
  assert.ok(doc.includes('Arplication'));
});

test('noteToDocumentText aman untuk catatan kosong', () => {
  const doc = noteToDocumentText({});
  assert.match(doc, /CATATAN TANPA JUDUL/);
});

test('notesToPdfSpecs memetakan catatan → spec teks', () => {
  const specs = notesToPdfSpecs([{ title: 'A', content: 'isi A' }, { title: 'B', content: 'isi B' }]);
  assert.equal(specs.length, 2);
  assert.equal(specs[0].type, 'text');
  assert.match(specs[1].text, /B/);
  assert.deepEqual(notesToPdfSpecs([]), []);
});
