const assert = require('node:assert/strict');
const test = require('node:test');

const boardRepositoryPath = require.resolve('../src/repositories/board-repository');
const postRepositoryPath = require.resolve('../src/repositories/post-repository');
const authPath = require.resolve('../src/middleware/auth');
const validationsPath = require.resolve('../src/middleware/post-validations');

let boardById = new Map();
let postById = new Map();

function loadMiddleware() {
  delete require.cache[validationsPath];
  require.cache[boardRepositoryPath] = {
    id: boardRepositoryPath,
    filename: boardRepositoryPath,
    loaded: true,
    exports: {
      getBoardById: async (boardId) => boardById.get(boardId) || null,
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
      getEmailAndBoardIdFromToken: (token) => ({ email: token, boardId: 'board-1' }),
    },
  };

  return require(validationsPath);
}

function makeRes() {
  return {
    code: undefined,
    body: undefined,
    status(code) {
      this.code = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

async function runMiddleware(middleware, req) {
  const res = makeRes();
  let nextCalled = false;
  await middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled, req };
}

function board(overrides = {}) {
  return {
    _id: 'board-1',
    ownerEmail: 'owner@example.com',
    maintainerEmails: [],
    anyoneCanView: false,
    anyoneCanPost: false,
    viewAccess: { emails: [], domains: [] },
    postAccess: { emails: [], domains: [] },
    receivers: [],
    isArchived: false,
    isOpen: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    openDate: null,
    closeDate: null,
    ...overrides,
  };
}

test.beforeEach(() => {
  boardById = new Map();
  postById = new Map();
});

test('authorizePostAction allows board owner to create a post', async () => {
  const { authorizePostAction } = loadMiddleware();
  boardById.set('board-1', board());

  const result = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { boardId: 'board-1' },
    headers: { authorization: 'Bearer owner@example.com' },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.userEmail, 'owner@example.com');
  assert.equal(result.req.board._id, 'board-1');
});

test('authorizePostAction passes loaded wall to validateBoard for post creation', async () => {
  const { authorizePostAction, validateBoard } = loadMiddleware();
  boardById.set('board-1', board());
  const req = {
    method: 'POST',
    params: { boardId: 'board-1' },
    headers: { authorization: 'Bearer owner@example.com' },
  };

  const authResult = await runMiddleware(authorizePostAction, req);
  const validateResult = await runMiddleware(validateBoard, req);

  assert.equal(authResult.nextCalled, true);
  assert.equal(validateResult.nextCalled, true);
});

test('validateBoard returns a wall not found error when no wall is attached', async () => {
  const { validateBoard } = loadMiddleware();

  const result = await runMiddleware(validateBoard, {});

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.code, 404);
  assert.equal(result.res.body.message, 'No wall found.');
});

test('authorizePostAction allows maintainer to create and delete posts', async () => {
  const { authorizePostAction } = loadMiddleware();
  boardById.set('board-1', board({ maintainerEmails: ['mod@example.com'] }));
  postById.set('post-1', { _id: 'post-1', email: 'guest@example.com' });

  const createResult = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { boardId: 'board-1' },
    headers: { authorization: 'Bearer mod@example.com' },
  });
  const deleteResult = await runMiddleware(authorizePostAction, {
    method: 'DELETE',
    params: { boardId: 'board-1', postId: 'post-1' },
    headers: { authorization: 'Bearer mod@example.com' },
  });

  assert.equal(createResult.nextCalled, true);
  assert.equal(deleteResult.nextCalled, true);
  assert.deepEqual(deleteResult.req.post, { _id: 'post-1', email: 'guest@example.com' });
});

test('authorizePostAction denies users with view-only access from posting', async () => {
  const { authorizePostAction } = loadMiddleware();
  boardById.set('board-1', board({ anyoneCanView: true }));

  const result = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { boardId: 'board-1' },
    headers: { authorization: 'Bearer viewer@example.com' },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.code, 403);
  assert.equal(result.res.body.message, 'User does not have access to this post');
});

test('authorizePostAction allows email and domain post access', async () => {
  const { authorizePostAction } = loadMiddleware();
  boardById.set('board-1', board({
    postAccess: {
      emails: ['writer@example.com'],
      domains: ['team.test'],
    },
  }));

  const emailResult = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { boardId: 'board-1' },
    headers: { authorization: 'Bearer writer@example.com' },
  });
  const domainResult = await runMiddleware(authorizePostAction, {
    method: 'POST',
    params: { boardId: 'board-1' },
    headers: { authorization: 'Bearer person@team.test' },
  });

  assert.equal(emailResult.nextCalled, true);
  assert.equal(domainResult.nextCalled, true);
});

test('authorizePostAction only lets a post author update their own post', async () => {
  const { authorizePostAction } = loadMiddleware();
  boardById.set('board-1', board());
  postById.set('post-1', { _id: 'post-1', email: 'guest@example.com' });

  const result = await runMiddleware(authorizePostAction, {
    method: 'PUT',
    params: { boardId: 'board-1', postId: 'post-1' },
    headers: { authorization: 'Bearer owner@example.com' },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.code, 403);
});

test('validateBoard allows open active boards and blocks archived or locked boards', async () => {
  const { validateBoard } = loadMiddleware();

  const open = await runMiddleware(validateBoard, { board: board() });
  const archived = await runMiddleware(validateBoard, { board: board({ isArchived: true }) });
  const locked = await runMiddleware(validateBoard, { board: board({ isOpen: false }) });

  assert.equal(open.nextCalled, true);
  assert.equal(archived.nextCalled, false);
  assert.equal(archived.res.code, 403);
  assert.equal(locked.nextCalled, false);
  assert.equal(locked.res.body.message, 'This moment is locked.');
});
