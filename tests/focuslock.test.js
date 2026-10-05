import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampGrace, needsGrace, graceWarningText, formatCountdown, strictLabel, DEFAULT_STRICT,
} from '../src/utils/focusLock.js';
import { DEFAULT_BLOCKER_CONFIG, isBlocked } from '../src/services/appBlocker.js';

// ------------------------------------------------------------ Focus Lock L3

test('clampGrace membatasi 3..60 detik', () => {
  assert.equal(clampGrace(10), 10);
  assert.equal(clampGrace(1), 3);
  assert.equal(clampGrace(999), 60);
  assert.equal(clampGrace('15'), 15);
  assert.equal(clampGrace('abc'), DEFAULT_STRICT.graceSeconds);
});

test('needsGrace hanya saat ketat + fokus jalan + mematikan', () => {
  const cfg = { strict: true };
  assert.equal(needsGrace(cfg, { focusRunning: true, nextValue: false }), true);
  // bukan saat menyalakan
  assert.equal(needsGrace(cfg, { focusRunning: true, nextValue: true }), false);
  // bukan saat fokus tidak jalan
  assert.equal(needsGrace(cfg, { focusRunning: false, nextValue: false }), false);
  // bukan saat mode ketat off
  assert.equal(needsGrace({ strict: false }, { focusRunning: true, nextValue: false }), false);
});

test('graceWarningText kontekstual sesuai durasi fokus', () => {
  assert.match(graceWarningText(0), /baru saja mulai/i);
  assert.match(graceWarningText(120), /2 menit/i);
  assert.match(graceWarningText(600), /10 menit/i);
  assert.match(graceWarningText(1500), /25 menit/i);
});

test('formatCountdown detik & menit', () => {
  assert.equal(formatCountdown(10), '10');
  assert.equal(formatCountdown(0), '0');
  assert.equal(formatCountdown(65), '1:05');
  assert.equal(formatCountdown(9.2), '10');
});

test('strictLabel untuk badge UI', () => {
  assert.equal(strictLabel({ strict: false }), 'NONAKTIF');
  assert.equal(strictLabel({ strict: true, graceSeconds: 10 }), 'AKTIF · 10s');
  assert.equal(strictLabel({ strict: true, graceSeconds: 999 }), 'AKTIF · 60s');
});

test('DEFAULT_BLOCKER_CONFIG memuat field mode ketat', () => {
  assert.equal(DEFAULT_BLOCKER_CONFIG.strict, false);
  assert.equal(DEFAULT_BLOCKER_CONFIG.graceSeconds, 10);
});

test('isBlocked tetap benar (blacklist/whitelist)', () => {
  const black = { mode: 'blacklist', packages: ['com.instagram.android'] };
  assert.equal(isBlocked('com.instagram.android', black), true);
  assert.equal(isBlocked('com.whatsapp', black), false);
  const white = { mode: 'whitelist', packages: ['com.whatsapp'] };
  assert.equal(isBlocked('com.whatsapp', white), false);
  assert.equal(isBlocked('com.instagram.android', white), true);
  assert.equal(isBlocked('com.instagram.android', { mode: 'whitelist', packages: [] }), false);
});
