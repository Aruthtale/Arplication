import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlocked, filterApps, DEFAULT_BLOCKER_CONFIG } from '../src/services/appBlocker.js';

// appBlocker.js mengimpor @capacitor/core via http.js; helper murni tidak
// menyentuh native, jadi aman diuji di node.

test('isBlocked — blacklist: blokir hanya yang terdaftar', () => {
  const cfg = { mode: 'blacklist', packages: ['com.zhiliaoapp.musically', 'com.instagram.android'] };
  assert.equal(isBlocked('com.zhiliaoapp.musically', cfg), true);
  assert.equal(isBlocked('com.instagram.android', cfg), true);
  assert.equal(isBlocked('com.discord', cfg), false);
});

test('isBlocked — whitelist: blokir yang TIDAK terdaftar', () => {
  const cfg = { mode: 'whitelist', packages: ['com.whatsapp'] };
  assert.equal(isBlocked('com.whatsapp', cfg), false);
  assert.equal(isBlocked('com.zhiliaoapp.musically', cfg), true);
});

test('isBlocked — whitelist kosong tidak memblokir apa pun (anti terkunci)', () => {
  const cfg = { mode: 'whitelist', packages: [] };
  assert.equal(isBlocked('com.zhiliaoapp.musically', cfg), false);
});

test('isBlocked — input tidak valid aman', () => {
  assert.equal(isBlocked('', { mode: 'blacklist', packages: ['x'] }), false);
  assert.equal(isBlocked('com.x', null), false);
  assert.equal(isBlocked('com.x', { mode: 'blacklist' }), false);
});

test('filterApps — cari berdasarkan label/package dan urut alfabetis', () => {
  const apps = [
    { packageName: 'com.b', label: 'Discord' },
    { packageName: 'com.a', label: 'TikTok' },
    { packageName: 'com.c', label: 'Instagram' },
  ];
  const sorted = filterApps(apps, '');
  assert.deepEqual(sorted.map((a) => a.label), ['Discord', 'Instagram', 'TikTok']);

  const hit = filterApps(apps, 'tik');
  assert.equal(hit.length, 1);
  assert.equal(hit[0].label, 'TikTok');

  const byPkg = filterApps(apps, 'com.c');
  assert.equal(byPkg.length, 1);
  assert.equal(byPkg[0].packageName, 'com.c');
});

test('DEFAULT_BLOCKER_CONFIG memiliki bentuk yang diharapkan', () => {
  assert.equal(DEFAULT_BLOCKER_CONFIG.mode, 'blacklist');
  assert.equal(DEFAULT_BLOCKER_CONFIG.auto, true);
  assert.deepEqual(DEFAULT_BLOCKER_CONFIG.packages, []);
});
