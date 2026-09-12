import { httpClient, isLocalWeb } from '../http.js';

function createLocalDownloadUrl(url, format) {
  const params = new URLSearchParams({ url, format });
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
      options: [
        {
          id: 'yt-video-mp4',
          label: 'Video MP4',
          ext: 'mp4',
          type: 'video',
          url: createLocalDownloadUrl(cleanUrl, 'video'),
          quality: 'Best available',
        },
        {
          id: 'yt-audio-mp3',
          label: 'Audio MP3',
          ext: 'mp3',
          type: 'audio',
          url: createLocalDownloadUrl(cleanUrl, 'audio'),
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
