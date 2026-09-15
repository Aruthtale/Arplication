/**
 * MediaSession integration — notifikasi media ala Spotify/Joox di
 * notification shade Android + lockscreen + kontrol headset/Bluetooth.
 *
 * Murni Web API (navigator.mediaSession), tanpa plugin native:
 *  - Judul/artis/album + artwork tampil di notif
 *  - Tombol play/pause/previous/next di shade & lockscreen
 *  - Tombol headset & Bluetooth ikut berfungsi
 *  - Berfungsi di APK (WebView Chromium) maupun browser desktop
 *
 * Catatan batasan WebView: audio berhenti saat app di-background
 * kecuali ada foreground service. Notif ini tetap muncul & bisa
 * dipakai mengganti lagu saat layar mati selama WebView hidup
 * (mis. layar kunci / split window). Untuk background playback penuh
 * perlu plugin native (langkah lanjutan, lihat BUGFIX-PLAN).
 */

const ACTION_HANDLERS = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward'];

export function isMediaSessionSupported() {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

/**
 * Sanitize metadata strings for MediaSession (trim, fallback).
 */
export function sanitizeMetadata({ title = '', artist = '', album = '' } = {}) {
  return {
    title: String(title || '').trim() || 'Tanpa Judul',
    artist: String(artist || '').trim() || 'Unknown Artist',
    album: String(album || '').trim() || 'ArMusic',
  };
}

/**
 * Pasang metadata + action handler untuk track yang sedang diputar.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.artist
 * @param {string} [opts.album]
 * @param {string} [opts.artworkUrl] - absolute URL artwork (fallback ke armusic.svg)
 * @param {Function} opts.onPlay
 * @param {Function} opts.onPause
 * @param {Function} opts.onPrev
 * @param {Function} opts.onNext
 * @param {Function} [opts.onSeek] - (seconds) => void
 */
export function publishNowPlaying({
  title = 'Tanpa Judul',
  artist = 'Artis Tidak Dikenal',
  album = 'ArMusic',
  artworkUrl = '',
  onPlay,
  onPause,
  onPrev,
  onNext,
  onSeek,
} = {}) {
  if (!isMediaSessionSupported()) return false;
  try {
    const ms = navigator.mediaSession;
    const artwork = artworkUrl || resolveArtwork();
    ms.metadata = new MediaMetadata({
      title: String(title || 'Tanpa Judul'),
      artist: String(artist || 'Artis Tidak Dikenal'),
      album: String(album || 'ArMusic'),
      artwork: artwork
        ? [
            { src: artwork, sizes: '512x512', type: 'image/svg+xml' },
          ]
        : [],
    });
    const handlers = { play: onPlay, pause: onPause, previoustrack: onPrev, nexttrack: onNext };
    for (const [action, fn] of Object.entries(handlers)) {
      try {
        ms.setActionHandler(action, typeof fn === 'function' ? () => fn() : null);
      } catch { /* aksi tidak didukung perangkat — abaikan */ }
    }
    // Seek (progress bar di notif, jika didukung OS)
    try {
      ms.setActionHandler('seekto', typeof onSeek === 'function'
        ? (details) => { if (Number.isFinite(details?.seekTime)) onSeek(details.seekTime); }
        : null);
    } catch { /* abaikan */ }
    try {
      ms.setActionHandler('seekbackward', typeof onSeek === 'function'
        ? (details) => onSeek?.(Math.max(0, (details?.seekTime ?? 0) - 10))
        : null);
    } catch { /* abaikan */ }
    try {
      ms.setActionHandler('seekforward', typeof onSeek === 'function'
        ? (details) => onSeek?.((details?.seekTime ?? 0) + 10)
        : null);
    } catch { /* abaikan */ }
    ms.playbackState = 'playing';
    return true;
  } catch (e) {
    console.warn('publishNowPlaying gagal:', e);
    return false;
  }
}

/**
 * Update status play/pause (ikon di notif ikut berubah).
 */
export function setPlaybackState(playing) {
  if (!isMediaSessionSupported()) return;
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  } catch { /* abaikan */ }
}

/**
 * Update posisi lagu (progress bar di notif lockscreen/shade).
 */
export function setPositionState({ duration = 0, position = 0, playbackRate = 1 } = {}) {
  if (!isMediaSessionSupported()) return;
  try {
    if (typeof navigator.mediaSession.setPositionState === 'function'
      && Number.isFinite(duration) && duration > 0
      && Number.isFinite(position) && position >= 0) {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1,
        position: Math.min(Math.max(0, position), duration),
      });
    }
  } catch { /* abaikan */ }
}

/**
 * Bersihkan metadata saat berhenti total (opsional — biar notif hilang).
 */
export function clearNowPlaying() {
  if (!isMediaSessionSupported()) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    for (const action of ACTION_HANDLERS) {
      try { navigator.mediaSession.setActionHandler(action, null); } catch { /* abaikan */ }
    }
  } catch { /* abaikan */ }
}

function resolveArtwork() {
  // Artwork default ArMusic — absolute biar bisa dibaca SystemUI.
  try {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/armusic.svg`;
    }
  } catch { /* abaikan */ }
  return '/armusic.svg';
}
