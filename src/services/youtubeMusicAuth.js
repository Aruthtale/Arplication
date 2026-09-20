import { Browser } from '@capacitor/browser';
import { isNative } from './http.js';

/**
 * YouTube Music OAuth Authentication
 * Strategy: OAuth 2.0 PKCE flow (tanpa client secret, aman untuk mobile)
 * 
 * Flow:
 * 1. Generate code_verifier + code_challenge (PKCE)
 * 2. Open browser → Google OAuth consent screen
 * 3. User approve → redirect ke custom scheme
 * 4. Capture auth code dari redirect URL
 * 5. Exchange auth code → access token + refresh token
 */

// Gunakan Web Client ID untuk semua platform (karena butuh custom scheme redirect)
// Android Client ID tidak support custom redirect URI
const CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;

const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

// Redirect URI per platform
const REDIRECT_URI = isNative()
  ? 'com.aruthtale.arplication:/oauth-callback'
  : 'http://localhost:5173/oauth-callback';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  // NOTE: youtubepartner scope butuh Google verification, tidak bisa di testing mode
].join(' ');

const AUTH_STORAGE_KEY = 'ytmusic_auth';

/**
 * Generate random string untuk PKCE
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Generate code_challenge dari code_verifier (SHA256 + base64url)
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Simpan auth state ke localStorage
 */
function saveAuthState(state) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save auth state:', e);
  }
}

/**
 * Load auth state dari localStorage
 */
export function loadAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    
    // Cek apakah token masih valid (belum expire)
    if (state.expiresAt && Date.now() < state.expiresAt) {
      return state;
    }
    
    // Token expire, tapi ada refresh token → auto refresh
    if (state.refreshToken) {
      return state; // Caller akan handle refresh
    }
    
    return null;
  } catch (e) {
    console.error('Failed to load auth state:', e);
    return null;
  }
}

/**
 * Clear auth state (logout)
 */
export function clearAuthState() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear auth state:', e);
  }
}

/**
 * Login dengan Google OAuth (PKCE flow)
 * Returns: { accessToken, refreshToken, expiresAt, userEmail }
 */
export async function loginYouTubeMusic() {
  if (!CLIENT_ID) {
    throw new Error('Google Client ID tidak ditemukan. Set VITE_GOOGLE_ANDROID_CLIENT_ID di .env.local');
  }

  // Generate PKCE parameters
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  // Simpan code_verifier untuk exchange token nanti
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);

  // Build authorization URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline'); // Untuk dapat refresh token
  authUrl.searchParams.set('prompt', 'consent'); // Force consent screen agar dapat refresh token

  if (isNative()) {
    // Native: Buka browser → capture redirect via App Links
    await Browser.open({
      url: authUrl.toString(),
      presentationStyle: 'popover',
    });

    // Return promise yang resolve saat dapat auth code dari App Links
    // (Implementasi App Links listener ada di capacitor.config.ts)
    return new Promise((resolve, reject) => {
      // Timeout 5 menit
      const timeout = setTimeout(() => {
        reject(new Error('Login timeout. User tidak menyelesaikan OAuth flow.'));
      }, 5 * 60 * 1000);

      // Listen untuk auth code dari App Links (event custom)
      window.addEventListener('oauth-callback', async (event) => {
        clearTimeout(timeout);
        try {
          const { code, state: returnedState } = event.detail;
          
          // Verify state
          const savedState = sessionStorage.getItem('oauth_state');
          if (returnedState !== savedState) {
            throw new Error('State mismatch. Possible CSRF attack.');
          }

          // Exchange code → token
          const tokens = await exchangeCodeForToken(code, codeVerifier);
          resolve(tokens);
        } catch (err) {
          reject(err);
        }
      }, { once: true });
    });
  } else {
    // Web: Popup window
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl.toString(),
      'Google OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        popup?.close();
        reject(new Error('Login timeout.'));
      }, 5 * 60 * 1000);

      // Poll untuk redirect
      const interval = setInterval(async () => {
        try {
          if (!popup || popup.closed) {
            clearInterval(interval);
            clearTimeout(timeout);
            reject(new Error('Login dibatalkan oleh user.'));
            return;
          }

          // Cek apakah sudah redirect ke callback URL
          const url = popup.location.href;
          if (url.startsWith(REDIRECT_URI)) {
            clearInterval(interval);
            clearTimeout(timeout);
            popup.close();

            const params = new URL(url).searchParams;
            const code = params.get('code');
            const returnedState = params.get('state');

            // Verify state
            const savedState = sessionStorage.getItem('oauth_state');
            if (returnedState !== savedState) {
              throw new Error('State mismatch.');
            }

            if (!code) {
              throw new Error('Authorization code tidak ditemukan.');
            }

            // Exchange code → token
            const tokens = await exchangeCodeForToken(code, codeVerifier);
            resolve(tokens);
          }
        } catch (e) {
          // Cross-origin error sebelum redirect = normal, ignore
          if (!e.message.includes('cross-origin')) {
            clearInterval(interval);
            clearTimeout(timeout);
            popup?.close();
            reject(e);
          }
        }
      }, 500);
    });
  }
}

/**
 * Exchange authorization code untuk access token
 */
async function exchangeCodeForToken(code, codeVerifier) {
  const params = {
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  };
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Fetch user email
  let userEmail = null;
  try {
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
      },
    });
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      userEmail = userInfo.email;
    }
  } catch (e) {
    // Ignore
  }

  const authState = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: Date.now() + (data.expires_in * 1000),
    userEmail,
    tokenType: data.token_type,
  };

  saveAuthState(authState);
  return authState;
}

/**
 * Refresh access token menggunakan refresh token
 */
export async function refreshAccessToken() {
  const authState = loadAuthState();
  if (!authState?.refreshToken) {
    throw new Error('Refresh token tidak ditemukan. User perlu login ulang.');
  }

  const params = {
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: authState.refreshToken,
  };
  
  // Web mode butuh client_secret
  if (!isNative() && CLIENT_SECRET) {
    params.client_secret = CLIENT_SECRET;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    const error = await response.json();
    
    // Refresh token expire/invalid → clear state, user harus login ulang
    if (error.error === 'invalid_grant') {
      clearAuthState();
      throw new Error('Refresh token tidak valid. Silakan login ulang.');
    }
    
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  const newAuthState = {
    ...authState,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  saveAuthState(newAuthState);
  return newAuthState;
}

/**
 * Get valid access token (auto-refresh jika expire)
 */
export async function getValidAccessToken() {
  const authState = loadAuthState();
  if (!authState) {
    throw new Error('User belum login.');
  }

  // Token masih valid (buffer 5 menit sebelum expire)
  if (authState.expiresAt && Date.now() < authState.expiresAt - 5 * 60 * 1000) {
    return authState.accessToken;
  }

  // Token expire/hampir expire → refresh
  const refreshed = await refreshAccessToken();
  return refreshed.accessToken;
}

/**
 * Logout (clear local state)
 */
export async function logoutYouTubeMusic() {
  clearAuthState();
  
  // Optional: Revoke token di Google (supaya tidak bisa dipakai lagi)
  // Tapi ini bisa skip untuk UX lebih cepat
  
  return true;
}
