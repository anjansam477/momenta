const { AsyncLocalStorage } = require("async_hooks");

// Per-request context propagated through the async call chain. Lets the logger
// stamp every line with the request's correlation id without threading `req`
// through every service/repository.
const als = new AsyncLocalStorage();

function runWithContext(context, fn) {
  return als.run(context, fn);
}

function getContext() {
  return als.getStore();
}

function getRequestId() {
  const store = als.getStore();
  return store ? store.requestId : undefined;
}

module.exports = { als, runWithContext, getContext, getRequestId };
