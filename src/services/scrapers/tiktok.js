import { httpClient } from '../http.js';

const TIKTOK_URL_REGEX = /(https?:\/\/(?:www\.|vm\.|vt\.|t\.|m\.)?tiktok\.com\/[^\s]+)/i;

/**
 * Checks if URL belongs to TikTok
 */
export function isTikTokUrl(url) {
  if (!url) return false;
  return /tiktok\.com/i.test(String(url));
}

/**
 * Extracts raw TikTok URL from user pasted strings (handles share texts)
 */
export function extractTikTokUrl(text = '') {
  const match = String(text).match(TIKTOK_URL_REGEX);
  return match ? match[1] : String(text).trim();
}

/**
 * Resolves shortened TikTok URLs (vt.tiktok.com, vm.tiktok.com) to their canonical video URL
 */
export async function unshortenTikTokUrl(url) {
  const clean = extractTikTokUrl(url);
  if (/vt\.tiktok\.com|vm\.tiktok\.com|t\.tiktok\.com/i.test(clean)) {
    try {
      const res = await httpClient({
        url: clean,
        raw: true,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (res?.url && /tiktok\.com\/@/i.test(res.url)) {
        return res.url;
      }
    } catch {
      // ignore redirect failure, fallback to raw url
    }
  }
  return clean;
}

/**
 * Resolves TikTok media details and download options
 */
export async function scrapeTikTok(url) {
  const extractedUrl = extractTikTokUrl(url);
  const canonicalUrl = await unshortenTikTokUrl(extractedUrl);

  const candidateUrls = [canonicalUrl, extractedUrl].filter(Boolean);
  const uniqueCandidates = Array.from(new Set(candidateUrls));

  let lastError = null;

  for (const candidate of uniqueCandidates) {
    try {
      // 1. Try TikWM with x-www-form-urlencoded & JSON support
      const endpoint = 'https://www.tikwm.com/api/';
      const res = await httpClient({
        url: endpoint,
        method: 'POST',
        data: { url: candidate, hd: 1 },
      });

      if (res && res.code === 0 && res.data) {
        const d = res.data;
        const isImagePost = Array.isArray(d.images) && d.images.length > 0;
        const downloadOptions = [];

        if (!isImagePost) {
          if (d.hdplay || d.play) {
            downloadOptions.push({
              id: 'hd-video',
              label: 'HD Video (No Watermark)',
              ext: 'mp4',
              type: 'video',
              url: (d.hdplay || d.play).startsWith('http') ? (d.hdplay || d.play) : `https://www.tikwm.com${d.hdplay || d.play}`,
              quality: d.hdplay ? 'Full HD 1080p' : 'HD 720p',
            });
          }

          if (d.wmplay) {
            downloadOptions.push({
              id: 'wm-video',
              label: 'Video with Watermark',
              ext: 'mp4',
              type: 'video',
              url: d.wmplay.startsWith('http') ? d.wmplay : `https://www.tikwm.com${d.wmplay}`,
              quality: 'Standard with Logo',
            });
          }
        }

        if (d.music) {
          downloadOptions.push({
            id: 'audio-mp3',
            label: 'Original Audio',
            ext: 'mp3',
            type: 'audio',
            url: d.music.startsWith('http') ? d.music : `https://www.tikwm.com${d.music}`,
            quality: 'High Bitrate MP3',
          });
        }

        if (isImagePost) {
          d.images.forEach((imgUrl, index) => {
            downloadOptions.push({
              id: `photo-${index + 1}`,
              label: `Photo ${index + 1} of ${d.images.length}`,
              ext: 'jpg',
              type: 'image',
              url: imgUrl,
              quality: 'HD Image',
            });
          });
        }

        return {
          platform: 'tiktok',
          id: d.id || 'tiktok-video',
          title: d.title || 'TikTok Media',
          cover: d.cover || (d.images && d.images[0]) || null,
          author: {
            name: d.author?.nickname || 'TikTok Creator',
            username: d.author?.unique_id || 'user',
            avatar: d.author?.avatar || null,
          },
          duration: d.duration ? `${d.duration}s` : null,
          isImages: isImagePost,
          options: downloadOptions,
        };
      } else if (res && res.msg) {
        lastError = new Error(`TikWM: ${res.msg}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Video TikTok tidak ditemukan atau tautan bersifat privat.');
}
