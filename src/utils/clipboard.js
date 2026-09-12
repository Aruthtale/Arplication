import { Clipboard } from '@capacitor/clipboard';
import { isNative } from '../services/http.js';

export async function readClipboard() {
  try {
    if (isNative()) {
      const { value } = await Clipboard.read();
      return value || '';
    }
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
  } catch (err) {
    console.warn('Clipboard read permission denied or unavailable:', err);
  }
  return '';
}

export async function writeClipboard(text) {
  try {
    if (isNative()) {
      await Clipboard.write({ string: text });
      return true;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }
  return false;
}
