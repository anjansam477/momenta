const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const harness = require('./harness'); // MUST be first — injects ioredis-mock

// App modules loaded AFTER the harness so they pick up the mock Redis client.
const wallRepository = require('../../src/repositories/wall-repository');
const { client } = require('../../src/utils/redis');
const WallMember = require('../../src/models/wall-members');

before(async () => { await harness.start(); });
after(async () => { await harness.stop(); });
beforeEach(async () => { await harness.clear(); await client.flushall(); });

function wallData(overrides = {}) {
  return { title: 'Birthday Bash', ownerEmail: 'owner@acme.com', type: 'birthday', ...overrides };
}

test('createWall persists the wall, an owner membership, and a slug', async () => {
  const wall = await wallRepository.createWall(wallData());

  assert.ok(wall._id, 'wall has an id');
  assert.strictEqual(wall.ownerEmail, 'owner@acme.com');
  assert.ok(wall.slug && wall.slug.length > 0, 'slug generated');

  const fetched = await wallRepository.getWallById(wall._id);
  assert.strictEqual(fetched.title, 'Birthday Bash');

  const members = await WallMember.find({ wallId: wall._id });
  assert.strictEqual(members.length, 1);
  assert.strictEqual(members[0].role, 'owner');
});

test('getUserRole returns the owner role, null for a stranger', async () => {
  const wall = await wallRepository.createWall(wallData());
  assert.strictEqual(await wallRepository.getUserRole(wall._id, 'owner@acme.com'), 'owner');
  assert.strictEqual(await wallRepository.getUserRole(wall._id, 'stranger@x.com'), null);
});

test('hasAccess: owner yes, stranger no on a private wall', async () => {
  const wall = await wallRepository.createWall(wallData());
  assert.strictEqual(await wallRepository.hasAccess(wall._id, 'owner@acme.com'), true);
  assert.strictEqual(await wallRepository.hasAccess(wall._id, 'stranger@x.com'), false);
});

test('hasAccess: anyoneCanView grants access to anybody', async () => {
  const wall = await wallRepository.createWall(wallData({ anyoneCanView: true }));
  assert.strictEqual(await wallRepository.hasAccess(wall._id, 'stranger@x.com'), true);
});

test('hasAccess: a domain-level member grants access to that whole domain', async () => {
  const wall = await wallRepository.createWall(wallData());
  await wallRepository.setMembers(wall._id, ['ignored@acme.com'], 'viewer', 'owner@acme.com', 'team.com');
  // member row carries domain "team.com" → anyone @team.com gets in
  assert.strictEqual(await wallRepository.hasAccess(wall._id, 'someone@team.com'), true);
  assert.strictEqual(await wallRepository.hasAccess(wall._id, 'someone@other.com'), false);
});

test('archiveWall flips status to archived', async () => {
  const wall = await wallRepository.createWall(wallData());
  const archived = await wallRepository.archiveWall(wall._id);
  assert.strictEqual(archived.status, 'archived');
});
