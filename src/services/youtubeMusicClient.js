import { getValidAccessToken } from './youtubeMusicAuth.js';
import { httpClient } from './http.js';

/**
 * YouTube Music API Client (Authenticated)
 * Menggunakan YouTube Music Internal API (sama seperti web client official)
 * 
 * Endpoints:
 * - /browse → Library, playlists, recommendations
 * - /search → Search dengan personalization
 * - /next → Get stream info
 */

const YTMUSIC_API_BASE = 'https://music.youtube.com/youtubei/v1';
const API_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WBYTJ3grs'; // Public API key dari YouTube Music web client

/**
 * Build common context untuk semua requests
 */
function buildContext() {
  return {
    client: {
      clientName: 'WEB_REMIX',
      clientVersion: '1.20240101.01.00',
      hl: 'id', // Bahasa Indonesia
      gl: 'ID', // Region Indonesia
    },
  };
}

/**
 * Make authenticated request ke YouTube Music API
 */
async function ytmusicRequest(endpoint, body = {}, requireAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
  };

  if (requireAuth) {
    const accessToken = await getValidAccessToken();
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await httpClient({
    url: `${YTMUSIC_API_BASE}${endpoint}`,
    method: 'POST',
    headers,
    data: {
      context: buildContext(),
      ...body,
    },
    timeout: 15000,
  });

  return response;
}

/**
 * Get user's library (liked songs, recent, etc.)
 */
export async function getLibrary() {
  try {
    const data = await ytmusicRequest('/browse', {
      browseId: 'FEmusic_library_landing',
    });

    // Parse response (struktur kompleks, perlu extracting)
    const tracks = parseLibraryResponse(data);
    return tracks;
  } catch (error) {
    console.error('Failed to fetch library:', error);
    throw new Error('Gagal memuat library. Pastikan sudah login.');
  }
}

/**
 * Get liked songs playlist
 */
export async function getLikedSongs() {
  try {
    const data = await ytmusicRequest('/browse', {
      browseId: 'VLRDAMVM', // Liked songs playlist ID
    });

    const tracks = parseLikedSongsResponse(data);
    return tracks;
  } catch (error) {
    console.error('Failed to fetch liked songs:', error);
    throw new Error('Gagal memuat liked songs.');
  }
}

/**
 * Search YouTube Music (authenticated = personalized results)
 */
export async function searchAuthenticated(query, limit = 20) {
  try {
    const data = await ytmusicRequest('/search', {
      query,
      params: 'EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D', // Filter: songs only
    });

    const tracks = parseSearchResponse(data, limit);
    return tracks;
  } catch (error) {
    console.error('Failed to search:', error);
    throw new Error('Gagal mencari lagu.');
  }
}

/**
 * Get recommendations / home feed
 */
export async function getRecommendations() {
  try {
    const data = await ytmusicRequest('/browse', {
      browseId: 'FEmusic_home',
    });

    const sections = parseHomeResponse(data);
    return sections;
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    throw new Error('Gagal memuat rekomendasi.');
  }
}

/**
 * Parse library response → array of tracks
 */
function parseLibraryResponse(data) {
  const tracks = [];
  
  try {
    // Navigate complex YouTube Music API response structure
    const shelves = data?.contents?.singleColumnBrowseResultsRenderer
      ?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const shelf of shelves) {
      const items = shelf?.musicCarouselShelfRenderer?.contents || 
                    shelf?.musicShelfRenderer?.contents || [];

      for (const item of items) {
        const trackData = item?.musicResponsiveListItemRenderer || 
                         item?.musicTwoRowItemRenderer;
        
        if (trackData) {
          const track = parseTrackItem(trackData);
          if (track) tracks.push(track);
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse library:', e);
  }

  return tracks;
}

/**
 * Parse liked songs response
 */
function parseLikedSongsResponse(data) {
  const tracks = [];
  
  try {
    const items = data?.contents?.singleColumnBrowseResultsRenderer
      ?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer
      ?.contents?.[0]?.musicPlaylistShelfRenderer?.contents || [];

    for (const item of items) {
      const trackData = item?.musicResponsiveListItemRenderer;
      if (trackData) {
        const track = parseTrackItem(trackData);
        if (track) tracks.push(track);
      }
    }
  } catch (e) {
    console.error('Failed to parse liked songs:', e);
  }

  return tracks;
}

/**
 * Parse search response
 */
function parseSearchResponse(data, limit) {
  const tracks = [];
  
  try {
    const items = data?.contents?.tabbedSearchResultsRenderer
      ?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer
      ?.contents?.[0]?.musicShelfRenderer?.contents || [];

    for (const item of items.slice(0, limit)) {
      const trackData = item?.musicResponsiveListItemRenderer;
      if (trackData) {
        const track = parseTrackItem(trackData);
        if (track) tracks.push(track);
      }
    }
  } catch (e) {
    console.error('Failed to parse search results:', e);
  }

  return tracks;
}

/**
 * Parse home/recommendations response
 */
function parseHomeResponse(data) {
  const sections = [];
  
  try {
    const shelves = data?.contents?.singleColumnBrowseResultsRenderer
      ?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const shelf of shelves) {
      const shelfData = shelf?.musicCarouselShelfRenderer || shelf?.musicShelfRenderer;
      if (!shelfData) continue;

      const title = shelfData?.header?.musicCarouselShelfBasicHeaderRenderer
        ?.title?.runs?.[0]?.text || 'Untitled';

      const items = shelfData?.contents || [];
      const tracks = items
        .map(item => parseTrackItem(item?.musicTwoRowItemRenderer || item?.musicResponsiveListItemRenderer))
        .filter(Boolean);

      if (tracks.length > 0) {
        sections.push({
          title,
          tracks,
        });
      }
    }
  } catch (e) {
    console.error('Failed to parse home feed:', e);
  }

  return sections;
}

/**
 * Parse single track item (universal parser untuk berbagai format response)
 */
function parseTrackItem(trackData) {
  if (!trackData) return null;

  try {
    // Extract video ID
    const videoId = trackData?.playNavigationEndpoint?.watchEndpoint?.videoId ||
                    trackData?.overlay?.musicItemThumbnailOverlayRenderer
                      ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint
                      ?.watchEndpoint?.videoId;

    if (!videoId) return null;

    // Extract title
    const title = trackData?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer
      ?.text?.runs?.[0]?.text || 
      trackData?.title?.runs?.[0]?.text || 'Unknown';

    // Extract artist
    const artist = trackData?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer
      ?.text?.runs?.[0]?.text || 
      trackData?.subtitle?.runs?.[0]?.text || 'Unknown';

    // Extract thumbnail
    const thumbnails = trackData?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const cover = thumbnails[thumbnails.length - 1]?.url || null;

    // Extract duration (jika ada)
    const durationText = trackData?.flexColumns?.[trackData.flexColumns.length - 1]
      ?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
    const duration = parseDurationText(durationText);

    return {
      videoId,
      title,
      artist,
      cover,
      duration,
      durationFormatted: durationText || null,
    };
  } catch (e) {
    console.error('Failed to parse track item:', e);
    return null;
  }
}

/**
 * Parse duration text (e.g., "3:45") → seconds
 */
function parseDurationText(text) {
  if (!text) return 0;
  
  try {
    const parts = text.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  } catch (e) {
    // Ignore
  }
  
  return 0;
}

export default {
  getLibrary,
  getLikedSongs,
  searchAuthenticated,
  getRecommendations,
};
