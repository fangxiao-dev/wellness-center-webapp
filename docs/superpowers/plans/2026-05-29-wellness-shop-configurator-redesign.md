# Aftercare Shop & Package Configurator Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/aftercare-shop` an inline add-to-cart product grid (no detail page, image not a link), and turn `/package-configurator` into an honest layered-compositing configurator (package base scene + toggleable transparent add-on prop layers; any duration×intensity×add-ons combination valid).

**Architecture:** MySQL seed drops the 9-row combination matrix and stores one base image per package + one transparent prop image per add-on. The configurator service computes price from deltas (no combination lookup) and returns a base image + active add-on layers. The EJS preview stacks transparent PNG layers like a car configurator. The aftercare page becomes self-contained product cards posting directly to the cart. Deep links from AI/home repoint to a scroll anchor; the AI→configurator deep link is preserved with renamed params.

**Tech Stack:** Node.js + Express services, `node --test` (built-in) + `node:assert/strict`, EJS views, MySQL (mysql2), MinIO assets via `mc mirror`, vanilla JS frontend.

Spec: `docs/superpowers/specs/2026-05-29-wellness-shop-configurator-redesign-design.md`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `services/ai-feature/src/recommendation.js` | recommendation response builder | Modify `href` to anchor form |
| `services/ai-feature/test/recommendation.smoke.js` | smoke test | Modify `href` assertion |
| `web/views/aftercare-shop.ejs` | shop grid | Rewrite: inline cart cards, flat list, slug anchor |
| `web/views/aftercare-product.ejs` | product detail | **Delete** |
| `services/web-backend/src/server.js` | SSR routes + initial selection | Delete detail route; rename `getInitialPackageSelection` keys |
| `services/web-backend/test/backend-routing.test.js` | SSR route tests | Update aftercare/detail assertions |
| `web/views/home.ejs` | home aftercare tiles | Repoint links to anchor |
| `web/views/ai-feature.ejs` | AI recommendation render | Repoint `safeProductPath` to anchor |
| `infrastructure/mysql/init/02_package_configurator.sql` | configurator seed | Add image columns, drop matrix tables |
| `services/package-configurator/src/server.js` | configurator API | Pure price/summary helpers; rewrite `calculate`; image URLs |
| `services/package-configurator/test/package-configurator.test.js` | configurator tests | Replace with helper unit tests |
| `web/views/package-configurator.ejs` | configurator UI | Rewrite: layered preview, multi-select add-ons, remove car code |
| `assets/package-configurator/addons/*.png` | add-on prop layers | Create transparent placeholders (user replaces via prompts) |

---

## Task 1: Repoint AI recommendation aftercare link to shop anchor

**Files:**
- Modify: `services/ai-feature/src/recommendation.js` (the `href` line in `buildRecommendationResponse`)
- Test: `services/ai-feature/test/recommendation.smoke.js`

- [ ] **Step 1: Update the smoke test expectation (failing test)**

In `services/ai-feature/test/recommendation.smoke.js`, change the `aftercareLinks` href assertion:

```javascript
  assert.deepEqual(response.aftercareLinks, [{
    id: 1,
    href: "/aftercare-shop#product-heated-neck-wrap",
    title: "Heated Neck Wrap",
    imageUrl: "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png",
    price: 34.9,
    reason: "Supports warmth after the session.",
  }]);
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `cd services/ai-feature && node --test test/recommendation.smoke.js`
Expected: FAIL — actual href is `/aftercare-shop/heated-neck-wrap`.

- [ ] **Step 3: Update the builder**

In `services/ai-feature/src/recommendation.js`, inside `buildRecommendationResponse`, change the `href`:

```javascript
        href: `/aftercare-shop#product-${product?.slug || item.id}`,
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `cd services/ai-feature && node --test test/recommendation.smoke.js`
Expected: PASS — "recommendation smoke test passed".

- [ ] **Step 5: Commit**

```bash
git add services/ai-feature/src/recommendation.js services/ai-feature/test/recommendation.smoke.js
git commit -m "feat: link AI aftercare recommendations to shop anchor"
```

---

## Task 2: Rewrite aftercare-shop view as inline add-to-cart grid

**Files:**
- Modify (full rewrite): `web/views/aftercare-shop.ejs`

- [ ] **Step 1: Replace the entire file content**

```ejs
<style>
  /* Aftercare-shop-specific layout. Wellness UI tokens, fonts, page-shell, site-nav,
     site-footer, section-*, .btn*, .field/.input, .card* live in
     /static/ci/wellness-ci.css. */

  .aftercare-shop-layout { max-width: 1200px; margin: 0 auto; padding: 40px 20px 80px; }
  .shop-header { margin-bottom: 40px; }
  .shop-header h1 { font-size: 2.8rem; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 8px; }
  .shop-header p { color: var(--muted); font-size: 1.1rem; }

  .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 22px; }

  .product-card {
    display: flex; flex-direction: column;
    border: 1px solid var(--line); border-radius: 14px; background: #fff; overflow: hidden;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
  }
  .product-card:hover { box-shadow: 0 16px 40px rgba(0,0,0,0.1); transform: translateY(-2px); }
  .product-card-media { aspect-ratio: 4 / 3; background: #f1f5f9; }
  .product-card-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .product-card-body { display: flex; flex-direction: column; gap: 6px; padding: 16px 16px 18px; flex: 1; }
  .product-card-category { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); }
  .product-card-name { font-size: 1.05rem; font-weight: 700; margin: 0; line-height: 1.25; }
  .product-card-desc { font-size: 0.86rem; color: var(--muted); line-height: 1.45; margin: 0; flex: 1; }
  .product-card-price { font-size: 1.1rem; font-weight: 800; margin-top: 4px; }
  .product-card-actions { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .qty-stepper { display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .qty-stepper button { width: 36px; height: 40px; border: 0; background: #fff; font-size: 1.1rem; cursor: pointer; color: var(--ink); }
  .qty-stepper button:hover { background: #f1f5f9; }
  .qty-stepper input { width: 40px; height: 40px; border: 0; text-align: center; font-weight: 700; font-size: 0.95rem; -moz-appearance: textfield; }
  .qty-stepper input::-webkit-outer-spin-button, .qty-stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .product-card-actions .btn { flex: 1; min-height: 44px; }
  .product-card-status { min-height: 18px; font-size: 0.8rem; font-weight: 700; margin-top: 6px; }

  @media (max-width: 640px) { .shop-header h1 { font-size: 2.2rem; } }
</style>

<div class="aftercare-shop-layout">
  <header class="shop-header">
    <h1>Aftercare</h1>
    <p>Aftercare products for calm, mobility, and recovery after your visit.</p>
  </header>

  <div class="product-grid">
    <% products.forEach(function(product) { %>
      <article class="product-card" id="product-<%= product.slug || product.id %>" data-product-card
               data-id="<%= product.id %>"
               data-name="<%= product.name %>"
               data-price="<%= product.price %>"
               data-image="<%= product.imageUrl %>">
        <div class="product-card-media">
          <img src="<%= product.imageUrl %>" alt="<%= product.name %>" loading="lazy" />
        </div>
        <div class="product-card-body">
          <span class="product-card-category"><%= product.category %></span>
          <h2 class="product-card-name"><%= product.name %></h2>
          <% if (product.description) { %><p class="product-card-desc"><%= product.description %></p><% } %>
          <span class="product-card-price"><%= parseFloat(product.price).toLocaleString("en-US", { style: "currency", currency: "EUR" }) %></span>
          <div class="product-card-actions">
            <div class="qty-stepper">
              <button type="button" data-qty-dec aria-label="Decrease quantity">&minus;</button>
              <input type="number" min="1" value="1" data-qty aria-label="Quantity" />
              <button type="button" data-qty-inc aria-label="Increase quantity">+</button>
            </div>
            <button class="btn btn-primary" type="button" data-add>Add to cart</button>
          </div>
          <div class="product-card-status" data-status aria-live="polite"></div>
        </div>
      </article>
    <% }) %>
  </div>
</div>

<script>
  document.querySelectorAll("[data-product-card]").forEach((card) => {
    const qtyInput = card.querySelector("[data-qty]");
    const status = card.querySelector("[data-status]");

    const clampQty = () => {
      const value = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      qtyInput.value = value;
      return value;
    };

    card.querySelector("[data-qty-dec]").addEventListener("click", () => { qtyInput.value = Math.max(1, clampQty() - 1); });
    card.querySelector("[data-qty-inc]").addEventListener("click", () => { qtyInput.value = clampQty() + 1; });
    qtyInput.addEventListener("change", clampQty);

    card.querySelector("[data-add]").addEventListener("click", async () => {
      status.style.color = "#047857";
      status.textContent = "Adding...";
      try {
        const response = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "aftercare",
            name: card.dataset.name,
            price: parseFloat(card.dataset.price),
            imageUrl: card.dataset.image,
            quantity: clampQty(),
            details: { productId: Number(card.dataset.id) },
          }),
        });
        if (!response.ok) throw new Error("cart request failed");
        status.textContent = "Added to cart.";
      } catch (error) {
        status.style.color = "#b91c1c";
        status.textContent = "Cart is currently unavailable.";
      }
    });
  });

  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.style.outline = "3px solid var(--accent)";
        target.style.borderRadius = "14px";
        setTimeout(() => { target.style.outline = ""; }, 1800);
      }, 100);
    }
  }
</script>
```

- [ ] **Step 2: Verify the existing SSR test still passes**

Run: `cd services/web-backend && node --test test/backend-routing.test.js`
Expected: PASS — the "aftercare listing SSR" test asserts `class="aftercare-shop-layout"` (preserved) and the single `/api/aftercare/products` fetch (unchanged).

- [ ] **Step 3: Commit**

```bash
git add web/views/aftercare-shop.ejs
git commit -m "feat: inline add-to-cart on aftercare shop grid"
```

---

## Task 3: Delete the aftercare detail page and repoint deep links

**Files:**
- Delete: `web/views/aftercare-product.ejs`
- Modify: `services/web-backend/src/server.js` (remove `GET /aftercare-shop/:productId`)
- Modify: `web/views/home.ejs` (line ~1147 aftercare tile link)
- Modify: `web/views/ai-feature.ejs` (line ~567 `safeProductPath`)
- Test: `services/web-backend/test/backend-routing.test.js`

- [ ] **Step 1: Delete the detail view and route**

Delete file `web/views/aftercare-product.ejs`.

In `services/web-backend/src/server.js`, remove the entire block:

```javascript
app.get("/aftercare-shop/:productId", async (req, res) => {
  try {
    const product = await fetchJson(`/api/aftercare/products/${encodeURIComponent(req.params.productId)}`, null);
    renderPage(res, "aftercare-product", {
      title: product ? `${product.name} | Aftercare Shop` : "Product not found",
      activePage: "merch",
      product,
    });
  } catch (err) {
    res.status(502).send("aftercare-shop service unavailable: " + err.message);
  }
});
```

- [ ] **Step 2: Repoint the home aftercare tile**

In `web/views/home.ejs` (~line 1147), change the card to a non-detail anchor link:

```ejs
          <a class="merch-card" href="/aftercare-shop#product-<%= product.slug %>">
```

(href changes from `/aftercare-shop/<%= product.slug %>` to `/aftercare-shop#product-<%= product.slug %>`.)

- [ ] **Step 3: Repoint the AI recommendation product path**

In `web/views/ai-feature.ejs` (~line 567), change `safeProductPath`:

```javascript
        const safeProductPath = (typeof href === "string" && href.startsWith("/aftercare-shop#product-")) ? href : `/aftercare-shop#product-${id}`;
```

- [ ] **Step 4: Update the routing test**

In `services/web-backend/test/backend-routing.test.js`, ensure the aftercare product mock includes a `slug` so the anchor renders cleanly, and confirm there is no test asserting the removed detail route. If a detail-route test exists (referencing `renderPage("aftercare-product")` or `GET /aftercare-shop/<id>` returning product detail HTML), delete that test block. Add `slug: "heated-neck-wrap"` to the product mock object (around line 142-146):

```javascript
        {
          id: 1,
          slug: "heated-neck-wrap",
          name: "Heated Neck Wrap",
          category: "heat-care",
          price: 34.9,
          imageUrl: "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png",
          description: "Reusable warmth for neck and shoulder aftercare.",
        },
```

- [ ] **Step 5: Run the routing test**

Run: `cd services/web-backend && node --test test/backend-routing.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/views/aftercare-product.ejs services/web-backend/src/server.js web/views/home.ejs web/views/ai-feature.ejs services/web-backend/test/backend-routing.test.js
git commit -m "refactor: remove aftercare detail page, repoint deep links to shop anchor"
```

---

## Task 4: Configurator SQL — image columns, drop the combination matrix

**Files:**
- Modify (full rewrite): `infrastructure/mysql/init/02_package_configurator.sql`

- [ ] **Step 1: Replace the entire file content**

```sql
CREATE DATABASE IF NOT EXISTS wellness_package_configurator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wellness_package_configurator;

SET NAMES utf8mb4;

DROP TABLE IF EXISTS configuration_addons;
DROP TABLE IF EXISTS configuration_images;
DROP TABLE IF EXISTS configurations;
DROP TABLE IF EXISTS add_ons;
DROP TABLE IF EXISTS intensities;
DROP TABLE IF EXISTS durations;
DROP TABLE IF EXISTS packages;

CREATE TABLE packages (
  id INT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  goal VARCHAR(255) NOT NULL,
  description VARCHAR(500) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  base_minutes INT NOT NULL,
  minio_object VARCHAR(255) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE durations (
  id INT PRIMARY KEY,
  minutes INT NOT NULL UNIQUE,
  label VARCHAR(50) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE intensities (
  id INT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE add_ons (
  id INT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minio_object VARCHAR(255) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO packages
  (id, slug, name, goal, description, base_price, base_minutes, minio_object)
VALUES
  (1, 'neck-shoulder-relief', 'Neck & Shoulder Relief', 'release neck and shoulder tension', 'Focused massage package for desk fatigue, shoulder tightness, and upper back relief.', 59.00, 45, 'package-configurator/neck-shoulder-relief.png'),
  (2, 'stress-reset-massage', 'Stress Reset Massage', 'calm down and reset after stress', 'Relaxation-led massage package with slower rhythm and calming add-ons.', 64.00, 45, 'package-configurator/stress-reset-massage.png'),
  (3, 'warm-recovery-massage', 'Warm Recovery Massage', 'restore warmth and gentle mobility', 'Warmth-focused massage package for cold days and general body recovery.', 69.00, 45, 'package-configurator/warm-recovery-massage.png');

INSERT INTO durations
  (id, minutes, label, price_delta)
VALUES
  (1, 45, '45 min', 0.00),
  (2, 60, '60 min', 18.00),
  (3, 90, '90 min', 45.00);

INSERT INTO intensities
  (id, slug, label, description, price_delta)
VALUES
  (1, 'gentle', 'Gentle', 'Soft pressure for relaxation and comfort.', 0.00),
  (2, 'medium', 'Medium', 'Balanced pressure for common tension relief.', 6.00),
  (3, 'deep', 'Deep', 'More focused pressure for persistent muscle tightness.', 12.00);

INSERT INTO add_ons
  (id, slug, name, description, price_delta, minio_object)
VALUES
  (1, 'hot-stone', 'Hot Stone', 'Warm stones for deeper comfort and warmth.', 14.00, 'package-configurator/addons/hot-stone.png'),
  (2, 'aroma-oil', 'Aroma Oil', 'Calming aroma oil for a quiet relaxation session.', 9.00, 'package-configurator/addons/aroma-oil.png'),
  (3, 'stretching', 'Gentle Stretching', 'Short guided stretching add-on after massage.', 11.00, 'package-configurator/addons/stretching.png'),
  (4, 'warm-towel', 'Warm Towel Finish', 'Warm towel finish for a calmer end to the session.', 6.00, 'package-configurator/addons/warm-towel.png');
```

- [ ] **Step 2: Commit**

```bash
git add infrastructure/mysql/init/02_package_configurator.sql
git commit -m "feat: configurator seed with per-package and per-addon images, no matrix"
```

---

## Task 5: Configurator service — pure price/summary helpers + rewritten calculate

**Files:**
- Modify: `services/package-configurator/src/server.js`
- Test (full rewrite): `services/package-configurator/test/package-configurator.test.js`

- [ ] **Step 1: Write failing unit tests for the pure helpers**

Replace the content of `services/package-configurator/test/package-configurator.test.js`:

```javascript
const assert = require("node:assert/strict");
const test = require("node:test");

const { computePackagePrice, buildConfigurationSummary } = require("../src/server");

test("computePackagePrice sums base price and all deltas", () => {
  const price = computePackagePrice({
    basePrice: 64,
    durationDelta: 18,
    intensityDelta: 6,
    addOnDeltas: [9, 6],
  });
  assert.equal(price, 103);
});

test("computePackagePrice handles no add-ons", () => {
  const price = computePackagePrice({
    basePrice: 59,
    durationDelta: 0,
    intensityDelta: 0,
    addOnDeltas: [],
  });
  assert.equal(price, 59);
});

test("buildConfigurationSummary lists duration, intensity and add-ons", () => {
  const summary = buildConfigurationSummary({
    packageName: "Stress Reset Massage",
    minutes: 60,
    intensityLabel: "Medium",
    addOnNames: ["Aroma Oil", "Warm Towel Finish"],
  });
  assert.equal(
    summary,
    "A 60-minute Stress Reset Massage at medium pressure with Aroma Oil and Warm Towel Finish."
  );
});

test("buildConfigurationSummary omits the add-on clause when none selected", () => {
  const summary = buildConfigurationSummary({
    packageName: "Neck & Shoulder Relief",
    minutes: 45,
    intensityLabel: "Gentle",
    addOnNames: [],
  });
  assert.equal(summary, "A 45-minute Neck & Shoulder Relief at gentle pressure.");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd services/package-configurator && node --test test/package-configurator.test.js`
Expected: FAIL — `computePackagePrice`/`buildConfigurationSummary` are not exported.

- [ ] **Step 3: Add the pure helpers and export them**

In `services/package-configurator/src/server.js`, add these functions near the top (after `asMoney`):

```javascript
function computePackagePrice({ basePrice, durationDelta, intensityDelta, addOnDeltas }) {
  const addOnsTotal = (addOnDeltas || []).reduce((sum, delta) => sum + asMoney(delta), 0);
  return asMoney(basePrice) + asMoney(durationDelta) + asMoney(intensityDelta) + addOnsTotal;
}

function joinNames(names) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function buildConfigurationSummary({ packageName, minutes, intensityLabel, addOnNames }) {
  const base = `A ${minutes}-minute ${packageName} at ${String(intensityLabel).toLowerCase()} pressure`;
  const addOns = addOnNames && addOnNames.length ? ` with ${joinNames(addOnNames)}` : "";
  return `${base}${addOns}.`;
}
```

At the bottom, extend `module.exports`:

```javascript
module.exports = app;
module.exports.computePackagePrice = computePackagePrice;
module.exports.buildConfigurationSummary = buildConfigurationSummary;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd services/package-configurator && node --test test/package-configurator.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire image URLs into `mapPackage` and `mapAddon`**

In `services/package-configurator/src/server.js`, update both mappers:

```javascript
function mapPackage(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    goal: row.goal,
    description: row.description,
    basePrice: asMoney(row.base_price),
    baseMinutes: Number(row.base_minutes),
    imageUrl: toPublicPackageImageUrl(row.minio_object),
  };
}

function mapAddon(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceDelta: asMoney(row.price_delta),
    imageUrl: toPublicPackageImageUrl(row.minio_object),
  };
}
```

- [ ] **Step 6: Remove the matrix code and rewrite `calculate`**

Delete `getConfigurationById`, `mapConfiguration`, and the `GET /configurations` and `GET /configurations/:id` route handlers. Replace the `POST /configuration/calculate` handler with:

```javascript
app.post("/configuration/calculate", async (req, res) => {
  const body = req.body || {};
  if (!body.package) return res.status(400).json({ error: "package is required" });

  const minutes = Number.parseInt(body.duration, 10);
  if (!Number.isInteger(minutes)) return res.status(400).json({ error: "duration (minutes) is required" });
  if (!body.intensity) return res.status(400).json({ error: "intensity is required" });

  const addOnSlugs = Array.isArray(body.addOns)
    ? body.addOns.filter((slug) => typeof slug === "string" && slug.trim())
    : [];

  try {
    const [pkgRows, durationRows, intensityRows] = await Promise.all([
      query("SELECT * FROM packages WHERE slug = ? LIMIT 1", [body.package]),
      query("SELECT * FROM durations WHERE minutes = ? LIMIT 1", [minutes]),
      query("SELECT * FROM intensities WHERE slug = ? LIMIT 1", [body.intensity]),
    ]);

    const pkg = pkgRows[0];
    const duration = durationRows[0];
    const intensity = intensityRows[0];
    if (!pkg) return sendError(res, 404, "unknown package");
    if (!duration) return sendError(res, 404, "unknown duration");
    if (!intensity) return sendError(res, 404, "unknown intensity");

    const addOns = addOnSlugs.length
      ? await query("SELECT * FROM add_ons WHERE slug IN (?) ORDER BY id", [addOnSlugs])
      : [];

    const price = computePackagePrice({
      basePrice: pkg.base_price,
      durationDelta: duration.price_delta,
      intensityDelta: intensity.price_delta,
      addOnDeltas: addOns.map((addOn) => addOn.price_delta),
    });

    const summary = buildConfigurationSummary({
      packageName: pkg.name,
      minutes: Number(duration.minutes),
      intensityLabel: intensity.label,
      addOnNames: addOns.map((addOn) => addOn.name),
    });

    res.json({
      package: { slug: pkg.slug, name: pkg.name, baseImageUrl: toPublicPackageImageUrl(pkg.minio_object) },
      duration: { minutes: Number(duration.minutes), label: duration.label },
      intensity: { slug: intensity.slug, label: intensity.label },
      addOns: addOns.map((addOn) => ({
        slug: addOn.slug,
        name: addOn.name,
        imageUrl: toPublicPackageImageUrl(addOn.minio_object),
        priceDelta: asMoney(addOn.price_delta),
      })),
      price,
      summary,
    });
  } catch (error) {
    sendError(res, 500, error.message);
  }
});
```

- [ ] **Step 7: Re-run the helper tests (regression check)**

Run: `cd services/package-configurator && node --test test/package-configurator.test.js`
Expected: PASS (the require of `../src/server` still loads; helpers unchanged).

- [ ] **Step 8: Commit**

```bash
git add services/package-configurator/src/server.js services/package-configurator/test/package-configurator.test.js
git commit -m "feat: compute configurator price from deltas, return base + add-on images"
```

---

## Task 6: web-backend — rename initial-selection keys, keep deep-link route

**Files:**
- Modify: `services/web-backend/src/server.js` (`getInitialPackageSelection`)

- [ ] **Step 1: Rewrite `getInitialPackageSelection`**

In `services/web-backend/src/server.js`, replace the function (the deep-link route `/package-configurator/:package/:duration/:intensity/:addon` stays as-is; AI links to it):

```javascript
function getInitialPackageSelection(req) {
  if (!req.params.package) return null;
  const addonParam = req.params.addon;
  const addOns = (!addonParam || addonParam === "none")
    ? []
    : addonParam.split(",").map((slug) => slug.trim()).filter(Boolean);
  return {
    package: req.params.package,
    duration: req.params.duration,
    intensity: req.params.intensity,
    addOns,
  };
}
```

- [ ] **Step 2: Verify web-backend routing tests still pass**

Run: `cd services/web-backend && node --test test/backend-routing.test.js`
Expected: PASS (no test asserts the old `{model,color,...}` shape; `initialSelection` is consumed only by the EJS rewritten in Task 7).

- [ ] **Step 3: Commit**

```bash
git add services/web-backend/src/server.js
git commit -m "refactor: map configurator deep-link params to package domain"
```

---

## Task 7: Rewrite the package-configurator view (layered compositing UI)

**Files:**
- Modify (full rewrite): `web/views/package-configurator.ejs`

- [ ] **Step 1: Replace the entire file content**

```ejs
<style>
  /* Configurator-specific layout. Wellness UI tokens, fonts, page-shell, site-nav,
     site-footer, .btn* live in /static/ci/wellness-ci.css. */

  :root { --config-nav-top: 24px; --config-nav-height: 64px; --summary-top: calc(var(--config-nav-top) + var(--config-nav-height) + 16px); }

  body { background: #0b0f17; }

  .config-stage { position: fixed; inset: 0; z-index: 0; overflow: hidden; background: #0b0f17; }
  .config-layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.4s ease; }
  .config-layer.base { opacity: 1; }
  .config-layer.addon { opacity: 0; }
  .config-layer.addon.active { opacity: 1; }
  .config-placeholder { position: fixed; inset: 0; z-index: 0; display: grid; place-items: center; color: #cbd5e1; font-weight: 600; }

  .config-caption {
    position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 8;
    padding: 8px 18px; border-radius: 999px; background: rgba(11,18,32,0.55); color: #fff;
    font-size: 0.86rem; font-weight: 700; letter-spacing: 0.02em; backdrop-filter: blur(10px);
  }

  .summary-panel {
    position: fixed; top: var(--summary-top); left: 50%; transform: translateX(-50%); z-index: 9;
    width: min(1180px, calc(100% - 40px)); padding: 14px 24px; border-radius: 14px;
    background: rgba(255,255,255,0.92); border: 1px solid rgba(17,24,39,0.1); box-shadow: 0 18px 60px rgba(0,0,0,0.25);
    display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 18px; align-items: center; backdrop-filter: blur(16px);
  }
  .summary-grid { display: flex; flex-wrap: wrap; gap: 10px 24px; min-width: 0; }
  .summary-cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .summary-key { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
  .summary-value { font-size: 0.92rem; font-weight: 800; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
  .summary-actions { display: flex; align-items: center; gap: 16px; }
  .price-tag { text-align: right; }
  .price-tag span { display: block; font-size: 0.72rem; font-weight: 800; color: #6b7280; }
  .price-main { font-size: 1.1rem; font-weight: 800; color: #111827; }
  .add-btn { min-height: 46px; padding: 0 22px; border: 0; border-radius: 999px; background: #2d74d8; color: #fff; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: background 0.2s, transform 0.2s; }
  .add-btn:hover:not(:disabled) { background: #245fb1; transform: translateY(-1px); }
  .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .add-status { font-size: 0.78rem; font-weight: 700; color: #047857; min-height: 16px; }

  .config-panel {
    position: fixed; top: calc(var(--summary-top) + 104px); right: max(20px, calc(50% - 590px)); z-index: 8;
    width: 380px; max-height: calc(100vh - var(--summary-top) - 140px); overflow-y: auto;
    padding: 22px; border-radius: 14px; background: rgba(255,255,255,0.94); border: 1px solid rgba(17,24,39,0.1);
    box-shadow: 0 18px 60px rgba(0,0,0,0.25); backdrop-filter: blur(16px);
  }
  .config-section + .config-section { margin-top: 22px; }
  .config-section h2 { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #4b5563; margin: 0 0 10px; }
  .option-col { display: flex; flex-direction: column; gap: 8px; }
  .option-row { display: flex; gap: 8px; }
  .opt-btn {
    flex: 1; min-height: 46px; padding: 10px 14px; border: 1px solid rgba(17,24,39,0.14); border-radius: 10px;
    background: #fff; font-weight: 700; font-family: inherit; color: var(--ink); cursor: pointer; text-align: center;
    transition: border-color 0.18s, background 0.18s, color 0.18s, transform 0.18s;
  }
  .opt-btn:hover { border-color: #111827; transform: translateY(-1px); }
  .opt-btn.active { background: #111827; color: #fff; border-color: #111827; }
  .opt-btn .opt-delta { display: block; font-size: 0.72rem; font-weight: 600; opacity: 0.7; margin-top: 2px; }

  .addon-chip {
    display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 12px;
    border: 1px solid rgba(17,24,39,0.14); border-radius: 10px; background: #fff; cursor: pointer;
    transition: border-color 0.18s, background 0.18s, transform 0.18s;
  }
  .addon-chip:hover { border-color: #111827; transform: translateY(-1px); }
  .addon-chip.active { border-color: #111827; box-shadow: inset 0 0 0 2px #111827; }
  .addon-chip img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; background: #f1f5f9; flex: 0 0 auto; }
  .addon-chip .addon-meta { display: flex; flex-direction: column; min-width: 0; }
  .addon-chip .addon-name { font-weight: 700; font-size: 0.9rem; }
  .addon-chip .addon-delta { font-size: 0.76rem; color: #6b7280; font-weight: 600; }

  @media (max-width: 980px) {
    .config-panel { position: static; width: auto; max-height: none; margin: calc(var(--summary-top) + 120px) 20px 40px; }
    .summary-panel { grid-template-columns: 1fr; }
  }
</style>

<div class="config-stage" aria-hidden="true">
  <img class="config-layer base" id="baseLayer" src="" alt="" />
  <div id="addonLayers"></div>
</div>
<div class="config-placeholder" id="placeholder">Loading preview ...</div>
<div class="config-caption" id="caption"></div>

<div class="summary-panel">
  <div class="summary-grid">
    <div class="summary-cell"><span class="summary-key">Package</span><span class="summary-value" id="sumPackage">—</span></div>
    <div class="summary-cell"><span class="summary-key">Duration</span><span class="summary-value" id="sumDuration">—</span></div>
    <div class="summary-cell"><span class="summary-key">Intensity</span><span class="summary-value" id="sumIntensity">—</span></div>
    <div class="summary-cell"><span class="summary-key">Add-ons</span><span class="summary-value" id="sumAddons">None</span></div>
  </div>
  <div class="summary-actions">
    <div class="price-tag"><span>Total</span><div class="price-main" id="price">€0.00</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <button class="add-btn" type="button" id="addBtn" disabled>Add package</button>
      <div class="add-status" id="addStatus"></div>
    </div>
  </div>
</div>

<div class="config-panel" aria-label="Configure your package">
  <div class="config-section"><h2>Package</h2><div class="option-col" id="packageBtns"></div></div>
  <div class="config-section"><h2>Duration</h2><div class="option-row" id="durationBtns"></div></div>
  <div class="config-section"><h2>Intensity</h2><div class="option-row" id="intensityBtns"></div></div>
  <div class="config-section"><h2>Add-ons</h2><div class="option-col" id="addonBtns"></div></div>
</div>

<script>
  const initialSelection = <%- JSON.stringify(initialSelection || null) %>;

  const state = {
    packages: [], durations: [], intensities: [], addOns: [],
    selection: { packageSlug: null, minutes: null, intensitySlug: null, addOnSlugs: new Set() },
    config: null,
  };

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "EUR" });
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Request failed: ${url}`);
    return res.json();
  }

  function renderPackages() {
    const c = document.getElementById("packageBtns");
    c.innerHTML = "";
    state.packages.forEach((pkg) => {
      const btn = document.createElement("button");
      btn.className = "opt-btn" + (state.selection.packageSlug === pkg.slug ? " active" : "");
      btn.textContent = pkg.name;
      btn.addEventListener("click", () => {
        if (state.selection.packageSlug === pkg.slug) return;
        state.selection.packageSlug = pkg.slug;
        renderPackages();
        recalculate();
      });
      c.appendChild(btn);
    });
  }

  function renderDurations() {
    const c = document.getElementById("durationBtns");
    c.innerHTML = "";
    state.durations.forEach((duration) => {
      const btn = document.createElement("button");
      btn.className = "opt-btn" + (state.selection.minutes === duration.minutes ? " active" : "");
      btn.innerHTML = `${duration.label}<span class="opt-delta">${duration.priceDelta > 0 ? "+" + formatPrice(duration.priceDelta) : "incl."}</span>`;
      btn.addEventListener("click", () => {
        if (state.selection.minutes === duration.minutes) return;
        state.selection.minutes = duration.minutes;
        renderDurations();
        recalculate();
      });
      c.appendChild(btn);
    });
  }

  function renderIntensities() {
    const c = document.getElementById("intensityBtns");
    c.innerHTML = "";
    state.intensities.forEach((intensity) => {
      const btn = document.createElement("button");
      btn.className = "opt-btn" + (state.selection.intensitySlug === intensity.slug ? " active" : "");
      btn.innerHTML = `${intensity.label}<span class="opt-delta">${intensity.priceDelta > 0 ? "+" + formatPrice(intensity.priceDelta) : "incl."}</span>`;
      btn.addEventListener("click", () => {
        if (state.selection.intensitySlug === intensity.slug) return;
        state.selection.intensitySlug = intensity.slug;
        renderIntensities();
        recalculate();
      });
      c.appendChild(btn);
    });
  }

  function renderAddons() {
    const c = document.getElementById("addonBtns");
    c.innerHTML = "";
    state.addOns.forEach((addOn) => {
      const chip = document.createElement("div");
      chip.className = "addon-chip" + (state.selection.addOnSlugs.has(addOn.slug) ? " active" : "");
      chip.innerHTML = `
        <img src="${addOn.imageUrl}" alt="" loading="lazy" />
        <div class="addon-meta">
          <span class="addon-name">${addOn.name}</span>
          <span class="addon-delta">+${formatPrice(addOn.priceDelta)}</span>
        </div>`;
      chip.addEventListener("click", () => {
        if (state.selection.addOnSlugs.has(addOn.slug)) state.selection.addOnSlugs.delete(addOn.slug);
        else state.selection.addOnSlugs.add(addOn.slug);
        renderAddons();
        renderAddonLayers();
        recalculate();
      });
      c.appendChild(chip);
    });
  }

  function renderAddonLayers() {
    const wrap = document.getElementById("addonLayers");
    wrap.innerHTML = "";
    state.addOns.forEach((addOn) => {
      const img = document.createElement("img");
      img.className = "config-layer addon" + (state.selection.addOnSlugs.has(addOn.slug) ? " active" : "");
      img.src = addOn.imageUrl;
      img.alt = "";
      wrap.appendChild(img);
    });
  }

  function updateImage() {
    const base = document.getElementById("baseLayer");
    const placeholder = document.getElementById("placeholder");
    const pkg = state.packages.find((p) => p.slug === state.selection.packageSlug);
    if (!pkg) { base.style.display = "none"; placeholder.style.display = "grid"; return; }
    placeholder.style.display = "none";
    base.style.display = "block";
    if (base.src !== pkg.imageUrl) base.src = pkg.imageUrl;
  }

  function updateUI() {
    const cfg = state.config;
    const addBtn = document.getElementById("addBtn");
    updateImage();
    if (!cfg) {
      document.getElementById("price").textContent = "Unavailable";
      addBtn.disabled = true;
      return;
    }
    document.getElementById("price").textContent = formatPrice(cfg.price);
    document.getElementById("sumPackage").textContent = cfg.package.name;
    document.getElementById("sumDuration").textContent = cfg.duration.label;
    document.getElementById("sumIntensity").textContent = cfg.intensity.label;
    document.getElementById("sumAddons").textContent = cfg.addOns.length ? cfg.addOns.map((a) => a.name).join(", ") : "None";
    document.getElementById("caption").textContent = `${cfg.duration.label} · ${cfg.intensity.label}`;
    addBtn.disabled = false;
  }

  async function recalculate() {
    if (!state.selection.packageSlug || !state.selection.minutes || !state.selection.intensitySlug) return;
    try {
      state.config = await fetchJson("/api/configurator/configuration/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: state.selection.packageSlug,
          duration: state.selection.minutes,
          intensity: state.selection.intensitySlug,
          addOns: Array.from(state.selection.addOnSlugs),
        }),
      });
    } catch (err) {
      console.error(err);
      state.config = null;
    }
    updateUI();
  }

  function applyInitialSelection() {
    const sel = initialSelection;
    state.selection.packageSlug = (sel && sel.package && state.packages.some((p) => p.slug === sel.package))
      ? sel.package : (state.packages[0] && state.packages[0].slug) || null;
    const minutesFromSel = sel && Number.parseInt(sel.duration, 10);
    state.selection.minutes = (minutesFromSel && state.durations.some((d) => d.minutes === minutesFromSel))
      ? minutesFromSel : (state.durations[0] && state.durations[0].minutes) || null;
    state.selection.intensitySlug = (sel && sel.intensity && state.intensities.some((i) => i.slug === sel.intensity))
      ? sel.intensity : (state.intensities[0] && state.intensities[0].slug) || null;
    if (sel && Array.isArray(sel.addOns)) {
      sel.addOns.forEach((slug) => { if (state.addOns.some((a) => a.slug === slug)) state.selection.addOnSlugs.add(slug); });
    }
  }

  async function init() {
    try {
      const [packages, durations, intensities, addOns] = await Promise.all([
        fetchJson("/api/configurator/packages"),
        fetchJson("/api/configurator/options/durations"),
        fetchJson("/api/configurator/options/intensities"),
        fetchJson("/api/configurator/options/add-ons"),
      ]);
      state.packages = packages;
      state.durations = durations;
      state.intensities = intensities;
      state.addOns = addOns;
      applyInitialSelection();
      renderPackages();
      renderDurations();
      renderIntensities();
      renderAddons();
      renderAddonLayers();
      await recalculate();
    } catch (err) {
      console.error(err);
      document.getElementById("placeholder").textContent = "Failed to load configurator";
    }
  }

  document.getElementById("addBtn").addEventListener("click", async () => {
    const cfg = state.config;
    if (!cfg) return;
    const addBtn = document.getElementById("addBtn");
    const addStatus = document.getElementById("addStatus");
    addBtn.disabled = true;
    addStatus.style.color = "#047857";
    addStatus.textContent = "Saving...";
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "package",
          name: cfg.package.name,
          price: cfg.price,
          imageUrl: cfg.package.baseImageUrl,
          quantity: 1,
          details: {
            package: cfg.package.slug,
            duration: cfg.duration.label,
            intensity: cfg.intensity.label,
            addOns: cfg.addOns.map((a) => a.name),
            summary: cfg.summary,
          },
        }),
      });
      addStatus.textContent = res.ok ? "Added to cart." : "Could not add.";
    } catch (err) {
      addStatus.style.color = "#b91c1c";
      addStatus.textContent = "Could not add.";
    } finally {
      addBtn.disabled = false;
      setTimeout(() => { addStatus.textContent = ""; }, 3000);
    }
  });

  init();
</script>
```

- [ ] **Step 2: Manual verification (requires running stack)**

Run: `docker compose up --build -d` then open `http://localhost:4100/package-configurator`.
Expected: package buttons render; selecting any package + any duration + any intensity shows a price (no 404); toggling add-on chips fades their prop layer in/out over the base image; the caption shows "60 min · Medium"; "Add package" posts to the cart. Verify a previously-404 combo (Neck & Shoulder Relief + 45 min + Gentle) now prices correctly.

- [ ] **Step 3: Commit**

```bash
git add web/views/package-configurator.ejs
git commit -m "feat: layered-compositing package configurator UI"
```

---

## Task 8: Add transparent add-on prop placeholders

The base package PNGs already exist in `assets/package-configurator/`. The four add-on prop layers do not yet exist; create transparent placeholders so the stack runs before the user drops in gpt-image-2 output. `mc mirror` is recursive, so files under `assets/package-configurator/addons/` mirror to `package-configurator/addons/` with no compose change.

**Files:**
- Create: `assets/package-configurator/addons/hot-stone.png`, `aroma-oil.png`, `warm-towel.png`, `stretching.png`

- [ ] **Step 1: Generate four transparent 1×1 PNG placeholders**

Run (PowerShell):

```powershell
$dir = "assets/package-configurator/addons"
New-Item -ItemType Directory -Force $dir | Out-Null
$b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
$bytes = [Convert]::FromBase64String($b64)
foreach ($n in @("hot-stone","aroma-oil","warm-towel","stretching")) {
  [IO.File]::WriteAllBytes((Join-Path $dir "$n.png"), $bytes)
}
```

Expected: four `.png` files created (each a 1×1 transparent pixel, invisible when scaled — the add-on layer simply shows nothing until replaced with a real prop image).

- [ ] **Step 2: Commit**

```bash
git add assets/package-configurator/addons/hot-stone.png assets/package-configurator/addons/aroma-oil.png assets/package-configurator/addons/warm-towel.png assets/package-configurator/addons/stretching.png
git commit -m "chore: add transparent placeholders for add-on prop layers"
```

> **User action (out of plan):** replace these four files (and optionally the three base scenes) with gpt-image-2 output using the prompts in the spec, then re-run `docker compose up --build` to re-seed MinIO.

---

## Task 9: Full verification pass

- [ ] **Step 1: Run all touched unit/smoke tests**

```bash
cd services/ai-feature && node --test test/recommendation.smoke.js
cd ../package-configurator && node --test test/package-configurator.test.js
cd ../web-backend && node --test test/backend-routing.test.js
```
Expected: all PASS.

- [ ] **Step 2: Run the project smoke test**

Run: `.\scripts\smoke-test.ps1 -SkipAi`
Expected: PASS.

- [ ] **Step 3: Manual browser sweep**

- `/aftercare-shop`: image is not clickable for navigation; quantity stepper works; "Add to cart" shows "Added to cart." and the cart count increases; `/aftercare-shop#product-heated-neck-wrap` scrolls to and highlights the card; visiting `/aftercare-shop/heated-neck-wrap` no longer renders a detail page (404/route gone).
- `/package-configurator`: every package×duration×intensity combination prices without 404; add-on layers composite over the base; "Add package" adds to cart.
- AI recommendation aftercare links land on the shop anchor; AI package link opens the configurator pre-selected.
- No German labels or car/BMW identity on either page.

- [ ] **Step 4: Final commit (if any test fixups were needed)**

```bash
git add -A
git commit -m "test: verify shop and configurator redesign"
```

---

## Self-Review notes

- **Spec coverage:** F1 (inline cart) → Tasks 2,3; detail removal + repointing → Task 3; F2 (data model/backend) → Tasks 4,5; F3 (layout/frontend) → Tasks 6,7; assets/MinIO → Task 8; image prompts live in the spec (user-executed); language=English applied in Tasks 2,7; tests → Tasks 1,5,9; 404-matrix fix → Tasks 4,5.
- **Type consistency:** calculate response `{package:{slug,name,baseImageUrl}, duration:{minutes,label}, intensity:{slug,label}, addOns:[{slug,name,imageUrl,priceDelta}], price, summary}` is produced in Task 5 and consumed verbatim in Task 7. `initialSelection` keys `{package,duration,intensity,addOns}` set in Task 6, read in Task 7 `applyInitialSelection`. Helper names `computePackagePrice`/`buildConfigurationSummary` consistent between Task 5 test and impl.
- **Known follow-up:** transparent placeholders make add-on layers invisible until the user supplies real prop art (Task 8 note).
