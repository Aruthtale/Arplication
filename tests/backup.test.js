import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBackup,
  validateBackup,
  summarizeBackup,
  serializeBackup,
  parseBackupText,
  extractLocalData,
  applyLocalData,
  resolveLocalKeys,
  backupFilename,
  BACKUP_APP,
  BACKUP_SCHEMA,
  BACKUP_LOCAL_KEYS,
  BACKUP_SENSITIVE_KEYS,
} from '../src/services/backupService.js';

// Storage tiruan mirip localStorage
function makeStorage(initial = {}) {
  let store = { ...initial };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
    _dump: () => ({ ...store }),
  };
}

test('buildBackup menghasilkan struktur + meta yang benar', () => {
  const b = buildBackup({
    localData: { ar_setting_haptic: 'false' },
    idbData: { 'arnote_db/notes': [{ id: 'n1' }] },
    version: '1.4.0',
    now: '2026-10-06T00:00:00.000Z',
  });
  assert.equal(b.meta.app, BACKUP_APP);
  assert.equal(b.meta.schema, BACKUP_SCHEMA);
  assert.equal(b.meta.version, '1.4.0');
  assert.equal(b.meta.exportedAt, '2026-10-06T00:00:00.000Z');
  assert.deepEqual(b.localStorage, { ar_setting_haptic: 'false' });
  assert.equal(b.indexedDB['arnote_db/notes'].length, 1);
});

test('validateBackup menolak input tidak valid', () => {
  assert.throws(() => validateBackup(null), /tidak valid/);
  assert.throws(() => validateBackup([]), /tidak valid/);
  assert.throws(() => validateBackup({}), /metadata/);
  assert.throws(() => validateBackup({ meta: { app: 'LainApp', schema: 1 } }), /bukan milik/);
  assert.throws(() => validateBackup({ meta: { app: BACKUP_APP, schema: 0 } }), /skema/);
  // skema lebih baru dari yang didukung -> tolak
  assert.throws(
    () => validateBackup({ meta: { app: BACKUP_APP, schema: BACKUP_SCHEMA + 1 } }),
    /lebih baru/,
  );
});

test('validateBackup menerima backup yang benar & menghitung item', () => {
  const b = buildBackup({
    localData: { a: '1', b: '2' },
    idbData: { 'arnote_db/notes': [{ id: 'n1' }, { id: 'n2' }], 'artoolbox_pdf_maker_db/draft_pages': [] },
  });
  const info = validateBackup(b);
  assert.equal(info.localCount, 2);
  assert.equal(info.idbStoreCount, 2);
  assert.equal(info.idbItemCount, 2);
});

test('round-trip: serialize → parse mengembalikan data identik', () => {
  const b = buildBackup({
    localData: { armusic_playlists: '[{"id":"p1"}]' },
    idbData: { 'arnote_db/notes': [{ id: 'n1', title: 'Halo' }] },
    now: '2026-10-06T10:00:00.000Z',
  });
  const text = serializeBackup(b);
  const parsed = parseBackupText(text);
  assert.deepEqual(parsed, b);
});

test('parseBackupText menolak JSON rusak & file asing', () => {
  assert.throws(() => parseBackupText('{bukan json'), /bukan JSON/);
  assert.throws(() => parseBackupText(JSON.stringify({ meta: { app: 'X', schema: 1 } })), /bukan milik/);
});

test('extractLocalData hanya mengambil kunci yang ada', () => {
  const s = makeStorage({ k1: 'v1', k2: 'v2' });
  const data = extractLocalData(s, ['k1', 'k2', 'k_hilang']);
  assert.deepEqual(data, { k1: 'v1', k2: 'v2' });
  assert.deepEqual(extractLocalData(null, ['k1']), {});
});

test('applyLocalData menulis balik & mengembalikan jumlah kunci', () => {
  const s = makeStorage();
  const n = applyLocalData(s, { a: '1', b: '2' });
  assert.equal(n, 2);
  assert.equal(s.getItem('a'), '1');
  assert.equal(s.getItem('b'), '2');
});

test('resolveLocalKeys: kunci sensitif hanya ikut bila diminta', () => {
  const normal = resolveLocalKeys();
  assert.ok(normal.includes('arloader_settings'));
  assert.ok(!normal.includes('ytmusic_auth'), 'ytmusic_auth tidak boleh ikut default');

  const withSensitive = resolveLocalKeys({ includeSensitive: true });
  assert.ok(withSensitive.includes('ytmusic_auth'));
  assert.equal(withSensitive.length, normal.length + BACKUP_SENSITIVE_KEYS.length);
});

test('ytmusic_auth tidak bocor ke ekspor default (whitelist)', () => {
  const s = makeStorage({
    arloader_settings: '{}',
    ytmusic_auth: '{"token":"RAHASIA"}',
  });
  const data = extractLocalData(s, resolveLocalKeys());
  assert.ok(!('ytmusic_auth' in data), 'token login tidak boleh ikut backup default');
  assert.ok('arloader_settings' in data);

  const withSensitive = extractLocalData(s, resolveLocalKeys({ includeSensitive: true }));
  assert.ok('ytmusic_auth' in withSensitive);
});

test('summarizeBackup menghitung catatan, draf, kunci, dan ukuran', () => {
  const b = buildBackup({
    localData: { a: '1', b: '2', c: '3' },
    idbData: {
      'arnote_db/notes': [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      'artoolbox_pdf_maker_db/draft_pages': [{ id: 'd1' }],
    },
    version: '1.4.0',
    now: '2026-10-06T00:00:00.000Z',
  });
  const s = summarizeBackup(b);
  assert.equal(s.keys, 3);
  assert.equal(s.notes, 3);
  assert.equal(s.drafts, 1);
  assert.ok(s.bytes > 0);
  assert.equal(s.version, '1.4.0');
  assert.equal(s.exportedAt, '2026-10-06T00:00:00.000Z');
});

test('whitelist tidak memuat kunci transient/sensitif yang salah', () => {
  assert.ok(!BACKUP_LOCAL_KEYS.includes('armusic-native-queue'));
  assert.ok(!BACKUP_LOCAL_KEYS.includes('ytmusic_auth'));
  // semua kunci whitelist harus string non-kosong & unik
  assert.equal(new Set(BACKUP_LOCAL_KEYS).size, BACKUP_LOCAL_KEYS.length);
  assert.ok(BACKUP_LOCAL_KEYS.every((k) => typeof k === 'string' && k.length > 0));
});

test('backupFilename berformat arplication-backup-YYYYMMDD-HHMM.json', () => {
  const name = backupFilename(new Date(2026, 9, 6, 14, 5)); // 6 Okt 2026 14:05
  assert.equal(name, 'arplication-backup-20261006-1405.json');
});
