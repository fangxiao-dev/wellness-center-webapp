const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const express = require("express");

const app = express();
const port = process.env.PORT || 4102;
const apiGateway = process.env.API_GATEWAY_URL || "http://api-gateway:4101";

function resolveRepoRoot() {
  const candidates = [
    process.env.REPO_ROOT,
    path.resolve(__dirname, "..", "..", ".."),
    path.resolve(process.cwd(), "..", ".."),
    path.resolve(process.cwd(), ".."),
    process.cwd(),
  ].filter(Boolean);

  return candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "web", "views"))
  );
}

const repoRoot = resolveRepoRoot();

if (!repoRoot) {
  throw new Error("Could not locate shared web/views directory");
}

const viewsRoot = path.join(repoRoot, "web", "views");

app.set("view engine", "ejs");
app.set("views", viewsRoot);
app.disable("view cache");
app.use("/api", express.json());

function renderPage(res, view, locals = {}) {
  const viewLocals = { serializeJsonForScript, ...locals };
  ejs.renderFile(path.join(viewsRoot, `${view}.ejs`), viewLocals, {}, (viewErr, body) => {
    if (viewErr) return res.status(500).send(viewErr.message);

    res.render(path.join("layouts", "main"), { ...viewLocals, body }, (layoutErr, html) => {
      if (layoutErr) return res.status(500).send(layoutErr.message);
      return res.send(html);
    });
  });
}

function serializeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function readSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

function forwardSetCookieHeaders(upstream, res) {
  const cookies = readSetCookieHeaders(upstream.headers);
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);
}

function normalizeAssetApiPathFromRequest(req) {
  const rawUrl = String(req.originalUrl || "");
  const [rawPath, rawQuery] = rawUrl.split("?", 2);
  const supportedPrefixes = [
    "/api/configurator/assets",
    "/api/aftercare/assets",
  ];
  const publicPrefix = supportedPrefixes.find((prefix) => rawPath.startsWith(`${prefix}/`));

  if (!publicPrefix) return null;

  const rawSegments = rawPath.slice(publicPrefix.length + 1).split("/");
  const encodedSegments = [];

  for (const rawSegment of rawSegments) {
    if (!rawSegment || rawSegment === "." || rawSegment === "..") return null;

    let decodedSegment;
    try {
      decodedSegment = decodeURIComponent(rawSegment);
    } catch (_err) {
      return null;
    }

    if (
      !decodedSegment ||
      decodedSegment === "." ||
      decodedSegment === ".." ||
      decodedSegment.includes("/") ||
      decodedSegment.includes("\\")
    ) {
      return null;
    }

    encodedSegments.push(encodeURIComponent(decodedSegment));
  }

  return `${publicPrefix}/${encodedSegments.join("/")}${rawQuery ? `?${rawQuery}` : ""}`;
}

function isAssetApiPath(req) {
  return /^\/api\/(?:configurator|aftercare)\/assets(?:\/|$)/.test(
    String(req.originalUrl || "").split("?")[0]
  );
}

function buildApiGatewayUrl(req) {
  const assetPath = normalizeAssetApiPathFromRequest(req);
  if (assetPath) return new URL(assetPath, apiGateway);
  if (isAssetApiPath(req)) return null;
  return new URL(req.originalUrl, apiGateway);
}

async function forwardToApiGateway(req, res) {
  try {
    const upstreamUrl = buildApiGatewayUrl(req);
    if (!upstreamUrl) return res.status(400).json({ error: "invalid asset key" });

    const headers = {};
    if (req.headers.cookie) headers.cookie = req.headers.cookie;
    if (!["GET", "HEAD"].includes(req.method)) headers["content-type"] = "application/json";

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
    });

    res.status(upstream.status);
    forwardSetCookieHeaders(upstream, res);

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) res.setHeader("cache-control", cacheControl);

    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}

function getInitialPackageSelection(req) {
  if (!req.params.package) return null;
  const addOns = !req.params.addon || req.params.addon === "none"
    ? []
    : req.params.addon.split(",").map((addon) => addon.trim()).filter(Boolean);
  return {
    package: req.params.package,
    duration: req.params.duration,
    intensity: req.params.intensity,
    addOns,
  };
}

async function fetchJson(pathname, fallback) {
  const response = await fetch(new URL(pathname, apiGateway));
  if (!response.ok) return fallback;
  return response.json();
}

async function fetchJsonResponse(pathname) {
  const response = await fetch(new URL(pathname, apiGateway));
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };
  return { response, payload };
}

function getSerenityMapsKey() {
  return [process.env.SERENITY_MAPS_KEY, process.env.GOOGLE_MAPS_API_KEY]
    .map((key) => (key && key !== "replace_me" ? key : ""))
    .find(Boolean) || "";
}

app.all(/^\/api(?:\/.*)?$/, forwardToApiGateway);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "web-backend", timestamp: new Date().toISOString() });
});

app.get(["/", "/index.html"], (_req, res) => {
  renderPage(res, "home", {
    title: "Serenity Wellness Center",
    activePage: "home",
    navVariant: "transparent",
    mapsApiKey: "",
  });
});

app.get("/home", (_req, res) => res.redirect(301, "/"));

function renderConfigurator(req, res) {
  renderPage(res, "package-configurator", {
    title: "Configure a Package | Serenity Wellness Center",
    activePage: "configurator",
    initialSelection: getInitialPackageSelection(req),
  });
}

app.get("/package-configurator", renderConfigurator);
app.get("/package-configurator/:package/:duration/:intensity/:addon", renderConfigurator);

app.get("/ai-feature", (_req, res) => {
  renderPage(res, "ai-feature", {
    title: "AI Consultation | Serenity Wellness Center",
    activePage: "ai",
  });
});

app.get("/aftercare-shop", async (_req, res) => {
  try {
    const products = await fetchJson("/api/aftercare/products", []);
    renderPage(res, "aftercare-shop", {
      title: "Aftercare Shop | Serenity Wellness Center",
      activePage: "aftercare",
      products,
    });
  } catch (err) {
    res.status(502).send("aftercare-shop service unavailable: " + err.message);
  }
});

app.get("/aftercare-shop/:productId", async (req, res) => {
  try {
    const productId = encodeURIComponent(req.params.productId);
    const { response, payload } = await fetchJsonResponse(`/api/aftercare/products/${productId}`);

    if (response.status === 404) {
      return res.status(404).send("Aftercare product not found.");
    }

    if (!response.ok) {
      return res.status(502).send("aftercare-shop service unavailable: " + (payload.error || response.statusText));
    }

    return renderPage(res, "aftercare-product", {
      title: `${payload.name} | Aftercare | Serenity Wellness Center`,
      activePage: "aftercare",
      product: payload,
    });
  } catch (err) {
    return res.status(502).send("aftercare-shop service unavailable: " + err.message);
  }
});

app.get("/shopping-cart", (_req, res) => {
  renderPage(res, "shopping-cart", {
    title: "Cart | Serenity Wellness Center",
    activePage: "cart",
  });
});

app.get("/visit-context", async (_req, res) => {
  try {
    const visitSummary = await fetchJson("/api/visit-context/visit-summary", {
      location: {},
      weather: {},
    });

    renderPage(res, "visit-context", {
      title: "Visit Context | Serenity Wellness Center",
      activePage: "visit",
      mapsApiKey: getSerenityMapsKey(),
      visitSummary,
    });
  } catch (err) {
    res.status(502).send("visit-context service unavailable: " + err.message);
  }
});

app.get("/impressum", (_req, res) => {
  renderPage(res, "impressum", {
    title: "Impressum | Serenity Wellness Center",
    activePage: null,
  });
});

app.listen(port, () => console.log(`web-backend listening on port ${port}`));
