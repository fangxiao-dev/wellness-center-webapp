const path = require("path");
const fs = require("fs");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const app = express();
const port = process.env.PORT || 4100;
const backendUrl = process.env.WEB_BACKEND_URL || "http://web-backend:4102";
const minioEndpoint = process.env.MINIO_ENDPOINT || "minio";
const minioPort = process.env.MINIO_PORT || "9000";
const minioBucket = process.env.MINIO_BUCKET || "wellness-media";
const minioBaseUrl = `http://${minioEndpoint}:${minioPort}`;
const mediaResponseHeaders = [
  "content-type",
  "content-range",
  "accept-ranges",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "expires",
];

function resolveRepoRoot() {
  const candidates = [
    process.env.REPO_ROOT,
    path.resolve(__dirname, "..", "..", ".."),
    path.resolve(process.cwd(), "..", ".."),
    path.resolve(process.cwd(), ".."),
    process.cwd(),
  ].filter(Boolean);

  return candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "web", "public"))
  );
}

const repoRoot = resolveRepoRoot();

if (!repoRoot) {
  throw new Error("Could not locate shared web/public directory");
}

app.use(/^\/static\/images\/[^/]+\.mp4$/i, (_req, res) => {
  res.status(404).end();
});

app.use("/static", express.static(path.join(repoRoot, "web", "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "web-frontend" });
});

function getHomeMediaFilename(originalUrl) {
  const rawPath = originalUrl.split("?")[0];
  const prefix = "/media/home/";

  if (!rawPath.startsWith(prefix)) {
    return null;
  }

  const rawFilename = rawPath.slice(prefix.length);

  if (!rawFilename) {
    return null;
  }

  let filename;
  try {
    filename = decodeURIComponent(rawFilename);
  } catch (_error) {
    return null;
  }

  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\") ||
    !filename.endsWith(".mp4")
  ) {
    return null;
  }

  return filename;
}

function sendMediaUpstreamError(res) {
  if (res.headersSent) {
    if (!res.destroyed) {
      res.destroy();
    }
    return;
  }

  res.status(502).type("text/plain").send("Upstream media service unavailable");
}

async function proxyHomeMedia(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).end();
    return;
  }

  const filename = getHomeMediaFilename(req.originalUrl);

  if (!filename) {
    res.status(400).end();
    return;
  }

  const upstreamUrl = `${minioBaseUrl}/${encodeURIComponent(minioBucket)}/home/${encodeURIComponent(filename)}`;
  const upstreamHeaders = {};

  if (req.headers.range) {
    upstreamHeaders.Range = req.headers.range;
  }

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
    });
  } catch (_error) {
    sendMediaUpstreamError(res);
    return;
  }

  res.status(upstream.status);
  for (const headerName of mediaResponseHeaders) {
    const headerValue = upstream.headers.get(headerName);
    if (headerValue) {
      res.setHeader(headerName, headerValue);
    }
  }

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  try {
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (_error) {
    sendMediaUpstreamError(res);
  }
}

app.all(/^\/media\/home(?:\/.*)?$/, (req, res, next) => {
  proxyHomeMedia(req, res).catch(next);
});

app.use(
  createProxyMiddleware({
    target: backendUrl,
    changeOrigin: false,
    xfwd: true,
  })
);

if (require.main === module) {
  app.listen(port, () => console.log(`web-frontend listening on port ${port}`));
}

module.exports = app;
