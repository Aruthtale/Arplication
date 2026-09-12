import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function devScraperProxyPlugin() {
  return {
    name: 'dev-scraper-proxy',
    configureServer(server) {
      // Instagram Dev Proxy
      server.middlewares.use('/__instagram', async (req, res) => {
        try {
          const targetUrl = `https://www.instagram.com${req.url}`;
          const fetchRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          res.statusCode = fetchRes.status;
          res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'text/html; charset=utf-8');
          const arrayBuf = await fetchRes.arrayBuffer();
          res.end(Buffer.from(arrayBuf));
        } catch (err) {
          res.statusCode = 502;
          res.end(err.message);
        }
      });

      // Spotify Dev Proxy
      server.middlewares.use('/__spotify', async (req, res) => {
        try {
          const targetUrl = `https://open.spotify.com${req.url}`;
          const fetchRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          res.statusCode = fetchRes.status;
          res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'text/html; charset=utf-8');
          const arrayBuf = await fetchRes.arrayBuffer();
          res.end(Buffer.from(arrayBuf));
        } catch (err) {
          res.statusCode = 502;
          res.end(err.message);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devScraperProxyPlugin(),
  ],
  server: {
    proxy: {
      '/__pinterest': {
        target: 'https://www.pinterest.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__pinterest/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
        },
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
