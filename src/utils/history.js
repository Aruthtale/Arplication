const KEY = 'arloader_downloads';
const SCRAPER_KEY = 'arloader_history';
const MAX_ITEMS = 50;

function read(key = KEY) {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`Failed to read history [${key}]:`, e);
  }
  return [];
}

function write(key = KEY, items = []) {
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch (e) {
    console.warn(`Failed to save history [${key}]:`, e);
  }
}

export function getDownloadHistory() {
  return read(KEY);
}

export function addDownloadRecord({ title, platform, cover, filename, filePath, ext, type, url }) {
  const items = read(KEY);
  const entry = {
    key: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: title || filename || 'Media',
    platform: platform || 'media',
    cover: cover || null,
    filename: filename || '',
    filePath: filePath || null,
    ext: ext || '',
    type: type || '',
    url: url || '',
    timestamp: Date.now(),
  };
  const updated = [entry, ...items.filter((i) => i.filename !== entry.filename)].slice(0, MAX_ITEMS);
  write(KEY, updated);
  return updated;
}

export function removeDownloadRecord(key) {
  const updated = read(KEY).filter((i) => i.key !== key);
  write(KEY, updated);
  return updated;
}

export function clearDownloadHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn('Failed to clear download history:', e);
  }
  return [];
}

// Scraper history functions
export function loadScraperHistory() {
  return read(SCRAPER_KEY);
}

export function saveScraperHistory({ url, platform, title, cover, data }) {
  const items = read(SCRAPER_KEY);
  const entry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    url,
    platform,
    title: title || url,
    cover: cover || null,
    data,
    timestamp: Date.now(),
  };
  const updated = [entry, ...items.filter((i) => i.url !== url)].slice(0, MAX_ITEMS);
  write(SCRAPER_KEY, updated);
  return updated;
}

export function clearScraperHistory() {
  try {
    localStorage.removeItem(SCRAPER_KEY);
  } catch (e) {
    console.warn('Failed to clear scraper history:', e);
  }
  return [];
}
