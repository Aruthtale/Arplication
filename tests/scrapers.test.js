import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractXId,
  getXSyndicationToken,
  parseXResponse,
} from '../src/services/scrapers/x.js';
import { extractYouTubeId, isYouTubeUrl } from '../src/services/scrapers/youtube.js';
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
  parseInstagramHtml,
} from '../src/services/scrapers/instagram.js';
import {
  isSpotifyUrl,
  extractSpotifyDetails,
  formatSpotifyDuration,
  parseSpotifyEmbedData,
} from '../src/services/scrapers/spotify.js';
import { detectPlatform } from '../src/services/scrapers/index.js';

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
  assert.equal(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?feature=share'), 'dQw4w9WgXcQ');
});

test('local downloader only accepts YouTube URLs', () => {
  assert.equal(isAllowedYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isAllowedYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), true);
  assert.equal(isAllowedYouTubeUrl('https://example.com/video'), false);
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
  globalThis.window = { location: { hostname: 'localhost' } };
  assert.equal(getPinterestPinPageUrl('443112050847584837'), '/__pinterest/pin/443112050847584837/');
  globalThis.window = originalWindow;
});

test('parsePinterestRelayHtml extracts original image and metadata', () => {
  const result = parsePinterestRelayHtml(pinHtml, 'https://www.pinterest.com/pin/443112050847584837/');
  assert.equal(result.platform, 'pinterest');
  assert.equal(result.id, '443112050847584837');
  assert.equal(result.title, 'Original Pin Title');
  assert.equal(result.cover, 'https://i.pinimg.com/originals/f5/ca/e8/f5cae8498992e9c9759abb4997b7a9e7.jpg');
  assert.equal(result.author.username, 'pincreator');
  assert.equal(result.options.length, 1);
  assert.equal(result.options[0].url, 'https://i.pinimg.com/originals/f5/ca/e8/f5cae8498992e9c9759abb4997b7a9e7.jpg');
});

test('isInstagramUrl recognizes post, reel, tv and share links', () => {
  assert.equal(isInstagramUrl('https://www.instagram.com/reel/DVBukMrgPAk/'), true);
  assert.equal(isInstagramUrl('https://www.instagram.com/p/DZT71H-BJuK/'), true);
  assert.equal(isInstagramUrl('https://instagr.am/tv/DdFFK5vSwpG/'), true);
  assert.equal(isInstagramUrl('https://www.instagram.com/share/reel/DVBukMrgPAk'), true);
  assert.equal(isInstagramUrl('https://example.com/not-ig'), false);
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
  const preview = result.options.find((opt) => opt.id === 'spotify-preview-mp3');
  assert.ok(preview);
  assert.equal(preview.url, 'https://p.scdn.co/mp3-preview/b4c682084c3fd05538726d0a126b7e14b6e92c83');
});

test('detectPlatform correctly detects all supported platforms', () => {
  assert.equal(detectPlatform('https://www.tiktok.com/@user/video/123'), 'tiktok');
  assert.equal(detectPlatform('https://www.youtube.com/watch?v=123'), 'youtube');
  assert.equal(detectPlatform('https://www.instagram.com/reel/123/'), 'instagram');
  assert.equal(detectPlatform('https://open.spotify.com/track/123'), 'spotify');
  assert.equal(detectPlatform('https://x.com/user/status/123'), 'x');
  assert.equal(detectPlatform('https://www.pinterest.com/pin/123/'), 'pinterest');
  assert.equal(detectPlatform('https://example.com/'), null);
});
