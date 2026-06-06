const assert = require('node:assert/strict');
const test = require('node:test');

const { safeName, isValidId } = require('../src/config/upload-config');

test('safeName strips directory traversal to a bare filename', () => {
  assert.equal(safeName('../../etc/passwd'), 'passwd');
  assert.equal(safeName('/var/www/shell.php'), 'shell.php');
});

test('safeName replaces unsafe characters and neutralises dot-only names', () => {
  assert.equal(safeName('a b!@#.png'), 'a_b___.png');
  assert.equal(safeName('..'), 'file');
  assert.equal(safeName('photo_01.jpg'), 'photo_01.jpg');
});

test('isValidId accepts real ObjectIds and rejects traversal/garbage', () => {
  assert.equal(isValidId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidId('../../wall'), false);
  assert.equal(isValidId('not-an-id'), false);
  assert.equal(isValidId(''), false);
});
