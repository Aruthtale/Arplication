import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '../services/http.js';

let channelCreated = false;

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
      await LocalNotifications.createChannel({
        id: 'arloader_downloads',
        name: 'Arloader Unduhan',
        description: 'Notifikasi status penyelesaian unduhan media Arloader',
        importance: 4, // High importance (banner notification)
        visibility: 1, // Public on lockscreen
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
          title: `🎬 Unduhan ${platName} Selesai!`,
          body: `"${cleanTitle}" telah tersimpan di ${path || 'penyimpanan'}.`,
          id: Math.floor(Date.now() % 100000) + Math.floor(Math.random() * 1000),
          schedule: { at: new Date(Date.now() + 100) },
          channelId: 'arloader_downloads',
          smallIcon: 'ic_launcher',
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
          schedule: { at: new Date(Date.now() + 100) },
          channelId: 'arloader_downloads',
          smallIcon: 'ic_launcher',
        },
      ],
    });
  } catch (e) {
    console.warn('Failed to post error notification:', e);
  }
}
