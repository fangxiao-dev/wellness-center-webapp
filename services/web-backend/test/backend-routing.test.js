const assert = require("node:assert/strict");
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address().port);
    });
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

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(250),
      });
      if (response.ok) return;
    } catch (err) {
      lastError = err;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError || new Error("server did not become healthy");
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill();
  await once(child, "exit").catch(() => {});
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function startBackend(apiGatewayUrl) {
  const portProbe = http.createServer((_req, res) => res.end());
  const port = await listen(portProbe);
  await new Promise((resolve) => portProbe.close(resolve));
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      API_GATEWAY_URL: apiGatewayUrl,
      REPO_ROOT: path.resolve(process.cwd(), "..", ".."),
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForHealth(baseUrl);
  } catch (err) {
    await stopChild(child);
    throw new Error(`${err.message}${stderr ? `\n${stderr}` : ""}`);
  }

  return {
    baseUrl,
    async stop() {
      await stopChild(child);
    },
  };
}

test("health identifies the web backend", async () => {
  const apiGateway = http.createServer((_req, res) => {
    res.writeHead(404).end();
  });
  let backend;

  try {
    const apiGatewayPort = await listen(apiGateway);
    backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);
    const response = await fetch(`${backend.baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.service, "web-backend");
  } finally {
    if (backend) await backend.stop();
    await closeServer(apiGateway);
  }
});

test("aftercare listing SSR fetches products through the API gateway", async () => {
  const requests = [];
  const apiGateway = http.createServer((req, res) => {
    requests.push(req.url);

    if (req.url === "/api/aftercare/products") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify([
        {
          id: 1,
          slug: "heated-neck-wrap",
          name: "Heated Neck Wrap",
          category: "recovery",
          price: 29.9,
          imageUrl: "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png",
          description: "Reusable warmth for neck and shoulder aftercare.",
        },
      ]));
      return;
    }

    res.writeHead(404).end(JSON.stringify({ error: "not found" }));
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await fetch(`${backend.baseUrl}/aftercare-shop`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Heated Neck Wrap/);
    assert.match(html, /class="aftercare-shop-layout"/);
    assert.match(html, /class="product-grid"/);
    assert.deepEqual(requests, ["/api/aftercare/products"]);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("aftercare product detail SSR fetches the product through the API gateway", async () => {
  const requests = [];
  const apiGateway = http.createServer((req, res) => {
    requests.push(req.url);

    if (req.url === "/api/aftercare/products/heated-neck-wrap") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        id: 1,
        slug: "heated-neck-wrap",
        name: "Heated Neck Wrap",
        category: "heat-care",
        price: 34.9,
        imageUrl: "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png",
        description: "Reusable warm wrap for shoulder and neck relaxation after a massage session.",
        usageNote: "Use at home for short warmth intervals.",
      }));
      return;
    }

    res.writeHead(404).end(JSON.stringify({ error: "not found" }));
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await fetch(`${backend.baseUrl}/aftercare-shop/heated-neck-wrap`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Heated Neck Wrap/);
    assert.match(html, /class="aftercare-product-layout"/);
    assert.match(html, /data-product-detail/);
    assert.match(html, /data-add/);
    assert.deepEqual(requests, ["/api/aftercare/products/heated-neck-wrap"]);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("aftercare product detail returns a clear 404 for missing products", async () => {
  const requests = [];
  const apiGateway = http.createServer((req, res) => {
    requests.push(req.url);
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "product not found" }));
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await fetch(`${backend.baseUrl}/aftercare-shop/not-a-product`);
    const body = await response.text();

    assert.equal(response.status, 404);
    assert.match(body, /Aftercare product not found/);
    assert.deepEqual(requests, ["/api/aftercare/products/not-a-product"]);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("backend does not expose the legacy minio proxy", async () => {
  const apiGateway = http.createServer((_req, res) => {
    res.writeHead(404).end();
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await fetch(`${backend.baseUrl}/minio/configurator-images/home/bmw_ai.png`);

    assert.equal(response.status, 404);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("api forwarding preserves multiple set-cookie headers from the gateway", async () => {
  const apiGateway = http.createServer((req, res) => {
    assert.equal(req.url, "/api/cart");
    res.setHeader("content-type", "application/json");
    res.setHeader("set-cookie", [
      "sessionId=abc; Path=/; HttpOnly",
      "cartHint=full; Path=/; SameSite=Lax",
    ]);
    res.end(JSON.stringify({ ok: true }));
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await fetch(`${backend.baseUrl}/api/cart`);
    const setCookie = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie").split(/,\s*(?=[^;]+=)/);

    assert.equal(response.status, 200);
    assert.deepEqual(setCookie, [
      "sessionId=abc; Path=/; HttpOnly",
      "cartHint=full; Path=/; SameSite=Lax",
    ]);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("api forwarding preserves binary asset response metadata and body", async () => {
  const body = Buffer.from([0, 1, 2, 3, 255]);
  const apiGateway = http.createServer((req, res) => {
    assert.equal(req.url, "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png");
    res.writeHead(200, {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=120",
    });
    res.end(body);
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await fetch(`${backend.baseUrl}/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml");
    assert.equal(response.headers.get("cache-control"), "public, max-age=120");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("backend rejects encoded configurator asset traversal before gateway fetch", async () => {
  const requests = [];
  const apiGateway = http.createServer((req, res) => {
    requests.push(req.url);
    res.writeHead(200, { "content-type": "image/jpeg" });
    res.end("should not be fetched");
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await rawGet(backend.baseUrl, "/api/configurator/assets/configurator/sub/%2e%2e/6_front.jpg");

    assert.equal(response.status, 400);
    assert.deepEqual(requests, []);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("package configurator route renders initial package selection", async () => {
  const apiGateway = http.createServer((_req, res) => {
    res.writeHead(404).end();
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await fetch(`${backend.baseUrl}/package-configurator/neck-shoulder-relief/60/medium/aroma-oil`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Serenity Wellness Center/);
    assert.match(html, /neck-shoulder-relief/);
    assert.match(html, /class="configurator-shell"/);
    assert.match(html, /id="configurator-app"/);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("package configurator route safely serializes script-breaking initial selection values", async () => {
  const apiGateway = http.createServer((_req, res) => {
    res.writeHead(404).end();
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await rawGet(
      backend.baseUrl,
      "/package-configurator/%3C%2Fscript%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E/60/medium/aroma-oil"
    );
    const html = response.body.toString();

    assert.equal(response.status, 200);
    assert.doesNotMatch(html, /const initialSelection = .*<\/script><script>alert\(1\)<\/script>/);
    assert.match(html, /\\u003c\/script/);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});

test("visit context route includes browser script for visit summary behavior", async () => {
  const apiGateway = http.createServer((_req, res) => {
    res.writeHead(404).end();
  });
  const apiGatewayPort = await listen(apiGateway);
  const backend = await startBackend(`http://127.0.0.1:${apiGatewayPort}`);

  try {
    const response = await fetch(`${backend.baseUrl}/visit-context`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /id="visit-summary"/);
    assert.match(html, /id="map"/);
    assert.match(html, /src="\/static\/app\.js"/);
    assert.match(html, /SERENITY_MAPS_KEY/);
  } finally {
    await backend.stop();
    await closeServer(apiGateway);
  }
});
