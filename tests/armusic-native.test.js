import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNativePlayableUri,
  shouldUseNativePlayback,
} from '../src/services/armusicNative.js';

test('isNativePlayableUri: file/content/http native, blob/data fallback WebView', () => {
  assert.equal(isNativePlayableUri('file:///storage/emulated/0/Download/Arloader/a.mp3'), true);
  assert.equal(isNativePlayableUri('content://media/external/audio/media/42'), true);
  assert.equal(isNativePlayableUri('https://cdn.example/a.mp3'), true);
  assert.equal(isNativePlayableUri('http://cdn.example/a.mp3'), true);
  assert.equal(isNativePlayableUri('blob:http://localhost/abc'), false);
  assert.equal(isNativePlayableUri('data:audio/mp3;base64,AAA'), false);
  assert.equal(isNativePlayableUri(''), false);
  assert.equal(isNativePlayableUri(null), false);
});

test('shouldUseNativePlayback: butuh support DAN uri playable', () => {
  assert.equal(shouldUseNativePlayback({ nativeSupported: true, uri: 'file:///a.mp3' }), true);
  assert.equal(shouldUseNativePlayback({ nativeSupported: true, uri: 'https://x/a.mp3' }), true);
  assert.equal(shouldUseNativePlayback({ nativeSupported: true, uri: 'blob:http://x' }), false);
  assert.equal(shouldUseNativePlayback({ nativeSupported: false, uri: 'file:///a.mp3' }), false);
  assert.equal(shouldUseNativePlayback({}), false);
  assert.equal(shouldUseNativePlayback(), false);
});
