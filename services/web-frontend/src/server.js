const path = require("path");
const fs = require("fs");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const port = process.env.PORT || 4100;
const backendUrl = process.env.WEB_BACKEND_URL || "http://web-backend:4102";

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

app.use("/static", express.static(path.join(repoRoot, "web", "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "web-frontend" });
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
