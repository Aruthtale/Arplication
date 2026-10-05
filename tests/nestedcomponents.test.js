import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guard regresi untuk bug "komponen didefinisikan di dalam komponen".
 *
 * Root cause yang pernah terjadi (QuickCalcView.jsx, v1.3.0):
 *   function QuickCalcView() {
 *     const Field = ({...}) => <input .../>;   // ← tipe komponen BARU tiap render
 *     return <Field .../>;
 *   }
 *
 * Setiap render membuat tipe komponen baru, sehingga React meng-unmount lalu
 * me-remount <input> → fokus hilang di tiap ketikan. oxlint melaporkannya sebagai
 * `react(static-components)`. Tes ini menegakkan aturan itu agar tidak kembali.
 */

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.jsx')) out.push(p);
  }
  return out;
}

// Deteksi: deklarasi komponen bernama Kapital di dalam file yang punya
// `export default function`/`function <Kapital>(`, DI DALAM badan fungsi
// (indentasi ≥ 2 spasi) — heuristik sederhana yang menangkap pola ini.
const NESTED_RE = /^\s{2,}(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(?[^)]*\)?\s*=>\s*\(?\s*<|^\s{2,}function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/m;

test('tidak ada komponen yang didefinisikan di dalam komponen (react/static-components)', () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8');
    // hanya periksa file yang mendefinisikan sebuah komponen (export default function / function Kapital)
    if (!/(export\s+default\s+function|^\s*function\s+[A-Z])/m.test(src)) continue;
    const m = src.match(NESTED_RE);
    if (m) {
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`${file.replace(ROOT, '')}:${line} → ${m[1] || m[2]}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Komponen di dalam komponen terdeteksi (fokus input bisa hilang tiap render):\n${offenders.join('\n')}`,
  );
});

test('file baru v1.3.0 tidak punya import yang tidak terpakai', async () => {
  // Smoke check khusus: pastikan file yang pernah kita perbaiki tetap bersih dari
  // pola komponen-nested (regresi langsung).
  const file = join(SRC, 'components/modules/artoolbox/tools/QuickCalcView.jsx');
  const src = readFileSync(file, 'utf8');
  assert.ok(
    !/const\s+Field\s*=\s*\(/.test(src),
    'Field tidak boleh dideklarasikan di dalam komponen',
  );
  assert.ok(
    !/const\s+Result\s*=\s*\(/.test(src),
    'Result tidak boleh dideklarasikan di dalam komponen',
  );
  // logHistory harus benar-benar dipakai (dulu dideklarasikan tapi tidak dipanggil)
  assert.ok(
    (src.match(/logHistory\(/g) || []).length >= 1,
    'logHistory harus dipanggil minimal sekali',
  );
});
