import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldEnableDnd, dndStatusLabel, DEFAULT_DND_STATE,
} from '../src/services/dnd.js';

// ------------------------------------------------------------ Ardoro DND

// Mode Jangan Ganggu (DND) menyala HANYA saat fase fokus dan hanya bila
// preferensi otomatis ON. Ini cermin dari DndStore.applyForPhase di native —
// bila keduanya berbeda, DND bisa nyala saat istirahat (bug).

test('shouldEnableDnd: hanya fase fokus + auto ON', () => {
  assert.equal(shouldEnableDnd('focus', true), true);
  assert.equal(shouldEnableDnd('focus', false), false);
  assert.equal(shouldEnableDnd('short', true), false);
  assert.equal(shouldEnableDnd('long', true), false);
  assert.equal(shouldEnableDnd('focus', undefined), false);
});

test('dndStatusLabel: memetakan status ke label UI', () => {
  assert.equal(dndStatusLabel({ supported: false }), 'TIDAK DIDUKUNG');
  assert.equal(dndStatusLabel({ supported: true, granted: false }), 'PERLU IZIN');
  assert.equal(dndStatusLabel({ supported: true, granted: true, auto: false }), 'MANUAL');
  assert.equal(dndStatusLabel({ supported: true, granted: true, auto: true, active: true }), 'HENING AKTIF');
  assert.equal(dndStatusLabel({ supported: true, granted: true, auto: true, active: false }), 'SIAP');
});

test('DEFAULT_DND_STATE: default aman (tidak mengklaim aktif)', () => {
  assert.equal(DEFAULT_DND_STATE.supported, false);
  assert.equal(DEFAULT_DND_STATE.granted, false);
  assert.equal(DEFAULT_DND_STATE.active, false);
  assert.equal(DEFAULT_DND_STATE.auto, true);
});
