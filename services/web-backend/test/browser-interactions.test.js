const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appJs = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", "web", "public", "app.js"),
  "utf8"
);

test("cart browser script can update item quantities through PATCH", () => {
  assert.match(appJs, /method:\s*["']PATCH["']/);
  assert.match(appJs, /\/api\/cart\/items\/\$\{encodeURIComponent\([^}]+\)\}/);
});

test("visit context browser script loads Google Maps when a key is configured", () => {
  assert.match(appJs, /maps\.googleapis\.com\/maps\/api\/js/);
  assert.match(appJs, /window\.google\.maps\.Map/);
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
