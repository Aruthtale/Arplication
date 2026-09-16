import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * Checks if current runtime is running inside native mobile container (Android/iOS)
 */
export function isNative() {
  try {
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch {}
  // fallback for test mocks via globalThis/window
  if (typeof globalThis !== 'undefined' && globalThis.Capacitor?.isNativePlatform?.()) return true;
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) return true;
  return false;
}

/**
 * Checks if current environment is local web browser (Vite dev server)
 * Returns false on native Android/iOS even if hostname is localhost.
 */
export function isLocalWeb() {
  if (isNative()) return false;
  if (typeof window === 'undefined') return false;
  if (typeof globalThis !== 'undefined' && globalThis.window !== window && globalThis.window?.location?.hostname) {
    // In tests globalThis.window may be mocked separately
    return ['localhost', '127.0.0.1', '::1'].includes(globalThis.window.location.hostname);
  }
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

/**
 * Universal User-Agent string
 */
export function getUserAgent() {
  return 'Mozilla/5.0 (Linux; Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0';
}

/**
 * Safe JSON parser with HTML error detection
 */
export function safeJsonParse(data) {
  if (typeof data === 'object' && data !== null) return data;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE')) {
      throw new Error('Upstream server returned an HTML error/block page.');
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error('Failed to parse server response as JSON.');
    }
  }
  throw new Error('Empty or invalid server response.');
}

/**
 * Hybrid HTTP client: Native CapacitorHttp on Android, Direct Fetch / Proxy on Web
 */
export async function httpClient({
  url,
  method = 'GET',
  headers = {},
  data = null,
  params = null,
  timeout = 30000,
  raw = false,
}) {
  const upperMethod = method.toUpperCase();
  let fullUrl = url;

  // Append query params if present
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  const reqHeaders = {
    'User-Agent': getUserAgent(),
    ...headers,
  };

  // 1. Android Native Environment (CapacitorHttp with full SSL & bypass CORS)
  if (isNative()) {
    try {
      const options = {
        url: fullUrl,
        method: upperMethod,
        headers: reqHeaders,
        connectTimeout: timeout,
        readTimeout: timeout,
      };

      if (data !== null) {
        options.data = typeof data === 'object' ? data : data;
        if (!reqHeaders['Content-Type'] && typeof data === 'object') {
          options.headers['Content-Type'] = 'application/json';
        }
      }

      const res = await CapacitorHttp.request(options);
      if (raw) return res;
      return safeJsonParse(res.data);
    } catch (err) {
      console.error('[HTTP-Native] Error:', err?.message || 'network error');
      throw new Error(`Native request failed: ${err.message || 'Unknown network error'}`);
    }
  }

  // 2. Web Browser: Direct fetch with fallback to public CORS proxy if blocked
  try {
    const fetchOptions = {
      method: upperMethod,
      headers: reqHeaders,
      signal: AbortSignal.timeout(timeout),
    };

    if (data !== null && upperMethod !== 'GET') {
      fetchOptions.body = typeof data === 'object' ? JSON.stringify(data) : data;
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(fullUrl, fetchOptions);
    const textData = await response.text();
    // Keep the final URL after redirects. Short links (such as pin.it) need
    // this value to determine which platform resource was ultimately opened.
    if (raw) return { status: response.status, ok: response.ok, url: response.url, data: textData };
    return safeJsonParse(textData);
  } catch (webErr) {
    // If browser CORS error, attempt with public CORS gateway for Web dev
    console.warn('[HTTP-Web] Direct fetch failed, trying proxy fallback...', webErr?.message || 'network error');
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`;
      const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(timeout) });
      const proxyText = await proxyRes.text();
      if (raw) return { status: proxyRes.status, ok: proxyRes.ok, url: proxyRes.url, data: proxyText };
      return safeJsonParse(proxyText);
    } catch (fallbackErr) {
      throw new Error(`Web request failed: ${fallbackErr.message || 'Network blocked by CORS'}`);
    }
  }
}
