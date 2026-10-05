import test from 'node:test';
import assert from 'node:assert/strict';
import {
  charWidthPt, measureTextPt, wrapTextToWidth, escapePdfText,
  buildTextContentStream, fitImageBox, buildPdf, A4_WIDTH, A4_HEIGHT,
} from '../src/utils/pdfBuilder.js';

const ascii = (bytes) => Array.from(bytes).map((b) => String.fromCharCode(b)).join('');

test('measureTextPt proporsional & wajar', () => {
  assert.ok(measureTextPt('Hello', 12) > 0);
  // 'W' lebih lebar dari 'i'
  assert.ok(charWidthPt('W', 12) > charWidthPt('i', 12));
});

test('wrapTextToWidth membungkus sesuai lebar', () => {
  const text = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do';
  const lines = wrapTextToWidth(text, 200, 12);
  assert.ok(lines.length > 1);
  lines.forEach((l) => assert.ok(measureTextPt(l, 12) <= 200.5, `baris terlalu lebar: ${l}`));
  // Semua kata utuh tergabung kembali
  assert.equal(lines.join(' ').replace(/\s+/g, ' '), text);
});

test('wrapTextToWidth menghormati newline & kata panjang', () => {
  assert.deepEqual(wrapTextToWidth('a\nb', 500, 12), ['a', 'b']);
  const long = 'X'.repeat(300);
  const lines = wrapTextToWidth(long, 100, 12);
  assert.ok(lines.length > 1);
});

test('escapePdfText mengamankan karakter khusus', () => {
  assert.equal(escapePdfText('a(b)c\\d'), 'a\\(b\\)c\\\\d');
  assert.equal(escapePdfText('héllo'), 'h\\351llo');
});

test('buildTextContentStream menghasilkan BT/ET valid', () => {
  const s = buildTextContentStream(['Halo', 'Dunia'], { fontSize: 12 });
  assert.ok(s.startsWith('BT\n'));
  assert.ok(s.trimEnd().endsWith('ET'));
  assert.match(s, /\(Halo\) Tj/);
  assert.match(s, /\(Dunia\) Tj/);
});

test('fitImageBox menempatkan gambar di tengah', () => {
  const box = fitImageBox(1000, 500, 595, 842, 20);
  assert.ok(box.drawW <= 595 - 40 + 0.01);
  assert.ok(box.drawH <= 842 - 40 + 0.01);
  assert.ok(box.drawX >= 0 && box.drawY >= 0);
});

test('buildPdf teks menghasilkan dokumen valid & berakhir EOF', () => {
  const bytes = buildPdf([{ type: 'text', text: 'Halo dunia' }]);
  const s = ascii(bytes);
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.includes('/Type /Catalog'));
  assert.ok(s.includes('/Type /Page'));
  assert.ok(s.includes('/BaseFont /Helvetica'));
  assert.ok(s.trimEnd().endsWith('%%EOF'));
  assert.ok(s.includes('/Count 1'));
});

test('buildPdf paginasi teks panjang jadi banyak halaman', () => {
  const longText = Array.from({ length: 200 }, (_, i) => `Baris ${i}`).join('\n');
  const bytes = buildPdf([{ type: 'text', text: longText }]);
  const s = ascii(bytes);
  const countMatch = s.match(/\/Count (\d+)/);
  assert.ok(Number(countMatch[1]) > 1, 'teks panjang harus multi-halaman');
});

test('buildPdf halaman gambar menyisipkan XObject DCTDecode', () => {
  const fakeJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]);
  const bytes = buildPdf([{
    type: 'image', width: 100, height: 50, data: fakeJpeg, pageWidth: A4_WIDTH, pageHeight: A4_HEIGHT,
  }]);
  const s = ascii(bytes);
  assert.ok(s.includes('/Subtype /Image'));
  assert.ok(s.includes('/Filter /DCTDecode'));
  assert.ok(s.includes('/Im1 Do'));
});

test('buildPdf campuran gambar + teks', () => {
  const fakeJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]);
  const bytes = buildPdf([
    { type: 'text', text: 'Halaman teks' },
    { type: 'image', width: 100, height: 50, data: fakeJpeg },
  ]);
  const s = ascii(bytes);
  assert.ok(s.includes('/Count 2'));
  assert.ok(s.includes('/Font'));
  assert.ok(s.includes('/XObject'));
});

test('buildPdf array kosong tetap PDF valid', () => {
  const bytes = buildPdf([]);
  const s = ascii(bytes);
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.includes('/Count 0'));
});
