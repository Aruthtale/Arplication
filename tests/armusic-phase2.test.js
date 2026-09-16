import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizePlaylistName,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  resolvePlaylistTracks,
  purgeTrackFromPlaylists,
  isTrackInPlaylist,
  groupTracksBy,
  MAX_PLAYLISTS,
  MAX_TRACKS_PER_PLAYLIST,
} from '../src/services/playlistManager.js';
import {
  formatEqFreq,
  formatEqGain,
  formatSleepRemaining,
} from '../src/services/armusicNative.js';

test('playlistManager: sanitizePlaylistName trims and clamps', () => {
  assert.equal(sanitizePlaylistName('   Santai Sore   '), 'Santai Sore');
  assert.equal(sanitizePlaylistName(''), '');
  assert.equal(sanitizePlaylistName('   '), '');
  const long = 'A'.repeat(100);
  assert.equal(sanitizePlaylistName(long).length, 60);
});

test('playlistManager: create, rename, delete workflow', () => {
  const { next: p1, playlist: created } = createPlaylist([], 'Koleksi Akustik');
  assert.equal(p1.length, 1);
  assert.equal(created.name, 'Koleksi Akustik');
  assert.ok(created.id);
  assert.deepEqual(created.trackIds, []);

  const p2 = renamePlaylist(p1, created.id, 'Akustik Chill');
  assert.equal(p2[0].name, 'Akustik Chill');

  const p3 = deletePlaylist(p2, created.id);
  assert.equal(p3.length, 0);
});

test('playlistManager: empty name falls back to auto-numbered label', () => {
  const { playlist } = createPlaylist([], '   ');
  assert.equal(playlist.name, 'Playlist 1');
});

test('playlistManager: limits total playlists to MAX_PLAYLISTS', () => {
  let list = [];
  for (let i = 0; i < MAX_PLAYLISTS; i++) {
    list = createPlaylist(list, `PL ${i}`).next;
  }
  assert.equal(list.length, MAX_PLAYLISTS);
  const over = createPlaylist(list, 'PL Kelebihan');
  assert.equal(over.next.length, MAX_PLAYLISTS);
  assert.equal(over.playlist, null);
});

test('playlistManager: add, remove, and deduplicate tracks', () => {
  const { next: p1, playlist: created } = createPlaylist([], 'Favorit');
  const id = created.id;

  // Add 1
  let p = addTrackToPlaylist(p1, id, 't1');
  assert.deepEqual(p[0].trackIds, ['t1']);
  assert.equal(isTrackInPlaylist(p, id, 't1'), true);
  assert.equal(isTrackInPlaylist(p, id, 't2'), false);

  // Add duplicate -> ignored
  p = addTrackToPlaylist(p, id, 't1');
  assert.deepEqual(p[0].trackIds, ['t1']);

  // Add another
  p = addTrackToPlaylist(p, id, 't2');
  assert.deepEqual(p[0].trackIds, ['t1', 't2']);

  // Remove
  p = removeTrackFromPlaylist(p, id, 't1');
  assert.deepEqual(p[0].trackIds, ['t2']);
});

test('playlistManager: limits tracks per playlist', () => {
  const { playlist: created } = createPlaylist([], 'Full');
  const pl = { ...created, trackIds: Array.from({ length: MAX_TRACKS_PER_PLAYLIST }, (_, i) => `t${i}`) };
  const base = [pl];
  const next = addTrackToPlaylist(base, pl.id, 't_extra');
  assert.equal(next[0].trackIds.length, MAX_TRACKS_PER_PLAYLIST);
});

test('playlistManager: resolvePlaylistTracks maps trackIds to track objects in order', () => {
  const library = [
    { id: 't1', title: 'Lagu 1', artist: 'Artis A' },
    { id: 't2', title: 'Lagu 2', artist: 'Artis B' },
    { id: 't3', title: 'Lagu 3', artist: 'Artis A' },
  ];
  const { next: p1, playlist: plCreated } = createPlaylist([], 'Mix');
  let p = addTrackToPlaylist(p1, plCreated.id, 't3');
  p = addTrackToPlaylist(p, plCreated.id, 't1');
  p = addTrackToPlaylist(p, plCreated.id, 't_missing'); // track terhapus dari lib

  const resolved = resolvePlaylistTracks(p, plCreated.id, library);
  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].id, 't3');
  assert.equal(resolved[1].id, 't1');
});

test('playlistManager: purgeTrackFromPlaylists removes deleted track from all playlists', () => {
  let list = createPlaylist([], 'A').next;
  list = createPlaylist(list, 'B').next;
  list = addTrackToPlaylist(list, list[0].id, 'target');
  list = addTrackToPlaylist(list, list[0].id, 'keep1');
  list = addTrackToPlaylist(list, list[1].id, 'target');
  list = addTrackToPlaylist(list, list[1].id, 'keep2');

  const purged = purgeTrackFromPlaylists(list, 'target');
  assert.deepEqual(purged[0].trackIds, ['keep1']);
  assert.deepEqual(purged[1].trackIds, ['keep2']);
});

test('playlistManager: groupTracksBy groups by artist or folder', () => {
  const lib = [
    { id: '1', artist: 'Hindia', folder: 'Indie', title: 'Evaluasi' },
    { id: '2', artist: 'Hindia', folder: 'Indie', title: 'Secukupnya' },
    { id: '3', artist: 'Feast', folder: 'Rock', title: 'Tarian Penghancur Raya' },
    { id: '4', artist: '', folder: '', title: 'Tanpa Metadata' },
  ];
  const byArtist = groupTracksBy(lib, 'artist');
  assert.equal(byArtist.length, 3);
  const feast = byArtist.find((g) => g.name === 'Feast');
  const hindia = byArtist.find((g) => g.name === 'Hindia');
  const unknown = byArtist.find((g) => g.name === 'Artis Tidak Dikenal');
  assert.equal(feast?.items.length, 1);
  assert.equal(hindia?.items.length, 2);
  assert.equal(unknown?.items.length, 1);

  const byFolder = groupTracksBy(lib, 'folder');
  assert.equal(byFolder.length, 3);
  const indie = byFolder.find((g) => g.name === 'Indie');
  assert.equal(indie?.items.length, 2);
  const other = byFolder.find((g) => g.name === 'Lainnya');
  assert.equal(other?.items.length, 1);
});

test('armusicNative: formatEqFreq formats milliHz cleanly', () => {
  assert.equal(formatEqFreq(60000), '60 Hz');
  assert.equal(formatEqFreq(230000), '230 Hz');
  assert.equal(formatEqFreq(910000), '910 Hz');
  assert.equal(formatEqFreq(3600000), '3.6 kHz');
  assert.equal(formatEqFreq(14000000), '14 kHz');
  assert.equal(formatEqFreq(0), '--');
  assert.equal(formatEqFreq(null), '--');
});

test('armusicNative: formatEqGain formats millibel to dB with sign', () => {
  assert.equal(formatEqGain(1200), '+12 dB');
  assert.equal(formatEqGain(-600), '-6 dB');
  assert.equal(formatEqGain(0), '0 dB');
  assert.equal(formatEqGain(350), '+3.5 dB');
});

test('armusicNative: formatSleepRemaining formats ms to mm:ss', () => {
  assert.equal(formatSleepRemaining(1000), '0:01');
  assert.equal(formatSleepRemaining(60000), '1:00');
  assert.equal(formatSleepRemaining(90000), '1:30');
  assert.equal(formatSleepRemaining(25 * 60 * 1000), '25:00');
  assert.equal(formatSleepRemaining(0), '0:00');
  assert.equal(formatSleepRemaining(-500), '0:00');
});
