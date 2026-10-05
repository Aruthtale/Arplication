/**
 * ArToolbox — PDF Builder (pure, offline, testable).
 *
 * Membangun byte PDF 1.4 secara manual (tanpa library) dari daftar halaman:
 *  - { type: 'image', width, height, data (JPEG bytes), pageWidth?, pageHeight? }
 *  - { type: 'text', text, fontSize? }
 *
 * Halaman teks otomatis dipaginasi (word-wrap + multi-halaman).
 * Font memakai Helvetica base-14 (WinAnsiEncoding) — tanpa perlu embed font.
 */

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

// Lebar Helvetica (per 1000 unit) untuk ASCII 32..126.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // 32-47
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, // 48-57 (0-9)
  278, 278, 584, 584, 584, 556, 1015, // 58-64
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, // 65-80
  778, 722, 667, 611, 722, 667, 944, 667, 667, 611, // 81-90
  278, 278, 278, 469, 556, 333, // 91-96
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, // 97-112
  556, 333, 500, 278, 556, 500, 722, 500, 500, 500, // 113-122
  334, 260, 334, 584, // 123-126
];

/** Lebar 1 karakter (pt) untuk font Helvetica pada ukuran tertentu. */
export function charWidthPt(ch, fontSize = 12) {
  const code = ch.codePointAt(0);
  const w = code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : 556;
  return (w / 1000) * fontSize;
}

/** Perkiraan lebar teks (pt). */
export function measureTextPt(text, fontSize = 12) {
  let total = 0;
  for (const ch of String(text ?? '')) total += charWidthPt(ch, fontSize);
  return total;
}

/**
 * Bungkus teks menjadi baris-baris yang muat dalam `maxWidth` pt.
 * Menghormati newline eksplisit dan memecah kata yang terlalu panjang.
 */
export function wrapTextToWidth(text, maxWidth, fontSize = 12) {
  const out = [];
  const lines = String(text ?? '').split(/\r\n|\r|\n/);
  for (const rawLine of lines) {
    if (rawLine === '') { out.push(''); continue; }
    const words = rawLine.split(/\s+/).filter((w) => w !== '');
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureTextPt(candidate, fontSize) <= maxWidth) {
        line = candidate;
      } else if (line === '') {
        // Kata tunggal lebih lebar dari halaman → pecah per karakter.
        let chunk = '';
        for (const ch of word) {
          if (chunk && measureTextPt(chunk + ch, fontSize) > maxWidth) {
            out.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Escape string agar aman di dalam literal PDF `( ... )`. */
export function escapePdfText(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const code = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '(') out += '\\(';
    else if (ch === ')') out += '\\)';
    else if (code >= 32 && code <= 126) out += ch;
    else if (code >= 160 && code <= 255) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += '?';
  }
  return out;
}

/** Bangun content stream PDF untuk satu halaman teks. */
export function buildTextContentStream(lines = [], opts = {}) {
  const fontSize = opts.fontSize || 11;
  const leading = opts.leading || fontSize * 1.4;
  const x = opts.x ?? 56.7;
  const startY = opts.startY ?? 785;
  const fontName = opts.fontName || 'F1';

  let s = 'BT\n';
  s += `/${fontName} ${fontSize} Tf\n`;
  s += `${leading.toFixed(2)} TL\n`;
  s += `1 0 0 1 ${x.toFixed(2)} ${startY.toFixed(2)} Tm\n`;
  lines.forEach((line, i) => {
    if (i > 0) s += 'T*\n';
    s += `(${escapePdfText(line)}) Tj\n`;
  });
  s += 'ET\n';
  return s;
}

/** Hitung layout "fit" sebuah gambar di dalam kotak halaman (margin 20pt). */
export function fitImageBox(imgW, imgH, pageW, pageH, margin = 20) {
  const maxW = Math.max(1, pageW - margin * 2);
  const maxH = Math.max(1, pageH - margin * 2);
  const ar = imgW / imgH;
  const fr = maxW / maxH;
  let drawW = maxW;
  let drawH = maxH;
  if (ar > fr) drawH = maxW / ar;
  else drawW = maxH * ar;
  return {
    drawW,
    drawH,
    drawX: (pageW - drawW) / 2,
    drawY: (pageH - drawH) / 2,
  };
}

/**
 * Bangun byte PDF dari daftar halaman.
 * @param {Array} pageSpecs
 * @param {{pageWidth?:number, pageHeight?:number, margin?:number, fontSize?:number}} opts
 * @returns {Uint8Array}
 */
export function buildPdf(pageSpecs = [], opts = {}) {
  const pageWidth = opts.pageWidth || A4_WIDTH;
  const pageHeight = opts.pageHeight || A4_HEIGHT;
  const baseMargin = opts.margin ?? 56.7;
  const baseFont = opts.fontSize || 11;

  const objects = [];
  const alloc = (obj) => { objects.push(obj); return objects.length; };

  const catalogNum = alloc(null); // 1
  const pagesNum = alloc(null);   // 2
  const fontNum = alloc({
    str: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  });

  // 1) Susun rencana halaman (paginasi teks).
  const plan = [];
  for (const spec of pageSpecs) {
    if (spec.type === 'text') {
      const fs = spec.fontSize || baseFont;
      const leading = fs * 1.4;
      const wrapped = wrapTextToWidth(spec.text, pageWidth - baseMargin * 2, fs);
      const perPage = Math.max(1, Math.floor((pageHeight - baseMargin * 2) / leading));
      if (wrapped.length === 0) {
        plan.push({ type: 'text', lines: [''], fontSize: fs, leading });
      } else {
        for (let i = 0; i < wrapped.length; i += perPage) {
          plan.push({ type: 'text', lines: wrapped.slice(i, i + perPage), fontSize: fs, leading });
        }
      }
    } else {
      plan.push({ type: 'image', ...spec });
    }
  }

  // 2) Alokasikan objek per halaman.
  const pageRefs = [];
  plan.forEach((p, idx) => {
    if (p.type === 'image') {
      const pw = p.pageWidth || pageWidth;
      const ph = p.pageHeight || pageHeight;
      const imgNum = alloc({
        raw: true,
        header: `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.data.length} >>\nstream\n`,
        footer: '\nendstream',
        data: p.data,
      });
      const box = fitImageBox(p.width, p.height, pw, ph);
      const content = `q\n${box.drawW.toFixed(2)} 0 0 ${box.drawH.toFixed(2)} ${box.drawX.toFixed(2)} ${box.drawY.toFixed(2)} cm\n/Im${idx + 1} Do\nQ\n`;
      const contentNum = alloc({ str: `<< /Length ${content.length} >>\nstream\n${content}endstream` });
      const pageNum = alloc({
        str: `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Contents ${contentNum} 0 R /Resources << /XObject << /Im${idx + 1} ${imgNum} 0 R >> >> >>`,
      });
      pageRefs.push(pageNum);
    } else {
      const content = buildTextContentStream(p.lines, {
        fontSize: p.fontSize,
        leading: p.leading,
        x: baseMargin,
        startY: pageHeight - baseMargin,
      });
      const contentNum = alloc({ str: `<< /Length ${content.length} >>\nstream\n${content}endstream` });
      const pageNum = alloc({
        str: `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents ${contentNum} 0 R /Resources << /Font << /F1 ${fontNum} 0 R >> >> >>`,
      });
      pageRefs.push(pageNum);
    }
  });

  objects[catalogNum - 1] = { str: `<< /Type /Catalog /Pages ${pagesNum} 0 R >>` };
  objects[pagesNum - 1] = {
    str: `<< /Type /Pages /Kids [${pageRefs.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`,
  };

  // 3) Serialisasi byte.
  const encoder = new TextEncoder();
  const chunks = [];
  const xref = [];
  let offset = 0;
  const pushText = (t) => { const b = encoder.encode(t); chunks.push(b); offset += b.length; };
  const pushBin = (b) => { chunks.push(b); offset += b.length; };

  pushText('%PDF-1.4\n%');
  pushBin(new Uint8Array([0xE2, 0xE3, 0xCF, 0xD3]));
  pushText('\n');

  for (let i = 1; i <= objects.length; i++) {
    xref[i] = offset;
    pushText(`${i} 0 obj\n`);
    const o = objects[i - 1];
    if (o && o.raw) {
      pushText(o.header);
      pushBin(o.data);
      pushText(o.footer);
    } else {
      pushText(o ? o.str : '<< >>');
    }
    pushText('\nendobj\n');
  }

  const xrefOffset = offset;
  pushText(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= objects.length; i++) {
    pushText(`${String(xref[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}
