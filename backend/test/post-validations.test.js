const assert = require('node:assert/strict');
const test = require('node:test');

const wallRepositoryPath = require.resolve('../src/repositories/wall-repository');
const postRepositoryPath = require.resolve('../src/repositories/post-repository');
const authPath = require.resolve('../src/middleware/auth');
const validationsPath = require.resolve('../src/middleware/post-validations');

let wallById = new Map();
let postById = new Map();
let roleByEmail = new Map(); // email -> role for the wall under test

function loadMiddleware() {
  delete require.cache[validationsPath];
  require.cache[wallRepositoryPath] = {
    id: wallRepositoryPath,
    filename: wallRepositoryPath,
    loaded: true,
    exports: {
      getWallById: async (wallId) => wallById.get(wallId) || null,
      getUserRole: async (_wallId, email) => roleByEmail.get(email) || null,
      hasAccess: async (_wallId, email) => roleByEmail.has(email),
    },
  };
  require.cache[postRepositoryPath] = {
    id: postRepositoryPath,
    filename: postRepositoryPath,
    loaded: true,
    exports: {
      getPostById: async (postId) => postById.get(postId) || null,
    },
  };
  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      getEmailFromToken: (token) => token,
      getEmailAndWallIdFromToken: (token) => ({ email: token, wallId: 'wall-1' }),
    },
  };

  return require(validationsPath);
}

function makeRes() {
  return {
    code: undefined,
    body: undefined,
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

async function runMiddleware(middleware, req) {
  const res = makeRes();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled, req };
}

function wall(overrides = {}) {
  return {
    _id: 'wall-1',
    ownerEmail: 'owner@example.com',
    anyoneCanView: false,
    anyoneCanPost: false,
    status: 'active',
    ...overrides,
  };
}

function bearer(email) {
  return { authorization: `Bearer ${email}` };
}

test.beforeEach(() => {
  wallById = new Map();
  postById = new Map();
  roleByEmail = new Map();
});

test('authorizePostAction allows the wall owner to create a post', async () => {
  const { authorizePostAction } = loadMiddleware();
  wallById.set('wall-1', wall());
  roleByEmail.set('owner@example.com', 'owner');

  const result = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { wallId: 'wall-1' },
    headers: bearer('owner@example.com'),
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.email, 'owner@example.com');
  assert.equal(result.req.wall._id, 'wall-1');
  assert.equal(result.req.role, 'owner');
});

test('authorizePostAction allows a poster-role member to create a post', async () => {
  const { authorizePostAction } = loadMiddleware();
  wallById.set('wall-1', wall());
  roleByEmail.set('writer@example.com', 'poster');

  const result = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { wallId: 'wall-1' },
    headers: bearer('writer@example.com'),
  });

  assert.equal(result.nextCalled, true);
});

test('authorizePostAction allows posting when anyoneCanPost is enabled', async () => {
  const { authorizePostAction } = loadMiddleware();
  wallById.set('wall-1', wall({ anyoneCanPost: true }));
  // no role for this user

  const result = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { wallId: 'wall-1' },
    headers: bearer('stranger@example.com'),
  });

  assert.equal(result.nextCalled, true);
});

test('authorizePostAction denies view-only users from posting', async () => {
  const { authorizePostAction } = loadMiddleware();
  wallById.set('wall-1', wall());
  roleByEmail.set('viewer@example.com', 'viewer');

  const result = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { wallId: 'wall-1' },
    headers: bearer('viewer@example.com'),
  });

  assert.equal(result.nextCalled, false);
  assert.ok(result.res.code >= 400, 'should respond with a client error');
});

test('authorizePostAction lets a maintainer delete another user\'s post', async () => {
  const { authorizePostAction } = loadMiddleware();
  wallById.set('wall-1', wall());
  roleByEmail.set('mod@example.com', 'maintainer');
  postById.set('post-1', { _id: 'post-1', authorEmail: 'guest@example.com' });

  const result = await runMiddleware(authorizePostAction, {
    method: 'DELETE',
    params: { wallId: 'wall-1', postId: 'post-1' },
    headers: bearer('mod@example.com'),
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.post._id, 'post-1');
});

test('authorizePostAction only lets the author update their own post', async () => {
  const { authorizePostAction } = loadMiddleware();
  wallById.set('wall-1', wall());
  roleByEmail.set('mod@example.com', 'maintainer');
  postById.set('post-1', { _id: 'post-1', authorEmail: 'guest@example.com' });

  const result = await runMiddleware(authorizePostAction, {
    method: 'PUT',
    params: { wallId: 'wall-1', postId: 'post-1' },
    headers: bearer('mod@example.com'),
  });

  assert.equal(result.nextCalled, false);
  assert.ok(result.res.code >= 400);
});

test('validateWall blocks when no wall is attached to the request', async () => {
  const { validateWall } = loadMiddleware();

  const result = await runMiddleware(validateWall, {});

  assert.equal(result.nextCalled, false);
  assert.ok(result.res.code >= 400);
});

test('validateWall allows active walls and blocks archived or locked walls', async () => {
  const { validateWall } = loadMiddleware();

  const open = await runMiddleware(validateWall, { wall: wall() });
  const archived = await runMiddleware(validateWall, { wall: wall({ status: 'archived' }) });
  const locked = await runMiddleware(validateWall, { wall: wall({ status: 'locked' }) });

  assert.equal(open.nextCalled, true);
  assert.equal(archived.nextCalled, false);
  assert.ok(archived.res.code >= 400);
  assert.equal(locked.nextCalled, false);
  assert.equal(locked.res.body.message, 'This moment is locked.');
});
