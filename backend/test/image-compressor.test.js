const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { compressImageInPlace, MAX_DIMENSION } = require('../src/utils/image-compressor');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'imgc-'));
}

test('downscales an oversized jpeg within MAX_DIMENSION and keeps it readable', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'big.jpg');
  await sharp({
    create: { width: 4000, height: 3000, channels: 3, background: { r: 10, g: 20, b: 30 } },
  }).jpeg().toFile(file);

  const before = fs.statSync(file).size;
  const did = await compressImageInPlace(file, 'image/jpeg');

  assert.strictEqual(did, true, 'should report it compressed');
  const meta = await sharp(file).metadata();
  assert.ok(meta.width <= MAX_DIMENSION && meta.height <= MAX_DIMENSION, 'within max dimension');
  assert.ok(fs.statSync(file).size <= before, 'not larger than original');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('does not enlarge an already-small image', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'small.png');
  await sharp({
    create: { width: 200, height: 150, channels: 3, background: { r: 1, g: 2, b: 3 } },
  }).png().toFile(file);

  const did = await compressImageInPlace(file, 'image/png');
  assert.strictEqual(did, true);
  const meta = await sharp(file).metadata();
  assert.strictEqual(meta.width, 200, 'width unchanged (no upscaling)');
  assert.strictEqual(meta.height, 150, 'height unchanged (no upscaling)');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('skips non-compressible types (gif/video) and leaves the file untouched', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'x.gif');
  fs.writeFileSync(file, 'pretend gif bytes');
  const before = fs.readFileSync(file);

  const gif = await compressImageInPlace(file, 'image/gif');
  const mp4 = await compressImageInPlace(file, 'video/mp4');

  assert.strictEqual(gif, false);
  assert.strictEqual(mp4, false);
  assert.deepStrictEqual(fs.readFileSync(file), before, 'file bytes unchanged');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('never throws on a corrupt image — returns false and keeps original', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'corrupt.jpg');
  fs.writeFileSync(file, 'this is not a real jpeg');
  const before = fs.readFileSync(file);

  const did = await compressImageInPlace(file, 'image/jpeg');
  assert.strictEqual(did, false, 'reports skipped on failure');
  assert.deepStrictEqual(fs.readFileSync(file), before, 'original left intact');
  assert.ok(!fs.existsSync(`${file}.tmp`), 'temp file cleaned up');

  fs.rmSync(dir, { recursive: true, force: true });
});
