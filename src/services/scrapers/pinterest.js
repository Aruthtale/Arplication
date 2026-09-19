import { httpClient, isLocalWeb } from '../http.js';

const PIN_ID_PATTERN = /(?:https?:\/\/)?(?:[\w-]+\.)?pinterest\.[a-z.]+\/(?:amp\/)?pin\/(\d+)/i;
const PIN_IT_PATTERN = /pin\.it\/[a-zA-Z0-9_-]+/i;

function normalizePinterestAssetUrl(url) {
  if (!url || typeof window === 'undefined') return url;
  if (!isLocalWeb()) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'i.pinimg.com') return url;
    return `/__pinimg/${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
  }
}

export function getPinterestPinPageUrl(pinId) {
  if (isLocalWeb()) return `/__pinterest/pin/${pinId}/`;
  return `https://www.pinterest.com/pin/${pinId}/`;
}

export function isPinterestUrl(url = '') {
  const clean = String(url).trim();
  return PIN_ID_PATTERN.test(clean) || PIN_IT_PATTERN.test(clean);
}

export function extractPinterestPinId(url = '') {
  const match = String(url).trim().match(PIN_ID_PATTERN);
  return match ? match[1] : null;
}

export function extractPinterestCanonicalUrl(html = '') {
  const source = String(html);
  const tagPatterns = [
    /<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i,
    /<meta\b[^>]*\bproperty=["']og:url["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i,
    /<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["']og:url["'][^>]*>/i,
  ];

  for (const pattern of tagPatterns) {
    const match = source.match(pattern);
    if (match && extractPinterestPinId(decodeHtmlEntities(match[1]))) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return null;
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
    if (
      candidate &&
      (candidate.images_orig ||
        candidate.images_736x ||
        candidate.videos ||
        candidate.storyPinData ||
        candidate.story_pin_data)
    ) {
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

  const detectExtension = (assetUrl, fallback = 'jpg') => {
    if (!assetUrl || typeof assetUrl !== 'string') return fallback;
    const clean = assetUrl.split('?')[0].toLowerCase();
    if (clean.endsWith('.gif')) return 'gif';
    if (clean.endsWith('.png')) return 'png';
    if (clean.endsWith('.webp')) return 'webp';
    if (clean.endsWith('.mp4') || clean.endsWith('.m4v') || clean.endsWith('.mov')) return 'mp4';
    if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'jpg';
    return fallback;
  };

  const options = [];
  const seenUrls = new Set();

  const pushOption = (option) => {
    if (!option?.url || seenUrls.has(option.url)) return;
    seenUrls.add(option.url);
    options.push({ ...option, url: normalizePinterestAssetUrl(option.url) });
  };

  // 1. Ekstrak animasi GIF bila tersedia di struktur gifs Pinterest
  if (pinData.gifs && typeof pinData.gifs === 'object') {
    const gifList = pinData.gifs;
    const bestGif = gifList.realOriginal?.url || gifList.real480x480?.url || gifList.real300x300?.url || gifList.real168x168?.url;
    if (bestGif) {
      pushOption({
        id: 'pinterest-gif-best',
        label: 'Animated GIF (HD)',
        quality: 'Original',
        type: 'image',
        ext: 'gif',
        url: bestGif,
      });
    }
  }

  // 2. Ekstrak video MP4 dari pinData.videos & storyPinData / story_pin_data
  const videoSources = [];
  if (pinData.videos) {
    const list = pinData.videos.video_list || pinData.videos.videoList || pinData.videos;
    if (typeof list === 'object') videoSources.push(list);
  }

  const storyData = pinData.storyPinData || pinData.story_pin_data;
  if (storyData && Array.isArray(storyData.pages)) {
    for (const page of storyData.pages) {
      if (Array.isArray(page?.blocks)) {
        for (const block of page.blocks) {
          const vData = block.videoDataV2 || block.videoData || block.video;
          if (vData && typeof vData === 'object') {
            Object.values(vData).forEach((val) => {
              if (val && typeof val === 'object') {
                videoSources.push(val);
              }
            });
          }
          if (block.video_list && typeof block.video_list === 'object') {
            videoSources.push(block.video_list);
          }
        }
      }
    }
  }

  for (const vSource of videoSources) {
    if (!vSource || typeof vSource !== 'object') continue;
    // If vSource is a direct video object with url
    if (vSource.url && typeof vSource.url === 'string') {
      const url = vSource.url;
      if (url.includes('.mp4') || detectExtension(url) === 'mp4') {
        const qualityLabel = vSource.height ? `${vSource.height}p` : `${vSource.width || 'Video'}`;
        pushOption({
          id: `pinterest-video-${vSource.height || vSource.width || 'hd'}`,
          label: `Video (${qualityLabel})`,
          quality: vSource.width && vSource.height ? `${vSource.width}x${vSource.height}` : qualityLabel,
          type: 'video',
          ext: 'mp4',
          url,
        });
      }
      continue;
    }
    // Otherwise vSource is a map of quality keys -> video objects
    Object.entries(vSource).forEach(([qualityKey, vInfo]) => {
      const url = vInfo?.url;
      if (url && typeof url === 'string' && (url.includes('.mp4') || detectExtension(url) === 'mp4')) {
        const width = vInfo.width || qualityKey.replace(/^v/, '');
        const height = vInfo.height ? `x${vInfo.height}` : '';
        const qualityLabel = vInfo.height ? `${vInfo.height}p` : `${width}`;
        pushOption({
          id: `pinterest-video-${qualityKey.toLowerCase()}`,
          label: `Video (${qualityLabel})`,
          quality: `${width}${height}` || 'HD',
          type: 'video',
          ext: 'mp4',
          url,
        });
      }
    });
  }

  // 3. Ekstrak resolusi original (bisa berupa gambar, gif, atau mp4)
  if (pinData.images_orig?.url) {
    const origUrl = pinData.images_orig.url;
    const ext = detectExtension(origUrl, 'jpg');
    const isVid = ext === 'mp4';
    pushOption({
      id: isVid ? 'pinterest-video-original' : 'pinterest-image-original',
      label: isVid ? 'Video (Original)' : (ext === 'gif' ? 'Original GIF' : 'Original Image'),
      quality: `${pinData.images_orig.width || 'Original'}x${pinData.images_orig.height || ''}`.replace(/x$/, ''),
      type: isVid ? 'video' : 'image',
      ext,
      url: origUrl,
    });
  }

  // 4. Ekstrak resolusi 736p (bisa berupa gambar, gif, atau mp4)
  if (pinData.images_736x?.url) {
    const u736 = pinData.images_736x.url;
    const ext = detectExtension(u736, 'jpg');
    const isVid = ext === 'mp4';
    pushOption({
      id: isVid ? 'pinterest-video-736p' : 'pinterest-image-736p',
      label: isVid ? 'Video (736p)' : (ext === 'gif' ? '736p GIF' : '736p Image'),
      quality: '736p',
      type: isVid ? 'video' : 'image',
      ext,
      url: u736,
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
    cover: normalizePinterestAssetUrl(cover),
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
    const canonicalUrl = extractPinterestCanonicalUrl(html);
    if (canonicalUrl) return canonicalUrl;

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

  const targetUrl = getPinterestPinPageUrl(pinId);

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
