const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const mysql = require("mysql2/promise");
const app = require("../src/server");
const { computePackagePrice, buildConfigurationSummary, baseImageKey } = app;

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

function withStubbedPool(handler) {
  const originalCreatePool = mysql.createPool;
  mysql.createPool = () => ({
    async query(sql, params = []) {
      if (sql.includes("FROM packages")) {
        return [[{
          id: 2,
          slug: "stress-reset-massage",
          name: "Stress Reset Massage",
          goal: "calm down and reset after stress",
          description: "Relaxation-led massage package.",
          base_price: "64.00",
          base_minutes: 45,
        }]];
      }
      if (sql.includes("FROM durations")) {
        return Number(params[0]) === 60
          ? [[{ id: 2, minutes: 60, label: "60 min", price_delta: "18.00" }]]
          : [[]];
      }
      if (sql.includes("FROM intensities")) {
        return params[0] === "medium"
          ? [[{ id: 2, slug: "medium", label: "Medium", description: "Balanced pressure.", price_delta: "6.00" }]]
          : [[]];
      }
      if (sql.includes("FROM add_ons")) {
        const slugs = params[0] || [];
        const rows = [
          {
            id: 2,
            slug: "aroma-oil",
            name: "Aroma Oil",
            description: "Calming aroma oil.",
            price_delta: "9.00",
            minio_object: "package-configurator/addons/aroma-oil.png",
          },
          {
            id: 4,
            slug: "warm-towel",
            name: "Warm Towel Finish",
            description: "Warm towel finish.",
            price_delta: "6.00",
            minio_object: "package-configurator/addons/warm-towel.png",
          },
        ].filter((row) => slugs.includes(row.slug));
        return [rows];
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  });
  return Promise.resolve()
    .then(handler)
    .finally(() => {
      mysql.createPool = originalCreatePool;
    });
}

async function postJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, payload: await response.json() };
}

test("computePackagePrice sums base price and all deltas", () => {
  const price = computePackagePrice({
    basePrice: 64,
    durationDelta: 18,
    intensityDelta: 6,
    addOnDeltas: [9, 6],
  });
  assert.equal(price, 103);
});

test("computePackagePrice handles no add-ons", () => {
  const price = computePackagePrice({
    basePrice: 59,
    durationDelta: 0,
    intensityDelta: 0,
    addOnDeltas: [],
  });
  assert.equal(price, 59);
});

test("baseImageKey returns the package base image object key", () => {
  assert.equal(
    baseImageKey("stress-reset-massage"),
    "package-configurator/base/stress-reset-massage.png"
  );
});

test("buildConfigurationSummary lists duration, intensity and add-ons", () => {
  const summary = buildConfigurationSummary({
    packageName: "Stress Reset Massage",
    minutes: 60,
    intensityLabel: "Medium",
    addOnNames: ["Aroma Oil", "Warm Towel Finish"],
  });
  assert.equal(
    summary,
    "A 60-minute Stress Reset Massage at medium pressure with Aroma Oil and Warm Towel Finish."
  );
});

test("buildConfigurationSummary omits the add-on clause when none selected", () => {
  const summary = buildConfigurationSummary({
    packageName: "Neck & Shoulder Relief",
    minutes: 45,
    intensityLabel: "Gentle",
    addOnNames: [],
  });
  assert.equal(summary, "A 45-minute Neck & Shoulder Relief at gentle pressure.");
});

test("configuration calculate returns price, summary, and image layers for valid selections", async () => {
  await withStubbedPool(async () => {
    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await postJson(`http://127.0.0.1:${port}`, "/configuration/calculate", {
        package: "stress-reset-massage",
        duration: 60,
        intensity: "medium",
        addOns: ["aroma-oil", "warm-towel"],
      });

      assert.equal(response.status, 200);
      assert.deepEqual(response.payload, {
        package: {
          slug: "stress-reset-massage",
          name: "Stress Reset Massage",
          baseImageUrl: "/api/configurator/assets/package-configurator/base/stress-reset-massage.png",
        },
        duration: { minutes: 60, label: "60 min" },
        intensity: { slug: "medium", label: "Medium" },
        addOns: [
          {
            slug: "aroma-oil",
            name: "Aroma Oil",
            imageUrl: "/api/configurator/assets/package-configurator/addons/aroma-oil.png",
            priceDelta: 9,
          },
          {
            slug: "warm-towel",
            name: "Warm Towel Finish",
            imageUrl: "/api/configurator/assets/package-configurator/addons/warm-towel.png",
            priceDelta: 6,
          },
        ],
        price: 103,
        summary: "A 60-minute Stress Reset Massage at medium pressure with Aroma Oil and Warm Towel Finish.",
      });
    } finally {
      await closeServer(server);
    }
  });
});

test("configuration calculate treats omitted add-ons as none selected", async () => {
  await withStubbedPool(async () => {
    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await postJson(`http://127.0.0.1:${port}`, "/configuration/calculate", {
        package: "stress-reset-massage",
        duration: 60,
        intensity: "medium",
      });

      assert.equal(response.status, 200);
      assert.deepEqual(response.payload, {
        package: {
          slug: "stress-reset-massage",
          name: "Stress Reset Massage",
          baseImageUrl: "/api/configurator/assets/package-configurator/base/stress-reset-massage.png",
        },
        duration: { minutes: 60, label: "60 min" },
        intensity: { slug: "medium", label: "Medium" },
        addOns: [],
        price: 88,
        summary: "A 60-minute Stress Reset Massage at medium pressure.",
      });
    } finally {
      await closeServer(server);
    }
  });
});

test("configuration calculate rejects unknown add-ons", async () => {
  await withStubbedPool(async () => {
    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await postJson(`http://127.0.0.1:${port}`, "/configuration/calculate", {
        package: "stress-reset-massage",
        duration: 60,
        intensity: "medium",
        addOns: ["aroma-oil", "unknown-addon"],
      });

      assert.equal(response.status, 404);
      assert.deepEqual(response.payload, { error: "add-on not found" });
    } finally {
      await closeServer(server);
    }
  });
});

test("configuration calculate rejects non-array add-ons", async () => {
  await withStubbedPool(async () => {
    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await postJson(`http://127.0.0.1:${port}`, "/configuration/calculate", {
        package: "stress-reset-massage",
        duration: 60,
        intensity: "medium",
        addOns: "hot-stone",
      });

      assert.equal(response.status, 400);
      assert.deepEqual(response.payload, { error: "addOns must be an array" });
    } finally {
      await closeServer(server);
    }
  });
});
