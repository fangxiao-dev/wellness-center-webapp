const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appJs = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", "web", "public", "app.js"),
  "utf8"
);

const runtimeSourceFiles = [
  path.resolve(__dirname, "..", "..", "..", "web", "public", "app.js"),
  path.resolve(__dirname, "..", "..", "..", "web", "views", "home.ejs"),
  path.resolve(__dirname, "..", "..", "..", "web", "views", "visit-context.ejs"),
  path.resolve(__dirname, "..", "..", "..", "web", "views", "ai-feature.ejs"),
].map((filePath) => ({
  filePath,
  content: fs.readFileSync(filePath, "utf8"),
}));

test("cart browser script can update item quantities through PATCH", () => {
  assert.match(appJs, /method:\s*["']PATCH["']/);
  assert.match(appJs, /\/api\/cart\/items\/\$\{encodeURIComponent\([^}]+\)\}/);
});

test("visit context browser script loads Google Maps when a key is configured", () => {
  assert.match(appJs, /maps\.googleapis\.com\/maps\/api\/js/);
  assert.match(appJs, /window\.google\.maps\.Map/);
});

test("visit context browser script requests the visit summary through the gateway route", () => {
  assert.match(appJs, /\/api\/visit-context\/visit-summary/);
  assert.doesNotMatch(appJs, /\/api\/destinations/);
});

test("visit context browser script renders all visit summary fields and useful map fallback", () => {
  assert.match(appJs, /openingNote/);
  assert.match(appJs, /arrivalTip/);
  assert.match(appJs, /weather(?:\?\.)?\.summary|weatherSummary/);
  assert.match(appJs, /Google Maps key/);
  assert.match(appJs, /location\.address/);
});

test("browser script escapes API text before rendering HTML", () => {
  assert.match(appJs, /function escapeHtml/);
  assert.match(appJs, /escapeHtml\(body\.text/);
  assert.match(appJs, /escapeHtml\(item\.name/);
  assert.match(appJs, /escapeHtml\(location\.name/);
});

test("browser script derives a string package name from configured package objects", () => {
  assert.match(appJs, /function packageDisplayName/);
  assert.match(appJs, /packageDisplayName\(configured\)/);
});

test("home browser code uses visit context APIs instead of removed destinations route", () => {
  const home = runtimeSourceFiles.find((file) => file.filePath.endsWith(path.join("web", "views", "home.ejs"))).content;

  assert.doesNotMatch(home, /\/api\/destinations/);
  assert.match(home, /\/api\/visit-context\/(?:locations|visit-summary)/);
});

test("runtime browser sources do not contain stale BMW route-service terms", () => {
  const staleTerms = [
    "car-reveal",
    "carModel",
    "SportsCarOverlay",
    "route-car-marker",
    "/api/destinations",
    "BMW",
    "route planning",
    "vehicle",
  ];

  for (const { filePath, content } of runtimeSourceFiles) {
    for (const term of staleTerms) {
      assert.doesNotMatch(
        content,
        new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        `${term} found in ${filePath}`
      );
    }
  }
});
