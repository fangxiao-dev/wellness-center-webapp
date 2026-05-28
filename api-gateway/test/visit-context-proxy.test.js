const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../src/server");

test("gateway exposes health endpoint", async () => {
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.service, "api-gateway");
  } finally {
    server.close();
  }
});
