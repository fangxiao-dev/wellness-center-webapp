const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

const gatewayServerPath = path.resolve(__dirname, "..", "src", "server.js");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
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

function extractCookieValue(setCookie, name) {
  const match = String(setCookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

function closeServer(server) {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  return new Promise((resolve) => server.close(resolve));
}

async function startGateway(configuratorUrl, aftercareUrl, cartUrl = "http://127.0.0.1:1", extraEnv = {}) {
  const envOverrides = {
    CONFIGURATOR_URL: configuratorUrl,
    AFTERCARE_URL: aftercareUrl,
    CART_URL: cartUrl,
    ...extraEnv,
  };
  const originalEnv = {};
  for (const key of Object.keys(envOverrides)) {
    originalEnv[key] = process.env[key];
    process.env[key] = envOverrides[key];
  }

  delete require.cache[gatewayServerPath];
  const app = require(gatewayServerPath);
  const server = http.createServer(app);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    async stop() {
      await closeServer(server);
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    },
  };
}

function parseCookieAttributes(setCookie, name) {
  const header = String(setCookie || "");
  const parts = header.split(";").map((part) => part.trim());
  const [cookiePair, ...attributePairs] = parts;
  const [cookieName, value] = cookiePair.split("=");
  if (cookieName !== name) return null;

  const attributes = {};
  for (const pair of attributePairs) {
    const [rawKey, ...rawValue] = pair.split("=");
    attributes[rawKey.toLowerCase()] = rawValue.length ? rawValue.join("=") : true;
  }

  return { value, attributes };
}

test("gateway uses a newly issued session id for first cart write", async () => {
  const cartBySession = new Map();
  const cartRequests = [];
  const cart = http.createServer((req, res) => {
    cartRequests.push(req.url);

    const postMatch = req.url.match(/^\/cart\/([^/]+)\/items$/);
    if (req.method === "POST" && postMatch) {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const sessionId = postMatch[1];
        const item = { id: "item-1", ...JSON.parse(Buffer.concat(chunks).toString()) };
        cartBySession.set(sessionId, [item]);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(item));
      });
      return;
    }

    const getMatch = req.url.match(/^\/cart\/([^/]+)$/);
    if (req.method === "GET" && getMatch) {
      const items = cartBySession.get(getMatch[1]) || [];
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ items, total: items.reduce((sum, item) => sum + item.price * item.quantity, 0) }));
      return;
    }

    res.writeHead(404).end();
  });
  const configurator = http.createServer((_req, res) => res.writeHead(404).end());
  const aftercare = http.createServer((_req, res) => res.writeHead(404).end());
  const cartPort = await listen(cart);
  const configuratorPort = await listen(configurator);
  const aftercarePort = await listen(aftercare);
  const gateway = await startGateway(
    `http://127.0.0.1:${configuratorPort}`,
    `http://127.0.0.1:${aftercarePort}`,
    `http://127.0.0.1:${cartPort}`
  );

  try {
    const createResponse = await fetch(`${gateway.baseUrl}/api/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "aftercare", name: "Heated Neck Wrap", price: 34.9, quantity: 1 }),
    });
    const sessionId = extractCookieValue(createResponse.headers.get("set-cookie"), "sessionId");

    assert.equal(createResponse.status, 200);
    assert.ok(sessionId);
    assert.notEqual(sessionId, "undefined");

    const cartResponse = await fetch(`${gateway.baseUrl}/api/cart`, {
      headers: { cookie: `sessionId=${sessionId}` },
    });
    const cartBody = await cartResponse.json();

    assert.equal(cartResponse.status, 200);
    assert.equal(cartBody.items[0].name, "Heated Neck Wrap");
    assert.deepEqual(cartRequests, [
      `/cart/${sessionId}/items`,
      `/cart/${sessionId}`,
    ]);
  } finally {
    await gateway.stop();
    await closeServer(cart);
    await closeServer(configurator);
    await closeServer(aftercare);
  }
});

test("gateway first cart request sets an explicit 24 hour lax httpOnly session cookie for local HTTP", async () => {
  const cart = http.createServer((req, res) => {
    assert.match(req.url, /^\/cart\/[^/]+$/);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ items: [], total: 0 }));
  });
  const configurator = http.createServer((_req, res) => res.writeHead(404).end());
  const aftercare = http.createServer((_req, res) => res.writeHead(404).end());
  const cartPort = await listen(cart);
  const configuratorPort = await listen(configurator);
  const aftercarePort = await listen(aftercare);
  const gateway = await startGateway(
    `http://127.0.0.1:${configuratorPort}`,
    `http://127.0.0.1:${aftercarePort}`,
    `http://127.0.0.1:${cartPort}`,
    { NODE_ENV: "development" }
  );

  try {
    const response = await fetch(`${gateway.baseUrl}/api/cart`);
    const sessionCookie = parseCookieAttributes(response.headers.get("set-cookie"), "sessionId");

    assert.equal(response.status, 200);
    assert.ok(sessionCookie);
    assert.ok(sessionCookie.value);
    assert.equal(sessionCookie.attributes.httponly, true);
    assert.equal(sessionCookie.attributes.samesite, "Lax");
    assert.equal(sessionCookie.attributes["max-age"], "86400");
    assert.ok(sessionCookie.attributes.expires);
    assert.equal(sessionCookie.attributes.secure, undefined);
  } finally {
    await gateway.stop();
    await closeServer(cart);
    await closeServer(configurator);
    await closeServer(aftercare);
  }
});

test("gateway enables secure session cookies in production-like environments", async () => {
  const cart = http.createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ items: [], total: 0 }));
  });
  const configurator = http.createServer((_req, res) => res.writeHead(404).end());
  const aftercare = http.createServer((_req, res) => res.writeHead(404).end());
  const cartPort = await listen(cart);
  const configuratorPort = await listen(configurator);
  const aftercarePort = await listen(aftercare);
  const gateway = await startGateway(
    `http://127.0.0.1:${configuratorPort}`,
    `http://127.0.0.1:${aftercarePort}`,
    `http://127.0.0.1:${cartPort}`,
    { NODE_ENV: "production" }
  );

  try {
    const response = await fetch(`${gateway.baseUrl}/api/cart`);
    const sessionCookie = parseCookieAttributes(response.headers.get("set-cookie"), "sessionId");

    assert.equal(response.status, 200);
    assert.ok(sessionCookie);
    assert.equal(sessionCookie.attributes.secure, true);
    assert.equal(sessionCookie.attributes.httponly, true);
    assert.equal(sessionCookie.attributes.samesite, "Lax");
  } finally {
    await gateway.stop();
    await closeServer(cart);
    await closeServer(configurator);
    await closeServer(aftercare);
  }
});

test("gateway streams configurator asset responses without JSON parsing", async () => {
  const body = Buffer.from([0, 1, 2, 3, 255]);
  const requests = [];
  const configurator = http.createServer((req, res) => {
    requests.push(req.url);
    res.writeHead(206, {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=60",
    });
    res.end(body);
  });
  const aftercare = http.createServer((_req, res) => res.writeHead(404).end());
  const configuratorPort = await listen(configurator);
  const aftercarePort = await listen(aftercare);
  const gateway = await startGateway(`http://127.0.0.1:${configuratorPort}`, `http://127.0.0.1:${aftercarePort}`);

  try {
    const response = await fetch(`${gateway.baseUrl}/api/configurator/assets/package-configurator/neck-shoulder-relief.png`, {
      signal: AbortSignal.timeout(2000),
    });

    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(response.headers.get("cache-control"), "public, max-age=60");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
    assert.deepEqual(requests, ["/assets/package-configurator/neck-shoulder-relief.png"]);
  } finally {
    await gateway.stop();
    await closeServer(configurator);
    await closeServer(aftercare);
  }
});

test("gateway streams aftercare asset responses without JSON parsing", async () => {
  const body = Buffer.from("svg-bytes");
  const configurator = http.createServer((_req, res) => res.writeHead(404).end());
  const requests = [];
  const aftercare = http.createServer((req, res) => {
    requests.push(req.url);
    res.writeHead(200, {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=120",
    });
    res.end(body);
  });
  const configuratorPort = await listen(configurator);
  const aftercarePort = await listen(aftercare);
  const gateway = await startGateway(`http://127.0.0.1:${configuratorPort}`, `http://127.0.0.1:${aftercarePort}`);

  try {
    const response = await fetch(`${gateway.baseUrl}/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png`, {
      signal: AbortSignal.timeout(2000),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml");
    assert.equal(response.headers.get("cache-control"), "public, max-age=120");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
    assert.deepEqual(requests, ["/assets/aftercare-shop/heated-neck-wrap.png"]);
  } finally {
    await gateway.stop();
    await closeServer(configurator);
    await closeServer(aftercare);
  }
});

test("gateway rejects encoded configurator asset traversal before upstream fetch", async () => {
  const requests = [];
  const configurator = http.createServer((req, res) => {
    requests.push(req.url);
    res.writeHead(200, { "content-type": "image/jpeg" });
    res.end("should not be fetched");
  });
  const aftercare = http.createServer((_req, res) => res.writeHead(404).end());
  const configuratorPort = await listen(configurator);
  const aftercarePort = await listen(aftercare);
  const gateway = await startGateway(`http://127.0.0.1:${configuratorPort}`, `http://127.0.0.1:${aftercarePort}`);

  try {
    const response = await rawGet(gateway.baseUrl, "/api/configurator/assets/package-configurator/sub/%2e%2e/neck-shoulder-relief.png");

    assert.equal(response.status, 400);
    assert.deepEqual(requests, []);
  } finally {
    await gateway.stop();
    await closeServer(configurator);
    await closeServer(aftercare);
  }
});

test("gateway rejects encoded aftercare asset traversal before upstream fetch", async () => {
  const configurator = http.createServer((_req, res) => res.writeHead(404).end());
  const requests = [];
  const aftercare = http.createServer((req, res) => {
    requests.push(req.url);
    res.writeHead(200, { "content-type": "image/svg+xml" });
    res.end("should not be fetched");
  });
  const configuratorPort = await listen(configurator);
  const aftercarePort = await listen(aftercare);
  const gateway = await startGateway(`http://127.0.0.1:${configuratorPort}`, `http://127.0.0.1:${aftercarePort}`);

  try {
    const response = await rawGet(gateway.baseUrl, "/api/aftercare/assets/aftercare-shop/sub/%2e%2e/heated-neck-wrap.png");

    assert.equal(response.status, 400);
    assert.deepEqual(requests, []);
  } finally {
    await gateway.stop();
    await closeServer(configurator);
    await closeServer(aftercare);
  }
});
