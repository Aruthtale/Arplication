const STORAGE_KEY = 'artoolbox_history_v1';
const MAX_HISTORY_ITEMS = 100;

/**
 * Mengambil seluruh riwayat perkakas dari LocalStorage
 * @returns {Array} List entri riwayat terurut dari yang terbaru
 */
export function getToolboxHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.error('Gagal membaca riwayat ArToolbox:', err);
    return [];
  }
}

/**
 * Menambahkan entri baru ke riwayat perkakas
 * @param {Object} entry - { toolType, title, dataPayload }
 * @returns {Array} List riwayat terbaru
 */
export function addToolboxHistory({ toolType, title, dataPayload }) {
  try {
    const current = getToolboxHistory();
    const newItem = {
      id: `tb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      toolType: toolType || 'general', // 'qr' | 'text' | 'calc' | 'color'
      title: title || 'Aktivitas Perkakas',
      dataPayload: dataPayload || '',
      timestamp: new Date().toISOString(),
    };

    // Sisipkan item baru di paling depan, lalu batasi hingga MAX_HISTORY_ITEMS
    const updated = [newItem, ...current].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Gagal menyimpan entri riwayat ArToolbox:', err);
    return [];
  }
}

/**
 * Menghapus satu item riwayat berdasarkan ID
 * @param {string} id 
 * @returns {Array} List riwayat terbaru
 */
export function deleteToolboxHistoryItem(id) {
  try {
    const current = getToolboxHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Gagal menghapus item riwayat ArToolbox:', err);
    return [];
  }
}

/**
 * Membersihkan seluruh riwayat ArToolbox
 */
export function clearToolboxHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  } catch (err) {
    console.error('Gagal membersihkan riwayat ArToolbox:', err);
    return [];
  }
}
