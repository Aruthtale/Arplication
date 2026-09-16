import { registerPlugin } from '@capacitor/core';
import { isNative } from './http.js';

/**
 * Bridge native ArMusic — playback ExoPlayer + notifikasi MediaStyle.
 *
 * Arsitektur anti-kill: audio DIMAINKAN ExoPlayer di foreground service
 * (tetap jalan saat app background/layar mati). WebView <audio> hanya
 * fallback untuk sumber non-native (blob: hasil file-picker).
 * No-op aman di web (Capacitor web fallback akan reject -> ditangkap).
 */

const ArMusic = registerPlugin('ArMusic');

let lastMeta = null;

// True bila instance native punya method playback (bukan sekadar show/dismiss).
let nativePlaybackCache = null;

function sameMeta(meta) {
  return lastMeta
    && lastMeta.title === meta.title
    && lastMeta.artist === meta.artist
    && lastMeta.album === meta.album
    && lastMeta.playing === meta.playing;
}

/**
 * Tampilkan / perbarui notifikasi musik native.
 * Dipanggil tiap play, resume, pause, dan ganti lagu.
 */
export async function showNativeNowPlaying({ title, artist, album, playing = true } = {}) {
  if (!isNative()) return false;
  const meta = {
    title: String(title || 'Tanpa Judul'),
    artist: String(artist || 'Artis Tidak Dikenal'),
    album: String(album || 'ArMusic'),
    playing: Boolean(playing),
  };
  if (sameMeta(meta)) return true;
  lastMeta = meta;
  try {
    await ArMusic.show(meta);
    return true;
  } catch (e) {
    console.warn('ArMusic native show gagal:', e);
    lastMeta = null;
    return false;
  }
}

/** Sembunyikan notifikasi musik native (stop / hapus lagu). */
export async function dismissNativeNowPlaying() {
  lastMeta = null;
  if (!isNative()) return;
  try {
    await ArMusic.dismiss();
  } catch (e) {
    console.warn('ArMusic native dismiss gagal:', e);
  }
}

/**
 * Dengarkan aksi tombol dari notifikasi/lockscreen/headset + event native
 * (advanced saat auto-next, queue-ended, error).
 * @param {(event: { action: string, index?: number, title?: string, artist?: string, album?: string, uri?: string, message?: string }) => void} cb
 * @returns {() => void} fungsi unsubscribe
 */
export function onNativeMediaControl(cb) {
  if (!isNative() || typeof cb !== 'function') return () => {};
  let handle = null;
  try {
    const p = ArMusic.addListener('mediaControl', (ev) => {
      const action = String(ev?.action || '').toLowerCase();
      if ([
        'toggle', 'next', 'prev', 'stop',
        'advanced', 'queue-ended', 'queueended', 'error',
        'sleep-ended', 'sleepended',
      ].includes(action)) cb({ ...(ev || {}), action });
    });
    // addListener Capacitor 7 mengembalikan Promise<PluginListenerHandle>
    if (p && typeof p.then === 'function') {
      p.then((h) => { handle = h; }).catch(() => {});
      return () => { try { handle?.remove?.(); } catch { /* abaikan */ } };
    }
    handle = p;
    return () => { try { handle?.remove?.(); } catch { /* abaikan */ } };
  } catch {
    return () => {};
  }
}

// ------------------------------------------------------------------ native playback

/**
 * True bila URI bisa dimainkan ExoPlayer native.
 * blob:/data: HANYA bisa WebView <audio> (hasil file-picker) → fallback.
 * file://, content://, http(s):// → native.
 */
export function isNativePlayableUri(uri = '') {
  const u = String(uri || '');
  if (!u) return false;
  if (/^(blob:|data:)/i.test(u)) return false;
  return true;
}

/**
 * True bila plugin native versi ExoPlayer (punya method play/seek/getState).
 * Hasil di-cache; panggil resetNativePlaybackCache() bila perlu re-detect.
 */
export async function nativePlaybackSupported() {
  if (!isNative()) return false;
  if (nativePlaybackCache !== null) return nativePlaybackCache;
  try {
    await ArMusic.getState();
    nativePlaybackCache = true;
  } catch {
    // Plugin lama (hanya show/dismiss) → anggap tidak support playback native.
    nativePlaybackCache = false;
  }
  return nativePlaybackCache;
}

export function resetNativePlaybackCache() {
  nativePlaybackCache = null;
}

/**
 * Keputusan routing playback — fungsi murni (testable di node).
 * Native-first: pakai ExoPlayer bila plugin support DAN uri playable native.
 * blob:/data: (hasil file-picker) selalu fallback WebView <audio>.
 */
export function shouldUseNativePlayback({ nativeSupported = false, uri = '' } = {}) {
  return Boolean(nativeSupported) && isNativePlayableUri(uri);
}

function buildQueueJson(items = []) {
  return JSON.stringify(items.map((t) => ({
    uri: String(t.uri || ''),
    title: String(t.title || 'Tanpa Judul'),
    artist: String(t.artist || 'Artis Tidak Dikenal'),
    album: String(t.folder || t.album || 'ArMusic'),
  })));
}

/**
 * Mainkan queue di ExoPlayer native. items = array track { uri, title, artist, folder }.
 * @returns true bila perintah terkirim ke native.
 */
export async function playNativeQueue(items = [], index = 0, { positionMs = 0, repeatOne = false } = {}) {
  if (!isNative()) return false;
  try {
    await ArMusic.play({
      queueJson: buildQueueJson(items),
      index: Math.max(0, index),
      positionMs: Math.max(0, Math.floor(positionMs)),
      repeatOne: Boolean(repeatOne),
    });
    lastMeta = null; // notif kini dipegang service — cache meta lama tidak berlaku
    return true;
  } catch (e) {
    console.warn('ArMusic native play gagal:', e);
    return false;
  }
}

/** Sinkronkan ulang queue native (mis. shuffle on/off) tanpa memutus lagu aktif. */
export async function updateNativeQueue(items = [], index = -1, repeatOne = false) {
  if (!isNative()) return false;
  try {
    await ArMusic.updateQueue({
      queueJson: buildQueueJson(items),
      index,
      repeatOne: Boolean(repeatOne),
    });
    return true;
  } catch (e) {
    console.warn('ArMusic native updateQueue gagal:', e);
    return false;
  }
}

async function callNativeVoid(method, arg) {
  if (!isNative()) return false;
  try {
    await ArMusic[method](arg);
    return true;
  } catch (e) {
    console.warn(`ArMusic native ${method} gagal:`, e);
    return false;
  }
}

export const pauseNativePlayback = () => callNativeVoid('pause');
export const resumeNativePlayback = () => callNativeVoid('resume');
export const toggleNativePlayback = () => callNativeVoid('toggle');
export const nextNativeTrack = () => callNativeVoid('next');
export const prevNativeTrack = () => callNativeVoid('prev');
export const stopNativePlayback = () => callNativeVoid('stop');

/** @param {number} positionMs posisi detik*1000 */
export function seekNativePlayback(positionMs) {
  return callNativeVoid('seek', { positionMs: Math.max(0, Math.floor(positionMs || 0)) });
}

/**
 * Poll state dari service: { playing, index, queueSize, positionMs, durationMs }.
 * @returns null bila native tidak tersedia / gagal.
 */
export async function getNativePlaybackState() {
  if (!isNative()) return null;
  try {
    const s = await ArMusic.getState();
    return {
      playing: Boolean(s?.playing),
      index: Number(s?.index ?? 0),
      queueSize: Number(s?.queueSize ?? 0),
      positionMs: Math.max(0, Number(s?.positionMs ?? 0)),
      durationMs: Math.max(0, Number(s?.durationMs ?? 0)),
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ Fase 2: EQ + sleep timer

/** Label frekuensi ramah-baca: 60000 mHz -> "60 Hz", 1400000 -> "1.4 kHz". */
export function formatEqFreq(milliHz) {
  const hz = Number(milliHz || 0) / 1000;
  if (!Number.isFinite(hz) || hz <= 0) return '--';
  if (hz >= 1000) {
    const k = hz / 1000;
    return `${Number(k.toFixed(k >= 10 ? 0 : 1))} kHz`;
  }
  return `${Math.round(hz)} Hz`;
}

/** dB dari millibel: 1200 -> "+12 dB". */
export function formatEqGain(milliBel) {
  const db = Number(milliBel || 0) / 100;
  const sign = db > 0 ? '+' : '';
  return `${sign}${Number(db.toFixed(1))} dB`;
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  try {
    if (v && typeof v.length === 'number') return Array.from(v);
  } catch { /* abaikan */ }
  return [];
}

/**
 * Baca info EQ native: { supported, attached, enabled, bandCount, minGainMb,
 * maxGainMb, centerFreqs[], gains[], presetCount, presetNames[], presetIndex }.
 * @returns null bila bukan native / plugin lama.
 */
export async function getNativeEqualizer() {
  if (!isNative()) return null;
  try {
    const s = await ArMusic.getEqualizer();
    return {
      supported: s?.supported !== false,
      attached: Boolean(s?.attached),
      enabled: Boolean(s?.enabled),
      sessionId: Number(s?.sessionId ?? 0),
      bandCount: Math.max(0, Number(s?.bandCount ?? 0)),
      minGainMb: Number(s?.minGainMb ?? -1500),
      maxGainMb: Number(s?.maxGainMb ?? 1500),
      centerFreqs: toArray(s?.centerFreqs).map(Number),
      gains: toArray(s?.gains).map(Number),
      presetCount: Math.max(0, Number(s?.presetCount ?? 0)),
      presetNames: toArray(s?.presetNames).map(String),
      presetIndex: Number(s?.presetIndex ?? -1),
    };
  } catch {
    return null;
  }
}

export function setNativeEqualizerEnabled(enabled) {
  return callNativeVoid('setEqualizerEnabled', { enabled: Boolean(enabled) });
}

export function setNativeEqualizerBand(band, gainMb) {
  return callNativeVoid('setEqualizerBand', {
    band: Math.max(0, Math.floor(Number(band) || 0)),
    gainMb: Math.floor(Number(gainMb) || 0),
  });
}

export function setNativeEqualizerPreset(preset) {
  return callNativeVoid('setEqualizerPreset', {
    preset: Math.max(0, Math.floor(Number(preset) || 0)),
  });
}

/**
 * Atur sleep timer native (menit). 0 = batalkan.
 * Timer hidup di service + fade-out 3 detik saat habis.
 */
export function setNativeSleepTimer(minutes) {
  return callNativeVoid('setSleepTimer', {
    minutes: Math.max(0, Math.floor(Number(minutes) || 0)),
  });
}

/**
 * Baca status timer: { active, remainingMs, totalMin }.
 * @returns null bila bukan native / plugin lama.
 */
export async function getNativeSleepTimer() {
  if (!isNative()) return null;
  try {
    const s = await ArMusic.getSleepTimer();
    return {
      active: Boolean(s?.active),
      remainingMs: Math.max(0, Number(s?.remainingMs ?? 0)),
      totalMin: Math.max(0, Number(s?.totalMin ?? 0)),
    };
  } catch {
    return null;
  }
}

/** Format sisa timer ms -> "24:59". Murni & testable. */
export function formatSleepRemaining(remainingMs) {
  const totalSec = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
