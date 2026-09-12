import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '../services/http.js';

export const DEFAULT_DOWNLOAD_SETTINGS = {
  directory: 'Downloads', // 'Downloads' | 'Documents'
  subfolder: 'Arloader',  // e.g. 'Arloader' or ''
  autoShare: false,       // whether to pop up "Buka dengan / Bagikan"
};

export function getDownloadSettings() {
  try {
    const saved = localStorage.getItem('arloader_settings');
    if (saved) {
      return { ...DEFAULT_DOWNLOAD_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to read download settings:', e);
  }
  return DEFAULT_DOWNLOAD_SETTINGS;
}

export function saveDownloadSettings(settings) {
  try {
    localStorage.setItem('arloader_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save download settings:', e);
  }
}

/**
 * Helper to convert Blob to Base64
 */
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
  const cleanSubfolder = String(folderChoice || '').trim().replace(/^\/+|\/+$/g, '');

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

      return { success: true, path: resPath, location: displayLocation };
    } catch (nativeErr) {
      console.error('All native download methods failed:', nativeErr);
      if (onProgress) onProgress(0, 'Gagal menyimpan ke penyimpanan.');
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
