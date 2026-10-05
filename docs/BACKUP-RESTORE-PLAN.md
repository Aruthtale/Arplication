# Rencana: Backup & Restore Data (v1.4.0)

Tujuan: satu file `.json` berisi seluruh data Arplication; impor di HP baru →
semua kembali. Mencegah kehilangan permanen saat reinstall.

## Inventaris penyimpanan (hasil audit kode)

### localStorage (whitelist)
| Kunci | Modul |
|---|---|
| `arloader_settings`, `arloader_folder_preset`, `arloader_downloads`, `arloader_history` | Arloader |
| `armusic_library`, `armusic_playlists`, `armusic_lyrics_cache`, `yt_music_recent_searches` | ArMusic |
| `ardoro_settings_v1`, `ardoro_stats_v1`, `ardoro_timer_state_v1` | Ardoro |
| `artoolbox_history_v1` | ArToolbox |
| `argame_high_scores`, `argame_settings`, `argame_sudoku_state` | ArGame |
| `ar_setting_autoscan`, `ar_setting_haptic`, `ar_setting_notifsound` | Global |

### localStorage (SENSITIF — default tidak ikut)
- `ytmusic_auth` (token login YouTube Music)

### localStorage (transient — tidak ikut)
- `armusic-native-queue` (antrean sesi, dibersihkan saat init)

### IndexedDB
| DB | Store |
|---|---|
| `arnote_db` | `notes` |
| `artoolbox_pdf_maker_db` | `draft_pages` |

## Struktur file backup
```json
{
  "meta": { "app": "Arplication", "schema": 1, "version": "1.4.0", "exportedAt": "ISO" },
  "localStorage": { "<key>": "<raw string value>" },
  "indexedDB": { "arnote_db/notes": [ ... ], "artoolbox_pdf_maker_db/draft_pages": [ ... ] }
}
```

## Rancangan `src/services/backupService.js`
- Konstanta: `BACKUP_APP`, `BACKUP_SCHEMA`, `BACKUP_LOCAL_KEYS`, `BACKUP_SENSITIVE_KEYS`, `BACKUP_IDB_STORES`.
- **Murni (mudah diuji):**
  - `buildBackup({ localData, idbData, includeSensitive, version, now })` → objek backup.
  - `validateBackup(obj)` → lempar Error bila `app`/`schema` salah; kembalikan ringkasan.
  - `summarizeBackup(backup)` → `{ keys, notes, drafts, bytes }`.
  - `extractLocalData(storage, keys)` / `applyLocalData(storage, data)`.
- **Orkestrasi (async, guard IndexedDB):**
  - `collectBackup({ includeSensitive })`
  - `restoreBackup(obj, { includeSensitive })` — validasi dulu, baru tulis.
  - `downloadBackup({ includeSensitive })` — pakai pola unduh web/native.
  - `parseBackupText(text)` — JSON.parse + validate.

## UI (`AppSettingsModal.jsx`)
Section baru "Cadangan & Pemulihan":
- Tombol **Cadangkan Data** → ringkasan (jumlah kunci/catatan/ukuran) → unduh `.json`.
- Checkbox **sertakan login** (default OFF) dengan peringatan.
- Tombol **Pulihkan Data** → pilih file → tampil ringkasan isi → modal konfirmasi
  "Timpa data sekarang?" (pola `DeleteConfirmModal`) → restore → reload.

## Tes (`tests/backup.test.js`)
- Round-trip `buildBackup → serialize → parse → applyLocalData` dengan storage tiruan.
- `validateBackup` menolak file asing / schema salah / bukan objek.
- `ytmusic_auth` **tidak** ikut saat `includeSensitive=false`; ikut saat `true`.
- `summarizeBackup` menghitung dengan benar.

## Risiko & mitigasi
- Menimpa data tanpa konfirmasi → modal konfirmasi + tombol Batal.
- File besar (library musik) → tampilkan ukuran sebelum unduh.
- Kompatibilitas → `schema` + `version`; migrasi bertahap.
- IndexedDB tak tersedia (Node/web lama) → guard `typeof indexedDB === 'undefined'`.

## Urutan rilis
Backup/Restore = **minor (1.4.0)**. Setelah ini baru Tema (#2), lalu ArGame (#3).
