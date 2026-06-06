const assert = require('node:assert/strict');
const test = require('node:test');

const { NOTIFICATION_TYPES } = require('../src/domain/notifications/notification-rules');

const wallServicePath = require.resolve('../src/services/wall-service');
const wallRepoPath = require.resolve('../src/repositories/wall-repository');
const analyticsRepoPath = require.resolve('../src/repositories/analytics-repository');
const postRepoPath = require.resolve('../src/repositories/post-repository');
const interactionRepoPath = require.resolve('../src/repositories/interaction-repository');
const notifyServicePath = require.resolve('../src/services/notification-event-service');

let published = [];
let repo = {};

function fakeModule(path, exports) {
  require.cache[path] = { id: path, filename: path, loaded: true, exports };
}

function loadService() {
  published = [];
  delete require.cache[wallServicePath];

  fakeModule(wallRepoPath, {
    createWall: async (data) => ({ _id: 'wall-1', ...data }),
    archiveWall: async (wallId) => { repo.archived = wallId; return { _id: wallId, status: 'archived' }; },
  });
  fakeModule(analyticsRepoPath, { incrementView: async () => {} });
  fakeModule(postRepoPath, {});
  fakeModule(interactionRepoPath, {});
  fakeModule(notifyServicePath, {
    publishNotification: async (type, data) => { published.push({ type, data }); },
    publishNotificationRemoval: async () => {},
  });

  return require(wallServicePath);
}

test.beforeEach(() => { repo = {}; });

test('deleteWall soft-archives the wall and publishes WALL_ARCHIVED', async () => {
  const service = loadService();
  const result = await service.deleteWall('wall-1', 'owner@x.com');

  assert.equal(repo.archived, 'wall-1');
  assert.equal(result.status, 'archived');
  assert.deepEqual(published.map((p) => p.type), [NOTIFICATION_TYPES.WALL_ARCHIVED]);
});

test('createWall delegates to the repository', async () => {
  const service = loadService();
  const wall = await service.createWall({ title: 'Birthday' });
  assert.equal(wall._id, 'wall-1');
  assert.equal(wall.title, 'Birthday');
});
