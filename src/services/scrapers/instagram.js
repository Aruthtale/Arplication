import { httpClient } from '../http.js';

const IG_URL_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
const IG_SHARE_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/share\/(?:reel|p)\/([A-Za-z0-9_-]+)/i;

/**
 * Checks if current environment is local web browser (Vite dev server)
 */
function isLocalWeb() {
  return typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
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
 * Checks if a string is a valid Instagram URL (Post, Reel, TV)
 */
export function isInstagramUrl(url = '') {
  const clean = String(url).trim();
  return IG_URL_PATTERN.test(clean) || IG_SHARE_PATTERN.test(clean);
}

/**
 * Extracts the shortcode identifier from an Instagram URL
 */
export function extractInstagramShortcode(url = '') {
  const clean = String(url).trim();
  const match = clean.match(IG_URL_PATTERN) || clean.match(IG_SHARE_PATTERN);
  return match ? match[1] : null;
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

  // 1. OpenGraph and Meta tags (supporting both property="..." and content="..." order)
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

  // Title pattern usually is: "Author on Instagram: \"Caption\"" or "Author (@username) on Instagram"
  const titleAuthorMatch = ogTitle.match(/^(.*?)\s+on\s+Instagram:\s*(?:&quot;|")?(.*)/is);
  if (titleAuthorMatch) {
    authorName = titleAuthorMatch[1].trim();
    username = `@${authorName.toLowerCase().replace(/\s+/g, '_')}`;
    caption = titleAuthorMatch[2].replace(/(?:&quot;|")\s*$/g, '').trim();
  }

  // Check description for likes/comments and author: e.g. "2M likes, 12K comments - apple on September 9, 2026..."
  const descAuthorMatch = ogDescription.match(/-\s*([a-zA-Z0-9._]+)\s+on\s+/i);
  if (descAuthorMatch && !authorName) {
    authorName = descAuthorMatch[1];
    username = `@${authorName}`;
  }

  // 3. Collect Unique Images (Cover & Carousel Slides)
  const images = [];
  if (ogImage) {
    images.push(ogImage);
  }

  // Scan for CDN images in source for Carousel support
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

  // Video options for Reels / Video Posts
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
    // If video stream URL is obfuscated by Meta, direct to web stream with cover
    options.push({
      id: 'ig-video-web',
      label: 'Watch / Stream Reel (MP4)',
      ext: 'mp4',
      type: 'video',
      url: originalUrl,
      quality: 'HD Stream',
    });
  }

  // Carousel or Photo options
  if (images.length > 1) {
    // Carousel post: include individual slide images
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
    // Single image post
    options.push({
      id: 'ig-photo-1',
      label: 'Photo Image (JPG)',
      ext: 'jpg',
      type: 'image',
      url: images[0],
      quality: 'Original Photo',
    });
  }

  // Always include high-res cover thumbnail option if available
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
 * Scrapes Instagram cookieless using FastDL -> SnapInsta -> Direct Meta tags fallback chain
 */
export async function scrapeInstagram(url = '') {
  const cleanUrl = String(url).trim();
  const shortcode = extractInstagramShortcode(cleanUrl);

  if (!shortcode) {
    throw new Error('URL Instagram tidak valid. Pastikan link berupa Post, Reel, atau Carousel.');
  }

  const normalizedUrl = `https://www.instagram.com/p/${shortcode}/`;

  // Fallback 1: FastDL API Convert Engine
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
    // FastDL fallback failed, proceed to next fallback
  }

  // Fallback 2: Direct Meta Tags / Public Instagram Page / Embed parser
  try {
    // Try embed page first (fewer bot challenges)
    const embedUrl = getInstagramPageUrl(shortcode, true);
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
      return parseInstagramHtml(embedHtml, normalizedUrl);
    }
  } catch {
    // Embed fetch failed, fallback to main page URL
  }

  // Fallback 3: Direct main page fetch
  const directUrl = getInstagramPageUrl(shortcode, false);
  const directRes = await httpClient({
    url: directUrl,
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    raw: true,
    timeout: 15000,
  });

  const directHtml = directRes?.data || '';
  if (!directHtml || directHtml.length < 200) {
    throw new Error('Gagal mengambil konten Instagram. Pastikan akun bersifat publik.');
  }

  return parseInstagramHtml(directHtml, normalizedUrl);
}
