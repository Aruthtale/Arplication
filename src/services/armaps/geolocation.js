/**
 * ArMaps — Layanan lokasi (GPS) untuk titik "lokasi saya".
 *
 * Di native memakai @capacitor/geolocation (GPS HP, tanpa internet).
 * Di web memakai navigator.geolocation (dev). Bila ditolak/tak tersedia,
 * UI tetap berfungsi — hanya tombol lokasi yang nonaktif.
 */

import { isNative } from '../http.js';

/** Cek izin lokasi saat ini (tanpa meminta). */
export async function checkLocationPermission() {
  if (isNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const status = await Geolocation.checkPermissions();
      return status?.location === 'granted' ? 'granted' : status?.location || 'prompt';
    } catch {
      return 'unknown';
    }
  }
  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const res = await navigator.permissions.query({ name: 'geolocation' });
      return res.state; // 'granted' | 'denied' | 'prompt'
    } catch {
      return 'unknown';
    }
  }
  return 'unknown';
}

/** Minta izin lokasi. Mengembalikan 'granted' | 'denied' | 'unknown'. */
export async function requestLocationPermission() {
  if (isNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const status = await Geolocation.requestPermissions();
      return status?.location || 'unknown';
    } catch {
      return 'unknown';
    }
  }
  return checkLocationPermission();
}

/**
 * Ambil posisi saat ini (sekali).
 * @returns {Promise<{ latitude:number, longitude:number, accuracy:number }>}
 */
export async function getCurrentPosition({ highAccuracy = true } = {}) {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: highAccuracy,
      timeout: 15000,
      maximumAge: 5000,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  }

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(new Error('GPS tidak tersedia di perangkat ini.'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(new Error(err?.message || 'Gagal membaca lokasi.')),
      { enableHighAccuracy: highAccuracy, timeout: 15000, maximumAge: 5000 },
    );
  });
}

/**
 * Ikuti posisi secara berkala. Mengembalikan fungsi berhenti.
 * @param {(pos:{latitude:number,longitude:number,accuracy:number})=>void} onUpdate
 * @returns {Promise<() => void>} stop()
 */
export async function watchPosition(onUpdate) {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 20000 },
      (pos, err) => {
        if (err || !pos) return;
        onUpdate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
    );
    return () => { Geolocation.clearWatch({ id }).catch(() => {}); };
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onUpdate({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    }),
    () => {},
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
  );
  return () => { navigator.geolocation.clearWatch(id); };
}
