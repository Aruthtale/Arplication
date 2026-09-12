import { httpClient } from '../http.js';

/**
 * Checks if URL belongs to TikTok
 */
export function isTikTokUrl(url) {
  if (!url) return false;
  return /tiktok\.com/i.test(url);
}

/**
 * Resolves TikTok media details and download options
 */
export async function scrapeTikTok(url) {
  const cleanUrl = url.trim();

  // Query TikWM API
  const endpoint = 'https://www.tikwm.com/api/';
  const res = await httpClient({
    url: endpoint,
    method: 'POST',
    data: { url: cleanUrl },
  });

  if (!res || res.code !== 0 || !res.data) {
    throw new Error(res?.msg || 'TikTok video not found or link is private.');
  }

  const d = res.data;
  const isImagePost = Array.isArray(d.images) && d.images.length > 0;

  const downloadOptions = [];

  if (!isImagePost) {
    if (d.play) {
      downloadOptions.push({
        id: 'hd-video',
        label: 'HD Video (No Watermark)',
        ext: 'mp4',
        type: 'video',
        url: d.play.startsWith('http') ? d.play : `https://www.tikwm.com${d.play}`,
        quality: 'Original 1080p/720p',
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
    id: d.id,
    title: d.title || 'TikTok Media',
    cover: d.cover,
    author: {
      name: d.author?.nickname || 'TikTok Creator',
      username: d.author?.unique_id || 'user',
      avatar: d.author?.avatar || null,
    },
    duration: d.duration ? `${d.duration}s` : null,
    isImages: isImagePost,
    options: downloadOptions,
  };
}
