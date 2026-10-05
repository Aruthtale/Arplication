/**
 * ArToolbox — Quick Calculator & Unit Converter (offline, pure & testable).
 */

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function formatRupiah(n) {
  const v = Number(n) || 0;
  return `Rp${v.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}

export function gcd(a, b) {
  let x = Math.abs(Math.round(Number(a) || 0));
  let y = Math.abs(Math.round(Number(b) || 0));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

// ---------------------------------------------------------------- Persen & harga

/** Berapa `pct`% dari `value`. */
export function percentOf(pct, value) {
  return round2(((Number(value) || 0) * (Number(pct) || 0)) / 100);
}

/** Persentase perubahan dari `from` ke `to` (%). */
export function percentChange(from, to) {
  const f = Number(from) || 0;
  const t = Number(to) || 0;
  if (f === 0) return null;
  return round2(((t - f) / Math.abs(f)) * 100);
}

/** Hitung diskon: potongan & harga akhir. */
export function discount(price, pct) {
  const p = Number(price) || 0;
  const d = Math.min(100, Math.max(0, Number(pct) || 0));
  const amount = (p * d) / 100;
  return { amount: round2(amount), final: round2(p - amount), savedPct: d };
}

/** Hitung markup / kenaikan harga. */
export function markup(price, pct) {
  const p = Number(price) || 0;
  const m = Math.max(0, Number(pct) || 0);
  const amount = (p * m) / 100;
  return { amount: round2(amount), final: round2(p + amount) };
}

/**
 * Hitung PPN / pajak.
 * @param {'exclusive'|'inclusive'} mode exclusive: harga belum termasuk pajak.
 */
export function vat(amount, pct = 11, mode = 'exclusive') {
  const a = Number(amount) || 0;
  const p = Math.max(0, Number(pct) || 0);
  if (mode === 'inclusive') {
    const base = a / (1 + p / 100);
    return { base: round2(base), tax: round2(a - base), total: round2(a) };
  }
  const tax = (a * p) / 100;
  return { base: round2(a), tax: round2(tax), total: round2(a + tax) };
}

/** Bagi tagihan rata + tip. */
export function splitBill(total, people, tipPct = 0) {
  const t = Number(total) || 0;
  const p = Math.max(1, Math.floor(Number(people) || 1));
  const tip = (t * Math.max(0, Number(tipPct) || 0)) / 100;
  const grand = t + tip;
  return { tip: round2(tip), grand: round2(grand), perPerson: round2(grand / p), people: p };
}

// ---------------------------------------------------------------- Rasio & tanggal

/** Sederhanakan rasio lebar:tinggi, mis. 1920x1080 → 16:9. */
export function aspectRatio(w, h) {
  const W = Math.round(Number(w) || 0);
  const H = Math.round(Number(h) || 0);
  if (W <= 0 || H <= 0) return null;
  const g = gcd(W, H);
  const rw = W / g;
  const rh = H / g;
  return { w: rw, h: rh, label: `${rw}:${rh}`, decimal: round2(W / H) };
}

/** Selisih hari antara dua tanggal (b − a). */
export function daysBetween(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null;
  return Math.round((d2 - d1) / 86400000);
}

/** Hitung umur (tahun, bulan, hari) dari tanggal lahir. */
export function ageFromDate(dateStr, now = new Date()) {
  const d = new Date(dateStr);
  const n = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(d.getTime()) || Number.isNaN(n.getTime())) return null;
  let years = n.getFullYear() - d.getFullYear();
  let months = n.getMonth() - d.getMonth();
  let days = n.getDate() - d.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(n.getFullYear(), n.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalDays = Math.floor((n - d) / 86400000);
  return { years, months, days, totalDays };
}

// ---------------------------------------------------------------- Konversi unit

export const UNIT_CATEGORIES = {
  panjang: {
    label: 'Panjang',
    units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  },
  berat: {
    label: 'Berat',
    units: { mg: 1e-6, g: 0.001, kg: 1, ton: 1000, oz: 0.028349523125, lb: 0.45359237 },
  },
  luas: {
    label: 'Luas',
    units: { 'mm2': 1e-6, 'cm2': 1e-4, 'm2': 1, 'km2': 1e6, ha: 1e4, are: 100, acre: 4046.8564224 },
  },
  volume: {
    label: 'Volume',
    units: { ml: 0.001, l: 1, 'm3': 1000, gal: 3.785411784, cup: 0.2365882365 },
  },
  data: {
    label: 'Data',
    units: { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 },
  },
  waktu: {
    label: 'Waktu',
    units: { ms: 0.001, s: 1, menit: 60, jam: 3600, hari: 86400, minggu: 604800 },
  },
  suhu: {
    label: 'Suhu',
    units: { '°C': 1, '°F': 1, K: 1 },
  },
};

function convertTemperature(value, from, to) {
  let c;
  if (from === '°C') c = value;
  else if (from === '°F') c = ((value - 32) * 5) / 9;
  else if (from === 'K') c = value - 273.15;
  else return NaN;

  if (to === '°C') return c;
  if (to === '°F') return (c * 9) / 5 + 32;
  if (to === 'K') return c + 273.15;
  return NaN;
}

/**
 * Konversi satuan. Mengembalikan number atau null bila tidak valid.
 */
export function convertUnit(value, from, to, category) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (category === 'suhu') {
    const r = convertTemperature(n, from, to);
    return Number.isFinite(r) ? round2(r) : null;
  }
  const cat = UNIT_CATEGORIES[category];
  if (!cat) return null;
  const f = cat.units[from];
  const t = cat.units[to];
  if (!f || !t) return null;
  return round2((n * f) / t);
}
