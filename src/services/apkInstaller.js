import { Capacitor } from '@capacitor/core';
import { isNative } from './http.js';

let plugin = null;

function getPlugin() {
  if (!isNative()) return null;
  if (!plugin) {
    try {
      plugin = Capacitor.registerPlugin('ApkInstaller');
    } catch {
      return null;
    }
  }
  return plugin;
}

/**
 * Opens the Android package installer for a downloaded APK file.
 * Resolves { opened: true } when the installer (or the
 * "Install unknown apps" settings) was launched.
 * Returns { available: false } on web or when the plugin is missing.
 */
export async function openApkInstaller(filePath) {
  const p = getPlugin();
  if (!p || !filePath) return { available: false };
  const res = await p.installApk({ path: filePath });
  return { available: true, ...(res || {}) };
}

export function isApkInstallerAvailable() {
  return !!getPlugin();
}
