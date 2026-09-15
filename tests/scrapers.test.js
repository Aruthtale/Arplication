import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractXId,
  getXSyndicationToken,
  parseXResponse,
} from '../src/services/scrapers/x.js';
import {
  isYouTubeUrl,
  isYouTubePlaylistUrl,
  extractYouTubePlaylistId,
  extractYouTubeId,
  extractPipedVideoId,
  pipedQualityRank,
  pickPipedProgressiveStreams,
  pickPipedAudioUrl,
  formatPipedDuration,
} from '../src/services/scrapers/youtube.js';
import { isAllowedYouTubeUrl } from '../scripts/downloader-server.js';
import {
  extractPinterestPinId,
  extractPinterestCanonicalUrl,
  getPinterestPinPageUrl,
  parsePinterestRelayHtml,
} from '../src/services/scrapers/pinterest.js';
import {
  isInstagramUrl,
  extractInstagramShortcode,
  extractInstagramDetails,
  parseInstagramHtml,
  hasDirectVideoOption,
  isReelUrl,
  getActiveInstagramCookie,
} from '../src/services/scrapers/instagram.js';
import {
  isSpotifyUrl,
  extractSpotifyDetails,
  formatSpotifyDuration,
  parseSpotifyEmbedData,
} from '../src/services/scrapers/spotify.js';
import { detectPlatform } from '../src/services/scrapers/index.js';
import { resolveSubfolderPath, formatPlatformFolderName } from '../src/utils/download.js';

const xResponse = {
  id_str: '2097687546381713860',
  text: 'A public video &amp; photo test.',
  user: {
    name: 'Creator',
    screen_name: 'creator',
    profile_image_url_https: 'https://pbs.twimg.com/profile_images/creator.jpg',
  },
  photos: [{ url: 'https://pbs.twimg.com/media/photo.jpg' }],
  mediaDetails: [
    {
      type: 'video',
      media_url_https: 'https://pbs.twimg.com/media/poster.jpg',
      video_info: {
        duration_millis: 30030,
        variants: [
          { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/video.m3u8' },
          { content_type: 'video/mp4', bitrate: 832000, url: 'https://video.twimg.com/640x360.mp4' },
          { content_type: 'video/mp4', bitrate: 2176000, url: 'https://video.twimg.com/1280x720.mp4' },
        ],
      },
    },
  ],
  video: {
    poster: 'https://pbs.twimg.com/media/poster.jpg',
    durationMs: 30030,
    variants: [
      { type: 'video/mp4', src: 'https://video.twimg.com/640x360.mp4' },
      { type: 'video/mp4', src: 'https://video.twimg.com/1280x720.mp4' },
    ],
  },
};

const pinHtml = `
  <script data-relay-completed-request="true">
    window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7B%22variables%22%3A%7B%22pinId%22%3A%22443112050847584837%22%7D%7D", {"data":{"v3GetPinQueryv2":{"data":{
      "entityId":"443112050847584837",
      "richMetadata":{"title":"Original Pin Title","description":"A useful description","url":"https://example.com/source"},
      "pinner":{"fullName":"Pin Creator","username":"pincreator","imageLargeUrl":"https://i.pinimg.com/140x140_RS/creator.jpg"},
      "images_236x":{"url":"https://i.pinimg.com/236x/f5/ca/e8/f5cae8498992e9c9759abb4997b7a9e7.jpg"},
      "images_orig":{"url":"https://i.pinimg.com/originals/f5/ca/e8/f5cae8498992e9c9759abb4997b7a9e7.jpg"},
      "imageSignature":"f5cae8498992e9c9759abb4997b7a9e7",
      "link":"https://example.com/source"
    }}}});
  </script>
`;

const igHtml = `
  <html>
    <head>
      <meta property="og:title" content="apple on Instagram: &quot;get set ready. New trick drops today!&quot;" />
      <meta property="og:image" content="https://scontent.cdninstagram.com/v/t51.82787-15/802119960_1.jpg" />
      <meta property="og:description" content="2M likes, 12K comments - apple on September 9, 2026: &quot;get set ready.&quot;" />
      <meta property="og:video:secure_url" content="https://scontent.cdninstagram.com/v/t51.82787-15/video_802119960.mp4" />
    </head>
  </html>
`;

const igCarouselHtml = `
  <html>
    <head>
      <meta property="og:title" content="traveler on Instagram: &quot;Beautiful sunsets in Bali&quot;" />
      <meta property="og:image" content="https://scontent.cdninstagram.com/v/t51/slide1.jpg" />
    </head>
    <body>
      <img src="https://scontent.cdninstagram.com/v/t51/slide2.jpg" />
      <img src="https://scontent.cdninstagram.com/v/t51/slide3.jpg" />
    </body>
  </html>
`;

const spotifyHtml = `
  <html>
    <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "pageProps": {
            "state": {
              "data": {
                "entity": {
                  "id": "4cOdK2wGLETKBW3PvgPWqT",
                  "name": "Never Gonna Give You Up",
                  "duration": 213000,
                  "artists": [{ "name": "Rick Astley" }],
                  "audioPreview": { "url": "https://p.scdn.co/mp3-preview/b4c682084c3fd05538726d0a126b7e14b6e92c83" },
                  "visualIdentity": {
                    "image": [{ "url": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02baf89eb11ec7c657805d2da0" }]
                  }
                }
              }
            }
          }
        }
      }
    </script>
  </html>
`;

test('extractXId accepts x.com and twitter.com status URLs', () => {
  assert.equal(extractXId('https://x.com/creator/status/1234567890123456789'), '1234567890123456789');
  assert.equal(extractXId('https://twitter.com/creator/status/1234567890123456789?feature=share'), '1234567890123456789');
  assert.equal(extractXId('https://example.com/status/1234567890123456789'), null);
});

test('YouTube URL recognition supports watch, Shorts, and short URLs', () => {
  assert.equal(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), true);
  assert.equal(isYouTubeUrl('https://www.youtube.com/playlist?list=PLBCF2DAC6FFB574DE'), true);
  assert.equal(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?feature=share'), 'dQw4w9WgXcQ');
  assert.equal(isYouTubePlaylistUrl('https://www.youtube.com/playlist?list=PLBCF2DAC6FFB574DE'), true);
  assert.equal(isYouTubePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLBCF2DAC6FFB574DE'), true);
  assert.equal(isYouTubePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
  assert.equal(extractYouTubePlaylistId('https://www.youtube.com/playlist?list=PLBCF2DAC6FFB574DE'), 'PLBCF2DAC6FFB574DE');
});

test('local downloader only accepts YouTube URLs', () => {
  assert.equal(isAllowedYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isAllowedYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), true);
  assert.equal(isAllowedYouTubeUrl('https://example.com/video'), false);
});

test('extractPipedVideoId accepts watch URL, short link, and bare ID', () => {
  assert.equal(extractPipedVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractPipedVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractPipedVideoId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractPipedVideoId('Rick Astley - Never Gonna Give You Up'), null);
  assert.equal(extractPipedVideoId(''), null);
});

test('pipedQualityRank ranks numeric quality labels', () => {
  assert.equal(pipedQualityRank('1080p'), 1080);
  assert.equal(pipedQualityRank('720p60'), 720);
  assert.equal(pipedQualityRank(''), 0);
  assert.equal(pipedQualityRank('unknown'), 0);
});

test('pickPipedAudioUrl prefers highest bitrate, falls back to progressive', () => {
  const withAudio = {
    audioStreams: [
      { url: 'https://a.example/low.webm', bitrate: 64000 },
      { url: 'https://a.example/high.webm', bitrate: 192000 },
    ],
    videoStreams: [],
  };
  assert.equal(pickPipedAudioUrl(withAudio), 'https://a.example/high.webm');

  const progressiveOnly = {
    audioStreams: [],
    videoStreams: [
      { url: 'https://v.example/360.mp4', videoOnly: false, quality: '360p' },
      { url: 'https://proxied.piped-proxy.example/720.mp4', videoOnly: false, quality: '720p' },
    ],
  };
  assert.equal(pickPipedAudioUrl(progressiveOnly), 'https://proxied.piped-proxy.example/720.mp4');
  assert.equal(pickPipedAudioUrl({}), null);
});

test('pickPipedProgressiveStreams filters video-only and sorts proxy first', () => {
  const data = {
    videoStreams: [
      { url: 'https://v.example/only.mp4', videoOnly: true, quality: '1080p' },
      { url: 'not-a-url', videoOnly: false, quality: '480p' },
      { url: 'https://cdn.example/360.mp4', videoOnly: false, quality: '360p' },
      { url: 'https://proxied.piped-proxy.example/720.mp4', videoOnly: false, quality: '720p' },
    ],
  };
  const picked = pickPipedProgressiveStreams(data);
  assert.equal(picked.length, 2);
  assert.equal(picked[0].url, 'https://proxied.piped-proxy.example/720.mp4');
  assert.equal(picked[1].url, 'https://cdn.example/360.mp4');
});

test('formatPipedDuration formats seconds to m:ss', () => {
  assert.equal(formatPipedDuration(213), '3:33');
  assert.equal(formatPipedDuration(65), '1:05');
  assert.equal(formatPipedDuration(null), null);
  assert.equal(formatPipedDuration(0), null);
});

test('getXSyndicationToken uses X syndication token formula', () => {
  assert.equal(getXSyndicationToken('2064694071537352925'), '56fec177qr');
  assert.equal(getXSyndicationToken('2097687546381713860'), '5322vegkc7t');
});

test('parseXResponse extracts metadata, photos, and highest-quality MP4', () => {
  const result = parseXResponse(xResponse);
  assert.equal(result.platform, 'x');
  assert.equal(result.id, '2097687546381713860');
  assert.equal(result.title, 'A public video & photo test.');
  assert.equal(result.author.name, 'Creator');
  assert.equal(result.cover, 'https://pbs.twimg.com/media/poster.jpg');
  assert.equal(result.duration, '30.03s');
  assert.deepEqual(result.options.map((option) => option.url), [
    'https://pbs.twimg.com/media/photo.jpg',
    'https://video.twimg.com/640x360.mp4',
    'https://video.twimg.com/1280x720.mp4',
  ]);
  assert.deepEqual(result.options.map((option) => option.type), ['image', 'video', 'video']);
});

test('extractPinterestPinId accepts standard Pinterest pin URLs', () => {
  assert.equal(extractPinterestPinId('https://www.pinterest.com/pin/443112050847584837/'), '443112050847584837');
  assert.equal(extractPinterestPinId('https://pinterest.co.uk/pin/443112050847584837/?sender=1'), '443112050847584837');
  assert.equal(extractPinterestPinId('https://www.pinterest.com/amp/pin/443112050847584837/'), '443112050847584837');
  assert.equal(extractPinterestPinId('https://pin.it/short'), null);
});

test('extractPinterestCanonicalUrl supports canonical and Open Graph tag attribute order', () => {
  assert.equal(
    extractPinterestCanonicalUrl('<link href="https://www.pinterest.com/pin/443112050847584837/" rel="canonical">'),
    'https://www.pinterest.com/pin/443112050847584837/'
  );
  assert.equal(
    extractPinterestCanonicalUrl('<meta content="https://www.pinterest.com/pin/443112050847584837/" property="og:url">'),
    'https://www.pinterest.com/pin/443112050847584837/'
  );
});

test('getPinterestPinPageUrl uses the local Vite proxy on localhost', () => {
  const originalWindow = globalThis.window;
  const originalCapacitor = globalThis.Capacitor;
  globalThis.window = { location: { hostname: 'localhost' } };
  globalThis.Capacitor = { isNativePlatform: () => false };
  assert.equal(getPinterestPinPageUrl('443112050847584837'), '/__pinterest/pin/443112050847584837/');
  globalThis.window = originalWindow;
  globalThis.Capacitor = originalCapacitor;
});

test('getPinterestPinPageUrl uses direct URL on native even with localhost hostname', () => {
  const originalWindow = globalThis.window;
  const originalCapacitor = globalThis.Capacitor;
  globalThis.window = { location: { hostname: 'localhost' } };
  globalThis.Capacitor = { isNativePlatform: () => true };
  assert.equal(getPinterestPinPageUrl('443112050847584837'), 'https://www.pinterest.com/pin/443112050847584837/');
  globalThis.window = originalWindow;
  globalThis.Capacitor = originalCapacitor;
});

test('parsePinterestRelayHtml extracts original image and metadata', () => {
  const originalWindow = globalThis.window;
  globalThis.window = { location: { hostname: 'example.com' } };
  const result = parsePinterestRelayHtml(pinHtml, 'https://www.pinterest.com/pin/443112050847584837/');
  assert.equal(result.platform, 'pinterest');
  assert.equal(result.id, '443112050847584837');
  assert.equal(result.title, 'Original Pin Title');
  assert.equal(result.cover, 'https://i.pinimg.com/originals/f5/ca/e8/f5cae8498992e9c9759abb4997b7a9e7.jpg');
  assert.equal(result.author.username, 'pincreator');
  assert.equal(result.options.length, 1);
  assert.equal(result.options[0].url, 'https://i.pinimg.com/originals/f5/ca/e8/f5cae8498992e9c9759abb4997b7a9e7.jpg');
  globalThis.window = originalWindow;
});

test('isInstagramUrl recognizes post, reel, tv, share, story, and highlight links', () => {
  assert.equal(isInstagramUrl('https://www.instagram.com/reel/DVBukMrgPAk/'), true);
  assert.equal(isInstagramUrl('https://www.instagram.com/p/DZT71H-BJuK/'), true);
  assert.equal(isInstagramUrl('https://instagr.am/tv/DdFFK5vSwpG/'), true);
  assert.equal(isInstagramUrl('https://www.instagram.com/share/reel/DVBukMrgPAk'), true);
  assert.equal(isInstagramUrl('https://www.instagram.com/stories/highlights/17926176319086111/'), true);
  assert.equal(isInstagramUrl('https://www.instagram.com/stories/username/3145678901234567890/'), true);
  assert.equal(isInstagramUrl('https://www.instagram.com/s/aGlnaGxpZ2h0OjE3OTI2MTc2MzE5MDg2MTEx'), true);
  assert.equal(isInstagramUrl('https://example.com/not-ig'), false);
});

test('extractInstagramDetails extracts details for posts, stories, and highlights', () => {
  assert.deepEqual(
    extractInstagramDetails('https://www.instagram.com/p/DZT71H-BJuK/'),
    { type: 'post', id: 'DZT71H-BJuK', shortcode: 'DZT71H-BJuK' }
  );
  assert.deepEqual(
    extractInstagramDetails('https://www.instagram.com/stories/highlights/17926176319086111/'),
    { type: 'highlight', id: '17926176319086111', shortcode: '17926176319086111' }
  );
  assert.deepEqual(
    extractInstagramDetails('https://www.instagram.com/stories/username/3145678901234567890/'),
    { type: 'story', username: 'username', id: '3145678901234567890', shortcode: '3145678901234567890' }
  );
  assert.deepEqual(
    extractInstagramDetails('https://www.instagram.com/s/aGlnaGxpZ2h0OjE3OTI2MTc2MzE5MDg2MTEx'),
    { type: 'highlight', id: '17926176319086111', shortcode: '17926176319086111' }
  );
});

test('extractInstagramShortcode extracts correct code', () => {
  assert.equal(extractInstagramShortcode('https://www.instagram.com/reel/DVBukMrgPAk/?utm_source=ig_web_copy_link'), 'DVBukMrgPAk');
  assert.equal(extractInstagramShortcode('https://www.instagram.com/p/DZT71H-BJuK/'), 'DZT71H-BJuK');
});

test('parseInstagramHtml extracts video, cover, and author correctly', () => {
  const result = parseInstagramHtml(igHtml, 'https://www.instagram.com/reel/DdFFK5vSwpG/');
  assert.equal(result.platform, 'instagram');
  assert.equal(result.id, 'DdFFK5vSwpG');
  assert.equal(result.author.name, 'apple');
  assert.equal(result.cover, 'https://scontent.cdninstagram.com/v/t51.82787-15/802119960_1.jpg');
  const videoOption = result.options.find((opt) => opt.type === 'video');
  assert.ok(videoOption);
  assert.equal(videoOption.url, 'https://scontent.cdninstagram.com/v/t51.82787-15/video_802119960.mp4');
});

test('parseInstagramHtml bot-wall on /reel/ never resolves to JPG-only', () => {
  // Regresi: reels IG hanya jadi JPG. Penyebab: scrapeInstagram Layer 3 mem-parse
  // pakai normalizedUrl /p/ sehingga isVideoPage=false, lalu JPG-only di-return
  // tanpa lanjut ke FastDL Layer 4. Parse pakai cleanUrl /reel/ + gate hasDirectVideoOption.
  const botWallHtml = `<html><head>
    <meta property="og:title" content="surfclip on Instagram: &quot;Sunset session&quot;" />
    <meta property="og:image" content="https://scontent.cdninstagram.com/v/t51/cover123.jpg" />
  </head><body>login wall</body></html>`;

  const viaFixedPath = parseInstagramHtml(botWallHtml, 'https://www.instagram.com/reel/C8xyz123/');
  // JPG fallback boleh ada di opsi, tapi direct MP4 harus tidak ada
  // -> caller wajib lanjut ke FastDL Layer 4, bukan return JPG.
  assert.equal(hasDirectVideoOption(viaFixedPath), false);

  const directMp4 = parseInstagramHtml(igHtml, 'https://www.instagram.com/reel/DdFFK5vSwpG/');
  assert.equal(hasDirectVideoOption(directMp4), true);
});

test('isReelUrl flags reel/tv links, hasDirectVideoOption rejects page links', () => {
  assert.equal(isReelUrl('https://www.instagram.com/reel/C8xyz123/'), true);
  assert.equal(isReelUrl('https://www.instagram.com/reels/C8xyz123/'), true);
  assert.equal(isReelUrl('https://www.instagram.com/tv/DdFFK5vSwpG/'), true);
  assert.equal(isReelUrl('https://www.instagram.com/p/DZT71H-BJuK/'), false);

  const pageLinkOnly = {
    options: [{ type: 'video', url: 'https://www.instagram.com/reel/C8xyz123/', ext: 'mp4' }],
  };
  assert.equal(hasDirectVideoOption(pageLinkOnly), false);
  const cdnFile = {
    options: [{ type: 'video', url: 'https://scontent.cdninstagram.com/v/t51/video123.mp4?x=1', ext: 'mp4' }],
  };
  assert.equal(hasDirectVideoOption(cdnFile), true);
});

test('getActiveInstagramCookie reads instagramSessionId (UI) and igSessionId (legacy)', () => {
  // Regresi: modal Pengaturan menyimpan `instagramSessionId`, scraper membaca
  // `igSessionId` -> Session ID user diabaikan, scrape jatuh ke jalur publik/JPG.
  const originalWindow = globalThis.window;
  const originalCapacitor = globalThis.Capacitor;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.window = { location: { hostname: 'example.com' } };
  globalThis.Capacitor = { isNativePlatform: () => false };
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
  };
  try {
    globalThis.localStorage.setItem(
      'arloader_settings',
      JSON.stringify({ instagramSessionId: ' UISESSION123 ' })
    );
    assert.ok(
      getActiveInstagramCookie().includes('UISESSION123'),
      'UI key instagramSessionId must be honored'
    );

    globalThis.localStorage.setItem(
      'arloader_settings',
      JSON.stringify({ igSessionId: ' LEGACYSESSION456 ' })
    );
    assert.ok(
      getActiveInstagramCookie().includes('LEGACYSESSION456'),
      'legacy key igSessionId must keep working'
    );
  } finally {
    globalThis.window = originalWindow;
    globalThis.Capacitor = originalCapacitor;
    globalThis.localStorage = originalLocalStorage;
  }
});

test('parseInstagramHtml supports carousel multi-slide extraction', () => {
  const result = parseInstagramHtml(igCarouselHtml, 'https://www.instagram.com/p/CarouselTest123/');
  assert.equal(result.platform, 'instagram');
  assert.equal(result.author.name, 'traveler');
  assert.ok(result.options.length >= 3);
  assert.equal(result.options[0].type, 'image');
});

test('isSpotifyUrl and extractSpotifyDetails parse tracks and albums', () => {
  assert.equal(isSpotifyUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'), true);
  assert.equal(isSpotifyUrl('https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa'), true);
  assert.equal(isSpotifyUrl('https://spotify.link/AbCdEf123'), true);
  assert.equal(isSpotifyUrl('https://example.com/not-spotify'), false);

  const details = extractSpotifyDetails('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=123');
  assert.deepEqual(details, { type: 'track', id: '4cOdK2wGLETKBW3PvgPWqT' });
});

test('formatSpotifyDuration formats millisecond timestamps', () => {
  assert.equal(formatSpotifyDuration(213000), '3:33');
  assert.equal(formatSpotifyDuration(65000), '1:05');
  assert.equal(formatSpotifyDuration(null), null);
});

test('parseSpotifyEmbedData extracts audio preview and cover metadata', () => {
  const result = parseSpotifyEmbedData(spotifyHtml, 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
  assert.equal(result.platform, 'spotify');
  assert.equal(result.id, '4cOdK2wGLETKBW3PvgPWqT');
  assert.equal(result.title, 'Never Gonna Give You Up');
  assert.equal(result.author.name, 'Rick Astley');
  assert.equal(result.duration, '3:33');
  assert.equal(result.previewUrl, 'https://p.scdn.co/mp3-preview/b4c682084c3fd05538726d0a126b7e14b6e92c83');
  const fullMp3 = result.options.find((opt) => opt.id === 'spotify-full-mp3');
  assert.ok(fullMp3);
  assert.equal(fullMp3.isFullAudio, true);
});

test('parseSpotifyEmbedData parses album and playlist trackLists', () => {
  const albumHtml = `<html><head></head><body><script id="__NEXT_DATA__" type="application/json">
  {"props":{"pageProps":{"state":{"data":{"entity":{"id":"2noRn2Aes5aoNVsU6iWThc","name":"Discovery","type":"album","artists":[{"name":"Daft Punk"}],"visualIdentity":{"image":[{"url":"https://i.scdn.co/image/album123"}]},"trackList":[{"uri":"spotify:track:0DiWol3AO6WpXZgp0goxAV","title":"One More Time","subtitle":"Daft Punk","duration":320000,"audioPreview":{"url":"https://p.scdn.co/preview1"}},{"uri":"spotify:track:3H3cOQ6LBLSvmcaV7QkZEu","title":"Aerodynamic","subtitle":"Daft Punk","duration":212000,"audioPreview":{"url":"https://p.scdn.co/preview2"}}]}}}}}}
  </script></body></html>`;
  const result = parseSpotifyEmbedData(albumHtml, 'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc');
  assert.equal(result.platform, 'spotify');
  assert.equal(result.isPlaylist, true);
  assert.equal(result.title, 'Discovery');
  assert.equal(result.trackCount, 2);
  assert.equal(result.tracks[0].title, 'One More Time');
  assert.equal(result.tracks[0].artist, 'Daft Punk');
  assert.equal(result.tracks[0].duration, '5:20');
  assert.equal(result.tracks[1].title, 'Aerodynamic');
});

test('detectPlatform correctly detects all supported platforms', () => {
  assert.equal(detectPlatform('https://www.tiktok.com/@user/video/123'), 'tiktok');
  assert.equal(detectPlatform('https://www.youtube.com/watch?v=123'), 'youtube');
  assert.equal(detectPlatform('https://www.instagram.com/reel/123/'), 'instagram');
  assert.equal(detectPlatform('https://www.instagram.com/stories/highlights/123/'), 'instagram');
  assert.equal(detectPlatform('https://open.spotify.com/track/123'), 'spotify');
  assert.equal(detectPlatform('https://x.com/user/status/123'), 'x');
  assert.equal(detectPlatform('https://www.pinterest.com/pin/123/'), 'pinterest');
  assert.equal(detectPlatform('https://example.com/'), null);
});

test('resolveSubfolderPath handles automatic platform folders and legacy presets', () => {
  assert.equal(formatPlatformFolderName('youtube'), 'YouTube');
  assert.equal(formatPlatformFolderName('tiktok'), 'TikTok');
  assert.equal(formatPlatformFolderName('spotify'), 'Spotify');
  assert.equal(formatPlatformFolderName('instagram'), 'Instagram');

  // Placeholder format
  assert.equal(resolveSubfolderPath('Arloader/{platform}', 'youtube'), 'Arloader/YouTube');
  assert.equal(resolveSubfolderPath('Arloader/{platform}', 'tiktok'), 'Arloader/TikTok');
  assert.equal(resolveSubfolderPath('Arloader/{platform}', 'spotify'), 'Arloader/Spotify');

  // Legacy preset migration (e.g. Arloader/TikTok saved in localStorage)
  assert.equal(resolveSubfolderPath('Arloader/TikTok', 'youtube'), 'Arloader/YouTube');
  assert.equal(resolveSubfolderPath('Arloader/TikTok', 'tiktok'), 'Arloader/TikTok');
  assert.equal(resolveSubfolderPath('Arloader', 'youtube'), 'Arloader/YouTube');

  // Custom user subfolders
  assert.equal(resolveSubfolderPath('MyVideos', 'youtube'), 'MyVideos');
});
