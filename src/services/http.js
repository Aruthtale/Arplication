import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * Checks if current runtime is running inside native mobile container (Android/iOS)
 */
export function isNative() {
  return Capacitor.isNativePlatform();
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
    } catch (e) {
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

  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams(params).toString();
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + query;
  }

  const reqHeaders = {
    'User-Agent': getUserAgent(),
    ...headers,
  };

  // 1. Native Mobile (CapacitorHttp — 100% CORS-Free via OkHttp)
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
      }

      const res = await CapacitorHttp.request(options);
      if (raw) return res;
      return safeJsonParse(res.data);
    } catch (err) {
      console.error('[HTTP-Native] Error:', err);
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
    if (raw) return { status: response.status, data: textData };
    return safeJsonParse(textData);
  } catch (webErr) {
    // If browser CORS error, attempt with public CORS gateway for Web dev
    console.warn('[HTTP-Web] Direct fetch failed, trying proxy fallback...', webErr);
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`;
      const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(timeout) });
      const proxyText = await proxyRes.text();
      if (raw) return { status: proxyRes.status, data: proxyText };
      return safeJsonParse(proxyText);
    } catch (fallbackErr) {
      throw new Error(`Web request failed: ${fallbackErr.message || 'Network blocked by CORS'}`);
    }
  }
}
