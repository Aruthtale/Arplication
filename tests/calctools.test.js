import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discount, markup, vat, splitBill, percentOf, percentChange,
  aspectRatio, ageFromDate, daysBetween, convertUnit, UNIT_CATEGORIES,
  formatRupiah, round2, gcd,
} from '../src/utils/calcTools.js';

test('round2 & formatRupiah', () => {
  assert.equal(round2(1.2345), 1.23);
  assert.match(formatRupiah(150000), /150\.000/);
});

test('gcd', () => {
  assert.equal(gcd(1920, 1080), 120);
  assert.equal(gcd(0, 0), 1);
});

test('percentOf & percentChange', () => {
  assert.equal(percentOf(15, 200000), 30000);
  assert.equal(percentChange(100, 150), 50);
  assert.equal(percentChange(100, 50), -50);
  assert.equal(percentChange(0, 50), null);
});

test('discount hitung potongan & harga akhir', () => {
  const d = discount(100000, 20);
  assert.equal(d.amount, 20000);
  assert.equal(d.final, 80000);
  // clamp 0..100
  assert.equal(discount(100000, 150).final, 0);
  assert.equal(discount(100000, -5).final, 100000);
});

test('markup menaikkan harga', () => {
  const m = markup(100000, 25);
  assert.equal(m.amount, 25000);
  assert.equal(m.final, 125000);
});

test('vat exclusive & inclusive', () => {
  const ex = vat(100000, 11, 'exclusive');
  assert.equal(ex.tax, 11000);
  assert.equal(ex.total, 111000);
  const inc = vat(111000, 11, 'inclusive');
  assert.equal(inc.base, 100000);
  assert.equal(inc.tax, 11000);
  assert.equal(inc.total, 111000);
});

test('splitBill membagi rata + tip', () => {
  const s = splitBill(100000, 4, 10);
  assert.equal(s.tip, 10000);
  assert.equal(s.grand, 110000);
  assert.equal(s.perPerson, 27500);
  assert.equal(s.people, 4);
  // minimal 1 orang
  assert.equal(splitBill(10000, 0).people, 1);
});

test('aspectRatio menyederhanakan', () => {
  assert.equal(aspectRatio(1920, 1080).label, '16:9');
  assert.equal(aspectRatio(1000, 1000).label, '1:1');
  assert.equal(aspectRatio(0, 100), null);
});

test('daysBetween', () => {
  assert.equal(daysBetween('2024-01-01', '2024-01-31'), 30);
  assert.equal(daysBetween('bad', '2024-01-31'), null);
});

test('ageFromDate menghitung umur', () => {
  const a = ageFromDate('2000-01-01', new Date('2025-06-15'));
  assert.equal(a.years, 25);
  assert.equal(a.months, 5);
  assert.equal(a.days, 14);
  assert.ok(a.totalDays > 9000);
  assert.equal(ageFromDate('bad'), null);
});

test('convertUnit panjang & data', () => {
  assert.equal(convertUnit(1, 'm', 'cm', 'panjang'), 100);
  assert.equal(convertUnit(1024, 'MB', 'GB', 'data'), 1);
  assert.equal(convertUnit(1000, 'g', 'kg', 'berat'), 1);
});

test('convertUnit suhu', () => {
  assert.equal(convertUnit(100, '°C', '°F', 'suhu'), 212);
  assert.equal(convertUnit(0, '°C', 'K', 'suhu'), 273.15);
  assert.equal(convertUnit(32, '°F', '°C', 'suhu'), 0);
});

test('convertUnit input tak valid → null', () => {
  assert.equal(convertUnit('abc', 'm', 'cm', 'panjang'), null);
  assert.equal(convertUnit(1, 'm', 'cm', 'ngawur'), null);
  assert.equal(convertUnit(1, 'xx', 'cm', 'panjang'), null);
});

test('UNIT_CATEGORIES punya kategori utama', () => {
  for (const k of ['panjang', 'berat', 'luas', 'volume', 'data', 'waktu', 'suhu']) {
    assert.ok(UNIT_CATEGORIES[k], `kategori ${k} hilang`);
    assert.ok(Object.keys(UNIT_CATEGORIES[k].units).length >= 2);
  }
});
