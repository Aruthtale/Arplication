import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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
  const relativePath = cleanSubfolder ? `${cleanSubfolder}/${safeFilename}` : safeFilename;

  // 1. Android Native Environment
  if (isNative()) {
    try {
      if (onProgress) onProgress(12, 'Menyiapkan unduhan...');

      const directoryEnum = dirChoice === 'Documents' ? Directory.Documents : Directory.Downloads;
      const targetLabel = dirChoice === 'Documents' ? 'Documents' : 'Download';

      const res = await Filesystem.downloadFile({
        url,
        path: relativePath,
        directory: directoryEnum,
        recursive: true,
        progress: true,
      });

      const displayLocation = cleanSubfolder ? `${targetLabel}/${cleanSubfolder}` : targetLabel;
      if (onProgress) onProgress(100, `Tersimpan di ${displayLocation}`);

      // Optional share/open dialog only if enabled by user
      if (shouldShare) {
        try {
          await Share.share({
            title: safeFilename,
            text: `Downloaded with Arloader: ${safeFilename}`,
            url: res.path,
            dialogTitle: 'Buka atau Bagikan Media',
          });
        } catch (_) {
          // User cancelled share dialog
        }
      }

      return { success: true, path: res.path, location: displayLocation };
    } catch (nativeErr) {
      console.warn('Native Filesystem download failed, opening browser fallback:', nativeErr);
      window.open(url, '_blank');
      return { success: true, fallback: true };
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
