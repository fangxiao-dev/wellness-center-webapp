const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const { buildWeatherFallback } = require("../src/visitContext");

const serverPath = path.resolve(__dirname, "..", "src", "server.js");
const dbPath = path.resolve(__dirname, "..", "src", "db.js");

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server) {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  return new Promise((resolve) => server.close(resolve));
}

async function withVisitContextApp({ rowsByQuery, env = {}, fetchImpl }, run) {
  const originalEnv = {};
  for (const [key, value] of Object.entries(env)) {
    originalEnv[key] = process.env[key];
    process.env[key] = value;
  }
  const originalFetch = global.fetch;
  const clientFetch = originalFetch;
  if (fetchImpl) global.fetch = fetchImpl;

  const queries = [];
  const pool = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      for (const entry of rowsByQuery) {
        if (entry.match(sql, params)) return [entry.rows];
      }
      return [[]];
    },
  };

  delete require.cache[serverPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { getPool: () => pool },
  };

  const app = require(serverPath);
  const server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await run({ baseUrl, queries, clientFetch });
  } finally {
    await closeServer(server);
    delete require.cache[serverPath];
    delete require.cache[dbPath];
    if (fetchImpl) global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

const locationRows = [
  {
    id: "wellness-center-main",
    name: "Serenity Wellness Center",
    address: "Main Street 1",
    destination: "Serenity Wellness Center, Main Street 1",
    label: "Main Center",
    value: "wellness-center-main",
    latitude: "52.520008",
    longitude: "13.404954",
    opening_note: "Open today.",
    arrival_tip: "Arrive ten minutes early.",
  },
];

const fallbackRows = [
  {
    fallback_condition: "mild",
    fallback_temperature_c: "19.0",
    fallback_summary: "Mild weather is suitable for a calm visit.",
  },
];

const queryFixtures = [
  {
    match: (sql) => sql.includes("FROM locations"),
    rows: locationRows,
  },
  {
    match: (sql) => sql.includes("FROM weather_context"),
    rows: fallbackRows,
  },
];

test("weather fallback uses seeded context", () => {
  const fallback = buildWeatherFallback({
    fallback_condition: "mild",
    fallback_temperature_c: "19.0",
    fallback_summary: "Mild weather is suitable for a calm visit.",
  });

  assert.equal(fallback.provider, "fallback");
  assert.equal(fallback.condition, "mild");
  assert.equal(fallback.temperatureC, 19);
  assert.match(fallback.summary, /calm visit/);
});

test("weather current returns fallback provider when weather key is missing", async () => {
  await withVisitContextApp({ rowsByQuery: queryFixtures }, async ({ baseUrl, clientFetch }) => {
    const response = await clientFetch(`${baseUrl}/weather/current`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.provider, "fallback");
    assert.equal(body.condition, "mild");
  });
});

test("weather current treats placeholder weather keys as fallback without calling Google", async () => {
  let calls = 0;
  await withVisitContextApp({
    rowsByQuery: queryFixtures,
    env: { GOOGLE_WEATHER_API_KEY: "placeholder" },
    fetchImpl: async () => {
      calls += 1;
      return Response.json({});
    },
  }, async ({ baseUrl, clientFetch }) => {
    const response = await clientFetch(`${baseUrl}/weather/current`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.provider, "fallback");
    assert.equal(calls, 0);
  });
});

test("weather current calls Google Weather with selected location coordinates when real key succeeds", async () => {
  const requests = [];
  await withVisitContextApp({
    rowsByQuery: queryFixtures,
    env: { GOOGLE_WEATHER_API_KEY: "real-weather-key" },
    fetchImpl: async (url) => {
      requests.push(new URL(url));
      return Response.json({
        weatherCondition: { description: { text: "Partly cloudy" } },
        temperature: { degrees: 21.4 },
      });
    },
  }, async ({ baseUrl, clientFetch }) => {
    const response = await clientFetch(`${baseUrl}/weather/current?locationId=wellness-center-main`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.provider, "google");
    assert.equal(body.condition, "Partly cloudy");
    assert.equal(body.temperatureC, 21.4);
    assert.equal(requests[0].origin + requests[0].pathname, "https://weather.googleapis.com/v1/currentConditions:lookup");
    assert.equal(requests[0].searchParams.get("key"), "real-weather-key");
    assert.equal(requests[0].searchParams.get("location.latitude"), "52.520008");
    assert.equal(requests[0].searchParams.get("location.longitude"), "13.404954");
    assert.equal(requests[0].searchParams.get("unitsSystem"), "METRIC");
  });
});

test("weather current falls back when Google Weather returns non-OK", async () => {
  await withVisitContextApp({
    rowsByQuery: queryFixtures,
    env: { GOOGLE_WEATHER_API_KEY: "real-weather-key" },
    fetchImpl: async () => new Response(JSON.stringify({ error: "upstream" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    }),
  }, async ({ baseUrl, clientFetch }) => {
    const response = await clientFetch(`${baseUrl}/weather/current`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.provider, "fallback");
    assert.equal(body.condition, "mild");
  });
});

test("weather current falls back when Google Weather mapping fails", async () => {
  await withVisitContextApp({
    rowsByQuery: queryFixtures,
    env: { GOOGLE_WEATHER_API_KEY: "real-weather-key" },
    fetchImpl: async () => Response.json({ temperature: { degrees: 21.4 } }),
  }, async ({ baseUrl, clientFetch }) => {
    const response = await clientFetch(`${baseUrl}/weather/current`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.provider, "fallback");
    assert.equal(body.summary, "Mild weather is suitable for a calm visit.");
  });
});

test("visit summary includes provider-aware weather", async () => {
  await withVisitContextApp({ rowsByQuery: queryFixtures }, async ({ baseUrl, clientFetch }) => {
    const response = await clientFetch(`${baseUrl}/visit-summary`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.location.id, "wellness-center-main");
    assert.equal(body.weather.provider, "fallback");
  });
});
