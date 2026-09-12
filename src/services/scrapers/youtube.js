import { httpClient } from '../http.js';

function isLocalWebRuntime() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function createLocalDownloadUrl(url, format) {
  const params = new URLSearchParams({ url, format });
  return `http://127.0.0.1:8787/download?${params.toString()}`;
}

/**
 * Checks if URL is a YouTube link
 */
export function isYouTubeUrl(url) {
  if (!url) return false;
  return /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i.test(url);
}

/**
 * Extracts YouTube Video ID from standard, shorts, or shortened URLs
 */
export function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

/**
 * Resolves YouTube video metadata and download links
 */
export async function scrapeYouTube(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a valid video or Shorts link.');
  }

  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const maxThumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  // During local development, use the user's own yt-dlp process instead of
  // an unauthorised third-party conversion site. The Vite proxy keeps this
  // request same-origin for the browser.
  if (isLocalWebRuntime()) {
    return {
      platform: 'youtube',
      id: videoId,
      title: `YouTube Video (${videoId})`,
      cover: thumbUrl,
      author: {
        name: 'YouTube Video',
        username: `@${videoId}`,
        avatar: null,
      },
      duration: null,
      options: [
        {
          id: 'yt-video-mp4',
          label: 'Video MP4',
          ext: 'mp4',
          type: 'video',
          url: createLocalDownloadUrl(url, 'video'),
          quality: 'Best available',
        },
        {
          id: 'yt-audio-mp3',
          label: 'Audio MP3',
          ext: 'mp3',
          type: 'audio',
          url: createLocalDownloadUrl(url, 'audio'),
          quality: 'Best available',
        },
        {
          id: 'yt-thumbnail',
          label: 'High-Res Thumbnail',
          ext: 'jpg',
          type: 'image',
          url: maxThumbUrl,
          quality: '1080p Image',
        },
      ],
    };
  }

  // Step 1: Initialize session with ytmp3.mobi conversion engine
  const initRes = await httpClient({
    url: 'https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471',
    headers: {
      Origin: 'https://ytmp3.mobi',
      Referer: 'https://ytmp3.mobi/',
    },
  });

  if (!initRes || !initRes.convertURL) {
    const reason = initRes?.error?.message || initRes?.message || 'tidak ada sesi konversi yang diberikan';
    throw new Error(
      `Konversi YouTube tidak tersedia dari penyedia saat ini (${reason}). Gunakan tautan resmi YouTube atau konfigurasi penyedia yang memiliki izin API.`
    );
  }

  const convertBase = initRes.convertURL;

  // Step 2: Request conversion for MP4 Video and MP3 Audio
  const [videoConv, audioConv] = await Promise.allSettled([
    httpClient({
      url: `${convertBase}&v=${videoId}&f=mp4`,
      headers: {
        Origin: 'https://ytmp3.mobi',
        Referer: 'https://ytmp3.mobi/',
      },
    }),
    httpClient({
      url: `${convertBase}&v=${videoId}&f=mp3`,
      headers: {
        Origin: 'https://ytmp3.mobi',
        Referer: 'https://ytmp3.mobi/',
      },
    }),
  ]);

  const vData = videoConv.status === 'fulfilled' ? videoConv.value : null;
  const aData = audioConv.status === 'fulfilled' ? audioConv.value : null;

  const title = vData?.title || aData?.title || `YouTube Video (${videoId})`;
  const downloadOptions = [];

  if (vData && vData.downloadURL) {
    downloadOptions.push({
      id: 'yt-video-mp4',
      label: 'Video MP4 (720p)',
      ext: 'mp4',
      type: 'video',
      url: vData.downloadURL,
      quality: 'HD 720p',
      progressUrl: vData.progressURL,
    });
  }

  if (aData && aData.downloadURL) {
    downloadOptions.push({
      id: 'yt-audio-mp3',
      label: 'Audio MP3 (128kbps)',
      ext: 'mp3',
      type: 'audio',
      url: aData.downloadURL,
      quality: 'Stereo Audio',
      progressUrl: aData.progressURL,
    });
  }

  // If both failed to get immediate downloadURL, provide direct thumbnail download
  downloadOptions.push({
    id: 'yt-thumbnail',
    label: 'High-Res Thumbnail',
    ext: 'jpg',
    type: 'image',
    url: maxThumbUrl,
    quality: '1080p Image',
  });

  return {
    platform: 'youtube',
    id: videoId,
    title,
    cover: thumbUrl,
    author: {
      name: 'YouTube Video',
      username: `@${videoId}`,
      avatar: null,
    },
    duration: null,
    options: downloadOptions,
  };
}
