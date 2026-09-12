import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractXId,
  getXSyndicationToken,
  parseXResponse,
} from '../src/services/scrapers/x.js';
import {
  extractPinterestPinId,
  parsePinterestRelayHtml,
} from '../src/services/scrapers/pinterest.js';

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

test('extractXId accepts x.com and twitter.com status URLs', () => {
  assert.equal(extractXId('https://x.com/creator/status/1234567890123456789'), '1234567890123456789');
  assert.equal(extractXId('https://twitter.com/creator/status/1234567890123456789?feature=share'), '1234567890123456789');
  assert.equal(extractXId('https://example.com/status/1234567890123456789'), null);
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
  assert.equal(extractPinterestPinId('https://pin.it/short'), null);
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
