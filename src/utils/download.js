import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from '../services/http.js';

/**
 * Initiates file download across Web and Native Mobile
 */
export async function downloadMedia({ url, filename, onProgress }) {
  if (!url) throw new Error('Download URL is missing.');

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // 1. Android Native Environment
  if (isNative()) {
    try {
      if (onProgress) onProgress(12, 'Menyiapkan unduhan...');
      
      const res = await Filesystem.downloadFile({
        url,
        path: `Arplication/${safeFilename}`,
        directory: Directory.Documents,
        recursive: true,
        progress: true,
      });

      if (onProgress) onProgress(100, 'Tersimpan di Documents/Arplication.');

      // Offer quick share sheet
      try {
        await Share.share({
          title: safeFilename,
          text: `Downloaded with Arloader: ${safeFilename}`,
          url: res.path,
          dialogTitle: 'Share or Open Media',
        });
      } catch (_) {
        // User cancelled share dialog
      }

      return { success: true, path: res.path };
    } catch (nativeErr) {
      console.warn('Native Filesystem download failed, opening browser fallback:', nativeErr);
      window.open(url, '_blank');
      return { success: true, fallback: true };
    }
  }

  // 2. Web Browser Environment
  if (onProgress) onProgress(12, 'Menyiapkan unduhan...');
  
  try {
    // Attempt blob download to enforce file name
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // A local yt-dlp service begins its response only after it has prepared
    // the media. This transition makes that wait visible in the UI.
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
    // Direct link fallback
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
