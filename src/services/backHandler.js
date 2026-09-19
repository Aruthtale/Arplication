// src/services/backHandler.js - LIFO Back Button Navigation Manager

const handlers = [];

/**
 * Mendaftarkan handler tombol Back (LIFO stack).
 * Handler harus mengembalikan true jika event sudah ditangani (misal: menutup modal).
 * Mengembalikan fungsi unregister untuk cleanup di useEffect.
 *
 * @param {Function} handlerFn
 * @returns {Function} unregister
 */
export function registerBackHandler(handlerFn) {
  handlers.push(handlerFn);
  return () => {
    const idx = handlers.indexOf(handlerFn);
    if (idx !== -1) {
      handlers.splice(idx, 1);
    }
  };
}

/**
 * Menjalankan handler back teratas dari stack.
 * @returns {boolean} true jika ada modal/sub-view yang menangani back, false jika stack kosong
 */
export function dispatchBackEvent() {
  if (handlers.length === 0) return false;

  // LIFO: ambil dari yang paling terakhir terdaftar (paling atas di UI)
  for (let i = handlers.length - 1; i >= 0; i--) {
    const handler = handlers[i];
    try {
      const handled = handler();
      // Jika handler return boolean, cek nilainya. Jika void / undefined, anggap handled = true
      if (handled !== false) {
        return true;
      }
    } catch (err) {
      console.error('Error executing back handler:', err);
    }
  }

  return false;
}
