const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const express = require("express");

const redisPath = path.resolve(__dirname, "..", "src", "redisClient.js");
const cartRoutesPath = path.resolve(__dirname, "..", "src", "cartRoutes.js");
const store = new Map();

require.cache[redisPath] = {
  id: redisPath,
  filename: redisPath,
  loaded: true,
  exports: {
    async get(key) {
      return store.get(key) || null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async del(key) {
      store.delete(key);
    },
  },
};

const cartRoutes = require(cartRoutesPath);

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function withCartServer(callback) {
  const app = express();
  app.use(express.json());
  app.use("/cart", cartRoutes);
  const server = http.createServer(app);
  const port = await listen(server);
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await closeServer(server);
    store.clear();
  }
}

test("rejects non-finite price values", async () => {
  await withCartServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/cart/session/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "aftercare",
        name: "Invalid price",
        price: "NaN",
        quantity: 1,
      }),
    });

    assert.equal(response.status, 400);
  });
});

test("rejects non-positive item quantities on create", async () => {
  await withCartServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/cart/session/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "aftercare",
        name: "Invalid quantity",
        price: 1.25,
        quantity: 0,
      }),
    });

    assert.equal(response.status, 400);
  });
});
