const assert = require('node:assert/strict');
const test = require('node:test');

const { NOTIFICATION_TYPES } = require('../src/domain/notifications/notification-rules');

const postServicePath = require.resolve('../src/services/post-service');
const postRepoPath = require.resolve('../src/repositories/post-repository');
const analyticsRepoPath = require.resolve('../src/repositories/analytics-repository');
const wallRepoPath = require.resolve('../src/repositories/wall-repository');
const notifyServicePath = require.resolve('../src/services/notification-event-service');

// Capture + configurable behaviour for the mocked dependencies.
let published = [];
let repo = {};

function fakeModule(path, exports) {
  require.cache[path] = { id: path, filename: path, loaded: true, exports };
}

function loadService() {
  published = [];
  delete require.cache[postServicePath];

  fakeModule(postRepoPath, {
    addPost: async (data) => { repo.lastAddPost = data; return { _id: 'p1', toObject: () => ({ _id: 'p1', ...data }) }; },
    reportPost: async () => ({ _id: 'r1' }),
    unreportPost: async () => ({ _id: 'r1' }),
    getOpenReportCount: async () => repo.openReportCount ?? 0,
    getPinnedCount: async () => repo.pinnedCount ?? 0,
    pinPost: async (postId, pinned) => ({ _id: postId, pinned }),
    deletePost: async (postId) => ({ _id: postId, wallId: 'wall-1' }),
    approvePost: async (postId) => ({ _id: postId, wallId: 'wall-1' }),
  });
  fakeModule(analyticsRepoPath, { incrementPost: async () => {} });
  fakeModule(wallRepoPath, {});
  fakeModule(notifyServicePath, {
    publishNotification: async (type, data) => { published.push({ type, data }); },
    publishNotificationRemoval: async () => {},
  });

  return require(postServicePath);
}

test.beforeEach(() => { repo = {}; });

test('createPost stores active status and publishes POST_ADDED when no approval needed', async () => {
  const service = loadService();
  const post = await service.createPost({ wallId: 'wall-1', authorEmail: 'a@x.com' }, { postConfig: { requireApproval: false } });

  assert.equal(repo.lastAddPost.status, 'active');
  assert.equal(post._id, 'p1');
  assert.deepEqual(published.map((p) => p.type), [NOTIFICATION_TYPES.POST_ADDED]);
});

test('createPost stores pending_approval and publishes POST_PENDING when approval required', async () => {
  const service = loadService();
  await service.createPost({ wallId: 'wall-1', authorEmail: 'a@x.com' }, { postConfig: { requireApproval: true } });

  assert.equal(repo.lastAddPost.status, 'pending_approval');
  assert.deepEqual(published.map((p) => p.type), [NOTIFICATION_TYPES.POST_PENDING]);
});

test('reportPost fires the threshold notification exactly once when the threshold is hit', async () => {
  const service = loadService();
  repo.openReportCount = 3; // threshold
  await service.reportPost('p1', 'wall-1', 'reporter@x.com', 'spam');

  assert.deepEqual(published.map((p) => p.type), [NOTIFICATION_TYPES.POST_REPORT_THRESHOLD]);
});

test('reportPost fires a normal POST_REPORTED below the threshold', async () => {
  const service = loadService();
  repo.openReportCount = 1;
  await service.reportPost('p1', 'wall-1', 'reporter@x.com', 'spam');

  assert.deepEqual(published.map((p) => p.type), [NOTIFICATION_TYPES.POST_REPORTED]);
});

test('reportPost does not re-fire the threshold notification once exceeded', async () => {
  const service = loadService();
  repo.openReportCount = 4; // already past threshold
  await service.reportPost('p1', 'wall-1', 'reporter@x.com', 'spam');

  assert.deepEqual(published, []);
});

test('pinPost rejects pinning beyond the per-wall maximum', async () => {
  const service = loadService();
  repo.pinnedCount = 3;
  await assert.rejects(() => service.pinPost('p1', 'wall-1', true), /pin at most/);
});

test('pinPost allows pinning when under the maximum', async () => {
  const service = loadService();
  repo.pinnedCount = 2;
  const result = await service.pinPost('p1', 'wall-1', true);
  assert.equal(result.pinned, true);
});
