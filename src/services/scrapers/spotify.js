import { httpClient } from '../http.js';

const SPOTIFY_URL_PATTERN = /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i;
const SPOTIFY_LINK_PATTERN = /(?:https?:\/\/)?spotify\.link\/([a-zA-Z0-9]+)/i;

/**
 * Checks if current environment is local web browser (Vite dev server)
 */
function isLocalWeb() {
  return typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

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
  
  const cover = entity?.visualIdentity?.image?.[0]?.url ||
    entity?.videoThumbnailImage?.url ||
    extractMeta('og:image') ||
    null;

  const audioPreviewUrl = entity?.audioPreview?.url || null;
  const durationStr = entity?.duration ? formatSpotifyDuration(entity.duration) : null;

  const options = [];

  // 1. Audio Preview option (Direct high quality MP3 stream from Spotify CDN)
  if (audioPreviewUrl) {
    options.push({
      id: 'spotify-preview-mp3',
      label: 'Audio Preview (MP3)',
      ext: 'mp3',
      type: 'audio',
      url: audioPreviewUrl,
      quality: 'High Bitrate Preview',
    });
  }

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
    title,
    cover,
    author: {
      name: artistsList,
      username: `@${artistsList.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      avatar: null,
    },
    duration: durationStr,
    options,
  };
}

/**
 * Scrapes Spotify track/album metadata & audio preview
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

  const options = [];
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
    title: oembedData.title,
    cover: oembedData.thumbnail_url || null,
    author: {
      name: oembedData.provider_name || 'Spotify',
      username: '@spotify',
      avatar: null,
    },
    duration: null,
    options,
  };
}
