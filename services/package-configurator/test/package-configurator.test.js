const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../src/server");

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const port = server.address().port;
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await response.json()
          : await response.text();
        resolve({ status: response.status, payload });
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

test("health endpoint identifies package configurator", async () => {
  const response = await request("GET", "/health");
  assert.equal(response.status, 200);
  assert.equal(response.payload.ok, true);
  assert.equal(response.payload.service, "package-configurator");
});

test("calculate rejects missing package", async () => {
  const response = await request("POST", "/configuration/calculate", {
    duration: "60",
    intensity: "medium",
    addOns: ["hot-stone"],
  });
  assert.equal(response.status, 400);
  assert.match(response.payload.error, /package/i);
});
