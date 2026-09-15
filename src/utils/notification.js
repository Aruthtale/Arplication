import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '../services/http.js';

let channelCreated = false;

/**
 * Check notification permission status (for UI display).
 * Returns { granted, canRequest, denied }
 */
export async function checkNotificationPermission() {
  if (!isNative()) return { granted: false, canRequest: false, denied: false };
  try {
    const perm = await LocalNotifications.checkPermissions();
    return {
      granted: perm.display === 'granted',
      canRequest: perm.display === 'prompt',
      denied: perm.display === 'denied',
    };
  } catch {
    return { granted: false, canRequest: false, denied: false };
  }
}

/**
 * Request notification permission from user.
 * Returns true if granted.
 */
export async function requestNotificationPermission() {
  if (!isNative()) return false;
  try {
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Ensures notification channel and permissions are granted on Android
 */
export async function ensureNotificationChannel() {
  if (!isNative()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return false;
    }
    if (!channelCreated) {
      // Hapus channel lama dulu agar config korup ikut terbuang — channel
      // Android bersifat PERSISTEN: createChannel tidak menimpa config lama.
      // (Channel lama menyimpan sound raw/default yang tidak ada di res/.)
      await LocalNotifications.deleteChannel({ id: 'arloader_downloads' }).catch(() => {});
      await LocalNotifications.deleteChannel({ id: 'ardoro_timer' }).catch(() => {});
      // Arloader channel (tanpa sound kustom — pakai bunyi default sistem)
      await LocalNotifications.createChannel({
        id: 'arloader_downloads',
        name: 'Arloader Unduhan',
        description: 'Notifikasi status penyelesaian unduhan media Arloader',
        importance: 4, // High importance (banner notification)
        visibility: 1, // Public on lockscreen
        vibration: true,
      }).catch(() => {});
      
      // Ardoro channel (NEW)
      await LocalNotifications.createChannel({
        id: 'ardoro_timer',
        name: 'Ardoro Timer',
        description: 'Notifikasi fase Pomodoro selesai',
        importance: 5, // Max importance for heads-up
        visibility: 1,
        vibration: true,
      }).catch(() => {});
      
      channelCreated = true;
    }
    return true;
  } catch (e) {
    console.warn('Notification channel setup failed:', e);
    return false;
  }
}

/**
 * Triggers a native Android notification upon download completion
 */
export async function sendDownloadCompleteNotification({ title = '', platform = '', path = '' }) {
  if (!isNative()) return;
  try {
    const ok = await ensureNotificationChannel();
    if (!ok) return;

    const cleanTitle = title ? (title.length > 35 ? title.slice(0, 35) + '...' : title) : 'Media';
    const platName = platform ? (platform.charAt(0).toUpperCase() + platform.slice(1)) : 'Arloader';

    await LocalNotifications.schedule({
      notifications: [
        {
          title: `🎬 Unduhan ${platName} Selesai`,
          body: `"${cleanTitle}" berhasil diunduh.`,
          id: Math.floor(Date.now() % 100000) + Math.floor(Math.random() * 1000),
          schedule: { at: new Date(Date.now() + 500) },
          channelId: 'arloader_downloads',
        },
      ],
    });
  } catch (e) {
    console.warn('Failed to post complete notification:', e);
  }
}

/**
 * Triggers a native Android notification upon download error
 */
export async function sendDownloadErrorNotification({ title = '', platform = '', error = '' }) {
  if (!isNative()) return;
  try {
    const ok = await ensureNotificationChannel();
    if (!ok) return;

    const cleanTitle = title ? (title.length > 30 ? title.slice(0, 30) + '...' : title) : 'Media';
    const platName = platform ? (platform.charAt(0).toUpperCase() + platform.slice(1)) : 'Arloader';

    await LocalNotifications.schedule({
      notifications: [
        {
          title: `❌ Unduhan ${platName} Gagal`,
          body: `Gagal mengunduh "${cleanTitle}". ${error || ''}`,
          id: Math.floor(Date.now() % 100000) + Math.floor(Math.random() * 1000),
          schedule: { at: new Date(Date.now() + 500) },
          channelId: 'arloader_downloads',
        },
      ],
    });
  } catch (e) {
    console.warn('Failed to post error notification:', e);
  }
}

/**
 * Pomodoro phase notification (Ardoro). No-op di web.
 * phase: fase yang baru selesai, nextPhase: fase berikutnya.
 */
export async function sendPomodoroPhaseNotification({ phase = '', nextPhase = '' }) {
  if (!isNative()) return;
  try {
    const ok = await ensureNotificationChannel();
    if (!ok) return;
    const finishedLabel = phase === 'focus' ? 'Sesi fokus selesai!' : 'Waktu istirahat selesai!';
    const nextLabel = nextPhase === 'focus'
      ? 'Saatnya kembali fokus.'
      : nextPhase === 'long'
        ? 'Nikmati istirahat panjang.'
        : 'Istirahat sebentar dulu.';
    await LocalNotifications.schedule({
      notifications: [
        {
          title: `🍅 Ardoro — ${finishedLabel}`,
          body: nextLabel,
          id: Math.floor(Date.now() % 100000) + Math.floor(Math.random() * 1000),
          schedule: { at: new Date(Date.now() + 100) },
          channelId: 'ardoro_timer', // Changed from 'arloader_downloads'
          sound: 'default', // Explicit sound
        },
      ],
    });
  } catch (e) {
    console.warn('Failed to post pomodoro notification:', e);
  }
}
