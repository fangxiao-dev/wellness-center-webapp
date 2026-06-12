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

function defaultQueryStub(sql, params = []) {
  if (sql.includes("FROM configurations c") && sql.includes("LEFT JOIN configuration_addons")) {
    assert.match(sql, /c\.enabled = TRUE/);
    assert.match(sql, /ca\.enabled = TRUE/);
    return [[
      {
        configuration_id: 7,
        package_id: 2,
        package_slug: "stress-reset-massage",
        package_name: "Stress Reset Massage",
        package_goal: "calm down and reset after stress",
        package_description: "Relaxation-led massage package.",
        package_base_price: "64.00",
        package_base_minutes: 45,
        package_minio_object: "package-configurator/stress-reset-massage.png",
        duration_id: 2,
        duration_minutes: 60,
        duration_label: "60 min",
        duration_price_delta: "18.00",
        intensity_id: 2,
        intensity_slug: "medium",
        intensity_label: "Medium",
        intensity_description: "Balanced pressure.",
        intensity_price_delta: "6.00",
        addon_id: 2,
        addon_slug: "aroma-oil",
        addon_name: "Aroma Oil",
        addon_description: "Calming aroma oil.",
        addon_price_delta: "9.00",
        addon_minio_object: "package-configurator/addons/aroma-oil.png",
      },
      {
        configuration_id: 7,
        package_id: 2,
        package_slug: "stress-reset-massage",
        package_name: "Stress Reset Massage",
        package_goal: "calm down and reset after stress",
        package_description: "Relaxation-led massage package.",
        package_base_price: "64.00",
        package_base_minutes: 45,
        package_minio_object: "package-configurator/stress-reset-massage.png",
        duration_id: 2,
        duration_minutes: 60,
        duration_label: "60 min",
        duration_price_delta: "18.00",
        intensity_id: 2,
        intensity_slug: "medium",
        intensity_label: "Medium",
        intensity_description: "Balanced pressure.",
        intensity_price_delta: "6.00",
        addon_id: 4,
        addon_slug: "warm-towel",
        addon_name: "Warm Towel Finish",
        addon_description: "Warm towel finish.",
        addon_price_delta: "6.00",
        addon_minio_object: "package-configurator/addons/warm-towel.png",
      },
      {
        configuration_id: 8,
        package_id: 1,
        package_slug: "neck-shoulder-relief",
        package_name: "Neck & Shoulder Relief",
        package_goal: "release neck and shoulder tension",
        package_description: "Focused massage package.",
        package_base_price: "59.00",
        package_base_minutes: 45,
        package_minio_object: "package-configurator/neck-shoulder-relief.png",
        duration_id: 1,
        duration_minutes: 45,
        duration_label: "45 min",
        duration_price_delta: "0.00",
        intensity_id: 1,
        intensity_slug: "gentle",
        intensity_label: "Gentle",
        intensity_description: "Soft pressure.",
        intensity_price_delta: "0.00",
        addon_id: null,
        addon_slug: null,
        addon_name: null,
        addon_description: null,
        addon_price_delta: null,
        addon_minio_object: null,
      },
    ]];
  }
  if (sql.includes("FROM configurations")) {
    assert.match(sql, /enabled = TRUE/);
    const [packageId, durationId, intensityId] = params;
    return packageId === 2 && durationId === 2 && intensityId === 2
      ? [[{ id: 7 }]]
      : [[]];
  }
  if (sql.includes("FROM configuration_addons")) {
    assert.match(sql, /ca\.enabled = TRUE/);
    const slugs = params[1] || [];
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
  if (sql.includes("FROM packages")) {
    return [[{
      id: 2,
      slug: "stress-reset-massage",
      name: "Stress Reset Massage",
      goal: "calm down and reset after stress",
      description: "Relaxation-led massage package.",
      base_price: "64.00",
      base_minutes: 45,
      minio_object: "package-configurator/stress-reset-massage.png",
    }]];
  }
  if (sql.includes("FROM durations")) {
    if (Number(params[0]) === 60) {
      return [[{ id: 2, minutes: 60, label: "60 min", price_delta: "18.00" }]];
    }
    if (Number(params[0]) === 90) {
      return [[{ id: 3, minutes: 90, label: "90 min", price_delta: "45.00" }]];
    }
    return [[]];
  }
  if (sql.includes("FROM intensities")) {
    if (params[0] === "medium") {
      return [[{ id: 2, slug: "medium", label: "Medium", description: "Balanced pressure.", price_delta: "6.00" }]];
    }
    if (params[0] === "deep") {
      return [[{ id: 3, slug: "deep", label: "Deep", description: "Focused pressure.", price_delta: "12.00" }]];
    }
    return [[]];
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
}

function withStubbedPool(handler) {
  const originalCreatePool = mysql.createPool;
  mysql.createPool = () => ({
    async query(sql, params = []) {
      return defaultQueryStub(sql, params);
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

function withStubbedFetch(handler) {
  const originalFetch = global.fetch;
  return Promise.resolve()
    .then(handler)
    .finally(() => {
      global.fetch = originalFetch;
    });
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

test("configurations returns enabled package, duration, intensity, and allowed add-on metadata", async () => {
  await withStubbedPool(async () => {
    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await rawGet(`http://127.0.0.1:${port}`, "/configurations");

      assert.equal(response.status, 200);
      assert.deepEqual(JSON.parse(response.body.toString()), [
        {
          id: 7,
          package: {
            id: 2,
            slug: "stress-reset-massage",
            name: "Stress Reset Massage",
            goal: "calm down and reset after stress",
            description: "Relaxation-led massage package.",
            basePrice: 64,
            baseMinutes: 45,
            imageUrl: "/api/configurator/assets/package-configurator/stress-reset-massage.png",
          },
          duration: {
            id: 2,
            minutes: 60,
            label: "60 min",
            priceDelta: 18,
          },
          intensity: {
            id: 2,
            slug: "medium",
            label: "Medium",
            description: "Balanced pressure.",
            priceDelta: 6,
          },
          addOns: [
            {
              id: 2,
              slug: "aroma-oil",
              name: "Aroma Oil",
              description: "Calming aroma oil.",
              priceDelta: 9,
              imageUrl: "/api/configurator/assets/package-configurator/addons/aroma-oil.png",
            },
            {
              id: 4,
              slug: "warm-towel",
              name: "Warm Towel Finish",
              description: "Warm towel finish.",
              priceDelta: 6,
              imageUrl: "/api/configurator/assets/package-configurator/addons/warm-towel.png",
            },
          ],
        },
        {
          id: 8,
          package: {
            id: 1,
            slug: "neck-shoulder-relief",
            name: "Neck & Shoulder Relief",
            goal: "release neck and shoulder tension",
            description: "Focused massage package.",
            basePrice: 59,
            baseMinutes: 45,
            imageUrl: "/api/configurator/assets/package-configurator/neck-shoulder-relief.png",
          },
          duration: {
            id: 1,
            minutes: 45,
            label: "45 min",
            priceDelta: 0,
          },
          intensity: {
            id: 1,
            slug: "gentle",
            label: "Gentle",
            description: "Soft pressure.",
            priceDelta: 0,
          },
          addOns: [],
        },
      ]);
    } finally {
      await closeServer(server);
    }
  });
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

test("configuration calculate rejects invalid combinations even when every option exists", async () => {
  await withStubbedPool(async () => {
    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await postJson(`http://127.0.0.1:${port}`, "/configuration/calculate", {
        package: "stress-reset-massage",
        duration: 90,
        intensity: "deep",
        addOns: ["aroma-oil"],
      });

      assert.equal(response.status, 400);
      assert.deepEqual(response.payload, { error: "configuration is not available" });
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

test("asset route streams owned package-configurator objects from MinIO", async () => {
  await withStubbedFetch(async () => {
    const requests = [];
    const body = Buffer.from("package-asset");
    global.fetch = async (url) => {
      requests.push(String(url));
      return new Response(body, {
        status: 206,
        headers: { "content-type": "image/png" },
      });
    };

    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await rawGet(`http://127.0.0.1:${port}`, "/assets/package-configurator/neck-shoulder-relief.png");

      assert.equal(response.status, 206);
      assert.equal(response.headers["content-type"], "image/png");
      assert.deepEqual(response.body, body);
      assert.deepEqual(requests, [
        "http://minio:9000/wellness-media/package-configurator/neck-shoulder-relief.png",
      ]);
    } finally {
      await closeServer(server);
    }
  });
});

test("asset route rejects aftercare objects before reading MinIO", async () => {
  await withStubbedFetch(async () => {
    const requests = [];
    global.fetch = async (url) => {
      requests.push(String(url));
      throw new Error("MinIO should not be read for foreign prefixes");
    };

    const server = http.createServer(app);
    const port = await listen(server);
    try {
      const response = await rawGet(`http://127.0.0.1:${port}`, "/assets/aftercare-shop/heated-neck-wrap.png");

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
      throw new Error("MinIO should not be read for homepage media through package assets");
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
