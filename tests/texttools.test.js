import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitWords, toUpperText, toLowerText, toTitleCase, toSentenceCase,
  toCamelCase, toPascalCase, toSnakeCase, toKebabCase, slugify,
  toAlternatingCase, reverseText, sortLines, uniqueLines, removeEmptyLines,
  trimLines, countText, base64Encode, base64Decode, hashText, formatJson,
  minifyJson, loremIpsum,
} from '../src/utils/textTools.js';

test('konversi gaya huruf dasar', () => {
  assert.equal(toUpperText('aBc'), 'ABC');
  assert.equal(toLowerText('aBc'), 'abc');
  assert.equal(toCamelCase('hello world foo'), 'helloWorldFoo');
  assert.equal(toPascalCase('hello world foo'), 'HelloWorldFoo');
  assert.equal(toSnakeCase('helloWorld foo'), 'hello_world_foo');
  assert.equal(toKebabCase('Hello World'), 'hello-world');
});

test('title & sentence case', () => {
  assert.equal(toTitleCase('hello world'), 'Hello World');
  assert.equal(toSentenceCase('hello world. how are you?'), 'Hello world. How are you?');
});

test('slugify membersihkan aksen & simbol', () => {
  assert.equal(slugify('Héllo, Wörld!'), 'hello-world');
  assert.equal(slugify('  --a--b--  '), 'a-b');
});

test('alternating & reverse', () => {
  assert.equal(toAlternatingCase('abcd'), 'AbCd');
  assert.equal(reverseText('abc'), 'cba');
  assert.equal(reverseText('a😀b'), 'b😀a'); // aman untuk emoji
});

test('utak-atik baris', () => {
  assert.equal(sortLines('c\na\nb'), 'a\nb\nc');
  assert.equal(sortLines('a\nc\nb', { descending: true }), 'c\nb\na');
  assert.equal(uniqueLines('a\nb\na\nc'), 'a\nb\nc');
  assert.equal(removeEmptyLines('a\n\nb\n  \nc'), 'a\nb\nc');
  assert.equal(trimLines('  a  \n  b  '), 'a\nb');
});

test('countText statistik lengkap', () => {
  const s = countText('Hello world. This is a test.\n\nSecond paragraph here.');
  assert.equal(s.words, 9);
  assert.equal(s.paragraphs, 2);
  assert.equal(s.lines, 3);
  assert.ok(s.chars > 0);
  assert.ok(s.readingTimeMin >= 1);
  assert.deepEqual(countText(''), {
    chars: 0, charsNoSpaces: 0, words: 0, lines: 0, sentences: 0, paragraphs: 0, readingTimeMin: 0,
  });
});

test('base64 encode/decode aman unicode & emoji', () => {
  const text = 'Halo, dunia! 😀 émoji';
  const enc = base64Encode(text);
  assert.equal(base64Decode(enc), text);
  assert.equal(base64Decode(base64Encode('')), '');
});

test('hashText SHA-256 (WebCrypto)', async () => {
  const h = await hashText('abc', 'SHA-256');
  assert.equal(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('formatJson & minifyJson', () => {
  const pretty = formatJson('{"a":1,"b":[2,3]}');
  assert.equal(pretty.ok, true);
  assert.equal(pretty.result, '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  assert.equal(minifyJson('{\n "a": 1\n}').result, '{"a":1}');
  const bad = formatJson('{oops');
  assert.equal(bad.ok, false);
  assert.ok(bad.error.length > 0);
});

test('loremIpsum menghasilkan unit sesuai permintaan', () => {
  assert.equal(loremIpsum(3, 'words').split(' ').length, 3);
  assert.ok(loremIpsum(2, 'sentences').split('.').filter((s) => s.trim()).length >= 2);
  assert.equal(loremIpsum(3, 'paragraphs').split('\n\n').length, 3);
  assert.ok(loremIpsum(9999, 'paragraphs').length > 0); // ter-clamp, tidak error
});

test('splitWords menangani camelCase', () => {
  assert.deepEqual(splitWords('helloWorld foo'), ['hello', 'World', 'foo']);
});
