import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const PORT = 8787;
const HOST = '127.0.0.1';
const MAX_ERROR_LENGTH = 1_500;

const MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export function isAllowedYouTubeUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === 'https:' &&
      (hostname === 'youtu.be' || hostname === 'youtube.com' || hostname.endsWith('.youtube.com'))
    );
  } catch {
    return false;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function setCorsHeaders(response) {
  // The server is bound to 127.0.0.1, so it is reachable only from this
  // computer. This lets the Vite page call it even when Vite is restarted.
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

function runYtDlp(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errorOutput = '';

    child.stderr.on('data', (chunk) => {
      errorOutput = `${errorOutput}${chunk}`.slice(-MAX_ERROR_LENGTH);
    });
    child.once('error', rejectRun);
    child.once('close', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(errorOutput.trim() || `yt-dlp berhenti dengan kode ${code}.`));
    });
  });
}

async function download(requestUrl, response) {
  const sourceUrl = requestUrl.searchParams.get('url') || '';
  const format = requestUrl.searchParams.get('format');

  if (!isAllowedYouTubeUrl(sourceUrl)) {
    sendJson(response, 400, { error: 'Hanya URL YouTube HTTPS yang diizinkan.' });
    return;
  }
  if (!['video', 'audio'].includes(format)) {
    sendJson(response, 400, { error: 'Format unduhan harus video atau audio.' });
    return;
  }

  const jobDir = await mkdtemp(join(tmpdir(), 'arplication-yt-'));
  const outputTemplate = join(jobDir, '%(title).120B-%(id)s.%(ext)s');
  const commonArgs = ['--no-playlist', '--no-warnings', '--restrict-filenames', '-o', outputTemplate];
  const formatArgs =
    format === 'audio'
      ? ['-x', '--audio-format', 'mp3']
      : ['-f', 'bv*+ba/b', '--merge-output-format', 'mp4'];

  try {
    await runYtDlp([...commonArgs, ...formatArgs, sourceUrl]);
    const files = await readdir(jobDir);
    const filename = files.find((file) => !file.endsWith('.part'));
    if (!filename) throw new Error('yt-dlp tidak menghasilkan berkas unduhan.');

    const filePath = join(jobDir, filename);
    const extension = extname(filename).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${basename(filename).replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
    });
    await pipeline(createReadStream(filePath), response);
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
}

export function createDownloaderServer() {
  return createServer(async (request, response) => {
    setCorsHeaders(response);
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    const requestUrl = new URL(request.url || '/', `http://${HOST}:${PORT}`);
    if (request.method === 'GET' && requestUrl.pathname === '/health') {
      sendJson(response, 200, { ok: true, service: 'arplication-yt-dlp' });
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/download') {
      try {
        await download(requestUrl, response);
      } catch (error) {
        if (!response.headersSent) {
          sendJson(response, 502, { error: error.message || 'Unduhan YouTube gagal.' });
        } else {
          response.destroy(error);
        }
      }
      return;
    }
    sendJson(response, 404, { error: 'Endpoint tidak ditemukan.' });
  });
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  createDownloaderServer().listen(PORT, HOST, () => {
    console.log(`Arloader yt-dlp server berjalan di http://${HOST}:${PORT}`);
  });
}
