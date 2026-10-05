/**
 * ArToolbox — Text & Developer Tools (100% offline, pure & testable).
 *
 * Semua fungsi murni (tanpa DOM) agar bisa diuji di Node dan dipakai ulang
 * oleh UI TextDevView maupun modul lain.
 */

const LOREM_WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud ' +
  'exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute ' +
  'irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur'
).split(' ');

/** Pecah teks menjadi kata-kata (mendukung camelCase → camel Case). */
export function splitWords(text) {
  return String(text ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

const cap = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '');

export function toUpperText(t) { return String(t ?? '').toUpperCase(); }
export function toLowerText(t) { return String(t ?? '').toLowerCase(); }

export function toTitleCase(t) {
  return String(t ?? '')
    .toLowerCase()
    .replace(/(^|[\s\-_/([{'"«])(\p{L})/gu, (_m, pre, ch) => pre + ch.toUpperCase());
}

export function toSentenceCase(t) {
  const s = String(t ?? '').toLowerCase();
  return s.replace(/(^\s*\S)|([.!?…]\s+\S)/g, (m) => m.toUpperCase());
}

export function toCamelCase(t) {
  const w = splitWords(t);
  return w.map((x, i) => (i === 0 ? x.toLowerCase() : cap(x))).join('');
}

export function toPascalCase(t) {
  return splitWords(t).map(cap).join('');
}

export function toSnakeCase(t) {
  return splitWords(t).map((x) => x.toLowerCase()).join('_');
}

export function toKebabCase(t) {
  return splitWords(t).map((x) => x.toLowerCase()).join('-');
}

export function slugify(t) {
  return String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function toAlternatingCase(t) {
  let upper = true;
  return String(t ?? '')
    .split('')
    .map((ch) => {
      if (/[a-zA-Z]/.test(ch)) {
        const out = upper ? ch.toUpperCase() : ch.toLowerCase();
        upper = !upper;
        return out;
      }
      return ch;
    })
    .join('');
}

export function reverseText(t) {
  return Array.from(String(t ?? '')).reverse().join('');
}

/** Urutkan baris A→Z (abaikan baris kosong). */
export function sortLines(t, { descending = false } = {}) {
  const lines = String(t ?? '').split(/\r\n|\r|\n/);
  const sorted = lines.slice().sort((a, b) => a.localeCompare(b, 'id'));
  if (descending) sorted.reverse();
  return sorted.join('\n');
}

/** Hapus baris duplikat (pertahankan urutan kemunculan pertama). */
export function uniqueLines(t) {
  const seen = new Set();
  return String(t ?? '')
    .split(/\r\n|\r|\n/)
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join('\n');
}

export function removeEmptyLines(t) {
  return String(t ?? '')
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== '')
    .join('\n');
}

export function trimLines(t) {
  return String(t ?? '')
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .join('\n');
}

/** Statistik teks: karakter, kata, baris, kalimat, paragraf, estimasi baca. */
export function countText(text) {
  const s = String(text ?? '');
  const chars = s.length;
  const charsNoSpaces = s.replace(/\s/g, '').length;
  const trimmed = s.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const lines = s === '' ? 0 : s.split(/\r\n|\r|\n/).length;
  const sentences = (s.match(/[^.!?…]+[.!?…]+(\s|$)/g) || []).length || (words > 0 ? 1 : 0);
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
  const readingTimeMin = words > 0 ? Math.max(1, Math.round(words / 200)) : 0;
  return { chars, charsNoSpaces, words, lines, sentences, paragraphs, readingTimeMin };
}

// ---------------------------------------------------------------- Base64

/** Encode teks → Base64 (aman untuk karakter non-ASCII / emoji). */
export function base64Encode(text) {
  const bytes = new TextEncoder().encode(String(text ?? ''));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** Decode Base64 → teks (aman untuk karakter non-ASCII / emoji). */
export function base64Decode(b64) {
  const clean = String(b64 ?? '').replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------- Hash

/** Hash teks (SHA-1 / SHA-256 / SHA-512) → hex. Async via WebCrypto. */
export async function hashText(text, algo = 'SHA-256') {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return '';
  const data = new TextEncoder().encode(String(text ?? ''));
  const buf = await subtle.digest(algo, data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------- JSON

/** Rapikan (pretty-print) JSON. Mengembalikan { ok, result, error }. */
export function formatJson(text, indent = 2) {
  try {
    const parsed = JSON.parse(String(text ?? ''));
    return { ok: true, result: JSON.stringify(parsed, null, indent), error: '' };
  } catch (e) {
    return { ok: false, result: '', error: String(e?.message || e) };
  }
}

/** Perkecil (minify) JSON. Mengembalikan { ok, result, error }. */
export function minifyJson(text) {
  try {
    return { ok: true, result: JSON.stringify(JSON.parse(String(text ?? ''))), error: '' };
  } catch (e) {
    return { ok: false, result: '', error: String(e?.message || e) };
  }
}

// ---------------------------------------------------------------- Lorem Ipsum

/**
 * Buat teks Lorem Ipsum.
 * @param {number} count jumlah unit
 * @param {'words'|'sentences'|'paragraphs'} unit
 */
export function loremIpsum(count = 1, unit = 'paragraphs') {
  const n = Math.max(1, Math.min(500, Math.floor(Number(count) || 1)));
  const pick = (i) => LOREM_WORDS[i % LOREM_WORDS.length];

  const sentence = (seed) => {
    const len = 8 + ((seed * 5) % 9);
    const words = Array.from({ length: len }, (_, i) => pick(seed + i));
    const s = words.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  };

  if (unit === 'words') {
    return Array.from({ length: n }, (_, i) => pick(i)).join(' ');
  }
  if (unit === 'sentences') {
    return Array.from({ length: n }, (_, i) => sentence(i)).join(' ');
  }
  // paragraphs
  return Array.from({ length: n }, (_, p) => {
    const count2 = 3 + (p % 3);
    return Array.from({ length: count2 }, (_, i) => sentence(p * 7 + i * 3)).join(' ');
  }).join('\n\n');
}
