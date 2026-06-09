const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

const frontendServerPath = path.resolve(__dirname, "..", "src", "server.js");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function startFrontend(backendUrl) {
  const originalBackendUrl = process.env.WEB_BACKEND_URL;
  process.env.WEB_BACKEND_URL = backendUrl;
  delete require.cache[frontendServerPath];
  const app = require(frontendServerPath);
  const server = http.createServer(app);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    async stop() {
      if (originalBackendUrl === undefined) {
        delete process.env.WEB_BACKEND_URL;
      } else {
        process.env.WEB_BACKEND_URL = originalBackendUrl;
      }
      await closeServer(server);
    },
  };
}

test("health identifies the web frontend", async () => {
  const backend = http.createServer((_req, res) => res.end("backend"));
  let frontend;

  try {
    const backendPort = await listen(backend);
    frontend = await startFrontend(`http://127.0.0.1:${backendPort}`);
    const response = await fetch(`${frontend.baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true, service: "web-frontend" });
  } finally {
    if (frontend) await frontend.stop();
    await closeServer(backend);
  }
});

test("serves static assets locally and proxies dynamic requests to backend", async () => {
  const proxiedRequests = [];
  const backend = http.createServer((req, res) => {
    proxiedRequests.push({
      method: req.method,
      url: req.url,
      cookie: req.headers.cookie,
      contentType: req.headers["content-type"],
    });
    res.setHeader("content-type", "text/plain");
    res.setHeader("set-cookie", "sessionId=abc; Path=/; HttpOnly");
    res.end("proxied");
  });
  const backendPort = await listen(backend);
  const frontend = await startFrontend(`http://127.0.0.1:${backendPort}`);

  try {
    const staticResponse = await fetch(`${frontend.baseUrl}/static/styles.css`);
    assert.equal(staticResponse.status, 200);
    assert.match(await staticResponse.text(), /:root/);

    const proxyResponse = await fetch(`${frontend.baseUrl}/aftercare-shop?x=1`, {
      method: "POST",
      headers: {
        cookie: "client=1",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ok: true }),
    });

    assert.equal(proxyResponse.status, 200);
    assert.equal(await proxyResponse.text(), "proxied");
    assert.equal(proxyResponse.headers.get("set-cookie"), "sessionId=abc; Path=/; HttpOnly");
    assert.deepEqual(proxiedRequests, [
      {
        method: "POST",
        url: "/aftercare-shop?x=1",
        cookie: "client=1",
        contentType: "application/json",
      },
    ]);
  } finally {
    await frontend.stop();
    await closeServer(backend);
  }
});
