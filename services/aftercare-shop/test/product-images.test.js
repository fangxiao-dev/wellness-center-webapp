const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const app = require("../src/server");
const { toPublicProductImageUrl } = require("../src/asset-paths");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function closeServer(server) {
  server.closeAllConnections?.();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function rawGet(baseUrl, path) {
  const url = new URL(baseUrl);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: url.hostname,
        port: url.port,
        method: "GET",
        path,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

function withStubbedFetch(handler) {
  const originalFetch = global.fetch;
  return Promise.resolve()
    .then(handler)
    .finally(() => {
      global.fetch = originalFetch;
    });
}

test("aftercare image keys become API asset URLs", () => {
  assert.equal(
    toPublicProductImageUrl("aftercare-shop/heated-neck-wrap.png"),
    "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png"
  );
});

test("unsafe image keys are rejected", () => {
  assert.throws(() => toPublicProductImageUrl("../secret.png"), /invalid/i);
});

test("asset route streams owned aftercare-shop objects from MinIO", async () => {
  await withStubbedFetch(async () => {
    const requests = [];
    const body = Buffer.from("aftercare-asset");
    global.fetch = async (url) => {
      requests.push(String(url));
      return new Response(body, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    };

    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await rawGet(`http://127.0.0.1:${port}`, "/assets/aftercare-shop/heated-neck-wrap.png");

      assert.equal(response.status, 200);
      assert.equal(response.headers["content-type"], "image/png");
      assert.deepEqual(response.body, body);
      assert.deepEqual(requests, [
        "http://minio:9000/wellness-media/aftercare-shop/heated-neck-wrap.png",
      ]);
    } finally {
      await closeServer(server);
    }
  });
});

test("asset route rejects package objects before reading MinIO", async () => {
  await withStubbedFetch(async () => {
    const requests = [];
    global.fetch = async (url) => {
      requests.push(String(url));
      throw new Error("MinIO should not be read for foreign prefixes");
    };

    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await rawGet(`http://127.0.0.1:${port}`, "/assets/package-configurator/neck-shoulder-relief.png");

      assert.equal(response.status, 400);
      assert.deepEqual(JSON.parse(response.body.toString()), { error: "invalid asset key" });
      assert.deepEqual(requests, []);
    } finally {
      await closeServer(server);
    }
  });
});

test("asset route rejects homepage media objects before reading MinIO", async () => {
  await withStubbedFetch(async () => {
    const requests = [];
    global.fetch = async (url) => {
      requests.push(String(url));
      throw new Error("MinIO should not be read for homepage media through aftercare assets");
    };

    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await rawGet(`http://127.0.0.1:${port}`, "/assets/home/home-video.mp4");

      assert.equal(response.status, 400);
      assert.deepEqual(JSON.parse(response.body.toString()), { error: "invalid asset key" });
      assert.deepEqual(requests, []);
    } finally {
      await closeServer(server);
    }
  });
});
