const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { generateWebpVariants, variantPath, VARIANT_WIDTHS } = require('../src/utils/image-variants');

// libvips keeps input files briefly cached/open; on Windows that blocks rmdir.
sharp.cache(false);

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'imgv-'));
}

// Best-effort temp cleanup — OS file locks (Windows) shouldn't fail the test.
function safeRm(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* OS will reap temp */ }
}

test('generates a WebP variant per width for a large image', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'big.jpg');
  await sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 5, g: 5, b: 5 } } }).jpeg().toFile(file);

  const widths = await generateWebpVariants(file, 'image/jpeg');
  assert.deepStrictEqual(widths, VARIANT_WIDTHS);

  for (const w of VARIANT_WIDTHS) {
    const v = variantPath(file, w);
    assert.ok(fs.existsSync(v), `variant ${w} exists`);
    const meta = await sharp(v).metadata();
    assert.strictEqual(meta.format, 'webp');
    assert.ok(meta.width <= w, `variant ${w} not wider than its descriptor`);
  }
  safeRm(dir);
});

test('all widths are still emitted for a small source (no enlargement)', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'small.png');
  await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toFile(file);

  const widths = await generateWebpVariants(file, 'image/png');
  assert.deepStrictEqual(widths, VARIANT_WIDTHS, 'every variant file is created');
  for (const w of VARIANT_WIDTHS) {
    const meta = await sharp(variantPath(file, w)).metadata();
    assert.strictEqual(meta.width, 300, 'small source is not upscaled');
  }
  safeRm(dir);
});

test('skips gif/video — no variants produced', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'x.gif');
  fs.writeFileSync(file, 'not really a gif');
  assert.deepStrictEqual(await generateWebpVariants(file, 'image/gif'), []);
  assert.deepStrictEqual(await generateWebpVariants(file, 'video/mp4'), []);
  assert.ok(!fs.existsSync(variantPath(file, 480)), 'no variant written');
  safeRm(dir);
});
