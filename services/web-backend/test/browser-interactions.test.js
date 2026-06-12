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
  path.resolve(__dirname, "..", "..", "..", "web", "views", "layouts", "main.ejs"),
  path.resolve(__dirname, "..", "..", "..", "web", "views", "package-configurator.ejs"),
  path.resolve(__dirname, "..", "..", "..", "web", "views", "visit-context.ejs"),
  path.resolve(__dirname, "..", "..", "..", "web", "views", "ai-feature.ejs"),
  path.resolve(__dirname, "..", "..", "..", "web", "views", "shopping-cart.ejs"),
].map((filePath) => ({
  filePath,
  content: fs.readFileSync(filePath, "utf8"),
}));

test("cart browser script can update item quantities through PATCH", () => {
  const cart = runtimeSourceFiles.find((file) =>
    file.filePath.endsWith(path.join("web", "views", "shopping-cart.ejs"))
  ).content;

  assert.match(cart, /method:\s*["']PATCH["']/);
  assert.match(cart, /\/api\/cart\/items\/\$\{btn\.dataset\.id\}/);
});

test("visit context browser script loads Google Maps when a key is configured", () => {
  assert.match(appJs, /maps\.googleapis\.com\/maps\/api\/js/);
  assert.match(appJs, /window\.SERENITY_MAPS_KEY/);
  assert.doesNotMatch(appJs, /GOOGLE_MAPS_API_KEY/);
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
  const ai = runtimeSourceFiles.find((file) =>
    file.filePath.endsWith(path.join("web", "views", "ai-feature.ejs"))
  ).content;
  const cart = runtimeSourceFiles.find((file) =>
    file.filePath.endsWith(path.join("web", "views", "shopping-cart.ejs"))
  ).content;

  assert.match(appJs, /function escapeHtml/);
  assert.match(appJs, /escapeHtml\(location\.name/);
  assert.match(ai, /const escapeHtml/);
  assert.match(ai, /escapeHtml\(rawTitle/);
  assert.match(cart, /textContent = normalizeText\(item\.name\)/);
});

test("global browser script keeps helpers out of the page global scope", () => {
  assert.match(appJs.trimStart(), /^\(function \(\) \{/);
  assert.match(appJs.trimEnd(), /\}\)\(\);$/);
});

test("browser script derives a string package name from configured package objects", () => {
  const configurator = runtimeSourceFiles.find((file) =>
    file.filePath.endsWith(path.join("web", "views", "package-configurator.ejs"))
  ).content;

  assert.match(configurator, /name:\s*cfg\.package\.name/);
  assert.match(configurator, /details:\s*\{/);
});

test("package configurator browser code loads valid configurations as the option source", () => {
  const configurator = runtimeSourceFiles.find((file) =>
    file.filePath.endsWith(path.join("web", "views", "package-configurator.ejs"))
  ).content;

  assert.match(configurator, /\/api\/configurator\/configurations/);
  assert.doesNotMatch(configurator, /\/api\/configurator\/options\/durations/);
  assert.doesNotMatch(configurator, /\/api\/configurator\/options\/intensities/);
  assert.doesNotMatch(configurator, /\/api\/configurator\/options\/add-ons/);
});

test("package configurator filters controls and falls back through enabled valid combinations", () => {
  const configurator = runtimeSourceFiles.find((file) =>
    file.filePath.endsWith(path.join("web", "views", "package-configurator.ejs"))
  ).content;

  assert.match(configurator, /state\.configurations/);
  assert.match(configurator, /function getValidConfigurations/);
  assert.match(configurator, /function reconcileSelection/);
  assert.match(configurator, /configurationMatchesSelection/);
  assert.match(configurator, /allowedAddOnsForSelection/);
});

test("home is a teaser for the canonical visit context route", () => {
  const home = runtimeSourceFiles.find((file) => file.filePath.endsWith(path.join("web", "views", "home.ejs"))).content;

  assert.match(home, /href="\/visit-context"/);
  assert.match(home, /Plan your visit/);
  assert.doesNotMatch(home, /\/api\/destinations/);
  assert.doesNotMatch(home, /\/api\/visit-context\/(?:locations|visit-summary)/);
  assert.doesNotMatch(home, /maps\.googleapis\.com/);
});

test("global browser script does not bind removed page-local DOM contracts", () => {
  const staleContracts = [
    "#configurator-form",
    "#ai-form",
    "#cart-items",
    ".add-aftercare-button",
    "function addAftercareItem",
    "function initConfigurator",
    "function initAftercareButtons",
    "function initAi",
    "function initCart",
  ];

  for (const contract of staleContracts) {
    assert.doesNotMatch(
      appJs,
      new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${contract} should not be bound from global app.js`
    );
  }
});

test("active browser sources use aftercare naming instead of stale shop runtime names", () => {
  const staleShopNamePattern = new RegExp(`\\b${"mer" + "ch"}[A-Za-z0-9_-]*|[A-Za-z0-9_-]*${"mer" + "ch"}[A-Za-z0-9_-]*\\b`, "i");

  for (const { filePath, content } of runtimeSourceFiles) {
    assert.doesNotMatch(
      content,
      staleShopNamePattern,
      `stale shop runtime naming found in ${filePath}`
    );
  }
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
