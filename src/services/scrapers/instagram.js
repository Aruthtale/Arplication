import { httpClient, isLocalWeb } from '../http.js';
import { getDownloadSettings } from '../../utils/download.js';

const IG_URL_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
const IG_SHARE_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/share\/(?:reel|p)\/([A-Za-z0-9_-]+)/i;
const IG_HIGHLIGHT_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/stories\/highlights\/([0-9]+)/i;
const IG_SHORT_HIGHLIGHT_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/s\/([A-Za-z0-9_=-]+)/i;
const IG_STORY_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/stories\/([A-Za-z0-9_.-]+)\/([0-9]+)/i;

/**
 * Checks if a string is a valid Instagram URL (Post, Reel, Story, Highlight)
 */
export function isInstagramUrl(url = '') {
  const clean = String(url).trim();
  return (
    IG_URL_PATTERN.test(clean) ||
    IG_SHARE_PATTERN.test(clean) ||
    IG_HIGHLIGHT_PATTERN.test(clean) ||
    IG_SHORT_HIGHLIGHT_PATTERN.test(clean) ||
    IG_STORY_PATTERN.test(clean)
  );
}

/**
 * Extracts Instagram link details (type, id, username)
 */
export function extractInstagramDetails(url = '') {
  const clean = String(url).trim();

  // 1. Highlight standard URL
  const highlightMatch = clean.match(IG_HIGHLIGHT_PATTERN);
  if (highlightMatch) {
    return { type: 'highlight', id: highlightMatch[1], shortcode: highlightMatch[1] };
  }

  // 2. Shortened highlight URL (/s/aGlnaGxpZ2h0OjE3OT...)
  const shortHighlightMatch = clean.match(IG_SHORT_HIGHLIGHT_PATTERN);
  if (shortHighlightMatch) {
    const rawCode = shortHighlightMatch[1];
    try {
      if (typeof atob === 'function') {
        const decoded = atob(rawCode.replace(/-/g, '+').replace(/_/g, '/'));
        const subMatch = decoded.match(/highlight:([0-9]+)/);
        if (subMatch) {
          return { type: 'highlight', id: subMatch[1], shortcode: subMatch[1] };
        }
      }
    } catch {
      // Ignore base64 decode failure
    }
    return { type: 'highlight', id: rawCode, shortcode: rawCode };
  }

  // 3. User Story URL
  const storyMatch = clean.match(IG_STORY_PATTERN);
  if (storyMatch) {
    return { type: 'story', username: storyMatch[1], id: storyMatch[2], shortcode: storyMatch[2] };
  }

  // 4. Standard Post / Reel / Share URL
  const postMatch = clean.match(IG_URL_PATTERN) || clean.match(IG_SHARE_PATTERN);
  if (postMatch) {
    return { type: 'post', id: postMatch[1], shortcode: postMatch[1] };
  }

  return { type: 'unknown', id: null, shortcode: null };
}

/**
 * Extracts the shortcode identifier from an Instagram URL
 */
export function extractInstagramShortcode(url = '') {
  const details = extractInstagramDetails(url);
  return details.shortcode || null;
}

/**
 * Gets the proxy or direct URL for an Instagram path
 */
export function getInstagramPageUrl(shortcode, embed = false) {
  const path = embed ? `/p/${shortcode}/embed/captioned/` : `/p/${shortcode}/`;
  if (isLocalWeb()) {
    return `/__instagram${path}`;
  }
  return `https://www.instagram.com${path}`;
}

/**
 * Gets the FastDL endpoint (proxy in local web, direct in native/production)
 */
export function getFastDlApiUrl() {
  if (isLocalWeb()) {
    return '/__fastdl/api/convert';
  }
  return 'https://api-wh.fastdl.app/api/convert';
}

/**
 * Normalizes and decodes HTML entities
 */
export function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#x201c;/g, '“')
    .replace(/&#x201d;/g, '”')
    .replace(/&#x2018;/g, '‘')
    .replace(/&#x2019;/g, '’')
    .replace(/&#x1f91d;/g, '🤝')
    .replace(/&#x1f923;/g, '🤣')
    .replace(/&#x1f972;/g, '🥲')
    .replace(/&#x1f927;/g, '🤧')
    .replace(/&#x1fae0;/g, '🫠')
    .replace(/&#x1f62d;/g, '😭')
    .replace(/&#064;/g, '@')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Parses Instagram HTML (oEmbed, embed or public page) into a standardized media result
 */
export function parseInstagramHtml(html = '', originalUrl = '') {
  const source = String(html);
  const shortcode = extractInstagramShortcode(originalUrl) || 'instagram_media';

  // 1. OpenGraph and Meta tags
  const extractMeta = (propName) => {
    const patterns = [
      new RegExp(`<meta\\b[^>]*\\bproperty=["']${propName}["'][^>]*\\bcontent=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta\\b[^>]*\\bcontent=["']([^"']*)["'][^>]*\\bproperty=["']${propName}["']`, 'i'),
      new RegExp(`<meta\\b[^>]*\\bname=["']${propName}["'][^>]*\\bcontent=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta\\b[^>]*\\bcontent=["']([^"']*)["'][^>]*\\bname=["']${propName}["']`, 'i'),
    ];
    for (const pat of patterns) {
      const match = source.match(pat);
      if (match && match[1]) return decodeHtmlEntities(match[1]);
    }
    return null;
  };

  const ogTitle = extractMeta('og:title') || '';
  const ogImage = extractMeta('og:image');
  const ogVideo = extractMeta('og:video:secure_url') || extractMeta('og:video');
  const ogDescription = extractMeta('og:description') || extractMeta('description') || '';
  const isVideoPage = /reel|reels|tv/i.test(originalUrl) || Boolean(ogVideo) || /"is_video":\s*true|video_versions/i.test(source);

  // 2. Parse Author Information
  let authorName = 'Instagram Creator';
  let username = `@${shortcode}`;
  let caption = ogTitle;

  const titleAuthorMatch = ogTitle.match(/^(.*?)\s+on\s+Instagram:\s*(?:&quot;|")?(.*)/is);
  if (titleAuthorMatch) {
    authorName = titleAuthorMatch[1].trim();
    username = `@${authorName.toLowerCase().replace(/\s+/g, '_')}`;
    caption = titleAuthorMatch[2].replace(/(?:&quot;|")\s*$/g, '').trim();
  }

  const descAuthorMatch = ogDescription.match(/-\s*([a-zA-Z0-9._]+)\s+on\s+/i);
  if (descAuthorMatch && !authorName) {
    authorName = descAuthorMatch[1];
    username = `@${authorName}`;
  }

  // 3. Collect Unique Images
  const images = [];
  if (ogImage) {
    images.push(ogImage);
  }

  const imgRegex = /https:\/\/[^"'\s<>]*(?:scontent|cdninstagram)[^"'\s<>]+\.(?:jpg|jpeg|webp|png)[^"'\s<>]*/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(source)) !== null) {
    const rawUrl = decodeHtmlEntities(imgMatch[0].replace(/\\u0026/g, '&').replace(/\\/g, ''));
    if (!images.includes(rawUrl) && !rawUrl.includes('/rsrc.php/') && !rawUrl.includes('static.cdninstagram.com')) {
      images.push(rawUrl);
    }
  }

  // 4. Collect Unique Video streams
  const videos = [];
  if (ogVideo) {
    videos.push(ogVideo);
  }

  const vidRegex = /https:\/\/[^"'\s<>]*(?:scontent|cdninstagram)[^"'\s<>]+\.mp4[^"'\s<>]*/gi;
  let vidMatch;
  while ((vidMatch = vidRegex.exec(source)) !== null) {
    const rawUrl = decodeHtmlEntities(vidMatch[0].replace(/\\u0026/g, '&').replace(/\\/g, ''));
    if (!videos.includes(rawUrl)) {
      videos.push(rawUrl);
    }
  }

  // 5. Construct Download Options
  const options = [];

  if (videos.length > 0) {
    videos.forEach((videoUrl, idx) => {
      options.push({
        id: `ig-video-${idx + 1}`,
        label: videos.length > 1 ? `Video Part ${idx + 1} (MP4)` : 'Video (MP4 HD)',
        ext: 'mp4',
        type: 'video',
        url: videoUrl,
        quality: 'Original HD',
      });
    });
  } else if (isVideoPage) {
    options.push({
      id: 'ig-video-web',
      label: 'Watch / Stream Reel (MP4)',
      ext: 'mp4',
      type: 'video',
      url: originalUrl,
      quality: 'HD Stream',
    });
  }

  if (images.length > 1) {
    images.slice(0, 10).forEach((imgUrl, idx) => {
      options.push({
        id: `ig-slide-${idx + 1}`,
        label: `Carousel Slide ${idx + 1}`,
        ext: 'jpg',
        type: 'image',
        url: imgUrl,
        quality: 'High Resolution',
      });
    });
  } else if (images.length === 1 && !videos.length) {
    options.push({
      id: 'ig-photo-1',
      label: 'Photo Image (JPG)',
      ext: 'jpg',
      type: 'image',
      url: images[0],
      quality: 'Original Photo',
    });
  }

  if (images.length > 0 && (videos.length > 0 || isVideoPage)) {
    options.push({
      id: 'ig-thumbnail',
      label: 'Cover Thumbnail',
      ext: 'jpg',
      type: 'image',
      url: images[0],
      quality: 'High-Res Image',
    });
  }

  return {
    platform: 'instagram',
    id: shortcode,
    title: caption || `Instagram Post (${shortcode})`,
    cover: images[0] || null,
    author: {
      name: authorName,
      username,
      avatar: null,
    },
    duration: null,
    options: options.length > 0 ? options : [
      {
        id: 'ig-media-direct',
        label: 'Instagram Media Link',
        ext: 'jpg',
        type: 'image',
        url: ogImage || originalUrl,
        quality: 'Standard',
      },
    ],
  };
}

/**
 * Scrapes Instagram Stories or Highlights using Session Cookie or Fallback Gateways
 */
export async function scrapeInstagramStoryOrHighlight(details, originalUrl) {
  const settings = getDownloadSettings();
  const sessionId = settings.igSessionId ? settings.igSessionId.trim() : '';

  // 1. Authenticated Session ID Method (GraphQL / Reels Media API)
  if (sessionId) {
    try {
      const reelId = details.type === 'highlight' ? `highlight:${details.id}` : details.id;
      const apiEndpoint = `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(reelId)}`;
      
      const res = await httpClient({
        url: apiEndpoint,
        headers: {
          'Cookie': `sessionid=${sessionId};`,
          'User-Agent': 'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; Xiaomi; 455000000)',
          'X-IG-App-ID': '936619743392459',
          'Accept': '*/*',
        },
        timeout: 12000,
      });

      const reelData = res?.reels_media?.[0] || res?.reels?.[reelId];
      if (reelData && Array.isArray(reelData.items) && reelData.items.length > 0) {
        const userObj = reelData.user || {};
        const options = [];

        reelData.items.forEach((item, idx) => {
          const isVideo = item.media_type === 2 || Boolean(item.video_versions?.length);
          const mediaUrl = isVideo 
            ? item.video_versions?.[0]?.url 
            : item.image_versions2?.candidates?.[0]?.url;

          if (mediaUrl) {
            options.push({
              id: `story-${idx + 1}`,
              label: isVideo ? `Story ${idx + 1} (Video MP4)` : `Story ${idx + 1} (Foto JPG)`,
              ext: isVideo ? 'mp4' : 'jpg',
              type: isVideo ? 'video' : 'image',
              url: mediaUrl,
              quality: 'Original Quality',
            });
          }
        });

        if (options.length > 0) {
          return {
            platform: 'instagram',
            id: details.id,
            title: reelData.title ? `Highlight: ${reelData.title}` : `Instagram Stories (@${userObj.username || details.id})`,
            cover: reelData.cover_media?.cropped_image_version?.url || options[0]?.url,
            author: {
              name: userObj.full_name || userObj.username || 'Instagram User',
              username: `@${userObj.username || 'user'}`,
              avatar: userObj.profile_pic_url || null,
            },
            duration: null,
            options,
          };
        }
      }
    } catch (sessionErr) {
      console.warn('Instagram session fetch failed, falling back to public gateways:', sessionErr);
    }
  }

  // 2. Public Gateway Fallback (FastDL API for stories/highlights)
  try {
    const fastDlRes = await httpClient({
      url: getFastDlApiUrl(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        url: originalUrl,
      },
      timeout: 12000,
    });

    if (fastDlRes && (fastDlRes.url || (Array.isArray(fastDlRes.items) && fastDlRes.items.length > 0))) {
      const items = Array.isArray(fastDlRes.items) ? fastDlRes.items : [fastDlRes];
      const options = items.map((item, idx) => ({
        id: `story-dl-${idx + 1}`,
        label: item.type === 'video' ? `Story ${idx + 1} (Video MP4)` : `Story ${idx + 1} (Foto JPG)`,
        ext: item.type === 'video' ? 'mp4' : 'jpg',
        type: item.type === 'video' ? 'video' : 'image',
        url: item.url || item.download_url,
        quality: 'HD Quality',
      }));

      return {
        platform: 'instagram',
        id: details.id,
        title: fastDlRes.title || `Instagram Highlight (${details.id})`,
        cover: items[0]?.thumbnail || items[0]?.url,
        author: {
          name: fastDlRes.author || 'Instagram User',
          username: `@${details.id}`,
          avatar: null,
        },
        duration: null,
        options,
      };
    }
  } catch {
    // Gateway fallback failed
  }

  throw new Error(
    'Gagal mengambil Highlight/Story Instagram. Untuk Highlight atau akun privat, Anda bisa memasukkan Instagram Session ID di menu Pengaturan.'
  );
}

/**
 * Scrapes Instagram cookieless (Post/Reel/Carousel) or via Story Handler
 */
export async function scrapeInstagram(url = '') {
  const cleanUrl = String(url).trim();
  const details = extractInstagramDetails(cleanUrl);

  if (!details.id) {
    throw new Error('URL Instagram tidak valid. Pastikan link berupa Post, Reel, Carousel, atau Highlight.');
  }

  // Handle Stories & Highlights
  if (details.type === 'highlight' || details.type === 'story') {
    return scrapeInstagramStoryOrHighlight(details, cleanUrl);
  }

  const shortcode = details.shortcode;
  const normalizedUrl = `https://www.instagram.com/p/${shortcode}/`;

  // Layer 1: Direct Instagram Embed page (Fast, cookieless, contains meta & CDN asset links)
  try {
    const embedUrl = getInstagramPageUrl(shortcode, true);
    const embedRes = await httpClient({
      url: embedUrl,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      raw: true,
      timeout: 12000,
    });

    const embedHtml = embedRes?.data || '';
    if (embedHtml && embedHtml.length > 200) {
      return parseInstagramHtml(embedHtml, normalizedUrl);
    }
  } catch {
    // Embed fetch failed, try main page or fallback
  }

  // Layer 2: Direct main page fetch
  try {
    const directUrl = getInstagramPageUrl(shortcode, false);
    const directRes = await httpClient({
      url: directUrl,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      raw: true,
      timeout: 12000,
    });

    const directHtml = directRes?.data || '';
    if (directHtml && directHtml.length > 200) {
      return parseInstagramHtml(directHtml, normalizedUrl);
    }
  } catch {
    // Main page fetch failed, proceed to fallback
  }

  // Layer 3: FastDL API Convert Engine Fallback
  try {
    const fastDlRes = await httpClient({
      url: getFastDlApiUrl(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        url: normalizedUrl,
      },
      timeout: 10000,
    });

    if (fastDlRes && (fastDlRes.url || (Array.isArray(fastDlRes.items) && fastDlRes.items.length > 0))) {
      const items = Array.isArray(fastDlRes.items) ? fastDlRes.items : [fastDlRes];
      const options = items.map((item, idx) => ({
        id: `fastdl-${idx + 1}`,
        label: item.type === 'video' ? `Video MP4 (HD ${idx + 1})` : `Image JPG (${idx + 1})`,
        ext: item.type === 'video' ? 'mp4' : 'jpg',
        type: item.type === 'video' ? 'video' : 'image',
        url: item.url || item.download_url,
        quality: 'HD High Quality',
      }));

      return {
        platform: 'instagram',
        id: shortcode,
        title: fastDlRes.title || `Instagram Media (${shortcode})`,
        cover: items[0]?.thumbnail || items[0]?.url,
        author: {
          name: fastDlRes.author || 'Instagram Creator',
          username: `@${shortcode}`,
          avatar: null,
        },
        duration: null,
        options,
      };
    }
  } catch {
    // FastDL fallback failed
  }

  throw new Error('Gagal mengambil konten Instagram. Pastikan akun atau postingan bersifat publik.');
}
