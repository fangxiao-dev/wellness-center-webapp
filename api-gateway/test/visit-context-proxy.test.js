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

function closeServer(server) {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  return new Promise((resolve) => server.close(resolve));
}

async function startGateway(visitContextUrl) {
  const originalVisitContextUrl = process.env.VISIT_CONTEXT_URL;
  process.env.VISIT_CONTEXT_URL = visitContextUrl;
  delete require.cache[gatewayServerPath];

  const app = require(gatewayServerPath);
  const server = http.createServer(app);
  const port = await listen(server);

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async stop() {
      await closeServer(server);
      delete require.cache[gatewayServerPath];
      if (originalVisitContextUrl === undefined) {
        delete process.env.VISIT_CONTEXT_URL;
      } else {
        process.env.VISIT_CONTEXT_URL = originalVisitContextUrl;
      }
    },
  };
}

test("gateway exposes health endpoint", async () => {
  const app = require(gatewayServerPath);
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.service, "api-gateway");
  } finally {
    server.close();
  }
});

test("gateway preserves weather provider field from visit-context weather current", async () => {
  const requests = [];
  const visitContext = http.createServer((req, res) => {
    requests.push(req.url);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      provider: "fallback",
      condition: "mild",
      temperatureC: 19,
      summary: "Mild weather is suitable for a calm visit.",
    }));
  });
  const visitContextPort = await listen(visitContext);
  const gateway = await startGateway(`http://127.0.0.1:${visitContextPort}`);

  try {
    const response = await fetch(`${gateway.baseUrl}/api/visit-context/weather/current?locationId=wellness-center-main`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.provider, "fallback");
    assert.equal(body.summary, "Mild weather is suitable for a calm visit.");
    assert.deepEqual(requests, ["/weather/current?locationId=wellness-center-main"]);
  } finally {
    await gateway.stop();
    await closeServer(visitContext);
  }
});

test("gateway proxies visit-context locations", async () => {
  const requests = [];
  const visitContext = http.createServer((req, res) => {
    requests.push(req.url);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify([
      {
        id: "wellness-center-main",
        name: "Serenity Wellness Center",
        destination: "Serenity Wellness Center, Boeblingen",
      },
    ]));
  });
  const visitContextPort = await listen(visitContext);
  const gateway = await startGateway(`http://127.0.0.1:${visitContextPort}`);

  try {
    const response = await fetch(`${gateway.baseUrl}/api/visit-context/locations`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body[0].id, "wellness-center-main");
    assert.equal(body[0].destination, "Serenity Wellness Center, Boeblingen");
    assert.deepEqual(requests, ["/locations"]);
  } finally {
    await gateway.stop();
    await closeServer(visitContext);
  }
});

test("gateway preserves weather provider field from visit-context visit summary", async () => {
  const visitContext = http.createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      location: { id: "wellness-center-main", name: "Serenity Wellness Center" },
      weather: {
        provider: "google",
        condition: "Partly cloudy",
        temperatureC: 21.4,
        summary: "Partly cloudy, 21.4 C near Serenity Wellness Center.",
      },
    }));
  });
  const visitContextPort = await listen(visitContext);
  const gateway = await startGateway(`http://127.0.0.1:${visitContextPort}`);

  try {
    const response = await fetch(`${gateway.baseUrl}/api/visit-context/visit-summary`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.weather.provider, "google");
    assert.equal(body.weather.condition, "Partly cloudy");
  } finally {
    await gateway.stop();
    await closeServer(visitContext);
  }
});
