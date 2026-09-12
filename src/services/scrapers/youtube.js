import { httpClient, isLocalWeb } from '../http.js';

function createLocalDownloadUrl(url, format, quality = '') {
  const params = new URLSearchParams({ url, format });
  if (quality) params.set('quality', quality);
  return `http://127.0.0.1:8787/download?${params.toString()}`;
}

/**
 * Checks if URL is a YouTube link (video, Shorts, or playlist)
 */
export function isYouTubeUrl(url = '') {
  if (!url) return false;
  return /(?:youtube\.com\/(?:watch\?|shorts\/|embed\/|playlist\?)|youtu\.be\/)/i.test(url);
}

/**
 * Checks if URL is specifically a YouTube playlist link
 */
export function isYouTubePlaylistUrl(url = '') {
  if (!url) return false;
  return /(?:youtube\.com\/(?:playlist\?list=|watch\?.*[?&]list=)|youtu\.be\/.*[?&]list=)([a-zA-Z0-9_-]+)/i.test(url);
}

/**
 * Extracts YouTube Playlist ID
 */
export function extractYouTubePlaylistId(url = '') {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:playlist\?list=|watch\?.*[?&]list=)|youtu\.be\/.*[?&]list=)([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
}

/**
 * Extracts YouTube Video ID from standard, shorts, or shortened URLs
 */
export function extractYouTubeId(url = '') {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

/**
 * Scrapes YouTube playlist metadata & track listing
 */
export async function scrapeYouTubePlaylist(url = '') {
  const cleanUrl = String(url).trim();
  const playlistId = extractYouTubePlaylistId(cleanUrl);
  if (!playlistId) {
    throw new Error('URL playlist YouTube tidak valid.');
  }

  // 1. If local web, query local yt-dlp server /playlist-inspect endpoint
  if (isLocalWeb()) {
    try {
      const inspectRes = await httpClient({
        url: `/api/yt-dlp/playlist-inspect?url=${encodeURIComponent(cleanUrl)}`,
        timeout: 25000,
      });

      if (inspectRes && inspectRes.ok && Array.isArray(inspectRes.entries)) {
        const tracks = inspectRes.entries.map((e, idx) => {
          const durSec = e.duration;
          let durationStr = null;
          if (durSec && typeof durSec === 'number') {
            const m = Math.floor(durSec / 60);
            const s = Math.floor(durSec % 60);
            durationStr = `${m}:${String(s).padStart(2, '0')}`;
          }
          return {
            id: e.id,
            index: e.index || idx + 1,
            title: e.title,
            artist: e.uploader || inspectRes.author || 'YouTube',
            duration: durationStr,
            cover: e.cover || `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
            url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
            downloadUrl: createLocalDownloadUrl(e.url || `https://www.youtube.com/watch?v=${e.id}`, 'audio'),
            downloadVideoUrl: createLocalDownloadUrl(e.url || `https://www.youtube.com/watch?v=${e.id}`, 'video'),
          };
        });

        const cover = tracks[0]?.cover || 'https://www.youtube.com/img/desktop/yt_1200.png';

        return {
          platform: 'youtube',
          id: playlistId,
          type: 'playlist',
          isPlaylist: true,
          title: inspectRes.title || `YouTube Playlist (${playlistId})`,
          cover,
          author: {
            name: inspectRes.author || 'YouTube Channel',
            username: '@youtube',
            avatar: null,
          },
          duration: null,
          trackCount: tracks.length,
          tracks,
          options: [
            {
              id: 'yt-playlist-link',
              label: 'Open Playlist on YouTube',
              ext: 'url',
              type: 'video',
              url: cleanUrl,
              quality: 'Official Web',
            },
          ],
        };
      }
    } catch {
      // Fallback to client-side extraction
    }
  }

  // 2. Client-side / Android fallback: scrape YouTube playlist page HTML
  const playlistPageUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  const pageRes = await httpClient({
    url: playlistPageUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    raw: true,
    timeout: 15000,
  });

  const html = String(pageRes?.data || '');
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i) || html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : `YouTube Playlist (${playlistId})`;

  const videoIdMatches = [...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)];
  const seenIds = new Set();
  const tracks = [];

  for (const match of videoIdMatches) {
    const vId = match[1];
    if (!seenIds.has(vId) && vId !== playlistId) {
      seenIds.add(vId);
      tracks.push({
        id: vId,
        index: tracks.length + 1,
        title: `Track ${tracks.length + 1} (${vId})`,
        artist: 'YouTube',
        duration: null,
        cover: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${vId}`,
        downloadUrl: null,
      });
      if (tracks.length >= 50) break;
    }
  }

  if (tracks.length === 0) {
    throw new Error('Tidak dapat mengekstrak daftar video dari playlist YouTube ini. Pastikan playlist disetel ke Publik.');
  }

  return {
    platform: 'youtube',
    id: playlistId,
    type: 'playlist',
    isPlaylist: true,
    title: rawTitle,
    cover: tracks[0]?.cover || 'https://www.youtube.com/img/desktop/yt_1200.png',
    author: {
      name: 'YouTube Playlist',
      username: '@youtube',
      avatar: null,
    },
    duration: null,
    trackCount: tracks.length,
    tracks,
    options: [
      {
        id: 'yt-playlist-link',
        label: 'Open Playlist on YouTube',
        ext: 'url',
        type: 'video',
        url: cleanUrl,
        quality: 'Official Web',
      },
    ],
  };
}

function buildYouTubeDownloadOptions({ cleanUrl, videoId, maxThumbUrl, vData, aData, isLocal }) {
  const thumbHq = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const thumbSd = `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;

  const mp4Options = [
    {
      id: 'yt-video-1080p',
      category: 'mp4',
      label: 'Full HD (1080p)',
      ext: 'mp4',
      type: 'video',
      resolution: '1080p',
      quality: 'Full HD • Kualitas Terbaik',
      estimatedSize: '~ 48.5 MB',
      bytes: 50855936,
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'video', '1080p') : (vData?.downloadURL || null),
    },
    {
      id: 'yt-video-720p',
      category: 'mp4',
      label: 'HD (720p)',
      ext: 'mp4',
      type: 'video',
      resolution: '720p',
      quality: 'HD • Standar Seimbang',
      estimatedSize: '~ 26.2 MB',
      bytes: 27472691,
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'video', '720p') : (vData?.downloadURL || null),
    },
    {
      id: 'yt-video-480p',
      category: 'mp4',
      label: 'SD (480p)',
      ext: 'mp4',
      type: 'video',
      resolution: '480p',
      quality: 'SD • Hemat Kuota',
      estimatedSize: '~ 14.8 MB',
      bytes: 15518924,
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'video', '480p') : (vData?.downloadURL || null),
    },
    {
      id: 'yt-video-360p',
      category: 'mp4',
      label: 'Mobile (360p)',
      ext: 'mp4',
      type: 'video',
      resolution: '360p',
      quality: 'Low • Sangat Hemat',
      estimatedSize: '~ 8.1 MB',
      bytes: 8493465,
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'video', '360p') : (vData?.downloadURL || null),
    },
  ];

  const mp3Options = [
    {
      id: 'yt-audio-320k',
      category: 'mp3',
      label: 'Audio HD (320 kbps)',
      ext: 'mp3',
      type: 'audio',
      resolution: '320 kbps',
      quality: 'Audio HD • Suara Jernih Maksimal',
      estimatedSize: '~ 8.5 MB',
      bytes: 8912896,
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'audio', '320k') : (aData?.downloadURL || null),
    },
    {
      id: 'yt-audio-256k',
      category: 'mp3',
      label: 'Audio Tinggi (256 kbps)',
      ext: 'mp3',
      type: 'audio',
      resolution: '256 kbps',
      quality: 'Audio High • Suara Jernih',
      estimatedSize: '~ 6.8 MB',
      bytes: 7130316,
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'audio', '256k') : (aData?.downloadURL || null),
    },
    {
      id: 'yt-audio-192k',
      category: 'mp3',
      label: 'Audio Sedang (192 kbps)',
      ext: 'mp3',
      type: 'audio',
      resolution: '192 kbps',
      quality: 'Audio Medium • Standar Musik',
      estimatedSize: '~ 5.1 MB',
      bytes: 5347737,
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'audio', '192k') : (aData?.downloadURL || null),
    },
    {
      id: 'yt-audio-128k',
      category: 'mp3',
      label: 'Audio Hemat (128 kbps)',
      ext: 'mp3',
      type: 'audio',
      resolution: '128 kbps',
      quality: 'Audio Low • Ukuran Ringan',
      estimatedSize: '~ 3.4 MB',
      bytes: 3565158,
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'audio', '128k') : (aData?.downloadURL || null),
    },
  ];

  const imgOptions = [
    {
      id: 'yt-img-maxres',
      category: 'img',
      label: 'Sampul HD MaxRes (1080p)',
      ext: 'jpg',
      type: 'image',
      resolution: '1080p',
      quality: 'Gambar Sampul Resolusi Maksimal',
      estimatedSize: '~ 380 KB',
      bytes: 389120,
      url: maxThumbUrl,
    },
    {
      id: 'yt-img-hq',
      category: 'img',
      label: 'Sampul HQ (480p)',
      ext: 'jpg',
      type: 'image',
      resolution: '480p',
      quality: 'Gambar Sampul Kualitas Tinggi',
      estimatedSize: '~ 120 KB',
      bytes: 122880,
      url: thumbHq,
    },
    {
      id: 'yt-img-sd',
      category: 'img',
      label: 'Sampul Standar (360p)',
      ext: 'jpg',
      type: 'image',
      resolution: '360p',
      quality: 'Gambar Sampul Hemat Kuota',
      estimatedSize: '~ 45 KB',
      bytes: 46080,
      url: thumbSd,
    },
  ];

  return [...mp4Options, ...mp3Options, ...imgOptions];
}

/**
 * Resolves YouTube video or playlist metadata and download links
 */
export async function scrapeYouTube(url = '') {
  const cleanUrl = String(url).trim();

  // If this is a YouTube playlist URL, use scrapeYouTubePlaylist
  if (isYouTubePlaylistUrl(cleanUrl)) {
    return scrapeYouTubePlaylist(cleanUrl);
  }

  const videoId = extractYouTubeId(cleanUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a valid video, Shorts, or playlist link.');
  }

  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const maxThumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  if (isLocalWeb()) {
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
      options: buildYouTubeDownloadOptions({ cleanUrl, videoId, maxThumbUrl, isLocal: true }),
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
  const downloadOptions = buildYouTubeDownloadOptions({
    cleanUrl,
    videoId,
    maxThumbUrl,
    vData,
    aData,
    isLocal: false,
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
