import { httpClient, isLocalWeb } from '../http.js';

const SPOTIFY_URL_PATTERN = /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i;
const SPOTIFY_LINK_PATTERN = /(?:https?:\/\/)?spotify\.link\/([a-zA-Z0-9]+)/i;

/**
 * Gets the proxy or direct URL for Spotify embed page
 */
export function getSpotifyEmbedUrl(type, id) {
  const path = `/embed/${type}/${id}`;
  if (isLocalWeb()) {
    return `/__spotify${path}`;
  }
  return `https://open.spotify.com${path}`;
}

/**
 * Checks if a string is a valid Spotify URL
 */
export function isSpotifyUrl(url = '') {
  const clean = String(url).trim();
  return SPOTIFY_URL_PATTERN.test(clean) || SPOTIFY_LINK_PATTERN.test(clean);
}

/**
 * Extracts type and Spotify ID from a Spotify URL
 */
export function extractSpotifyDetails(url = '') {
  const clean = String(url).trim();
  const match = clean.match(SPOTIFY_URL_PATTERN);
  if (match) {
    return {
      type: match[1].toLowerCase(),
      id: match[2],
    };
  }
  return null;
}

/**
 * Formats duration milliseconds into m:ss format
 */
export function formatSpotifyDuration(ms) {
  if (!ms || typeof ms !== 'number' || isNaN(ms)) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Resolves full MP3 download URL for a Spotify track (via local yt-dlp or cloud ymcdn engine)
 */
export async function resolveSpotifyTrackAudio({ title = '', artist = '', query = '' }) {
  const searchQuery = (query || `${artist} - ${title}`).trim();
  if (isLocalWeb()) {
    return `/api/yt-dlp/download?query=${encodeURIComponent(searchQuery)}&format=audio`;
  }

  // Step 1: Search YouTube for matching video ID
  let videoId = null;
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const searchRes = await httpClient({
      url: searchUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      raw: true,
      timeout: 12000,
    });

    let rawHtml = String(searchRes?.data || '');
    // Decode YouTube hex escapes e.g. \x22videoId\x22
    const unescapedHtml = rawHtml.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    const matches = [
      ...unescapedHtml.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g),
      ...unescapedHtml.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g),
    ];
    const ids = [...new Set(matches.map((m) => m[1]))];
    videoId = ids[0] || null;
  } catch (err) {
    console.warn('YouTube search scraping error:', err);
  }

  if (!videoId) {
    throw new Error(`Tidak dapat menemukan stream audio untuk "${searchQuery}".`);
  }

  // Step 2: Initialize ymcdn conversion engine
  const initRes = await httpClient({
    url: 'https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471',
    headers: {
      Origin: 'https://ytmp3.mobi',
      Referer: 'https://ytmp3.mobi/',
    },
    timeout: 10000,
  });

  if (!initRes?.convertURL) {
    throw new Error('Layanan konversi audio sedang sibuk. Silakan coba kembali beberapa saat lagi.');
  }

  // Step 3: Request MP3 conversion
  const convRes = await httpClient({
    url: `${initRes.convertURL}&v=${videoId}&f=mp3`,
    headers: {
      Origin: 'https://ytmp3.mobi',
      Referer: 'https://ytmp3.mobi/',
    },
    timeout: 10000,
  });

  if (!convRes?.downloadURL) {
    throw new Error('Gagal memulai konversi MP3.');
  }

  let downloadUrl = convRes.downloadURL;
  if (convRes.progressURL) {
    for (let i = 0; i < 15; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const progRes = await httpClient({
          url: convRes.progressURL,
          headers: {
            Origin: 'https://ytmp3.mobi',
            Referer: 'https://ytmp3.mobi/',
          },
          timeout: 8000,
        });
        if (progRes?.progress === 3 || progRes?.error === 0) {
          if (progRes.downloadURL) downloadUrl = progRes.downloadURL;
          break;
        }
      } catch {
        // continue polling
      }
    }
  }

  return downloadUrl;
}

/**
 * Parses Spotify embed HTML page data (__NEXT_DATA__)
 */
export function parseSpotifyEmbedData(html = '', originalUrl = '') {
  const source = String(html);
  const details = extractSpotifyDetails(originalUrl) || { type: 'track', id: 'spotify_track' };

  let entity = null;
  const nextDataMatch = source.match(/<script\s+id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (nextDataMatch && nextDataMatch[1]) {
    try {
      const parsedData = JSON.parse(nextDataMatch[1]);
      entity = parsedData?.props?.pageProps?.state?.data?.entity || null;
    } catch {
      // JSON parse fallback
    }
  }

  // Extract meta tags fallback if NEXT_DATA not present
  const extractMeta = (propName) => {
    const patterns = [
      new RegExp(`<meta\\b[^>]*\\bproperty=["']${propName}["'][^>]*\\bcontent=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta\\b[^>]*\\bcontent=["']([^"']*)["'][^>]*\\bproperty=["']${propName}["']`, 'i'),
    ];
    for (const pat of patterns) {
      const match = source.match(pat);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  const title = entity?.name || extractMeta('og:title') || `Spotify ${details.type.toUpperCase()}`;
  const artistsList = Array.isArray(entity?.artists)
    ? entity.artists.map((a) => a.name).join(', ')
    : extractMeta('og:description') || 'Spotify Artist';

  const cover =
    entity?.visualIdentity?.image?.[0]?.url ||
    entity?.videoThumbnailImage?.url ||
    extractMeta('og:image') ||
    null;

  const isCollection = details.type === 'album' || details.type === 'playlist' || Array.isArray(entity?.trackList);

  if (isCollection && Array.isArray(entity?.trackList)) {
    const tracks = entity.trackList.map((t, idx) => {
      const artist = (t.subtitle || artistsList || '').replace(/\u00a0/g, ' ').trim();
      const trackTitle = t.title || `Track ${idx + 1}`;
      const durationMs = t.duration || 0;
      const trackId = t.uri ? t.uri.replace('spotify:track:', '') : (t.uid || `track_${idx + 1}`);
      const trackQuery = `${artist} - ${trackTitle}`.trim();
      const previewUrl = t.audioPreview?.url || null;

      return {
        id: trackId,
        index: idx + 1,
        title: trackTitle,
        artist,
        duration: formatSpotifyDuration(durationMs),
        durationMs,
        previewUrl,
        query: trackQuery,
        cover,
        downloadUrl: isLocalWeb()
          ? `/api/yt-dlp/download?query=${encodeURIComponent(trackQuery)}&format=audio`
          : null,
      };
    });

    const options = [];
    if (cover) {
      options.push({
        id: 'spotify-cover-art',
        label: `${details.type === 'album' ? 'Album' : 'Playlist'} Cover Art (HD)`,
        ext: 'jpg',
        type: 'image',
        url: cover,
        quality: 'High Resolution',
      });
    }

    options.push({
      id: 'spotify-stream-link',
      label: `Open in Spotify (${details.type.toUpperCase()})`,
      ext: 'url',
      type: 'audio',
      url: originalUrl,
      quality: 'Official Stream',
    });

    return {
      platform: 'spotify',
      id: entity?.id || details.id,
      type: details.type,
      isPlaylist: true,
      title,
      cover,
      author: {
        name: artistsList,
        username: `@${artistsList.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        avatar: null,
      },
      duration: null,
      trackCount: tracks.length,
      tracks,
      options,
    };
  }

  // Single Track parsing
  const audioPreviewUrl = entity?.audioPreview?.url || null;
  const durationStr = entity?.duration ? formatSpotifyDuration(entity.duration) : null;
  const query = `${artistsList} - ${title}`.trim();

  const options = [];

  // 1. Full Track MP3 option (Spotify spotDL pattern)
  options.push({
    id: 'spotify-full-mp3',
    label: 'Full Track (MP3 320kbps)',
    ext: 'mp3',
    type: 'audio',
    url: isLocalWeb()
      ? `/api/yt-dlp/download?query=${encodeURIComponent(query)}&format=audio`
      : null,
    quality: 'Full 320kbps',
    query,
    isFullAudio: true,
  });

  // 2. High-Res Cover Art option
  if (cover) {
    options.push({
      id: 'spotify-cover-art',
      label: 'Album / Track Art (HD)',
      ext: 'jpg',
      type: 'image',
      url: cover,
      quality: 'High Resolution',
    });
  }

  // 3. Web Stream / Player Link
  options.push({
    id: 'spotify-stream-link',
    label: `Open in Spotify (${details.type.toUpperCase()})`,
    ext: 'url',
    type: 'audio',
    url: originalUrl,
    quality: 'Official Stream',
  });

  return {
    platform: 'spotify',
    id: entity?.id || details.id,
    type: 'track',
    isPlaylist: false,
    title,
    cover,
    previewUrl: audioPreviewUrl,
    author: {
      name: artistsList,
      username: `@${artistsList.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      avatar: null,
    },
    duration: durationStr,
    query,
    options,
  };
}

/**
 * Scrapes Spotify track/album/playlist metadata & audio links
 */
export async function scrapeSpotify(url = '') {
  const cleanUrl = String(url).trim();
  const details = extractSpotifyDetails(cleanUrl);

  if (!details) {
    throw new Error('URL Spotify tidak valid. Pastikan link berupa Track, Album, atau Playlist.');
  }

  // Step 1: Request Spotify Embed page (contains full __NEXT_DATA__ + audio preview URL)
  const embedUrl = getSpotifyEmbedUrl(details.type, details.id);

  try {
    const embedRes = await httpClient({
      url: embedUrl,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      raw: true,
      timeout: 15000,
    });

    const embedHtml = embedRes?.data || '';
    if (embedHtml && embedHtml.length > 200) {
      return parseSpotifyEmbedData(embedHtml, cleanUrl);
    }
  } catch {
    // Embed fetch failed, fallback to oEmbed API
  }

  // Step 2: Fallback to Spotify official oEmbed API
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
  const oembedData = await httpClient({
    url: oembedUrl,
    timeout: 10000,
  });

  if (!oembedData || !oembedData.title) {
    throw new Error('Gagal mengambil data dari Spotify. Pastikan track/album dapat diakses secara publik.');
  }

  const query = oembedData.title;
  const options = [];

  options.push({
    id: 'spotify-full-mp3',
    label: 'Full Track (MP3 320kbps)',
    ext: 'mp3',
    type: 'audio',
    url: isLocalWeb()
      ? `/api/yt-dlp/download?query=${encodeURIComponent(query)}&format=audio`
      : null,
    quality: 'Full 320kbps',
    query,
    isFullAudio: true,
  });

  if (oembedData.thumbnail_url) {
    options.push({
      id: 'spotify-cover-art',
      label: 'Album / Track Art (HD)',
      ext: 'jpg',
      type: 'image',
      url: oembedData.thumbnail_url,
      quality: 'High Resolution',
    });
  }

  options.push({
    id: 'spotify-stream-link',
    label: `Open in Spotify (${details.type.toUpperCase()})`,
    ext: 'url',
    type: 'audio',
    url: cleanUrl,
    quality: 'Official Stream',
  });

  return {
    platform: 'spotify',
    id: details.id,
    type: details.type,
    isPlaylist: false,
    title: oembedData.title,
    cover: oembedData.thumbnail_url || null,
    author: {
      name: oembedData.provider_name || 'Spotify',
      username: '@spotify',
      avatar: null,
    },
    duration: null,
    query,
    options,
  };
}
