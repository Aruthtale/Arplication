import { httpClient, isLocalWeb, isNative } from './http.js';
import {
  resolveYouTubeAudioUrl as youtubeResolveAudioUrl,
} from './scrapers/youtube.js';
import { pickYouTubeMusicAudioUrl, searchYouTubeMusic } from './scrapers/youtubeMusic.js';

// Priority: 1) Innertube direct (fastest for YouTube Music), 2) Piped (already exists), 3) Convert1s, 4) yt-dlp remote, 5) yt-dlp local

/**
 * Resolve audio URL for a YouTube Music track.
 * Strategy:
 * 1. Try Innertube watch/playlist API untuk get audio stream direkt (fastest, no download)
 * 2. Fallback: Piped streams (reuse from youtube.js)
 * 3. Fallback: Convert1s (Mori engine)
 * 4. Fallback: yt-dlp remote (server konfigurasi)
 * 5. Fallback: yt-dlp lokal (Vite dev mode)
 * 6. Final fallback: full search + multi-candidate resolution (existing youtube logic)
 */

const INNERTUBE_API_URL = 'https://music.youtube.com/youtubei/v1';

const INNERTUBE_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Origin': 'https://music.youtube.com',
  'Referer': 'https://music.youtube.com/',
};

function buildInnertubeWatchBody(videoId) {
  return {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '2.20240923.01.00',
        hl: 'id',
        gl: 'ID',
        utcOffsetMinutes: 420,
        timezone: 'Asia/Jakarta',
      },
    },
    videoId: videoId,
    playlistId: 'RDAMVM' + videoId,
    params: 'wAEB',
  };
}

export async function resolveYouTubeMusicAudioUrl({ videoId = null, url = null, query = '', onProgress = null, quality = '128' } = {}) {
  const startTime = Date.now();
  const vid = videoId || extractVideoIdFromUrl(url) || (query ? await extractVideoIdFromQuery(query) : null);
  if (!vid) {
    throw new Error('ID Video YouTube tidak valid atau tidak bisa diekstrak.');
  }

  // Prioritas 1: Innertube direkt (streaming via YouTube Music API)
  try {
    const audioUrl = await resolveInnertubeStream(vid, onProgress);
    if (audioUrl) {
      console.log(`[YouTube Music] Berhasil resolve stream Innertube dalam ${Date.now() - startTime}ms`);
      return audioUrl;
    }
  } catch (err) {
    console.warn('[YouTube Music] Innertube stream failed, fallback:', err?.message || err);
  }

  // Prioritas 2: Piped stream (sudah ada di youtube.js, works untuk sebagian besar)
  try {
    const audioUrl = await resolvePipedStream(vid, onProgress);
    if (audioUrl) {
      console.log(`[YouTube Music] Berhasil resolve stream Piped dalam ${Date.now() - startTime}ms`);
      return audioUrl;
    }
  } catch (err) {
    console.warn('[YouTube Music] Piped stream failed, fallback:', err?.message || err);
  }

  // Prioritas 3: Convert1s (Mori engine) - resolusi MP3 tercepat
  try {
    const audioUrl = await resolveConvert1s(vid, quality, onProgress);
    if (audioUrl) {
      console.log(`[YouTube Music] Berhasil resolve Convert1s dalam ${Date.now() - startTime}ms`);
      return audioUrl;
    }
  } catch (err) {
    console.warn('[YouTube Music] Convert1s gagal, fallback:', err?.message || err);
  }

  // Prioritas 4: Remote yt-dlp (di server Arloader)
  try {
    const audioUrl = await resolveYtDlpRemote(vid, quality, onProgress);
    if (audioUrl) {
      console.log(`[YouTube Music] Berhasil resolve yt-dlp remote dalam ${Date.now() - startTime}ms`);
      return audioUrl;
    }
  } catch (err) {
    console.warn('[YouTube Music] yt-dlp remote gagal, fallback:', err?.message || err);
  }

  // Prioritas 5: yt-dlp lokal (Vite dev mode)
  if (isLocalWeb()) {
    try {
      const audioUrl = await resolveYtDlpLocal(vid, quality, onProgress);
      if (audioUrl) {
        console.log(`[YouTube Music] Berhasil resolve yt-dlp lokal dalam ${Date.now() - startTime}ms`);
        return audioUrl;
      }
    } catch (err) {
      console.warn('[YouTube Music] yt-dlp lokal gagal, fallback:', err?.message || err);
    }
  }

  // Prioritas 6: Cari videoId dari kueri dan gunakan all-in-one resolver (existing)
  try {
    const audioUrl = await resolveYouTubeMusicAllInOne(vid, query, onProgress);
    if (audioUrl) {
      console.log(`[YouTube Music] Berhasil resolve all-in-one dalam ${Date.now() - startTime}ms`);
      return audioUrl;
    }
  } catch (err) {
    console.warn('[YouTube Music] all-in-one resolve gagal:', err?.message || err);
  }

  throw new Error('Semua layer resolusi audio gagal untuk YouTube Music.');
}

async function resolveInnertubeStream(videoId, onProgress) {
  const body = buildInnertubeWatchBody(videoId);
  const data = await httpClient({
    url: INNERTUBE_API_URL,
    method: 'POST',
    headers: INNERTUBE_HEADERS,
    data: body,
    timeout: 15000,
  });

  // Berbasiskan respons Innertube: streaming URL langsung atau download URL
  if (data?.streamingData?.formats) {
    // Coba streaming URL
    for (const fmt of data.streamingData.formats) {
      if (fmt?.url?.startsWith('http')) return fmt.url;
    }
  }

  if (data?.streamingData?.adaptiveFormats) {
    // Audio-only adaptive formats
    for (const fmt of data.streamingData.adaptiveFormats) {
      if (fmt?.url?.startsWith('http') && fmt?.mimeType?.includes('audio')) {
        return fmt.url;
      }
    }
    // Fallback ke video formats yang contain audio
    for (const fmt of data.streamingData.adaptiveFormats) {
      if (fmt?.url?.startsWith('http')) return fmt.url;
    }
  }

  if (data?.download) {
    return data.download;
  }

  if (data?.audioUrl) {
    return data.audioUrl;
  }

  throw new Error('Streaming URL tidak ditemukan di respons Innertube.');
}

async function resolvePipedStream(videoId, onProgress) {
  const { pipedGetStreams } = await import('./scrapers/youtube.js');
  const streamData = await pipedGetStreams(videoId);
  // streamData = { title, artist, duration, thumbnailUrl, audioStreams: [...], videoStreams: [...] }
  const audioUrl = pickYouTubeMusicAudioUrl(streamData.audioStreams || []);
  if (audioUrl) return audioUrl;
  throw new Error('Stream audio Piped tidak tersedia.');
}

async function resolveConvert1s(videoId, quality, onProgress) {
  const headers = {
    Origin: 'https://media.ytmp3.gg',
    Referer: 'https://media.ytmp3.gg/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  // Kirim request ke Convert1s API
  const outQuality = quality ? (quality.endsWith('p') ? quality : `${quality}p`) : '128';

  const convRes = await httpClient({
    url: 'https://hub.convert1s.com/api/download',
    method: 'POST',
    headers,
    data: {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      os: 'macos',
      output: {
        type: 'audio',
        format: 'mp3',
        quality: outQuality,
      },
      audio: { bitrate: quality + 'k' },
    },
    timeout: 25000,
  });

  if (!convRes?.statusUrl) throw new Error('Convert1s tidak mengembalikan status URL.');

  // Polling status
  for (let i = 0; i < 30; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (onProgress) onProgress(20 + Math.min(70, i * 2), `Mengonversi audio (Convert1s)...`);

    try {
      const poll = await httpClient({
        url: convRes.statusUrl,
        headers,
        timeout: 15000,
      });

      if (poll?.status === 'completed' && poll?.downloadUrl) {
        return poll.downloadUrl;
      }

      if (poll?.status === 'error' || poll?.status === 'failed') {
        break;
      }
    } catch (e) {}
  }

  throw new Error('Convert1s audio conversion timeout atau gagal.');
}

async function resolveYtDlpRemote(videoId, quality, onProgress) {
  if (!isNative()) {
    throw new Error('yt-dlp remote hanya tersedia di aplikasi Android.');
  }

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('arloader_settings') : null;
    const settings = raw ? JSON.parse(raw) : {};
    const serverUrl = String(settings.ytDlpServerUrl || '').trim();
    if (!serverUrl) throw new Error('URL yt-dlp server tidak dikonfigurasi.');

    const base = serverUrl.replace(/\/+$/, '');
    const res = await httpClient({
      url: `${base}/api/yt-dlp/audio-url?q=${encodeURIComponent(`https://music.youtube.com/watch?v=${videoId}`)}`,
      timeout: 25000,
    });

    if (res?.ok && res?.audioUrl) return res.audioUrl;
    throw new Error('Remote yt-dlp tidak mengembalikan URL audio.');
  } catch (e) {
    throw new Error(`Remote yt-dlp error: ${e.message || e}`);
  }
}

async function resolveYtDlpLocal(videoId, quality, onProgress) {
  if (!isLocalWeb()) {
    throw new Error('yt-dlp lokal hanya tersedia di Vite dev mode (web).');
  }

  try {
    const localRes = await httpClient({
      url: `/api/yt-dlp/audio-url?q=${encodeURIComponent(`https://music.youtube.com/watch?v=${videoId}`)}`,
      timeout: 20000,
    });

    if (localRes?.audioUrl) return localRes.audioUrl;
    throw new Error('Local yt-dlp tidak mengembalikan URL audio.');
  } catch (e) {
    throw new Error(`Local yt-dlp error: ${e.message || e}`);
  }
}

async function resolveYouTubeMusicAllInOne(videoId, query, onProgress) {
  // Gunakan existing resolver dari youtube.js (multi-layer resolver)
  return await youtubeResolveAudioUrl({ videoId, query, onProgress });
}

function extractVideoIdFromUrl(url = '') {
  const clean = String(url || '').trim();
  if (!clean) return null;

  const match = clean.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function extractVideoIdFromQuery(query = '') {
  if (!query) return null;

  // Coba gunakan YouTube web search untuk videoId
  try {
    const data = await httpClient({
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      raw: true,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });

    const html = typeof data === 'string' ? data : (data?.data || '');
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (videoIdMatch && videoIdMatch[1]) return videoIdMatch[1];
  } catch (e) {}

  return null;
}

export { searchYouTubeMusic };

export default {
  searchYouTubeMusic,
  resolveYouTubeMusicAudioUrl,
};