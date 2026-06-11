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
    createTransport: () => ({ sendMail: async (opts) => { sent.push(opts); return { messageId: 'x' }; } }),
  });
  fakeModule(mailRepoPath, {
    createJob: async (data) => {
      const job = { _id: `job-${created.length + 1}`, ...data };
      created.push(job);
      store.job = job;
      return job;
    },
    getSchedulesByWallIdAndType: async () => store.existing ?? null,
    getJobById: async (id) => (store.job && String(store.job._id) === String(id) ? store.job : null),
    cancelByWallId: async () => { store.cancelled = true; },
    removeRecipient: async () => {},
    markSent: async (id) => { store.sentJobId = id; },
    markFailed: async (id, err) => { store.failed = { id, err }; },
    getPendingScheduledAfter: async () => [],
    markPastDuePendingAsFailed: async () => {},
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

test('SCHEDULE creates ONE job holding every recipient (not one per recipient)', async () => {
  const svc = loadService();
  const future = new Date(Date.now() + 60 * 60 * 1000);

  await svc.scheduleEmail({
    type: 'SCHEDULE',
    primary: ['a@x.com', 'b@x.com', 'c@x.com'],
    cc: [],
    subject: 'Birthday',
    wallId: 'wall-1',
    scheduledDate: future,
    template: 'scheduledDelivery',
    templateData: { creatorName: 'Owner', wallName: 'Birthday' },
  });
  svc.clearAllTimers();

  assert.equal(created.length, 1, 'exactly one job created');
  assert.deepEqual(created[0].recipients.primary, ['a@x.com', 'b@x.com', 'c@x.com']);
  assert.equal(created[0].template, 'scheduledDelivery');
  assert.equal(created[0].subject, 'Birthday');
});

test('delivery renders a unique per-recipient email and marks the job sent', async () => {
  const svc = loadService();
  const future = new Date(Date.now() + 60 * 60 * 1000);

  await svc.scheduleEmail({
    type: 'SCHEDULE',
    primary: ['a@x.com', 'b@x.com', 'c@x.com'],
    cc: ['owner@x.com'],
    subject: 'Birthday',
    wallId: 'wall-1',
    scheduledDate: future,
    template: 'scheduledDelivery',
    templateData: { creatorName: 'Owner', wallName: 'Birthday' },
  });
  svc.clearAllTimers();

  await svc._deliverScheduledJob(store.job._id);

  assert.equal(sent.length, 3, 'one email per recipient');
  assert.deepEqual(sent.map((m) => m.to), ['a@x.com', 'b@x.com', 'c@x.com']);
  // Each carries its own unique token rendered from the template.
  assert.ok(sent[0].html.includes('token-a@x.com'));
  assert.ok(sent[1].html.includes('token-b@x.com'));
  assert.ok(sent[2].html.includes('token-c@x.com'));
  assert.equal(store.sentJobId, store.job._id, 'job marked sent once');
});

test('a cancelled job does not deliver', async () => {
  const svc = loadService();
  const future = new Date(Date.now() + 60 * 60 * 1000);
  await svc.scheduleEmail({
    type: 'SCHEDULE', primary: ['a@x.com'], cc: [], subject: 'T', wallId: 'w',
    scheduledDate: future, template: 'scheduledDelivery', templateData: {},
  });
  svc.clearAllTimers();
  store.job.status = 'cancelled';

  await svc._deliverScheduledJob(store.job._id);
  assert.equal(sent.length, 0, 'nothing sent for a cancelled job');
});

test('getScheduledByWallId returns all recipients', async () => {
  const svc = loadService();
  store.existing = { recipients: { primary: ['a@x.com', 'b@x.com'], cc: [] }, scheduledAt: new Date() };
  const result = await svc.getScheduledByWallId('wall-1');
  assert.deepEqual(result.recipients.primary, ['a@x.com', 'b@x.com']);
});
