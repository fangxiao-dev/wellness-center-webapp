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

test("supports add, update, remove, and clear for package and aftercare snapshots", async () => {
  await withCartServer(async (baseUrl) => {
    const packageResponse = await fetch(`${baseUrl}/cart/session/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "package",
        name: "Neck & Shoulder Relief",
        price: 89,
        quantity: 1,
        imageUrl: "/api/configurator/assets/package-configurator/neck-shoulder-relief.svg",
        details: {
          package: "neck-shoulder-relief",
          duration: 60,
          intensity: "medium",
          addOns: ["aroma-oil"],
        },
      }),
    });
    const packageItem = await packageResponse.json();

    const aftercareResponse = await fetch(`${baseUrl}/cart/session/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "aftercare",
        name: "Heated Neck Wrap",
        price: 34.9,
        quantity: 2,
        imageUrl: "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.svg",
        details: {
          productId: 1,
          slug: "heated-neck-wrap",
        },
      }),
    });
    const aftercareItem = await aftercareResponse.json();

    assert.equal(packageResponse.status, 201);
    assert.equal(aftercareResponse.status, 201);
    assert.equal(packageItem.type, "package");
    assert.equal(aftercareItem.type, "aftercare");

    const updateResponse = await fetch(`${baseUrl}/cart/session/items/${aftercareItem.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity: 3 }),
    });
    assert.equal(updateResponse.status, 200);

    const updatedCart = await (await fetch(`${baseUrl}/cart/session`)).json();
    assert.equal(updatedCart.items.length, 2);
    assert.equal(updatedCart.items.find((item) => item.id === aftercareItem.id).quantity, 3);
    assert.equal(updatedCart.total, 193.7);

    const removeResponse = await fetch(`${baseUrl}/cart/session/items/${packageItem.id}`, {
      method: "DELETE",
    });
    assert.equal(removeResponse.status, 200);

    const cartAfterRemove = await (await fetch(`${baseUrl}/cart/session`)).json();
    assert.deepEqual(cartAfterRemove.items.map((item) => item.id), [aftercareItem.id]);

    const clearResponse = await fetch(`${baseUrl}/cart/session`, { method: "DELETE" });
    assert.equal(clearResponse.status, 200);

    const emptyCart = await (await fetch(`${baseUrl}/cart/session`)).json();
    assert.deepEqual(emptyCart.items, []);
    assert.equal(emptyCart.total, 0);
  });
});
