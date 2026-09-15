import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAudioFilename,
  parseFileMetadata,
  formatTrackDuration,
  toPlayableSrc,
  mergeScanResults,
  removeTrack,
} from '../src/services/localMusic.js';

test('isAudioFilename accepts common audio extensions', () => {
  assert.equal(isAudioFilename('lagu.mp3'), true);
  assert.equal(isAudioFilename('rekaman.M4A'), true);
  assert.equal(isAudioFilename('musik.flac'), true);
  assert.equal(isAudioFilename('suara.opus'), true);
  assert.equal(isAudioFilename('video.mp4'), false);
  assert.equal(isAudioFilename('foto.jpg'), false);
  assert.equal(isAudioFilename('tanpa-ekstensi'), false);
});

test('parseFileMetadata guesses artist - title pattern', () => {
  const dash = parseFileMetadata('Tulus_Monokrom_id123.mp3');
  assert.equal(dash.title, 'Tulus Monokrom id123');

  const withDash = parseFileMetadata('Tulus - Monokrom.mp3');
  assert.equal(withDash.artist, 'Tulus');
  assert.equal(withDash.title, 'Monokrom');

  const empty = parseFileMetadata('');
  assert.equal(empty.title, 'Tanpa Judul');
});

test('formatTrackDuration formats seconds to m:ss', () => {
  assert.equal(formatTrackDuration(213), '3:33');
  assert.equal(formatTrackDuration(65), '1:05');
  assert.equal(formatTrackDuration(null), null);
  assert.equal(formatTrackDuration(0), null);
  assert.equal(formatTrackDuration(-5), null);
});

test('toPlayableSrc passes through web URLs untouched', () => {
  assert.equal(toPlayableSrc('blob:https://x/abc'), 'blob:https://x/abc');
  assert.equal(toPlayableSrc('https://cdn.example/a.mp3'), 'https://cdn.example/a.mp3');
  assert.equal(toPlayableSrc(''), null);
});

test('mergeScanResults adds new tracks and refreshes existing URIs', () => {
  const library = [
    { id: 'scan:Download/Arloader/a.mp3', title: 'A', uri: 'old-uri' },
  ];
  const scanned = [
    { id: 'scan:Download/Arloader/a.mp3', title: 'A', uri: 'new-uri' },
    { id: 'scan:Download/Arloader/b.mp3', title: 'B', uri: 'uri-b' },
  ];
  const merged = mergeScanResults(library, scanned);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((t) => t.title === 'A').uri, 'new-uri');
  assert.equal(merged.find((t) => t.title === 'A').unavailable, false);
});

test('removeTrack drops track by id', () => {
  const tracks = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(removeTrack(tracks, 'a'), [{ id: 'b' }]);
});
