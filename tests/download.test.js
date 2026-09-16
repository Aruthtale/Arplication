import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeFilename,
  buildFilename,
  resolveSubfolderPath,
} from '../src/utils/download.js';

test('sanitizeFilename removes null bytes and encoded null bytes', () => {
  assert.equal(sanitizeFilename('track\x00malicious.mp3'), 'trackmalicious.mp3');
  assert.equal(sanitizeFilename('track%00malicious.mp3'), 'trackmalicious.mp3');
  assert.equal(sanitizeFilename('evil\u0000file.mp4'), 'evilfile.mp4');
});

test('sanitizeFilename prevents directory traversal sequences', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'etc_passwd');
  assert.equal(sanitizeFilename('..\\..\\windows\\system32'), 'windows_system32');
  assert.equal(sanitizeFilename('....//....//boot//vmlinuz'), 'boot_vmlinuz');
  assert.equal(sanitizeFilename('..'), 'media');
  assert.equal(sanitizeFilename('.'), 'media');
  assert.equal(sanitizeFilename('../'), 'media');
  assert.equal(sanitizeFilename('...'), 'media');
});

test('sanitizeFilename neutralizes illegal filesystem characters', () => {
  assert.equal(sanitizeFilename('Song: Best *Hits*? [2026] <Live>.mp3'), 'Song_ Best _Hits_ [2026] _Live_.mp3');
  assert.equal(sanitizeFilename('title|with"quotes"'), 'title_with_quotes');
});

test('sanitizeFilename protects against Windows reserved DOS device names', () => {
  assert.equal(sanitizeFilename('CON.txt'), 'file_CON.txt');
  assert.equal(sanitizeFilename('prn.mp3'), 'file_prn.mp3');
  assert.equal(sanitizeFilename('AUX.bin'), 'file_AUX.bin');
  assert.equal(sanitizeFilename('NUL.wav'), 'file_NUL.wav');
  assert.equal(sanitizeFilename('com1.ogg'), 'file_com1.ogg');
  assert.equal(sanitizeFilename('LPT3.flac'), 'file_LPT3.flac');
});

test('sanitizeFilename strips leading/trailing dots and whitespace', () => {
  assert.equal(sanitizeFilename('   .hidden_file.mp3   '), 'hidden_file.mp3');
  assert.equal(sanitizeFilename('trailing_dots....'), 'trailing_dots');
});

test('sanitizeFilename uses fallback when input is empty or invalid', () => {
  assert.equal(sanitizeFilename(''), 'media');
  assert.equal(sanitizeFilename(null), 'media');
  assert.equal(sanitizeFilename(undefined), 'media');
  assert.equal(sanitizeFilename('   ', 'default_fallback.mp3'), 'default_fallback.mp3');
  assert.equal(sanitizeFilename('///', 'fallback'), 'fallback');
});

test('buildFilename produces safe sanitized filenames with metadata', () => {
  const file = buildFilename({
    title: '../../Secret Track *Live*',
    author: 'Daft / Punk',
    platform: 'youtube',
    optionId: 'audio_128',
    ext: 'mp3',
    pattern: 'title_id',
  });
  assert.ok(!file.includes('..'));
  assert.ok(!file.includes('/'));
  assert.ok(!file.includes('*'));
  assert.ok(file.endsWith('.mp3'));
});

test('resolveSubfolderPath prevents path traversal across subfolder segments', () => {
  const safePath1 = resolveSubfolderPath('../../etc', 'youtube');
  assert.ok(!safePath1.includes('..'));
  assert.equal(safePath1, 'etc');

  const safePath2 = resolveSubfolderPath('Arloader/../../../Sensitive', 'tiktok');
  assert.ok(!safePath2.includes('..'));
  assert.equal(safePath2, 'Arloader/Sensitive');

  const normalPath = resolveSubfolderPath('Arloader/{platform}', 'spotify');
  assert.equal(normalPath, 'Arloader/Spotify');
});
