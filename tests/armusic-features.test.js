import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLrc,
  activeLyricIndex,
  scoreCandidate,
  toResult,
  lyricsCacheKey,
} from '../src/services/lyrics.js';
import {
  isMediaSessionSupported,
  sanitizeMetadata,
} from '../src/services/mediaSession.js';

test('parseLrc: parses synced timestamps into seconds correctly', () => {
  const lrc = `[00:04.10] Di suatu malam
[00:08.50] Yang sunyi dan hening
[01:12.00] Di sana ada cerita
`;
  const result = parseLrc(lrc);
  assert.equal(result.length, 3);
  assert.equal(result[0].text, 'Di suatu malam');
  assert.ok(Math.abs(result[0].t - 4.10) < 0.001);
  assert.equal(result[1].text, 'Yang sunyi dan hening');
  assert.ok(Math.abs(result[1].t - 8.50) < 0.001);
  assert.equal(result[2].text, 'Di sana ada cerita');
  assert.ok(Math.abs(result[2].t - 72.00) < 0.001);
});

test('parseLrc: ignores headers like [ar:], [ti:], [by:]', () => {
  const lrc = `[ar: Tulus]
[ti: Monokrom]
[al: Monokrom]
[length: 03:34]
[00:02.00] Lembaran foto hitam putih
[00:06.50] Aku coba ingat lagi
`;
  const result = parseLrc(lrc);
  assert.equal(result.length, 2);
  assert.equal(result[0].text, 'Lembaran foto hitam putih');
  assert.equal(result[1].text, 'Aku coba ingat lagi');
});

test('parseLrc: handles empty or invalid text safely', () => {
  assert.deepEqual(parseLrc(''), []);
  assert.deepEqual(parseLrc(null), []);
  assert.deepEqual(parseLrc('Bukan format LRC sama sekali\nBaris kedua'), []);
});

test('activeLyricIndex: picks active line based on current playback seconds', () => {
  const lines = [
    { t: 0, text: 'Intro' },
    { t: 5, text: 'Baris 1' },
    { t: 10, text: 'Baris 2' },
    { t: 15, text: 'Baris 3' },
  ];
  assert.equal(activeLyricIndex(lines, 0), 0);
  assert.equal(activeLyricIndex(lines, 3), 0);
  assert.equal(activeLyricIndex(lines, 5), 1);
  assert.equal(activeLyricIndex(lines, 7.5), 1);
  assert.equal(activeLyricIndex(lines, 10), 2);
  assert.equal(activeLyricIndex(lines, 14.8), 2); // 14.8 + 0.15 = 14.95 < 15
  assert.equal(activeLyricIndex(lines, 15), 3);   // 15 + 0.15 >= 15
  assert.equal(activeLyricIndex(lines, 20), 3);
  assert.equal(activeLyricIndex([], 5), -1);
});

test('lyricsCacheKey: normalizes artist and title to lowercase trimmed key', () => {
  assert.equal(
    lyricsCacheKey('  Tulus  ', ' Monokrom  '),
    'tulus :: monokrom'
  );
});

test('scoreCandidate: scores exact title & artist matches highest', () => {
  const exact = { trackName: 'Monokrom', artistName: 'Tulus', duration: 214 };
  const partial = { trackName: 'Monokrom (Cover)', artistName: 'Orang Lain', duration: 180 };
  const sExact = scoreCandidate(exact, 'Tulus', 'Monokrom', 214);
  const sPartial = scoreCandidate(partial, 'Tulus', 'Monokrom', 214);
  assert.ok(sExact > sPartial, `Expected ${sExact} > ${sPartial}`);
});

test('toResult: converts lrclib payload with parsed synced lyrics', () => {
  const res = toResult({
    trackName: 'Monokrom',
    artistName: 'Tulus',
    syncedLyrics: '[00:02.00] Baris satu\n[00:05.00] Baris dua',
    plainLyrics: 'Baris satu\nBaris dua',
    duration: 214,
  });
  assert.equal(res.found, true);
  assert.equal(res.synced.length, 2);
  assert.equal(res.synced[0].text, 'Baris satu');
  assert.equal(res.trackName, 'Monokrom');
});

test('isMediaSessionSupported: returns boolean safely in node or browser', () => {
  const supported = isMediaSessionSupported();
  assert.equal(typeof supported, 'boolean');
});

test('sanitizeMetadata: cleans nulls, strings, and sets fallbacks', () => {
  const clean = sanitizeMetadata({
    title: '   Lagu Keren   ',
    artist: null,
    album: '',
  });
  assert.equal(clean.title, 'Lagu Keren');
  assert.equal(clean.artist, 'Unknown Artist');
  assert.equal(clean.album, 'ArMusic');
});
