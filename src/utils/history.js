const KEY = 'arloader_downloads';
const MAX_ITEMS = 50;

function read() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to read download history:', e);
  }
  return [];
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch (e) {
    console.warn('Failed to save download history:', e);
  }
}

export function getDownloadHistory() {
  return read();
}

export function addDownloadRecord({ title, platform, cover, filename, filePath, ext, type, url }) {
  const items = read();
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
  write(updated);
  return updated;
}

export function removeDownloadRecord(key) {
  const updated = read().filter((i) => i.key !== key);
  write(updated);
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
