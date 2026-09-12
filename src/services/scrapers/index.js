import { isTikTokUrl, scrapeTikTok } from './tiktok.js';
import { isYouTubeUrl, scrapeYouTube } from './youtube.js';

export function detectPlatform(url) {
  if (isTikTokUrl(url)) return 'tiktok';
  if (isYouTubeUrl(url)) return 'youtube';
  return null;
}

export async function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('Please enter or paste a valid link.');
  }

  const cleanUrl = url.trim();
  const platform = detectPlatform(cleanUrl);

  if (platform === 'tiktok') {
    return await scrapeTikTok(cleanUrl);
  }

  if (platform === 'youtube') {
    return await scrapeYouTube(cleanUrl);
  }

  throw new Error('Unsupported platform URL. Currently Arloader supports TikTok and YouTube links.');
}
