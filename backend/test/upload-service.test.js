const { test } = require('node:test');
const assert = require('node:assert');
const { contentTypeForUrl, resolveMediaPath } = require('../src/services/upload-service');
const { mediaPath } = require('../environment-config');

test('maps every accepted image type to the right Content-Type', () => {
  assert.strictEqual(contentTypeForUrl('/walls/a/b/photo.jpg'), 'image/jpeg');
  assert.strictEqual(contentTypeForUrl('/walls/a/b/photo.JPEG'), 'image/jpeg');
  assert.strictEqual(contentTypeForUrl('/walls/a/b/pic.png'), 'image/png');
  assert.strictEqual(contentTypeForUrl('/walls/a/b/pic.webp'), 'image/webp'); // was octet-stream before
  assert.strictEqual(contentTypeForUrl('/walls/a/b/anim.gif'), 'image/gif');
});

test('maps every accepted video type', () => {
  assert.strictEqual(contentTypeForUrl('/x/clip.mp4'), 'video/mp4');
  assert.strictEqual(contentTypeForUrl('/x/clip.webm'), 'video/webm'); // was octet-stream before
  assert.strictEqual(contentTypeForUrl('/x/clip.mov'), 'video/quicktime');
});

test('unknown / extensionless falls back to octet-stream', () => {
  assert.strictEqual(contentTypeForUrl('/x/file.bin'), 'application/octet-stream');
  assert.strictEqual(contentTypeForUrl('/x/noext'), 'application/octet-stream');
});

test('resolveMediaPath prefixes a relative url with the media root', () => {
  assert.strictEqual(resolveMediaPath('/media-files/a/b.jpg'), `${mediaPath}/media-files/a/b.jpg`);
});

test('resolveMediaPath does NOT double-prefix an absolute url (the 404 bug)', () => {
  const absolute = `${mediaPath}/media-files/a/b.jpg`;
  assert.strictEqual(resolveMediaPath(absolute), absolute, 'absolute path served as-is');
});
