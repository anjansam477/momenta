const assert = require('node:assert/strict');
const test = require('node:test');

const mailServicePath = require.resolve('../src/services/mail-service');
const mailRepoPath = require.resolve('../src/repositories/mail-repository');
const authPath = require.resolve('../src/middleware/auth');
const templatesPath = require.resolve('../src/templates/email-templates');
const envPath = require.resolve('../environment-config');
const nodemailerPath = require.resolve('nodemailer');

let sent = [];      // captured sendMail calls
let created = [];   // captured createJob calls
let store = {};     // tunable repo behaviour

function fakeModule(path, exports) {
  require.cache[path] = { id: path, filename: path, loaded: true, exports };
}

function loadService() {
  sent = [];
  created = [];
  store = {};
  delete require.cache[mailServicePath];

  fakeModule(nodemailerPath, {
    createTransport: () => ({
      sendMail: async (opts) => {
        if (store.failSend) throw new Error('smtp down');
        sent.push(opts);
        return { messageId: 'x' };
      },
    }),
  });
  fakeModule(mailRepoPath, {
    createJob: async (data) => {
      const job = { _id: `job-${created.length + 1}`, ...data };
      created.push(job);
      store.job = job;
      return job;
    },
    getSchedulesByWallIdAndType: async () => store.existing ?? null,
    claimDueJob: async () => {
      const j = store.due && store.due.length ? store.due.shift() : null;
      return j || null;
    },
    cancelByWallId: async () => { store.cancelled = true; },
    removeRecipient: async () => {},
    markSent: async (id) => { store.sentJobId = id; },
    markFailed: async (id, err) => { store.failed = { id, err }; },
    requeueJob: async (id) => { store.requeued = id; },
  });
  fakeModule(authPath, { generateTokenForReceiver: (email) => `token-${email}` });
  fakeModule(templatesPath, {
    emailTemplates: {
      scheduledDelivery: ({ creatorName, token }) => `<p>${creatorName} sent you a moment. ${token}</p>`,
    },
  });
  fakeModule(envPath, { SERVICE_BASE_URL: 'http://svc' });

  return require(mailServicePath);
}

function scheduleArgs() {
  return {
    type: 'SCHEDULE',
    primary: ['a@x.com', 'b@x.com', 'c@x.com'],
    cc: ['owner@x.com'],
    subject: 'Birthday',
    wallId: 'wall-1',
    scheduledDate: new Date(Date.now() + 60 * 60 * 1000),
    template: 'scheduledDelivery',
    templateData: { creatorName: 'Owner', wallName: 'Birthday' },
  };
}

test('SCHEDULE persists ONE job with every recipient and arms no timer', async () => {
  const svc = loadService();
  await svc.scheduleEmail(scheduleArgs());

  assert.equal(created.length, 1, 'exactly one job created');
  assert.deepEqual(created[0].recipients.primary, ['a@x.com', 'b@x.com', 'c@x.com']);
  assert.equal(created[0].status, 'pending');
  assert.equal(sent.length, 0, 'nothing sent at schedule time');
});

test('the poller claims a due job and delivers a unique email per recipient', async () => {
  const svc = loadService();
  await svc.scheduleEmail(scheduleArgs());
  // Make the created job "due" for the next claim.
  store.due = [store.job];

  await svc._processDueJobs();

  assert.equal(sent.length, 3, 'one email per recipient');
  assert.deepEqual(sent.map((m) => m.to), ['a@x.com', 'b@x.com', 'c@x.com']);
  assert.ok(sent[0].html.includes('token-a@x.com'));
  assert.ok(sent[2].html.includes('token-c@x.com'));
  assert.equal(store.sentJobId, store.job._id, 'job marked sent');
});

test('nothing is delivered when no job is due', async () => {
  const svc = loadService();
  store.due = [];
  await svc._processDueJobs();
  assert.equal(sent.length, 0);
});

test('a failed send with retries left is requeued, not failed', async () => {
  const svc = loadService();
  store.failSend = true;
  await svc._deliverClaimedJob({
    _id: 'job-1', wallId: 'w', subject: 'T', template: 'scheduledDelivery',
    templateData: {}, recipients: { primary: ['a@x.com'], cc: [] }, retryCount: 0, maxRetries: 3,
  });
  assert.equal(store.requeued, 'job-1', 'requeued for another attempt');
  assert.equal(store.failed, undefined, 'not marked failed yet');
});

test('a failed send with no retries left is marked failed', async () => {
  const svc = loadService();
  store.failSend = true;
  await svc._deliverClaimedJob({
    _id: 'job-9', wallId: 'w', subject: 'T', template: 'scheduledDelivery',
    templateData: {}, recipients: { primary: ['a@x.com'], cc: [] }, retryCount: 2, maxRetries: 3,
  });
  assert.equal(store.failed?.id, 'job-9');
  assert.equal(store.requeued, undefined);
});

test('getScheduledByWallId returns all recipients', async () => {
  const svc = loadService();
  store.existing = { recipients: { primary: ['a@x.com', 'b@x.com'], cc: [] }, scheduledAt: new Date() };
  const result = await svc.getScheduledByWallId('wall-1');
  assert.deepEqual(result.recipients.primary, ['a@x.com', 'b@x.com']);
});
