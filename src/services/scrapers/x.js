import { httpClient } from '../http.js';

const X_URL_PATTERN = /(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i;

export function isXUrl(url = '') {
  return X_URL_PATTERN.test(String(url).trim());
}

export function extractXId(url = '') {
  const match = String(url).trim().match(X_URL_PATTERN);
  return match ? match[2] : null;
}

export function getXSyndicationToken(id) {
  const numericId = Number(id);
  return ((numericId / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, '');
}

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function extractResolution(url = '') {
  const match = String(url).match(/\/(\d+)x(\d+)\//);
  if (!match) return null;
  return `${match[1]}x${match[2]}`;
}

export function parseXResponse(data, sourceUrl = '') {
  if (!data || !data.id_str) {
    throw new Error('Tweet tidak ditemukan atau akun privat/dihapus.');
  }

  const rawText = data.text || '';
  const cleanTitle = decodeHtmlEntities(rawText).trim() || 'X Post';

  const author = {
    name: data.user?.name || '',
    username: data.user?.screen_name || '',
    avatar: data.user?.profile_image_url_https || '',
  };

  const options = [];
  const seenUrls = new Set();

  const pushOption = (option) => {
    if (!option?.url || seenUrls.has(option.url)) return;
    seenUrls.add(option.url);
    options.push(option);
  };

  if (Array.isArray(data.photos)) {
    data.photos.forEach((photo, index) => {
      if (photo?.url) {
        pushOption({
          id: `x-photo-${index + 1}`,
          label: `Photo ${index + 1}`,
          quality: 'Original',
          type: 'image',
          ext: 'jpg',
          url: photo.url,
        });
      }
    });
  }

  const mediaDetails = Array.isArray(data.mediaDetails) ? data.mediaDetails : [];
  mediaDetails.forEach((item, index) => {
    if (item?.type === 'photo' && item.media_url_https) {
      pushOption({
        id: `x-photo-${index + 1}`,
        label: `Photo ${index + 1}`,
        quality: 'Original',
        type: 'image',
        ext: 'jpg',
        url: item.media_url_https,
      });
    }
  });

  const videoVariants = [];
  if (Array.isArray(data.video?.variants)) {
    data.video.variants.forEach((variant) => {
      const url = variant.src || variant.url;
      if (!url) return;
      const contentType = variant.type || variant.content_type || '';
      if (contentType.includes('mp4')) {
        videoVariants.push({
          url,
          bitrate: variant.bitrate || 0,
        });
      }
    });
  }

  mediaDetails.forEach((item) => {
    const variants = item.video_info?.variants;
    if (Array.isArray(variants)) {
      variants.forEach((variant) => {
        if (variant?.content_type?.includes('mp4') && variant.url) {
          videoVariants.push({
            url: variant.url,
            bitrate: variant.bitrate || 0,
          });
        }
      });
    }
  });

  videoVariants.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0));

  videoVariants.forEach((v, idx) => {
    const res = extractResolution(v.url);
    const quality = res || (v.bitrate ? `${Math.round(v.bitrate / 1000)}kbps` : 'MP4');
    pushOption({
      id: `x-video-${res || v.bitrate || idx + 1}`,
      label: `Video ${quality}`,
      quality,
      type: 'video',
      ext: 'mp4',
      url: v.url,
    });
  });

  if (options.length === 0) {
    throw new Error('Tidak ada media (gambar/video) yang dapat diunduh pada postingan ini.');
  }

  const cover =
    data.video?.poster ||
    data.photos?.[0]?.url ||
    mediaDetails.find((m) => m.media_url_https)?.media_url_https ||
    author.avatar ||
    '';

  const durationMs =
    data.video?.durationMs ||
    mediaDetails.find((m) => m.video_info?.duration_millis)?.video_info?.duration_millis ||
    null;

  const duration = durationMs ? `${(durationMs / 1000).toFixed(2)}s` : null;

  return {
    platform: 'x',
    id: data.id_str,
    title: cleanTitle,
    author,
    cover,
    duration,
    options,
    isImages: options.every((opt) => opt.type === 'image'),
    sourceUrl,
  };
}

export async function scrapeX(url) {
  const id = extractXId(url);
  if (!id) {
    throw new Error('URL X/Twitter tidak valid.');
  }

  const token = getXSyndicationToken(id);
  const endpoint = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`;

  const res = await httpClient({
    url: endpoint,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  return parseXResponse(res, url);
}
