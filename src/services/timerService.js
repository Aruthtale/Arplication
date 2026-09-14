import { registerPlugin } from '@capacitor/core';
import { isNative } from './http.js';

const TimerService = registerPlugin('TimerService');

/**
 * Start Android Foreground Service untuk Ardoro Timer.
 * Service akan update notification setiap detik dan broadcast saat selesai.
 * 
 * @param {number} endTimeMillis - Unix timestamp (ms) kapan timer selesai
 * @param {string} phase - 'focus' | 'short' | 'long'
 * @returns {Promise<boolean>} true jika berhasil start
 */
export async function startForegroundTimer(endTimeMillis, phase) {
  if (!isNative()) return false;
  try {
    await TimerService.startForegroundTimer({
      endTime: endTimeMillis,
      phase: phase,
    });
    return true;
  } catch (e) {
    console.warn('Failed to start foreground timer:', e);
    return false;
  }
}

/**
 * Stop Android Foreground Service untuk Ardoro Timer.
 */
export async function stopForegroundTimer() {
  if (!isNative()) return;
  try {
    await TimerService.stopForegroundTimer();
  } catch (e) {
    console.warn('Failed to stop foreground timer:', e);
  }
}
