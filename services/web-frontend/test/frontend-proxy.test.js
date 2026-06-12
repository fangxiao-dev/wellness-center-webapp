const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
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

async function getUnusedPort() {
  const server = net.createServer();
  const port = await listen(server);
  await closeServer(server);
  return port;
}

async function startFrontend(backendUrl, options = {}) {
  const originalBackendUrl = process.env.WEB_BACKEND_URL;
  const originalMinioEndpoint = process.env.MINIO_ENDPOINT;
  const originalMinioPort = process.env.MINIO_PORT;
  const originalMinioBucket = process.env.MINIO_BUCKET;

  process.env.WEB_BACKEND_URL = backendUrl;
  if (options.minioEndpoint) process.env.MINIO_ENDPOINT = options.minioEndpoint;
  if (options.minioPort) process.env.MINIO_PORT = String(options.minioPort);
  if (options.minioBucket) process.env.MINIO_BUCKET = options.minioBucket;

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
      if (originalMinioEndpoint === undefined) {
        delete process.env.MINIO_ENDPOINT;
      } else {
        process.env.MINIO_ENDPOINT = originalMinioEndpoint;
      }
      if (originalMinioPort === undefined) {
        delete process.env.MINIO_PORT;
      } else {
        process.env.MINIO_PORT = originalMinioPort;
      }
      if (originalMinioBucket === undefined) {
        delete process.env.MINIO_BUCKET;
      } else {
        process.env.MINIO_BUCKET = originalMinioBucket;
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
    const staticResponse = await fetch(`${frontend.baseUrl}/static/ci/wellness-ci.css`);
    assert.equal(staticResponse.status, 200);
    assert.match(await staticResponse.text(), /:root/);

    const appScriptResponse = await fetch(`${frontend.baseUrl}/static/app.js`);
    assert.equal(appScriptResponse.status, 200);
    assert.match(await appScriptResponse.text(), /initVisitContext/);

    const staticVideoResponse = await fetch(`${frontend.baseUrl}/static/images/home-video.mp4`, {
      method: "HEAD",
    });
    assert.equal(staticVideoResponse.status, 404);
    const encodedStaticVideoResponse = await fetch(`${frontend.baseUrl}/static/images/home-video%2Emp4`, {
      method: "HEAD",
    });
    assert.equal(encodedStaticVideoResponse.status, 404);
    const encodedExtensionResponse = await fetch(`${frontend.baseUrl}/static/images/home-video.mp%34`, {
      method: "HEAD",
    });
    assert.equal(encodedExtensionResponse.status, 404);

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

test("proxies homepage mp4 requests to the MinIO home object and preserves media headers", async () => {
  const backendRequests = [];
  const backend = http.createServer((req, res) => {
    backendRequests.push(req.url);
    res.end("backend");
  });
  const minioRequests = [];
  const minio = http.createServer((req, res) => {
    minioRequests.push({
      method: req.method,
      url: req.url,
      range: req.headers.range,
    });
    res.statusCode = 206;
    res.setHeader("content-type", "video/mp4");
    res.setHeader("content-range", "bytes 0-3/10");
    res.setHeader("accept-ranges", "bytes");
    res.setHeader("content-length", "4");
    res.setHeader("cache-control", "public, max-age=60");
    res.end("test");
  });
  const backendPort = await listen(backend);
  const minioPort = await listen(minio);
  const frontend = await startFrontend(`http://127.0.0.1:${backendPort}`, {
    minioEndpoint: "127.0.0.1",
    minioPort,
    minioBucket: "wellness-media",
  });

  try {
    const response = await fetch(`${frontend.baseUrl}/media/home/home-video.mp4`, {
      headers: { range: "bytes=0-3" },
    });

    assert.equal(response.status, 206);
    assert.equal(await response.text(), "test");
    assert.equal(response.headers.get("content-type"), "video/mp4");
    assert.equal(response.headers.get("content-range"), "bytes 0-3/10");
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.equal(response.headers.get("content-length"), "4");
    assert.equal(response.headers.get("cache-control"), "public, max-age=60");
    assert.deepEqual(minioRequests, [
      {
        method: "GET",
        url: "/wellness-media/home/home-video.mp4",
        range: "bytes=0-3",
      },
    ]);
    assert.deepEqual(backendRequests, []);
  } finally {
    await frontend.stop();
    await closeServer(backend);
    await closeServer(minio);
  }
});

test("proxies homepage mp4 HEAD requests without sending a body", async () => {
  const backend = http.createServer((_req, res) => res.end("backend"));
  const minioRequests = [];
  const minio = http.createServer((req, res) => {
    minioRequests.push({ method: req.method, url: req.url });
    res.setHeader("content-type", "video/mp4");
    res.setHeader("accept-ranges", "bytes");
    res.setHeader("content-length", "1234");
    res.end("should-not-be-read");
  });
  const backendPort = await listen(backend);
  const minioPort = await listen(minio);
  const frontend = await startFrontend(`http://127.0.0.1:${backendPort}`, {
    minioEndpoint: "127.0.0.1",
    minioPort,
    minioBucket: "wellness-media",
  });

  try {
    const response = await fetch(`${frontend.baseUrl}/media/home/home-video.mp4`, {
      method: "HEAD",
    });

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("content-type"), "video/mp4");
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.equal(response.headers.get("content-length"), "1234");
    assert.deepEqual(minioRequests, [
      { method: "HEAD", url: "/wellness-media/home/home-video.mp4" },
    ]);
  } finally {
    await frontend.stop();
    await closeServer(backend);
    await closeServer(minio);
  }
});

test("returns 502 text when MinIO cannot be reached for homepage media", async () => {
  const backendRequests = [];
  const backend = http.createServer((req, res) => {
    backendRequests.push(req.url);
    res.end("backend");
  });
  const backendPort = await listen(backend);
  const unusedMinioPort = await getUnusedPort();
  const frontend = await startFrontend(`http://127.0.0.1:${backendPort}`, {
    minioEndpoint: "127.0.0.1",
    minioPort: unusedMinioPort,
    minioBucket: "wellness-media",
  });

  try {
    const response = await fetch(`${frontend.baseUrl}/media/home/home-video.mp4`);
    const body = await response.text();

    assert.equal(response.status, 502);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(body, "Upstream media service unavailable");
    assert.deepEqual(backendRequests, []);
  } finally {
    await frontend.stop();
    await closeServer(backend);
  }
});

test("handles homepage media streams that fail after headers without unhandled errors", async () => {
  const backend = http.createServer((_req, res) => res.end("backend"));
  const minio = http.createServer((_req, res) => {
    res.writeHead(200, {
      "content-type": "video/mp4",
      "content-length": "1024",
    });
    res.flushHeaders();
    res.write("partial-media");
    setTimeout(() => {
      res.destroy(new Error("simulated upstream stream failure"));
    }, 10);
  });
  const unhandledErrors = [];
  const onUncaughtException = (error) => {
    unhandledErrors.push(error);
  };
  const onUnhandledRejection = (error) => {
    unhandledErrors.push(error);
  };

  process.prependListener("uncaughtException", onUncaughtException);
  process.prependListener("unhandledRejection", onUnhandledRejection);

  const backendPort = await listen(backend);
  const minioPort = await listen(minio);
  const frontend = await startFrontend(`http://127.0.0.1:${backendPort}`, {
    minioEndpoint: "127.0.0.1",
    minioPort,
    minioBucket: "wellness-media",
  });

  try {
    let clientError;
    const abortController = new AbortController();
    const abortTimer = setTimeout(() => abortController.abort(), 250);
    try {
      await fetch(`${frontend.baseUrl}/media/home/home-video.mp4`, {
        signal: abortController.signal,
      }).then((response) =>
        response.arrayBuffer()
      );
    } catch (error) {
      clientError = error;
    } finally {
      clearTimeout(abortTimer);
    }

    assert.ok(clientError, "client should see the truncated stream");
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.deepEqual(unhandledErrors, []);

    const healthResponse = await fetch(`${frontend.baseUrl}/health`);
    assert.equal(healthResponse.status, 200);
  } finally {
    process.removeListener("uncaughtException", onUncaughtException);
    process.removeListener("unhandledRejection", onUnhandledRejection);
    await frontend.stop();
    await closeServer(backend);
    await closeServer(minio);
  }
});

test("rejects unsupported methods and invalid homepage media paths", async () => {
  const backendRequests = [];
  const backend = http.createServer((req, res) => {
    backendRequests.push(req.url);
    res.end("backend");
  });
  const minioRequests = [];
  const minio = http.createServer((req, res) => {
    minioRequests.push(req.url);
    res.end("minio");
  });
  const backendPort = await listen(backend);
  const minioPort = await listen(minio);
  const frontend = await startFrontend(`http://127.0.0.1:${backendPort}`, {
    minioEndpoint: "127.0.0.1",
    minioPort,
    minioBucket: "wellness-media",
  });

  try {
    const methodResponse = await fetch(`${frontend.baseUrl}/media/home/home-video.mp4`, {
      method: "POST",
    });
    assert.equal(methodResponse.status, 405);
    assert.equal(methodResponse.headers.get("allow"), "GET, HEAD");

    const invalidPaths = [
      "/media/home",
      "/media/home/",
      "/media/home/nested/home-video.mp4",
      "/media/home/home%5Cvideo.mp4",
      "/media/home/..%2Fhome-video.mp4",
      "/media/home/.",
      "/media/home/home-video.png",
      "/media/home/%E0%A4%A",
    ];

    for (const pathName of invalidPaths) {
      const response = await fetch(`${frontend.baseUrl}${pathName}`);
      assert.equal(response.status, 400, pathName);
    }

    assert.deepEqual(backendRequests, []);
    assert.deepEqual(minioRequests, []);
  } finally {
    await frontend.stop();
    await closeServer(backend);
    await closeServer(minio);
  }
});

test("non-home media requests still fall through to the backend", async () => {
  const proxiedRequests = [];
  const backend = http.createServer((req, res) => {
    proxiedRequests.push({ method: req.method, url: req.url });
    res.end("backend-media");
  });
  const backendPort = await listen(backend);
  const frontend = await startFrontend(`http://127.0.0.1:${backendPort}`);

  try {
    const response = await fetch(`${frontend.baseUrl}/media/packages/package-relief.png`);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "backend-media");
    assert.deepEqual(proxiedRequests, [
      { method: "GET", url: "/media/packages/package-relief.png" },
    ]);
  } finally {
    await frontend.stop();
    await closeServer(backend);
  }
});
