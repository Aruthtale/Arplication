import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { isNative } from '../services/http.js';
import { sendDownloadCompleteNotification, sendDownloadErrorNotification } from './notification.js';

export const DEFAULT_DOWNLOAD_SETTINGS = {
  directory: 'Downloads', // 'Downloads' | 'Documents'
  subfolder: 'Arloader/{platform}',  // Default: Otomatis pisah folder per-platform (TikTok, Spotify, YouTube, etc)
  autoShare: false,       // whether to pop up "Buka dengan / Bagikan"
  igSessionId: '',        // optional Instagram sessionid cookie
  filenamePattern: 'title_id', // 'title_id' | 'clean_title' | 'id_only'
};

export function formatPlatformFolderName(plat) {
  const p = String(plat || '').toLowerCase().trim();
  switch (p) {
    case 'youtube': return 'YouTube';
    case 'tiktok': return 'TikTok';
    case 'spotify': return 'Spotify';
    case 'instagram': return 'Instagram';
    case 'twitter':
    case 'x': return 'Twitter';
    case 'pinterest': return 'Pinterest';
    case 'soundcloud': return 'SoundCloud';
    default:
      return p ? (p.charAt(0).toUpperCase() + p.slice(1)) : 'General';
  }
}

export function getDownloadSettings() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('arloader_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed.subfolder ||
          parsed.subfolder === 'Arloader' ||
          /^Arloader\/(TikTok|Spotify|YouTube|Instagram|Twitter|Pinterest)$/i.test(parsed.subfolder)
        ) {
          parsed.subfolder = 'Arloader/{platform}';
          saveDownloadSettings(parsed);
        }
        return { ...DEFAULT_DOWNLOAD_SETTINGS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to read download settings:', e);
  }
  return DEFAULT_DOWNLOAD_SETTINGS;
}

export function saveDownloadSettings(settings) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('arloader_settings', JSON.stringify(settings));
    }
  } catch (e) {
    console.warn('Failed to save download settings:', e);
  }
}

/**
 * Build a tidy filename from media metadata + user pattern setting.
 * Patterns: 'title_id' | 'author_title' | 'platform_title_id'
 */
export function buildFilename({ title, author, platform, optionId, ext, pattern }) {
  const clean = (s, len) =>
    String(s || '')
      .replace(/[^\p{L}\p{N}._-]+/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, len) || 'media';
  const t = clean(title, 50);
  const a = clean(author, 30);
  const p = clean(platform, 15);
  const id = clean(optionId, 20);
  let base;
  switch (pattern) {
    case 'author_title':
      base = a !== 'media' ? `${a}_${t}` : `${t}_${id}`;
      break;
    case 'platform_title_id':
      base = `${p}_${t}_${id}`;
      break;
    case 'title_id':
    default:
      base = `${t}_${id}`;
      break;
  }
  return `${base}.${String(ext || 'bin').replace(/[^a-zA-Z0-9]/g, '') || 'bin'}`;
}

/**
 * Map technical errors to user-friendly Indonesian messages.
 */
export function formatDownloadError(err) {
  const msg = String(err?.message || err || '');
  if (/401|403|session|login|cookie/i.test(msg)) {
    return 'Akses ditolak — sesi kedaluwarsa. Perbarui IG Session ID di Pengaturan lalu coba lagi.';
  }
  if (/404|expired|gone|not found/i.test(msg)) {
    return 'Tautan kedaluwarsa atau media sudah dihapus. Ambil ulang link terbaru lalu coba lagi.';
  }
  if (/network|timeout|fetch|failed to fetch|econn|socket/i.test(msg)) {
    return 'Jaringan bermasalah. Periksa koneksi internet lalu coba lagi.';
  }
  if (/HTTP\s*5\d\d/i.test(msg)) {
    return 'Server penyedia sedang sibuk. Tunggu sebentar lalu coba lagi.';
  }
  return `Unduhan gagal (${msg.slice(0, 80) || 'kesalahan tak dikenal'}). Coba lagi.`;
}
/**
 * Format byte count into human readable string (KB/MB/GB).
 */
export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(Number(bytes))) return null;
  const n = Number(bytes);
  if (n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = n;
  let u = 0;
  while (size >= 1024 && u < units.length - 1) {
    size /= 1024;
    u += 1;
  }
  return `${size >= 100 ? Math.round(size) : size.toFixed(size >= 10 ? 1 : 2)} ${units[u]}`;
}

/**
 * Probe remote file size via HEAD (fallback Range 0-0).
 * Returns byte count number or null when unknown.
 */
export async function probeFileSize(url) {
  if (!url) return null;
  // Native: CapacitorHttp HEAD
  if (isNative()) {
    try {
      const res = await CapacitorHttp.request({ url, method: 'HEAD' });
      const headers = res?.headers || {};
      const len = headers['Content-Length'] || headers['content-length'] || headers['Content-length'];
      if (len) {
        const n = Number(len);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch (_) { /* fall through to GET range */ }
    try {
      const res = await CapacitorHttp.request({
        url,
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        responseType: 'blob',
      });
      const headers = res?.headers || {};
      const range = headers['Content-Range'] || headers['content-range'] || '';
      const m = String(range).match(/\/(\d+)\s*$/);
      if (m) {
        const n = Number(m[1]);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch (_) { /* unknown */ }
    return null;
  }

  // Web: fetch HEAD, fallback Range
  try {
    const head = await fetch(url, { method: 'HEAD' });
    const len = head?.headers?.get?.('content-length');
    if (len) {
      const n = Number(len);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch (_) { /* try range */ }
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    const range = r?.headers?.get?.('content-range') || '';
    const m = String(range).match(/\/(\d+)\s*$/);
    if (m) {
      const n = Number(m[1]);
      if (!isNaN(n) && n > 0) return n;
    }
    const len = r?.headers?.get?.('content-length');
    if (len && r.status === 200) {
      const n = Number(len);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch (_) { /* unknown */ }
  return null;
}

/**
 * Resolve subfolder path with automatic platform placeholder support ({platform}).
 */
export function resolveSubfolderPath(rawFolder, platformName = '') {
  let str = String(rawFolder || '').trim();
  const safePlatform = formatPlatformFolderName(platformName);

  if (!str) {
    str = 'Arloader/{platform}';
  }

  if (str.includes('{platform}')) {
    str = str.replace(/\{platform\}/gi, safePlatform || 'General');
  } else if (
    /^Arloader\/(TikTok|Spotify|YouTube|Instagram|Twitter|Pinterest|Media|General)$/i.test(str) ||
    str.toLowerCase() === 'arloader'
  ) {
    str = `Arloader/${safePlatform || 'General'}`;
  }
  return str.replace(/^\/+|\/+$/g, '');
}

/**
 * Save a text file (caption/description) next to downloads.
 */
export async function saveTextFile({ text, filename, platform = '', targetDirectory = null, subfolder = null }) {
  if (!text) throw new Error('Teks kosong.');
  const settings = getDownloadSettings();
  const dirChoice = targetDirectory || settings.directory || 'Downloads';
  const folderChoice = subfolder !== null ? subfolder : settings.subfolder;
  const safeFilename = String(filename || 'caption.txt').replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanSubfolder = resolveSubfolderPath(folderChoice, platform);

  if (isNative()) {
    const base64 = typeof Buffer !== 'undefined'
      ? Buffer.from(text, 'utf-8').toString('base64')
      : btoa(unescape(encodeURIComponent(text)));
    let directoryEnum;
    let relativePath;
    if (dirChoice === 'Documents') {
      directoryEnum = Directory.Documents;
      relativePath = cleanSubfolder ? `${cleanSubfolder}/${safeFilename}` : safeFilename;
    } else {
      directoryEnum = Directory.ExternalStorage;
      const mkdirPath = cleanSubfolder ? `Download/${cleanSubfolder}` : 'Download';
      relativePath = `${mkdirPath}/${safeFilename}`;
    }
    await Filesystem.mkdir({
      path: relativePath.split('/').slice(0, -1).join('/') || '/',
      directory: directoryEnum,
      recursive: true,
    }).catch(() => {});
    const res = await Filesystem.writeFile({
      path: relativePath,
      data: base64,
      directory: directoryEnum,
      recursive: true,
    });
    return { success: true, path: res.uri };
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }, 1500);
  return { success: true };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Initiates file download across Web and Native Mobile
 */
export async function downloadMedia({
  url,
  filename,
  platform = '',
  onProgress,
  targetDirectory = null,
  subfolder = null,
  autoShare = null,
}) {
  if (!url) throw new Error('Download URL is missing.');

  const settings = getDownloadSettings();
  const dirChoice = targetDirectory || settings.directory || 'Downloads';
  const folderChoice = subfolder !== null ? subfolder : settings.subfolder;
  const shouldShare = autoShare !== null ? autoShare : (settings.autoShare ?? false);

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanSubfolder = resolveSubfolderPath(folderChoice, platform);

  // 1. Android Native Environment
  if (isNative()) {
    try {
      if (onProgress) onProgress(10, 'Memeriksa izin penyimpanan...');
      await Filesystem.requestPermissions().catch(() => {});

      let directoryEnum;
      let relativePath;
      let mkdirPath = '';

      if (dirChoice === 'Documents') {
        directoryEnum = Directory.Documents;
        mkdirPath = cleanSubfolder;
        relativePath = cleanSubfolder ? `${cleanSubfolder}/${safeFilename}` : safeFilename;
      } else {
        // Downloads directory on Android (Directory.ExternalStorage points to /storage/emulated/0)
        directoryEnum = Directory.ExternalStorage;
        mkdirPath = cleanSubfolder ? `Download/${cleanSubfolder}` : 'Download';
        relativePath = `${mkdirPath}/${safeFilename}`;
      }

      const targetLabel = dirChoice === 'Documents' ? 'Documents' : 'Download';
      const displayLocation = cleanSubfolder ? `${targetLabel}/${cleanSubfolder}` : targetLabel;

      if (mkdirPath) {
        await Filesystem.mkdir({
          path: mkdirPath,
          directory: directoryEnum,
          recursive: true,
        }).catch((err) => console.warn('mkdir warning:', err));
      }

      let resPath = null;

      // Method A: Filesystem.downloadFile
      try {
        if (onProgress) onProgress(30, 'Mengunduh file ke penyimpanan...');
        const res = await Filesystem.downloadFile({
          url,
          path: relativePath,
          directory: directoryEnum,
          recursive: true,
          progress: true,
        });
        resPath = res.path;
      } catch (dlErr) {
        console.warn('downloadFile failed, attempting internal blob-write fallback:', dlErr);

        if (onProgress) onProgress(45, 'Mengambil data media...');
        
        let blob = null;
        try {
          const capRes = await CapacitorHttp.get({
            url,
            responseType: 'blob',
          });
          if (capRes.data) {
            // CapacitorHttp blob response is base64 string
            const base64Data = typeof capRes.data === 'string' ? capRes.data.replace(/^data:[^;]+;base64,/, '') : capRes.data;
            const writeRes = await Filesystem.writeFile({
              path: relativePath,
              data: base64Data,
              directory: directoryEnum,
              recursive: true,
            });
            resPath = writeRes.uri;
          }
        } catch (capErr) {
          console.warn('CapacitorHttp fallback failed, trying fetch:', capErr);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          blob = await response.blob();
          const base64 = await blobToBase64(blob);
          const writeRes = await Filesystem.writeFile({
            path: relativePath,
            data: base64,
            directory: directoryEnum,
            recursive: true,
          });
          resPath = writeRes.uri;
        }
      }

      if (onProgress) onProgress(100, `Tersimpan di ${displayLocation}`);

      // Normalize to a viewable file URI (downloadFile may return a relative path)
      let viewUri = resPath;
      try {
        if (viewUri && !viewUri.startsWith('file://') && !viewUri.startsWith('content://')) {
          const uriRes = await Filesystem.getUri({ path: relativePath, directory: directoryEnum }).catch(() => null);
          if (uriRes?.uri) viewUri = uriRes.uri;
        }
      } catch (_) { /* keep original path */ }

      // Optional share/open dialog only if explicitly enabled by user
      if (shouldShare && resPath) {
        try {
          await Share.share({
            title: safeFilename,
            text: `Downloaded with Arloader: ${safeFilename}`,
            url: resPath,
            dialogTitle: 'Buka atau Bagikan Media',
          });
        } catch (_) {
          // User cancelled share dialog
        }
      }

      // Send local notification on Android
      sendDownloadCompleteNotification({
        title: safeFilename,
        platform,
        path: displayLocation,
      });

      return { success: true, path: viewUri || resPath, location: displayLocation };
    } catch (nativeErr) {
      console.error('All native download methods failed:', nativeErr);
      if (onProgress) onProgress(0, 'Gagal menyimpan ke penyimpanan.');
      sendDownloadErrorNotification({
        title: safeFilename,
        platform,
        error: nativeErr?.message || '',
      });
      throw nativeErr;
    }
  }

  // 2. Web Browser Environment
  if (onProgress) onProgress(12, 'Menyiapkan unduhan...');

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    if (onProgress) onProgress(72, 'Menyimpan file ke browser...');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);

    if (onProgress) onProgress(100, 'Unduhan selesai.');
    return { success: true };
  } catch (err) {
    console.warn('Blob fetch failed (likely CORS), falling back to direct anchor:', err);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 1000);

    if (onProgress) onProgress(100, 'Unduhan dibuka di tab baru.');
    return { success: true, direct: true };
  }
}
