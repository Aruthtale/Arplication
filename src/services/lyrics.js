/**
 * Lyrics service — lirik lagu via lrclib.net (gratis, tanpa API key).
 *
 * - GET /api/get?artist_name=&track_name= → tepat sasaran (synced + plain)
 * - Fallback /api/search?q= → pilih kandidat terbaik (skor judul+artis, toleransi durasi)
 * - Cache localStorage 200 entri agar offline & hemat kuota
 * - Parser LRC "[mm:ss.xx] teks" → [{ t: detik, text }]
 */

import { CapacitorHttp } from '@capacitor/core';
import { isNative } from './http.js';

const LRC_API = 'https://lrclib.net/api';
const CACHE_KEY = 'armusic_lyrics_cache';
const MAX_CACHE = 200;
const FETCH_TIMEOUT_MS = 12000;

function readCache() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    if (typeof localStorage === 'undefined') return;
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE) {
      // buang yang paling lama (insertion order)
      for (const k of keys.slice(0, keys.length - MAX_CACHE)) delete cache[k];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage penuh — abaikan */ }
}

export function clearLyricsCache() {
  try { localStorage?.removeItem(CACHE_KEY); } catch { /* abaikan */ }
}

export function lyricsCacheKey(artist = '', title = '') {
  return `${String(artist || '').toLowerCase().trim()} :: ${String(title || '').toLowerCase().trim()}`;
}

/**
 * Parse LRC synced: "[mm:ss.xx] teks" (boleh banyak tag per baris).
 * Return [{ t, text }] terurut waktu. Baris tanpa teks dilewati.
 */
export function parseLrc(lrc = '') {
  const lines = [];
  const tagRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  for (const rawLine of String(lrc || '').split(/\r?\n/)) {
    tagRe.lastIndex = 0;
    const stamps = [];
    let m;
    while ((m = tagRe.exec(rawLine)) !== null) {
      const min = Number(m[1]);
      const sec = Number(m[2]);
      let frac = 0;
      if (m[3] !== undefined) {
        const f = m[3];
        frac = f.length === 3 ? Number(f) / 1000 : f.length === 2 ? Number(f) / 100 : Number(f) / 10;
      }
      const t = min * 60 + sec + frac;
      if (Number.isFinite(t) && t >= 0) stamps.push(t);
    }
    const text = rawLine.replace(tagRe, '').trim();
    if (!text) continue;
    for (const t of stamps) lines.push({ t, text });
  }
  lines.sort((a, b) => a.t - b.t);
  return lines;
}

/**
 * Indeks baris aktif untuk posisi detik tertentu.
 * Return -1 jika belum ada baris yang mulai (intro).
 */
export function activeLyricIndex(lines = [], positionSec = 0) {
  let idx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].t <= positionSec + 0.15) idx = i;
    else break;
  }
  return idx;
}

async function fetchJson(url) {
  // Native: lewat CapacitorHttp (lolos CORS WebView); web: fetch biasa + timeout.
  if (isNative()) {
    const res = await CapacitorHttp.get({ url, connectTimeout: FETCH_TIMEOUT_MS, readTimeout: FETCH_TIMEOUT_MS });
    const data = typeof res?.data === 'string' ? JSON.parse(res.data) : res?.data;
    if (res?.status >= 400 || data == null) throw new Error(`HTTP ${res?.status || '?'}`);
    return data;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function norm(s = '') {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function scoreCandidate(cand, artist, title, durationSec) {
  const aN = norm(artist);
  const tN = norm(title);
  const caN = norm(cand?.artistName);
  const ctN = norm(cand?.trackName);
  let score = 0;
  if (ctN === tN) score += 4;
  else if (tN && ctN.includes(tN)) score += 2;
  else if (tN && tN.includes(ctN) && ctN) score += 1;
  if (aN && (caN === aN || caN.includes(aN) || aN.includes(caN))) score += 3;
  else if (aN === 'artis tidak dikenal' || !aN) score += 0; // artis tak dikenal — andalkan judul
  const dur = Number(cand?.duration);
  if (Number.isFinite(dur) && Number.isFinite(durationSec) && durationSec > 0) {
    if (Math.abs(dur - durationSec) <= 5) score += 2;
    else if (Math.abs(dur - durationSec) <= 15) score += 1;
    else score -= 1;
  }
  if (cand?.instrumental) score -= 5;
  if (cand?.syncedLyrics) score += 1;
  return score;
}

export function toResult(api) {
  if (!api) return { found: false, synced: [], plain: '', instrumental: false };
  const synced = api.syncedLyrics ? parseLrc(api.syncedLyrics) : [];
  return {
    found: Boolean(api.plainLyrics || synced.length > 0),
    synced,
    plain: api.plainLyrics || '',
    instrumental: Boolean(api.instrumental),
    trackName: api.trackName || '',
    artistName: api.artistName || '',
    albumName: api.albumName || '',
    duration: api.duration ?? null,
  };
}

/**
 * Ambil lirik lagu. Return { found, synced[], plain, instrumental, ... }.
 * Urutan: cache → /api/get → /api/search (fallback).
 */
export async function fetchLyrics({ artist = '', title = '', durationSec = 0 } = {}) {
  const cleanArtist = String(artist || '').trim();
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return { found: false, synced: [], plain: '', instrumental: false };

  const key = lyricsCacheKey(cleanArtist, cleanTitle);
  const cache = readCache();
  if (cache[key]) return cache[key];

  const unknownArtist = !cleanArtist || /artis tidak dikenal/i.test(cleanArtist);

  // 1) Tepat sasaran
  try {
    const params = new URLSearchParams({ track_name: cleanTitle });
    if (!unknownArtist) params.set('artist_name', cleanArtist);
    else params.set('artist_name', '');
    if (Number.isFinite(durationSec) && durationSec > 0) params.set('duration', String(Math.round(durationSec)));
    const direct = await fetchJson(`${LRC_API}/get?${params.toString()}`);
    if (direct && (direct.plainLyrics || direct.syncedLyrics)) {
      const res = toResult(direct);
      cache[key] = res; writeCache(cache);
      return res;
    }
  } catch { /* lanjut fallback */ }

  // 2) Pencarian + skor
  try {
    const q = unknownArtist ? cleanTitle : `${cleanArtist} ${cleanTitle}`;
    const list = await fetchJson(`${LRC_API}/search?q=${encodeURIComponent(q)}`);
    if (Array.isArray(list) && list.length > 0) {
      let best = null; let bestScore = -Infinity;
      for (const cand of list.slice(0, 10)) {
        const s = scoreCandidate(cand, cleanArtist, cleanTitle, durationSec);
        if (s > bestScore) { bestScore = s; best = cand; }
      }
      if (best && bestScore > 0) {
        const res = toResult(best);
        cache[key] = res; writeCache(cache);
        return res;
      }
    }
  } catch { /* gagal total */ }

  const miss = { found: false, synced: [], plain: '', instrumental: false };
  cache[key] = miss; writeCache(cache);
  return miss;
}
