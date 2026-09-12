import { httpClient } from '../http.js';

const PIN_ID_PATTERN = /pinterest\.(?:[a-z.]+)\/pin\/(\d+)/i;
const PIN_IT_PATTERN = /pin\.it\/[a-zA-Z0-9_-]+/i;

export function isPinterestUrl(url = '') {
  const clean = String(url).trim();
  return PIN_ID_PATTERN.test(clean) || PIN_IT_PATTERN.test(clean);
}

export function extractPinterestPinId(url = '') {
  const match = String(url).trim().match(PIN_ID_PATTERN);
  return match ? match[1] : null;
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

function normalizeRawBody(res) {
  if (typeof res === 'string') return res;
  if (typeof res?.data === 'string') return res.data;
  if (typeof res?.data === 'object') {
    try {
      return JSON.stringify(res.data);
    } catch {
      return '';
    }
  }
  return '';
}

export function parsePinterestRelayHtml(html = '', fallbackUrl = '') {
  const scripts = [];
  const scriptRegex = /<script\b[^>]*data-relay-completed-request="true"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    const callMatch = content.match(
      /window\.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__\s*\(\s*["']([^"']+)["']\s*,\s*(\{[\s\S]*\})\s*\);?/
    );
    if (callMatch) {
      try {
        const payload = JSON.parse(callMatch[2]);
        scripts.push(payload);
      } catch {
        // ignore parse error for individual chunk
      }
    }
  }

  let pinData = null;
  for (const payload of scripts) {
    const candidate = payload?.data?.v3GetPinQueryv2?.data;
    if (candidate && (candidate.images_orig || candidate.images_736x || candidate.videos)) {
      pinData = candidate;
      break;
    }
  }

  if (!pinData) {
    throw new Error('Gagal mengekstrak data Pin Pinterest (halaman mungkin privat atau format berubah).');
  }

  const rawTitle =
    pinData.richMetadata?.title ||
    pinData.gridTitle ||
    pinData.seoTitle ||
    pinData.title ||
    pinData.richMetadata?.description ||
    'Pinterest Pin';

  const cleanTitle = decodeHtmlEntities(rawTitle).trim();

  const author = {
    name: pinData.pinner?.fullName || pinData.originPinner?.fullName || 'Pinterest User',
    username: pinData.pinner?.username || pinData.originPinner?.username || '',
    avatar: pinData.pinner?.imageLargeUrl || pinData.originPinner?.imageLargeUrl || '',
  };

  const options = [];
  const seenUrls = new Set();

  const pushOption = (option) => {
    if (!option?.url || seenUrls.has(option.url)) return;
    seenUrls.add(option.url);
    options.push(option);
  };

  if (pinData.videos) {
    const videoList = pinData.videos.video_list || pinData.videos;
    if (typeof videoList === 'object') {
      Object.entries(videoList).forEach(([qualityKey, vInfo]) => {
        const url = vInfo?.url;
        if (url && typeof url === 'string' && url.includes('.mp4')) {
          const width = vInfo.width || qualityKey;
          pushOption({
            id: `pinterest-video-${qualityKey}`,
            label: `Video (${width})`,
            quality: String(width),
            type: 'video',
            ext: 'mp4',
            url,
          });
        }
      });
    }
  }

  if (pinData.images_orig?.url) {
    pushOption({
      id: 'pinterest-image-original',
      label: 'Original Image',
      quality: `${pinData.images_orig.width || 'Original'}x${pinData.images_orig.height || ''}`.replace(/x$/, ''),
      type: 'image',
      ext: 'jpg',
      url: pinData.images_orig.url,
    });
  }

  if (pinData.images_736x?.url) {
    pushOption({
      id: 'pinterest-image-736p',
      label: '736p Image',
      quality: '736p',
      type: 'image',
      ext: 'jpg',
      url: pinData.images_736x.url,
    });
  }

  if (options.length === 0) {
    throw new Error('Tidak ada media yang dapat diunduh pada Pin Pinterest ini.');
  }

  const cover =
    pinData.images_orig?.url ||
    pinData.images_736x?.url ||
    pinData.images_564x?.url ||
    pinData.images_236x?.url ||
    '';

  return {
    platform: 'pinterest',
    id: pinData.entityId || extractPinterestPinId(fallbackUrl) || 'pinterest-pin',
    title: cleanTitle,
    author,
    cover,
    duration: null,
    options,
    isImages: options.every((opt) => opt.type === 'image'),
    sourceUrl: pinData.link || fallbackUrl,
  };
}

export async function resolvePinterestUrl(url = '') {
  let clean = String(url).trim();
  const directId = extractPinterestPinId(clean);
  if (directId) {
    return clean;
  }

  if (PIN_IT_PATTERN.test(clean)) {
    const res = await httpClient({
      url: clean,
      raw: true,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const html = normalizeRawBody(res);
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
    if (canonicalMatch && extractPinterestPinId(canonicalMatch[1])) {
      return canonicalMatch[1];
    }

    const ogMatch = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i);
    if (ogMatch && extractPinterestPinId(ogMatch[1])) {
      return ogMatch[1];
    }

    if (res?.url && extractPinterestPinId(res.url)) {
      return res.url;
    }
  }

  return clean;
}

export async function scrapePinterest(url) {
  const resolvedUrl = await resolvePinterestUrl(url);
  const pinId = extractPinterestPinId(resolvedUrl);

  if (!pinId) {
    throw new Error('URL Pinterest tidak valid atau bukan link pin yang didukung.');
  }

  const targetUrl = `https://www.pinterest.com/pin/${pinId}/`;

  const res = await httpClient({
    url: targetUrl,
    raw: true,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
    },
  });

  const html = normalizeRawBody(res);
  if (!html) {
    throw new Error('Gagal mendapatkan halaman Pinterest.');
  }

  return parsePinterestRelayHtml(html, targetUrl);
}
