import { isTikTokUrl, scrapeTikTok } from './tiktok.js';
import { isYouTubeUrl, scrapeYouTube } from './youtube.js';
import { isXUrl, scrapeX } from './x.js';
import { isPinterestUrl, scrapePinterest } from './pinterest.js';

export function detectPlatform(url) {
  if (isTikTokUrl(url)) return 'tiktok';
  if (isYouTubeUrl(url)) return 'youtube';
  if (isXUrl(url)) return 'x';
  if (isPinterestUrl(url)) return 'pinterest';
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

  if (platform === 'x') {
    return await scrapeX(cleanUrl);
  }

  if (platform === 'pinterest') {
    return await scrapePinterest(cleanUrl);
  }

  throw new Error(
    'Unsupported platform URL. Currently Arloader supports TikTok, YouTube, X (Twitter), and Pinterest links.'
  );
}
