const { test } = require('node:test');
const assert = require('node:assert');
const { openapiSpec } = require('../src/config/openapi');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']);

test('spec declares OpenAPI 3.0.x with info + servers', () => {
  assert.match(openapiSpec.openapi, /^3\.0\.\d+$/);
  assert.ok(openapiSpec.info.title && openapiSpec.info.version);
  assert.ok(Array.isArray(openapiSpec.servers) && openapiSpec.servers.length > 0);
});

test('every path has at least one valid HTTP operation with a summary', () => {
  const paths = Object.entries(openapiSpec.paths);
  assert.ok(paths.length >= 30, `expected the full API surface, got ${paths.length} paths`);

  for (const [route, ops] of paths) {
    const methods = Object.keys(ops).filter((m) => HTTP_METHODS.has(m));
    assert.ok(methods.length > 0, `${route} has no HTTP operation`);
    for (const m of methods) {
      assert.ok(ops[m].summary, `${m.toUpperCase()} ${route} missing summary`);
      assert.ok(ops[m].responses && Object.keys(ops[m].responses).length > 0, `${m.toUpperCase()} ${route} missing responses`);
    }
  }
});

test('bearerAuth security scheme is defined and used', () => {
  assert.deepStrictEqual(openapiSpec.components.securitySchemes.bearerAuth, {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });
  const usesSecurity = Object.values(openapiSpec.paths).some((ops) =>
    Object.values(ops).some((op) => Array.isArray(op.security))
  );
  assert.ok(usesSecurity, 'at least one operation should require bearerAuth');
});
