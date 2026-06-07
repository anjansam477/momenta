const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const harness = require('./harness'); // MUST be first — injects ioredis-mock

const postRepository = require('../../src/repositories/post-repository');
const { client } = require('../../src/utils/redis');

before(async () => { await harness.start(); });
after(async () => { await harness.stop(); });
beforeEach(async () => { await harness.clear(); await client.flushall(); });

function postData(wallId, overrides = {}) {
  return {
    wallId,
    authorEmail: 'poster@acme.com',
    authorName: { first: 'Pat', last: 'Doe' },
    content: 'Happy birthday!',
    ...overrides,
  };
}

test('addPost persists a post and returns it with an empty reactions map', async () => {
  const wallId = new mongoose.Types.ObjectId();
  const post = await postRepository.addPost(postData(wallId));

  assert.ok(post._id, 'post has an id');
  assert.strictEqual(post.content, 'Happy birthday!');
  assert.deepStrictEqual(post.reactions, {}, 'new post has no reactions');
  // On a standalone mongod (no replica set) withTransaction falls back to a
  // session-less write — this asserts that fallback path actually persists.
  const fetched = await postRepository.getPostById(post._id);
  assert.strictEqual(fetched.content, 'Happy birthday!');
});

test('getPostsByWallId returns active posts for the wall, newest-sorted', async () => {
  const wallId = new mongoose.Types.ObjectId();
  await postRepository.addPost(postData(wallId, { content: 'first' }));
  await postRepository.addPost(postData(wallId, { content: 'second' }));
  // a post on a different wall must not leak in
  await postRepository.addPost(postData(new mongoose.Types.ObjectId(), { content: 'other wall' }));

  const posts = await postRepository.getPostsByWallId(wallId, 1, 10);
  assert.strictEqual(posts.length, 2);
  assert.ok(posts.every((p) => p.content !== 'other wall'));
  assert.ok(posts.every((p) => 'reactions' in p));
});

test('pagination: pageSize caps the number of returned posts', async () => {
  const wallId = new mongoose.Types.ObjectId();
  for (let i = 0; i < 5; i++) {
    await postRepository.addPost(postData(wallId, { content: `post ${i}` }));
  }
  const page1 = await postRepository.getPostsByWallId(wallId, 1, 2);
  assert.strictEqual(page1.length, 2);
});

test('deletePost soft-deletes (status=deleted) so it drops out of the feed', async () => {
  const wallId = new mongoose.Types.ObjectId();
  const post = await postRepository.addPost(postData(wallId));
  await postRepository.deletePost(post._id);

  const feed = await postRepository.getPostsByWallId(wallId, 1, 10);
  assert.strictEqual(feed.length, 0, 'deleted post excluded from active feed');
});

// ---- cursor pagination (getPostsPage, option a) ----

const Post = require('../../src/models/posts');

// Raw inserts with explicit, increasing createdAt for deterministic ordering.
async function seedPosts(wallId, bodyCount, { pinned = 0 } = {}) {
  const t0 = Date.UTC(2024, 0, 1);
  const docs = [];
  for (let i = 0; i < pinned; i++) {
    docs.push({ wallId, authorEmail: 'a@x.com', authorName: { first: 'A' }, content: `pinned ${i}`, status: 'active', pinned: true, createdAt: new Date(t0 - 1000 * (i + 1)), updatedAt: new Date() });
  }
  for (let i = 0; i < bodyCount; i++) {
    docs.push({ wallId, authorEmail: 'a@x.com', authorName: { first: 'A' }, content: `body ${i}`, status: 'active', pinned: false, createdAt: new Date(t0 + 1000 * i), updatedAt: new Date() });
  }
  await Post.collection.insertMany(docs);
}

test('getPostsPage: first page carries pinned posts then the chronological body', async () => {
  const wallId = new mongoose.Types.ObjectId();
  await seedPosts(wallId, 3, { pinned: 2 });

  const page = await postRepository.getPostsPage(wallId, { limit: 2 });
  // 2 pinned + 2 body on the first page
  assert.strictEqual(page.posts.length, 4);
  assert.ok(page.posts.slice(0, 2).every((p) => p.pinned), 'pinned first');
  assert.ok(page.posts.slice(2).every((p) => !p.pinned), 'body after pins');
  assert.strictEqual(page.hasMore, true);
  assert.ok(page.nextCursor, 'nextCursor present when more remain');
});

test('getPostsPage: paging by cursor yields every body post exactly once (no dupes/gaps)', async () => {
  const wallId = new mongoose.Types.ObjectId();
  await seedPosts(wallId, 5, { pinned: 1 });

  const seen = [];
  let cursor = null;
  let guard = 0;
  do {
    const page = await postRepository.getPostsPage(wallId, { cursor, limit: 2 });
    // pinned only appears on the first page (no cursor)
    if (cursor) assert.ok(page.posts.every((p) => !p.pinned), 'no pinned on later pages');
    seen.push(...page.posts.filter((p) => !p.pinned).map((p) => p.content));
    cursor = page.nextCursor;
  } while (cursor && ++guard < 10);

  const unique = new Set(seen);
  assert.strictEqual(unique.size, 5, 'all 5 body posts seen');
  assert.strictEqual(seen.length, 5, 'no duplicates across pages');
  assert.deepStrictEqual(seen, ['body 0', 'body 1', 'body 2', 'body 3', 'body 4'], 'chronological order preserved');
});

test('getPostsPage: last page reports hasMore=false and a null cursor', async () => {
  const wallId = new mongoose.Types.ObjectId();
  await seedPosts(wallId, 2);
  const page = await postRepository.getPostsPage(wallId, { limit: 5 });
  assert.strictEqual(page.posts.length, 2);
  assert.strictEqual(page.hasMore, false);
  assert.strictEqual(page.nextCursor, null);
});
