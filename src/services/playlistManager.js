/**
 * Playlist manager lokal ArMusic — 100% localStorage, tanpa backend.
 * Playlist menyimpan trackId (referensi ke library), bukan duplikat track,
 * sehingga lagu yang dihapus dari library otomatis hilang dari playlist.
 */

export const ARMUSIC_PLAYLISTS_KEY = 'armusic_playlists';
export const MAX_PLAYLISTS = 50;
export const MAX_PLAYLIST_NAME = 60;
export const MAX_TRACKS_PER_PLAYLIST = 500;

function uid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `pl_${crypto.randomUUID()}`;
  } catch { /* abaikan */ }
  return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizePlaylistName(name = '') {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PLAYLIST_NAME);
}

function norm(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({
      id: String(p.id || ''),
      name: sanitizePlaylistName(p.name) || 'Tanpa Nama',
      trackIds: Array.isArray(p.trackIds)
        ? p.trackIds.map(String).filter(Boolean).slice(0, MAX_TRACKS_PER_PLAYLIST)
        : [],
      createdAt: Number(p.createdAt) || 0,
      updatedAt: Number(p.updatedAt) || 0,
    }))
    .filter((p) => p.id);
}

export function loadPlaylists() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(ARMUSIC_PLAYLISTS_KEY);
    if (!raw) return [];
    return norm(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function savePlaylists(playlists = []) {
  const clean = norm(playlists).slice(0, MAX_PLAYLISTS);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ARMUSIC_PLAYLISTS_KEY, JSON.stringify(clean));
    }
  } catch { /* storage penuh — abaikan */ }
  return clean;
}

/** @returns {next, playlist} — next = array baru (immutable). */
export function createPlaylist(playlists = [], name = '') {
  const clean = norm(playlists);
  const label = sanitizePlaylistName(name) || `Playlist ${clean.length + 1}`;
  const now = Date.now();
  const playlist = { id: uid(), name: label, trackIds: [], createdAt: now, updatedAt: now };
  const next = [...clean, playlist].slice(0, MAX_PLAYLISTS);
  return { next, playlist: next.some((p) => p.id === playlist.id) ? playlist : null };
}

export function renamePlaylist(playlists = [], id, name = '') {
  const label = sanitizePlaylistName(name);
  if (!label) return norm(playlists);
  return norm(playlists).map((p) =>
    (p.id === String(id) ? { ...p, name: label, updatedAt: Date.now() } : p));
}

export function deletePlaylist(playlists = [], id) {
  return norm(playlists).filter((p) => p.id !== String(id));
}

export function getPlaylist(playlists = [], id) {
  return norm(playlists).find((p) => p.id === String(id)) || null;
}

export function isTrackInPlaylist(playlists = [], playlistId, trackId) {
  const p = getPlaylist(playlists, playlistId);
  return Boolean(p && p.trackIds.includes(String(trackId)));
}

/** Tambah lagu (idempotent — duplikat diabaikan). @returns array baru. */
export function addTrackToPlaylist(playlists = [], playlistId, trackId) {
  const tid = String(trackId || '');
  if (!tid) return norm(playlists);
  return norm(playlists).map((p) => {
    if (p.id !== String(playlistId)) return p;
    if (p.trackIds.includes(tid)) return p;
    return {
      ...p,
      trackIds: [...p.trackIds, tid].slice(0, MAX_TRACKS_PER_PLAYLIST),
      updatedAt: Date.now(),
    };
  });
}

export function removeTrackFromPlaylist(playlists = [], playlistId, trackId) {
  const tid = String(trackId || '');
  return norm(playlists).map((p) => (
    p.id !== String(playlistId)
      ? p
      : { ...p, trackIds: p.trackIds.filter((t) => t !== tid), updatedAt: Date.now() }
  ));
}

/**
 * Urutkan track library mengikuti urutan trackIds playlist.
 * Lagu yang sudah dihapus dari library dilewati (tidak error).
 */
export function resolvePlaylistTracks(playlists = [], playlistId, library = []) {
  const p = getPlaylist(playlists, playlistId);
  if (!p) return [];
  const byId = new Map((Array.isArray(library) ? library : []).map((t) => [String(t?.id), t]));
  return p.trackIds.map((tid) => byId.get(String(tid))).filter(Boolean);
}

/** Keluarkan trackId dari SEMUA playlist (dipakai saat lagu dihapus library). */
export function purgeTrackFromPlaylists(playlists = [], trackId) {
  const tid = String(trackId || '');
  if (!tid) return norm(playlists);
  return norm(playlists).map((p) => (
    p.trackIds.includes(tid)
      ? { ...p, trackIds: p.trackIds.filter((t) => t !== tid), updatedAt: Date.now() }
      : p
  ));
}

/** Kelompokkan track per artis/folder untuk tab ARTIS/FOLDER. Murni & testable. */
export function groupTracksBy(tracks = [], key = 'artist') {
  const map = new Map();
  for (const t of (Array.isArray(tracks) ? tracks : [])) {
    const label = String(t?.[key] || (key === 'folder' ? 'Lainnya' : 'Artis Tidak Dikenal')).trim() || 'Lainnya';
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(t);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'id'))
    .map(([name, items]) => ({ name, items }));
}
