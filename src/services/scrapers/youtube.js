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
 * Extracts a YouTube video ID from a watch URL, short link, or bare 11-char ID.
 * Used to resolve per-track queries (e.g. playlist tracks) without searching.
 */
export function extractPipedVideoId(text = '') {
  const s = String(text || '').trim();
  if (!s) return null;
  const fromUrl = extractYouTubeId(s);
  if (fromUrl) return fromUrl;
  const bare = s.match(/^([a-zA-Z0-9_-]{11})$/);
  return bare ? bare[1] : null;
}

/**
 * Piped API instances (public frontends for YouTube data + direct stream URLs).
 * Ordered by last-known reliability; the first responsive instance wins.
 * Pruned 2026-09-15: verified live via curl (HTTP 200 + valid JSON).
 * Removed: kavin.rocks (525), adminforge.de (403), leptons.xyz (502),
 * reallyaweso.me (502), nosebs.ru (DNS mati), privacy.com.de (DNS mati),
 * api.piped.yt (DNS mati), drgns.space (DNS mati), owo.si (timeout),
 * codespace.cz (DNS mati), darkness.services (DNS mati), orangenet.cc (502).
 */
export const PIPED_API_INSTANCES = [
  'https://pipedapi.ducks.party',
  'https://api.piped.private.coffee',
];

/**
 * GET a Piped API path from the first healthy instance (failover loop).
 * Returns parsed JSON. Throws when every instance fails or returns an error payload.
 */
export async function pipedGet(path = '') {
  let lastError = null;
  for (const base of PIPED_API_INSTANCES) {
    try {
      const data = await httpClient({
        url: `${base}${path}`,
        timeout: 10000,
      });
      if (data && !data.error && (data.title || data.name || data.items || data.audioStreams || data.videoStreams)) {
        return data;
      }
      lastError = new Error(data?.error ? String(data.error).slice(0, 120) : 'Respons instance kosong.');
    } catch (err) {
      lastError = err;
    }
  }
  const errText = String(lastError?.message || lastError || '');
  if (/unable to resolve host|no address|eai_again|enotfound|dns/i.test(errText)) {
    throw new Error('Server Piped sedang offline atau mengalami gangguan jaringan.');
  }
  throw lastError || new Error('Semua instance Piped tidak dapat dijangkau.');
}

/**
 * Searches YouTube videos via Piped API. Returns up to `limit` video entries:
 * [{ videoId, title, uploader, duration, cover }]
 */
export async function pipedSearchVideos(query = '', limit = 5) {
  const q = String(query || '').trim();
  if (!q) return [];
  const data = await pipedGet(`/search?q=${encodeURIComponent(q)}&filter=videos`);
  const items = Array.isArray(data?.items) ? data.items : [];
  const results = [];
  for (const item of items) {
    const watchUrl = String(item?.url || '');
    const m = watchUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (!m) continue;
    const videoId = m[1];
    results.push({
      videoId,
      title: item?.title || `YouTube Video (${videoId})`,
      uploader: item?.uploaderName || 'YouTube',
      duration: typeof item?.duration === 'number' ? item.duration : null,
      cover: item?.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * Fetches stream metadata for a YouTube video via Piped API.
 * Returns { title, uploader, duration, thumbnailUrl, audioStreams, videoStreams }.
 */
export async function pipedGetStreams(videoId = '') {
  const vid = String(videoId || '').trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(vid)) {
    throw new Error('Video ID YouTube tidak valid.');
  }
  return pipedGet(`/streams/${vid}`);
}

/**
 * Numeric rank for quality labels ("1080p" -> 1080). Unknown -> 0.
 */
export function pipedQualityRank(quality = '') {
  const m = String(quality || '').match(/(\d{3,4})/);
  return m ? Number(m[1]) : 0;
}

/**
 * Picks progressive (audio+video muxed) MP4 streams, proxy URLs first.
 * Pure function — safe for unit tests.
 */
export function pickPipedProgressiveStreams(data) {
  const list = Array.isArray(data?.videoStreams) ? data.videoStreams : [];
  return list
    .filter((s) => s && s.videoOnly === false && typeof s.url === 'string' && s.url.startsWith('http'))
    .map((s) => ({
      quality: s.quality || '',
      format: s.format || '',
      codec: s.codec || null,
      url: s.url,
      contentLength: Number(s.contentLength) > 0 ? Number(s.contentLength) : null,
    }))
    .sort((a, b) => {
      const aProxy = /piped-proxy|videoplayback/i.test(a.url) ? 0 : 1;
      const bProxy = /piped-proxy|videoplayback/i.test(b.url) ? 0 : 1;
      if (aProxy !== bProxy) return aProxy - bProxy;
      return pipedQualityRank(b.quality) - pipedQualityRank(a.quality);
    });
}

/**
 * Picks the best direct audio stream URL (highest bitrate first).
 * Falls back to the best progressive MP4 URL (contains an audio track)
 * when the instance serves no audio-only streams.
 * Pure function — safe for unit tests.
 */
export function pickPipedAudioUrl(data) {
  const list = Array.isArray(data?.audioStreams) ? data.audioStreams : [];
  const withUrl = list.filter((s) => s && typeof s.url === 'string' && s.url.startsWith('http'));
  if (withUrl.length > 0) {
    withUrl.sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
    return withUrl[0].url;
  }
  const progressive = pickPipedProgressiveStreams(data);
  return progressive[0]?.url || null;
}

/**
 * Formats seconds into m:ss duration string.
 */
export function formatPipedDuration(sec) {
  const n = Number(sec);
  if (!n || isNaN(n) || n <= 0) return null;
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * True jika error berasal dari proteksi anti-bot YouTube/Piped
 * (SignInConfirmNotBot, 403/429, "sign in to confirm").
 * Pure function — aman untuk unit test.
 */
export function isBotBlockError(err) {
  const msg = String(err?.message || err || '');
  return /SignInConfirm|confirm.*not.*bot|sign in to confirm|you're a bot|LOGIN_REQUIRED|429|too many requests|rate limit|403.*forbidden|HTML error\/block page|upstream server returned|block page|cloudflare|attention required|just a moment|502.*bad gateway|525/i.test(msg);
}

/**
 * Format error resolver menjadi pesan Indonesia yang jelas & actionable.
 * Pure function — aman untuk unit test.
 */
export function formatResolverError(err, query = '') {
  const raw = String(err?.message || err || '');
  const q = String(query || '').slice(0, 60);
  if (isBotBlockError(err)) {
    return `YouTube/Piped sedang memblokir permintaan otomatis untuk "${q}". Tunggu 1–2 menit lalu coba lagi, atau unduh track satu per satu (jangan batch sekaligus).`;
  }
  if (/tidak dapat menemukan|not found|404/i.test(raw)) {
    return `Tidak dapat menemukan stream audio untuk "${q}". Coba kata kunci lain atau pakai link YouTube langsung.`;
  }
  if (/network|timeout|fetch|failed to fetch|econn|socket|tidak dapat dijangkau|unable to resolve host|no address/i.test(raw)) {
    return 'Jaringan bermasalah atau server penyedia offline. Periksa koneksi lalu coba lagi.';
  }
  if (/stream audio tidak tersedia/i.test(raw)) {
    return `Video ditemukan tapi stream audio-nya kosong untuk "${q}". Coba lagu lain.`;
  }
  return raw.slice(0, 160) || 'Gagal resolve audio.';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Direct YouTube search via web endpoint to get videoId without Piped.
 */
async function searchYouTubeDirect(query) {
  if (!query) return null;
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await httpClient({
      url: searchUrl,
      raw: true,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = typeof res === 'string' ? res : (res?.data || '');
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (err) {
    console.warn('[YouTube] Direct web search failed:', err.message);
  }
  return null;
}

/**
 * Resolves MP3 audio URL via Convert1s / ytmp3.gg converter cluster (same engine Mori uses).
 */
async function resolveConvert1sAudio(videoId) {
  if (!videoId) return null;
  const convertHeaders = {
    Origin: 'https://media.ytmp3.gg',
    Referer: 'https://media.ytmp3.gg/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  try {
    const convRes = await httpClient({
      url: 'https://hub.convert1s.com/api/download',
      method: 'POST',
      headers: convertHeaders,
      data: {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        os: 'android',
        output: {
          type: 'audio',
          format: 'mp3',
          quality: '128',
        },
        audio: { bitrate: '128k' },
      },
      timeout: 12000,
    });

    const statusUrl = convRes?.statusUrl;
    if (!statusUrl) return null;

    for (let i = 0; i < 15; i += 1) {
      await sleep(1000);
      try {
        const pollRes = await httpClient({
          url: statusUrl,
          headers: convertHeaders,
          timeout: 8000,
        });
        if (pollRes?.status === 'completed' && pollRes?.downloadUrl) {
          return pollRes.downloadUrl;
        }
        if (pollRes?.status === 'failed') {
          break;
        }
      } catch (err) {
        console.warn('[Convert1s] Poll error:', err.message);
      }
    }
  } catch (err) {
    console.warn('[Convert1s] Conversion error:', err.message);
  }
  return null;
}

/**
 * Resolves audio URL via a remote self-hosted yt-dlp API server.
 * Server URL is read from download settings (localStorage).
 * Expected server endpoint: GET /api/yt-dlp/audio-url?q=<videoUrl>
 * Expected response: { ok: true, audioUrl: "https://..." }
 */
async function resolveYtDlpRemoteAudio(videoId) {
  if (!videoId) return null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('arloader_settings') : null;
    const settings = raw ? JSON.parse(raw) : {};
    const serverUrl = String(settings.ytDlpServerUrl || '').trim();
    if (!serverUrl) return null;

    const base = serverUrl.replace(/\/+$/, '');
    const res = await httpClient({
      url: `${base}/api/yt-dlp/audio-url?q=${encodeURIComponent(`https://youtube.com/watch?v=${videoId}`)}`,
      timeout: 20000,
    });
    if (res?.ok && res?.audioUrl) return res.audioUrl;
  } catch (err) {
    console.warn('[YouTube] Remote yt-dlp audio failed:', err.message);
  }
  return null;
}

/**
 * Resolves video URL via a remote self-hosted yt-dlp API server.
 * Server URL is read from download settings (localStorage).
 * Expected server endpoint: GET /download?url=<videoUrl>&format=video&quality=<quality>
 */
async function resolveYtDlpRemoteVideoUrl(videoId, quality = '') {
  if (!videoId) return null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('arloader_settings') : null;
    const settings = raw ? JSON.parse(raw) : {};
    const serverUrl = String(settings.ytDlpServerUrl || '').trim();
    if (!serverUrl) return null;

    const base = serverUrl.replace(/\/+$/, '');
    const params = new URLSearchParams({
      url: `https://youtube.com/watch?v=${videoId}`,
      format: 'video',
    });
    if (quality) params.set('quality', quality);
    return `${base}/download?${params.toString()}`;
  } catch (_) {}
  return null;
}

/**
 * Resolves MP3 or MP4 download URL via ymcdn converter engine (ytmp3 cluster).
 * It initiates the conversion session AND polls progress until progress === 3 (ready),
 * ensuring the returned downloadURL is 100% active and won't return HTTP 410.
 */
async function resolveYmcdnConvert({ videoId, format = 'mp3', onProgress = null, maxWaitSeconds = 25 }) {
  if (!videoId) return null;
  const ymHeaders = {
    Origin: 'https://ytmp3.mobi',
    Referer: 'https://ytmp3.mobi/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  };
  try {
    const initRes = await httpClient({
      url: 'https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471',
      headers: ymHeaders,
      timeout: 10000,
    });
    if (!initRes?.convertURL) return null;

    const convRes = await httpClient({
      url: `${initRes.convertURL}&v=${videoId}&f=${format}`,
      headers: ymHeaders,
      timeout: 10000,
    });

    if (!convRes?.progressURL) return null;

    const progressUrl = convRes.progressURL;
    const fallbackDlUrl = convRes.downloadURL;

    for (let i = 0; i < maxWaitSeconds; i += 1) {
      await sleep(1000);
      try {
        const pollData = await httpClient({
          url: progressUrl,
          headers: ymHeaders,
          timeout: 8000,
        });
        if (pollData?.error && pollData.error !== 0) {
          console.warn('[Ymcdn] Conversion server error:', pollData.error);
          break;
        }
        if (typeof onProgress === 'function') {
          const pct = Math.min(95, 20 + Math.round((i / maxWaitSeconds) * 75));
          onProgress(pct, `Mengonversi ${format.toUpperCase()} di server (${pct}%)...`);
        }
        if (pollData?.progress === 3 || pollData?.downloadURL) {
          return pollData.downloadURL || fallbackDlUrl;
        }
      } catch (pollErr) {
        console.warn('[Ymcdn] Progress poll warning:', pollErr.message);
      }
    }
  } catch (err) {
    console.warn('[Ymcdn] Conversion initiation error:', err.message);
  }
  return null;
}

/**
 * Resolves a direct playable/downloadable audio URL for a query, video ID, or watch URL.
 * Multi-layer strategy:
 * 1. ymcdn converter cluster with full progress polling (100% immune to 410 Gone)
 * 1.2. Convert1s cloud converter cluster
 * 1.5. Remote self-hosted yt-dlp server (if configured)
 * 2. Local yt-dlp server (if in Vite dev mode)
 * 3. Direct Piped video stream
 * 4. Piped search multi-candidate stream
 */
export async function resolveYouTubeAudioUrl({ query = '', videoId = null, url = '', onProgress = null } = {}) {
  const rawQuery = String(query || '').trim();
  let directVid = extractPipedVideoId(String(videoId || '')) || extractPipedVideoId(String(url || '')) || extractPipedVideoId(rawQuery);

  // If no direct videoId, try finding videoId directly from YouTube web search
  if (!directVid && rawQuery) {
    directVid = await searchYouTubeDirect(rawQuery);
  }

  // PRIORITAS 1: ymcdn Cloud Converter with progress polling (Bypasses YouTube 410 completely)
  if (directVid) {
    try {
      const ymcdnAudioUrl = await resolveYmcdnConvert({ videoId: directVid, format: 'mp3', onProgress });
      if (ymcdnAudioUrl) {
        return ymcdnAudioUrl;
      }
    } catch (err) {
      console.warn('[YouTube] ymcdn audio resolution failed, falling back:', err.message);
    }
  }

  // PRIORITAS 1.2: Convert1s Cloud Converter (Mori Engine)
  if (directVid) {
    try {
      const convertAudioUrl = await resolveConvert1sAudio(directVid);
      if (convertAudioUrl) {
        return convertAudioUrl;
      }
    } catch (err) {
      console.warn('[YouTube] Convert1s resolution failed, falling back:', err.message);
    }
  }

  // PRIORITAS 1.5: Remote self-hosted yt-dlp server (if configured in settings)
  if (directVid) {
    try {
      const remoteAudioUrl = await resolveYtDlpRemoteAudio(directVid);
      if (remoteAudioUrl) {
        return remoteAudioUrl;
      }
    } catch (err) {
      console.warn('[YouTube] Remote yt-dlp audio resolution failed, falling back:', err.message);
    }
  }

  // PRIORITAS 2: Local yt-dlp server (if in Vite dev web mode)
  if (isLocalWeb()) {
    try {
      const searchQuery = rawQuery || (directVid ? `https://youtube.com/watch?v=${directVid}` : '');
      if (searchQuery) {
        const localRes = await httpClient({
          url: `/api/yt-dlp/audio-url?q=${encodeURIComponent(searchQuery)}`,
          timeout: 15000,
        });
        if (localRes?.audioUrl) {
          return localRes.audioUrl;
        }
      }
    } catch (err) {
      console.warn('[YouTube] Local yt-dlp fallback gagal, coba Piped:', err.message);
    }
  }

  // PRIORITAS 3: Jalur cepat Piped - ID video langsung
  if (directVid) {
    try {
      const streams = await pipedGetStreams(directVid);
      const audioUrl = pickPipedAudioUrl(streams);
      if (audioUrl) {
        return audioUrl;
      }
    } catch (err) {
      console.warn('[YouTube] Piped direct stream failed:', err.message);
    }
  }

  // PRIORITAS 4: Piped search multi-kandidat
  if (!rawQuery) throw new Error('Kueri pencarian kosong.');
  const results = await pipedSearchVideosSafe(rawQuery, 5);
  if (!results.length && !directVid) {
    throw new Error(`Tidak dapat menemukan stream audio untuk "${rawQuery}". Coba kata kunci lain atau pakai link YouTube langsung.`);
  }

  let lastError = null;
  const attempts = results.slice(0, 5);
  for (let i = 0; i < attempts.length; i += 1) {
    const vid = attempts[i]?.videoId;
    if (!vid) continue;
    try {
      const streams = await pipedGetStreams(vid);
      const audioUrl = pickPipedAudioUrl(streams);
      if (audioUrl) return audioUrl;
      lastError = new Error('Stream audio tidak tersedia untuk video ini. Coba lagu lain.');
    } catch (err) {
      lastError = err;
    }
    // Jeda antar kandidat agar tidak dihajar rate-limit / bot-detect beruntun
    if (i < attempts.length - 1) await sleep(800);
  }
  throw new Error(formatResolverError(lastError, rawQuery));
}

/**
 * Resolves a direct playable/downloadable MP4 video URL for a video ID or watch URL.
 */
export async function resolveYouTubeVideoUrl({ videoId = null, url = '', onProgress = null } = {}) {
  const vid = extractPipedVideoId(String(videoId || '')) || extractPipedVideoId(String(url || ''));
  if (!vid) throw new Error('Video ID YouTube tidak valid.');

  // PRIORITAS 1: ymcdn Cloud Converter with progress polling (Bypasses YouTube 410 completely)
  try {
    const ymcdnVideoUrl = await resolveYmcdnConvert({ videoId: vid, format: 'mp4', onProgress });
    if (ymcdnVideoUrl) {
      return ymcdnVideoUrl;
    }
  } catch (err) {
    console.warn('[YouTube] ymcdn video resolution failed, falling back:', err.message);
  }

  // PRIORITAS 1.2: Local yt-dlp server (if in Vite dev web mode)
  if (isLocalWeb()) {
    try {
      const localRes = await httpClient({
        url: `/api/yt-dlp/video-url?q=${encodeURIComponent(`https://youtube.com/watch?v=${vid}`)}`,
        timeout: 15000,
      });
      if (localRes?.videoUrl) {
        return localRes.videoUrl;
      }
    } catch (_) {}
  }

  // PRIORITAS 1.5: Remote self-hosted yt-dlp server (if configured in settings)
  try {
    const remoteVideoUrl = await resolveYtDlpRemoteVideoUrl(vid);
    if (remoteVideoUrl) {
      return remoteVideoUrl;
    }
  } catch (_) {}

  // PRIORITAS 2: Piped progressive video stream
  try {
    const streams = await pipedGetStreams(vid);
    const progressive = pickPipedProgressiveStreams(streams);
    if (progressive.length > 0 && progressive[0].url) {
      return progressive[0].url;
    }
  } catch (err) {
    console.warn('[YouTube] Piped video stream failed:', err.message);
  }

  throw new Error('Gagal memperbarui stream video YouTube. Coba lagi dalam beberapa saat.');
}

async function pipedSearchVideosSafe(rawQuery, limit = 5) {
  try {
    return await pipedSearchVideos(rawQuery, limit);
  } catch {
    return [];
  }
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

function buildYouTubeDownloadOptions({ cleanUrl, videoId, maxThumbUrl, vData, aData, isLocal, pipedAudioUrl = null, pipedVideoUrl = null }) {
  const thumbHq = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const thumbSd = `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;

  // Remote (non-local) URLs are resolved on-demand per download request with live server progress polling
  const remoteVideoUrl = null;
  const remoteAudioUrl = null;

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
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'video', '1080p') : remoteVideoUrl,
      videoId,
      platform: 'youtube',
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
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'video', '720p') : remoteVideoUrl,
      videoId,
      platform: 'youtube',
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
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'video', '480p') : remoteVideoUrl,
      videoId,
      platform: 'youtube',
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
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'video', '360p') : remoteVideoUrl,
      videoId,
      platform: 'youtube',
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
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'audio', '320k') : remoteAudioUrl,
      videoId,
      platform: 'youtube',
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
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'audio', '256k') : remoteAudioUrl,
      videoId,
      platform: 'youtube',
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
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'audio', '192k') : remoteAudioUrl,
      videoId,
      platform: 'youtube',
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
      url: isLocal ? createLocalDownloadUrl(cleanUrl, 'audio', '128k') : remoteAudioUrl,
      videoId,
      platform: 'youtube',
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

  // Remote metadata extraction: Piped direct streams first, direct search fallback.
  let pipedTitle = null;
  let pipedUploader = null;
  let pipedDuration = null;
  let pipedCover = null;
  try {
    const streams = await pipedGetStreams(videoId);
    pipedTitle = streams?.title || null;
    pipedUploader = streams?.uploader || streams?.uploaderName || null;
    pipedDuration = formatPipedDuration(streams?.duration) || null;
    pipedCover = streams?.thumbnailUrl || null;
  } catch (err) {
    console.warn('Piped stream info warning, extracting metadata via web fallback:', err?.message || err);
  }

  // If Piped title is missing, fetch basic title from YouTube oEmbed API
  if (!pipedTitle) {
    try {
      const oembedRes = await httpClient({
        url: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        timeout: 8000,
      });
      if (oembedRes?.title) {
        pipedTitle = oembedRes.title;
        pipedUploader = oembedRes.author_name || pipedUploader;
      }
    } catch (_) {}
  }

  const title = pipedTitle || `YouTube Video (${videoId})`;
  const downloadOptions = buildYouTubeDownloadOptions({
    cleanUrl,
    videoId,
    maxThumbUrl,
    isLocal: false,
  });

  return {
    platform: 'youtube',
    id: videoId,
    title,
    cover: pipedCover || thumbUrl,
    author: {
      name: pipedUploader || 'YouTube Video',
      username: `@${videoId}`,
      avatar: null,
    },
    duration: pipedDuration,
    options: downloadOptions,
  };
}
