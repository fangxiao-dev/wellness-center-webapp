const assert = require("node:assert/strict");
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
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

async function startBackend() {
  if (process.env.WEB_SHOP_BACKEND_TEST_BASE) {
    return {
      baseUrl: process.env.WEB_SHOP_BACKEND_TEST_BASE,
      stop: async () => {},
    };
  }

  const apiGateway = http.createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end("[]");
  });
  const apiGatewayPort = await listen(apiGateway);

  const portProbe = http.createServer((_req, res) => res.end());
  const port = await listen(portProbe);
  await new Promise((resolve) => portProbe.close(resolve));

  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      API_GATEWAY_URL: `http://127.0.0.1:${apiGatewayPort}`,
      REPO_ROOT: path.resolve(process.cwd(), "..", ".."),
    },
    stdio: "ignore",
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForHealth(baseUrl);
  } catch (err) {
    await stopChild(child);
    await closeServer(apiGateway);
    throw err;
  }

  return {
    baseUrl,
    async stop() {
      await stopChild(child);
      await closeServer(apiGateway);
    },
  };
}

test("home page preserves presentation structure with YouTube hero background", async () => {
  const backend = await startBackend();

  try {
    const response = await fetch(`${backend.baseUrl}/`);

    assert.equal(response.status, 200);

    const html = await response.text();

    assert.doesNotMatch(html, /\/minio\//);
    assert.match(html, /href="\/static\/ci\/wellness-ci\.css"/);
    assert.match(html, /site-nav--transparent/);
    assert.match(html, /id="heroYoutubePlayer"/);
    assert.match(html, /data-video-id="A9PhV0B2nmg"/);
    assert.match(html, /youtube\.com\/iframe_api/);
    assert.match(html, /youtube-nocookie\.com/);
    [
      "/static/images/home-hero.png",
      "/static/images/wellness-ai-hero.png",
      "/static/images/aftercare-preview.png",
      "/static/images/center-impression.png",
      "/static/images/package-relief.png",
      "/static/images/package-recovery.png",
      "/static/images/wellness-stage-loop.png",
    ].forEach((src) => assert.ok(html.includes(src), `expected home HTML to include ${src}`));
    assert.doesNotMatch(html, /\/api\/configurator\/assets\/home\//);
    assert.match(html, /class="hero-overlay"/);
    assert.match(html, /class="package-showcase package-stage-showcase"/);
    assert.match(html, /class="package-stage-grid"/);
    assert.match(html, /class="merch-preview-grid"/);
    assert.doesNotMatch(html, /\/api\/merch\//);
    assert.doesNotMatch(html, /Bayerische|Motoren|Werke/);
  } finally {
    await backend.stop();
  }
});

test("AI feature page uses static wellness hero image", async () => {
  const backend = await startBackend();

  try {
    const response = await fetch(`${backend.baseUrl}/ai-feature`);

    assert.equal(response.status, 200);

    const html = await response.text();

    assert.ok(html.includes("/static/images/wellness-ai-hero.png"));
    assert.doesNotMatch(html, /\/api\/configurator\/assets\/home\//);
  } finally {
    await backend.stop();
  }
});
