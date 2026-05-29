const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const express = require("express");

const app = express();
const port = process.env.PORT || 4101;

const CONFIGURATOR = process.env.CONFIGURATOR_URL || "http://package-configurator:4103";
const AFTERCARE = process.env.AFTERCARE_URL || "http://aftercare-shop:4104";
const CART = process.env.CART_URL || "http://shopping-cart:4106";
const AI = process.env.AI_URL || "http://ai-feature:4105";
const VISIT_CONTEXT = process.env.VISIT_CONTEXT_URL || "http://visit-context-service:4107";

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  if (!req.cookies.sessionId) {
    req.cookies.sessionId = crypto.randomUUID();
    res.cookie("sessionId", req.cookies.sessionId, { httpOnly: true });
  }
  next();
});

async function proxyJson(res, request) {
  try {
    const upstream = await request();
    const contentType = upstream.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await upstream.json()
      : { error: await upstream.text() };
    res.status(upstream.status).json(payload);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
}

async function proxyBinary(res, request) {
  try {
    const upstream = await request();
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    const cacheControl = upstream.headers.get("cache-control");
    if (contentType) res.setHeader("content-type", contentType);
    if (cacheControl) res.setHeader("cache-control", cacheControl);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
}

function normalizeAssetPathFromRequest(req, publicPrefix) {
  const rawPath = String(req.originalUrl || "").split("?")[0];
  if (!rawPath.startsWith(`${publicPrefix}/`)) return null;

  const encodedSegments = [];
  for (const rawSegment of rawPath.slice(publicPrefix.length + 1).split("/")) {
    if (!rawSegment || rawSegment === "." || rawSegment === "..") return null;
    let decodedSegment;
    try {
      decodedSegment = decodeURIComponent(rawSegment);
    } catch (_error) {
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
  return encodedSegments.join("/");
}

function queryString(req, allowedKeys = []) {
  const search = new URLSearchParams();
  for (const key of allowedKeys) {
    if (req.query[key] != null) search.set(key, String(req.query[key]));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api-gateway", timestamp: new Date().toISOString() });
});

app.get("/api/configurator/packages", (_req, res) => {
  proxyJson(res, () => fetch(`${CONFIGURATOR}/packages`));
});
app.get("/api/configurator/options/durations", (_req, res) => {
  proxyJson(res, () => fetch(`${CONFIGURATOR}/options/durations`));
});
app.get("/api/configurator/options/intensities", (_req, res) => {
  proxyJson(res, () => fetch(`${CONFIGURATOR}/options/intensities`));
});
app.get("/api/configurator/options/add-ons", (_req, res) => {
  proxyJson(res, () => fetch(`${CONFIGURATOR}/options/add-ons`));
});
app.post("/api/configurator/configuration/calculate", (req, res) => {
  proxyJson(res, () => fetch(`${CONFIGURATOR}/configuration/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  }));
});
app.get(/^\/api\/configurator\/assets\/.+$/, (req, res) => {
  const assetPath = normalizeAssetPathFromRequest(req, "/api/configurator/assets");
  if (!assetPath) return res.status(400).json({ error: "invalid asset key" });
  proxyBinary(res, () => fetch(`${CONFIGURATOR}/assets/${assetPath}`));
});

app.get("/api/aftercare/products", (_req, res) => {
  proxyJson(res, () => fetch(`${AFTERCARE}/products`));
});
app.get("/api/aftercare/products/:productId", (req, res) => {
  proxyJson(res, () => fetch(`${AFTERCARE}/products/${encodeURIComponent(req.params.productId)}`));
});
app.get(/^\/api\/aftercare\/assets\/.+$/, (req, res) => {
  const assetPath = normalizeAssetPathFromRequest(req, "/api/aftercare/assets");
  if (!assetPath) return res.status(400).json({ error: "invalid asset key" });
  proxyBinary(res, () => fetch(`${AFTERCARE}/assets/${assetPath}`));
});

app.get("/api/visit-context/locations", (_req, res) => {
  proxyJson(res, () => fetch(`${VISIT_CONTEXT}/locations`));
});
app.get("/api/visit-context/weather/current", (req, res) => {
  proxyJson(res, () => fetch(`${VISIT_CONTEXT}/weather/current${queryString(req, ["locationId"])}`));
});
app.get("/api/visit-context/visit-summary", (req, res) => {
  proxyJson(res, () => fetch(`${VISIT_CONTEXT}/visit-summary${queryString(req, ["locationId"])}`));
});

app.get("/api/cart", (req, res) => {
  proxyJson(res, () => fetch(`${CART}/cart/${req.cookies.sessionId}`));
});
app.post("/api/cart/items", (req, res) => {
  proxyJson(res, () => fetch(`${CART}/cart/${req.cookies.sessionId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  }));
});
app.patch("/api/cart/items/:itemId", (req, res) => {
  proxyJson(res, () => fetch(`${CART}/cart/${req.cookies.sessionId}/items/${encodeURIComponent(req.params.itemId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  }));
});
app.delete("/api/cart", (req, res) => {
  proxyJson(res, () => fetch(`${CART}/cart/${req.cookies.sessionId}`, { method: "DELETE" }));
});
app.delete("/api/cart/items/:itemId", (req, res) => {
  proxyJson(res, () => fetch(`${CART}/cart/${req.cookies.sessionId}/items/${encodeURIComponent(req.params.itemId)}`, {
    method: "DELETE",
  }));
});

app.post("/api/ai/recommend", (req, res) => {
  proxyJson(res, () => fetch(`${AI}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  }));
});

if (require.main === module) {
  app.listen(port, () => console.log(`api-gateway listening on port ${port}`));
}

module.exports = app;
