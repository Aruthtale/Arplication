import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Pinterest does not grant browser CORS access to Pin pages. In local
      // development, keep the browser request same-origin and let Vite make
      // the server-to-server request instead.
      '/__pinterest': {
        target: 'https://www.pinterest.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__pinterest/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
        },
      },
      // Instagram proxy for local development
      '/__instagram': {
        target: 'https://www.instagram.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__instagram/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      // Spotify proxy for local development
      '/__spotify': {
        target: 'https://open.spotify.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__spotify/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      // FastDL API proxy for local development
      '/__fastdl': {
        target: 'https://api-wh.fastdl.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__fastdl/, ''),
      },
      '/api/yt-dlp': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/__pinimg': {
        target: 'https://i.pinimg.com',
        changeOrigin: true,
        rewrite: (path) => {
          const encodedUrl = path.replace(/^\/__pinimg\//, '');
          const assetUrl = decodeURIComponent(encodedUrl);
          const parsed = new URL(assetUrl);
          if (parsed.hostname !== 'i.pinimg.com') throw new Error('Invalid Pinterest asset host');
          return `${parsed.pathname}${parsed.search}`;
        },
      },
    },
  },
})
