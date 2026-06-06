const assert = require('node:assert/strict');
const test = require('node:test');
const client = require('prom-client');

const {
  postsCreated,
  wallsCreated,
  notificationsDelivered,
  socketConnections,
} = require('../src/utils/metrics');

test('business metrics are registered and increment without throwing', async () => {
  assert.doesNotThrow(() => {
    postsCreated.inc();
    wallsCreated.inc();
    notificationsDelivered.inc();
    socketConnections.inc();
    socketConnections.dec();
  });

  const names = (await client.register.getMetricsAsJSON()).map((m) => m.name);
  for (const n of [
    'momenta_posts_created_total',
    'momenta_walls_created_total',
    'momenta_notifications_delivered_total',
    'momenta_socket_connections',
  ]) {
    assert.ok(names.includes(n), `${n} should be registered on the default registry`);
  }
});
