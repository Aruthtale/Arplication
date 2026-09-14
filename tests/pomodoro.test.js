import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatClock, clampRounds, durationFor, advancePhase,
  recordFocusSession, summarizeStats, todayKey,
  POMODORO_PRESETS, DEFAULT_ARDORO_SETTINGS,
} from '../src/utils/pomodoro.js';

test('formatClock mm:ss', () => {
  assert.equal(formatClock(1500), '25:00');
  assert.equal(formatClock(65), '1:05');
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(-5), '0:00');
});

test('advancePhase: 4 fokus -> long di kelipatan rounds', () => {
  let s = { phase: 'focus', focusDone: 0 };
  s = advancePhase(s, 4); assert.deepEqual(s, { phase: 'short', focusDone: 1 });
  s = advancePhase(s, 4); assert.equal(s.phase, 'focus');
  s = advancePhase({ phase: 'focus', focusDone: 1 }, 4); assert.deepEqual(s, { phase: 'short', focusDone: 2 });
  s = advancePhase({ phase: 'focus', focusDone: 2 }, 4); assert.deepEqual(s, { phase: 'short', focusDone: 3 });
  s = advancePhase({ phase: 'focus', focusDone: 3 }, 4); assert.deepEqual(s, { phase: 'long', focusDone: 4 });
});

test('advancePhase: jeda kembali ke fokus tanpa ubah hitungan', () => {
  assert.deepEqual(advancePhase({ phase: 'short', focusDone: 2 }, 4), { phase: 'focus', focusDone: 2 });
  assert.deepEqual(advancePhase({ phase: 'long', focusDone: 4 }, 4), { phase: 'focus', focusDone: 4 });
});

test('durationFor pakai settings per fase', () => {
  const s = { ...DEFAULT_ARDORO_SETTINGS, focus: 1500, short: 300, long: 900 };
  assert.equal(durationFor('focus', s), 1500);
  assert.equal(durationFor('short', s), 300);
  assert.equal(durationFor('long', s), 900);
});

test('clampRounds 2..8', () => {
  assert.equal(clampRounds(4), 4);
  assert.equal(clampRounds(1), 2);
  assert.equal(clampRounds(99), 8);
});

test('recordFocusSession akumulasi per hari (immutable)', () => {
  const a = recordFocusSession({ days: {} }, 1500, '2026-09-14');
  assert.equal(a.days['2026-09-14'].sessions, 1);
  assert.equal(a.days['2026-09-14'].focusSec, 1500);
  const b = recordFocusSession(a, 1500, '2026-09-14');
  assert.equal(b.days['2026-09-14'].sessions, 2);
  assert.equal(a.days['2026-09-14'].sessions, 1); // input tidak termutasi
});

test('summarizeStats hitung hari ini + total + 7 hari', () => {
  const now = new Date(2026, 8, 14, 10, 0, 0);
  const stats = { days: { [todayKey(now)]: { focusSec: 3000, sessions: 2 }, '2026-09-13': { focusSec: 1500, sessions: 1 } } };
  const sum = summarizeStats(stats, now);
  assert.equal(sum.todaySessions, 2);
  assert.equal(sum.todayMinutes, 50);
  assert.equal(sum.totalSessions, 3);
  assert.equal(sum.last7.length, 7);
});

test('preset tersedia', () => {
  assert.ok(POMODORO_PRESETS.klasik && POMODORO_PRESETS.deep && POMODORO_PRESETS.kilat);
});
