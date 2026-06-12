# Wellness Gap Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the architecture and theme gaps found in `docs/reports/2026-06-12-wellness-solo-architecture-review.md` while preserving the group-project cloud architecture in the Wellness Center solo project.

**Architecture:** Keep the existing `Browser -> web-frontend -> web-backend -> api-gateway -> domain services -> infrastructure` runtime chain. The work hardens service ownership, restores configurator truth, and improves user-facing parity without collapsing services or moving domain data behind the wrong layer.

**Tech Stack:** Node.js, CommonJS, Express, EJS SSR, Docker Compose, MySQL 8.4, Redis 8, MinIO, Gemini via `@google/genai`, Google Maps Platform Weather API, PowerShell smoke tests.

---

## Source And Alignment

Selected planning route: fallback workflow. `docs/exchange`, `docs/func-design`, `docs/impl-plans`, and `docs/top-level-knowledge` exist, but `test-cases/` and a current `docs/exchange/requirement-alignment-*.md` artifact are missing. The user explicitly requested no new func-design, so this plan updates implementation planning only.

Source gap report:

- `docs/reports/2026-06-12-wellness-solo-architecture-review.md`

Primary alignment:

- Preserve architecture parity over visual novelty.
- Reuse the UI shell, package configurator, aftercare shop, map/visit context, SSR routing, and Docker service topology.
- Retheme and harden for Wellness Center semantics.
- Do not add direct browser MinIO access, cross-service SQL, payment, authentication, appointment scheduling, or a new order service for this migration.

External documentation note:

- Google Weather API current conditions were checked against the official Google Maps Platform docs on 2026-06-12. The current conditions endpoint is `https://weather.googleapis.com/v1/currentConditions:lookup` with latitude and longitude query parameters and an API key. See `https://developers.google.com/maps/documentation/weather/current-conditions`.

## Existing Docs And Code Context

Stable docs:

- `docs/top-level-knowledge/project-context.md`
- `docs/top-level-knowledge/tech-stack.md`
- `docs/func-design/wellness-center-service-boundaries.md`
- `docs/architecture.md`
- `docs/project-status.md`
- `docs/impl-plans/2026-05-28-wellness-center-initialization.md`

Implementation baseline:

- Docker Compose already has `web-frontend`, `web-backend`, `api-gateway`, `package-configurator`, `aftercare-shop`, `ai-feature`, `visit-context-service`, `shopping-cart`, MySQL, Redis, and MinIO.
- `services/package-configurator/src/server.js` owns package data and MinIO package asset reads.
- `services/aftercare-shop/src/server.js` owns product data and MinIO product asset reads.
- `api-gateway/src/server.js` routes `/api/configurator/*`, `/api/aftercare/*`, `/api/visit-context/*`, `/api/cart`, and `/api/ai/recommend`.
- `services/visit-context-service/src/server.js` currently returns only MySQL fallback weather.
- `services/ai-feature/src/server.js` calls Gemini when configured but does not check every context response before parsing and does not validate the final recommendation against live context.
- `web/views/shopping-cart.ejs` still has visible old cart semantics in copy and class names.
- `web/views/visit-context.ejs` is much simpler than the rich home map section.

## Goals

- Enforce MinIO object ownership prefixes at the owning service boundary.
- Restore a valid package configuration truth model and `GET /configurations`.
- Keep configurator calculation and AI recommendations constrained to valid combinations.
- Use Google Weather API when `GOOGLE_WEATHER_API_KEY` is configured, with reliable MySQL fallback and provider reporting.
- Harden AI context fetches and output validation.
- Clean visible old-theme cart semantics and clarify checkout as a demo confirmation flow.
- Make `/visit-context` the canonical rich map/arrival/weather experience.
- Improve aftercare shop visual parity while preserving direct add-to-cart behavior.
- Remove or split stale global browser handlers and expand smoke/regression coverage.

## Non-Goals

- No service collapse or monolith rewrite.
- No direct SQL from `web-backend`, `api-gateway`, or `ai-feature`.
- No direct browser MinIO media source beyond the existing homepage-only `/media/home/*.mp4` exception.
- No real payment, authentication, appointment scheduling, therapist portal, CMS, or order-service implementation.
- No committed `.env` file. API key migration remains a local owner action.

## Module Boundaries

- `package-configurator` owns packages, durations, intensities, add-ons, valid combinations, configured pricing, and package media keys.
- `aftercare-shop` owns product catalog rows and product media keys.
- `visit-context-service` owns center location and weather provider/fallback mapping.
- `ai-feature` orchestrates recommendation only through `package-configurator` and `aftercare-shop` HTTP APIs.
- `shopping-cart` owns Redis-backed anonymous item snapshots.
- `api-gateway` is the same-origin browser API boundary and must not enforce business truth that belongs in domain services.
- `web-backend` renders SSR pages and forwards `/api/*`.
- `web-frontend` serves `/static`, hosts `/media/home/*.mp4`, and proxies browser requests to `web-backend`.

## File Structure Map

Expected modifications by area:

- `services/package-configurator/src/asset-paths.js`: prefix-specific package media key normalization.
- `services/aftercare-shop/src/asset-paths.js`: prefix-specific aftercare media key normalization.
- `services/package-configurator/src/server.js`: `/configurations`, valid-combination calculation, package asset route.
- `services/aftercare-shop/src/server.js`: aftercare asset route import update.
- `api-gateway/src/server.js`: configurator configuration routes and existing asset proxy tests.
- `infrastructure/mysql/init/02_package_configurator.sql`: valid configuration tables and seed rows.
- `services/ai-feature/src/server.js`: context fetch checks and `/configurations` context.
- `services/ai-feature/src/recommendation.js`: live-context recommendation validation.
- `services/visit-context-service/src/server.js`: Google weather provider selection and fallback.
- `services/visit-context-service/src/visitContext.js`: provider response mapping.
- `web/views/package-configurator.ejs`: valid-combination UI constraints.
- `web/views/visit-context.ejs`: canonical rich visit page shell.
- `web/views/home.ejs`: keep visit-context teaser or link to canonical route.
- `web/views/aftercare-shop.ejs`: overlay/motion card parity without losing add-to-cart.
- `web/views/shopping-cart.ejs`: wellness copy, class names, demo checkout wording.
- `web/public/app.js`: keep only active shared behavior or split page behavior.
- `scripts/smoke-test.ps1`: media boundary, configurations, cart CRUD, provider assertions.
- Tests under `api-gateway/test`, service `test` folders, and `services/web-backend/test`.
- Docs: `README.md`, `docs/project-status.md`, and this plan's execution notes if implementation decisions change.

## Implementation Plan

### Task 0: Preflight And Source Preservation

**Files:**
- Read: `docs/reports/2026-06-12-wellness-solo-architecture-review.md`
- Read: `docs/top-level-knowledge/project-context.md`
- Read: `docs/top-level-knowledge/tech-stack.md`
- Read: `docs/func-design/wellness-center-service-boundaries.md`
- Read: `docs/architecture.md`
- Read: `docs/project-status.md`
- Do not modify: `.env`

- [ ] **Step 1: Record current worktree state**

Run:

```powershell
git status --short --branch
```

Expected:

```text
The gap report may still be untracked. Do not remove or overwrite unrelated user files.
```

- [ ] **Step 2: Confirm service topology still exists**

Run:

```powershell
docker compose config --quiet
```

Expected: exit code `0`.

- [ ] **Step 3: Keep API key migration local**

Copy only key values into `.env` when the owner is ready for live demo:

```text
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_FALLBACK_MODEL
GOOGLE_MAPS_API_KEY
GOOGLE_WEATHER_API_KEY
```

Map group project DB variable names only if reusing local credentials:

```text
DBE_CLOUDDEV_MERCH* -> DBE_CLOUDDEV_AFTERCARE*
DBE_CLOUDDEV_ROUTE* -> DBE_CLOUDDEV_VISIT_CONTEXT*
```

Expected:

```text
.env remains untracked and uncommitted.
```

### Task 1: Enforce MinIO Owning-Service Asset Prefixes

**Files:**
- Modify: `services/package-configurator/src/asset-paths.js`
- Modify: `services/package-configurator/src/server.js`
- Create or modify: `services/package-configurator/test/asset-paths.test.js`
- Modify: `services/aftercare-shop/src/asset-paths.js`
- Modify: `services/aftercare-shop/src/server.js`
- Create or modify: `services/aftercare-shop/test/product-images.test.js`
- Modify: `api-gateway/test/asset-proxy.test.js`
- Modify: `scripts/smoke-test.ps1`

- [ ] **Step 1: Add failing service tests for cross-prefix rejection**

Package expected behavior:

```javascript
assert.equal(
  normalizePackageAssetKey("package-configurator/neck-shoulder-relief.png"),
  "package-configurator/neck-shoulder-relief.png"
);
assert.throws(
  () => normalizePackageAssetKey("aftercare-shop/heated-neck-wrap.png"),
  /invalid package asset key/
);
assert.throws(
  () => normalizePackageAssetKey("home/home-video.mp4"),
  /invalid package asset key/
);
```

Aftercare expected behavior:

```javascript
assert.equal(
  normalizeAftercareAssetKey("aftercare-shop/heated-neck-wrap.png"),
  "aftercare-shop/heated-neck-wrap.png"
);
assert.throws(
  () => normalizeAftercareAssetKey("package-configurator/neck-shoulder-relief.png"),
  /invalid aftercare asset key/
);
```

Run:

```powershell
npm test --prefix services/package-configurator
npm test --prefix services/aftercare-shop
```

Expected before implementation: new tests fail.

- [ ] **Step 2: Implement prefix-specific normalizers**

Use one shared internal helper per file and export service-specific functions:

```javascript
function normalizeOwnedObjectKey(key, requiredPrefix, errorMessage) {
  if (typeof key !== "string" || key.trim() === "") throw new Error(errorMessage);
  const segments = key.split("/");
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || segment.includes("\\")) {
      throw new Error(errorMessage);
    }
  }
  const normalized = segments.map(encodeURIComponent).join("/");
  if (!normalized.startsWith(requiredPrefix)) throw new Error(errorMessage);
  return normalized;
}
```

`package-configurator` must require `package-configurator/`.

`aftercare-shop` must require `aftercare-shop/`.

- [ ] **Step 3: Update service asset routes and public image builders**

Package service imports:

```javascript
const { normalizePackageAssetKey, toPublicPackageImageUrl } = require("./asset-paths");
```

Aftercare service imports:

```javascript
const { normalizeAftercareAssetKey, toPublicProductImageUrl } = require("./asset-paths");
```

Expected:

```text
Allowed owned assets still stream.
Cross-prefix assets return HTTP 400 or 404 without fetching MinIO through the wrong service.
```

- [ ] **Step 4: Add gateway and smoke checks**

Add gateway tests that confirm cross-prefix requests are rejected through the full public API path:

```text
/api/configurator/assets/aftercare-shop/heated-neck-wrap.png
/api/aftercare/assets/package-configurator/neck-shoulder-relief.png
/api/configurator/assets/home/home-video.mp4
```

Add `scripts/smoke-test.ps1` positive checks for owned asset routes and negative checks for cross-prefix routes.

- [ ] **Step 5: Verify**

Run:

```powershell
npm test --prefix services/package-configurator
npm test --prefix services/aftercare-shop
npm test --prefix api-gateway
.\scripts\smoke-test.ps1 -SkipAi
```

Expected:

```text
All asset prefix tests pass.
Smoke test reports owned media OK and cross-prefix media blocked.
```

### Task 2: Restore Valid Package Configuration Truth

**Files:**
- Modify: `infrastructure/mysql/init/02_package_configurator.sql`
- Modify: `services/package-configurator/src/server.js`
- Modify: `services/package-configurator/test/package-configurator.test.js`
- Modify: `api-gateway/src/server.js`
- Modify: `api-gateway/test/asset-proxy.test.js` or create `api-gateway/test/configurator-proxy.test.js`
- Modify: `scripts/smoke-test.ps1`

- [ ] **Step 1: Add valid-combination seed tables**

Restore explicit configuration truth with tables equivalent to:

```sql
CREATE TABLE configurations (
  id INT PRIMARY KEY,
  package_id INT NOT NULL,
  duration_id INT NOT NULL,
  intensity_id INT NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_configuration (package_id, duration_id, intensity_id),
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (duration_id) REFERENCES durations(id),
  FOREIGN KEY (intensity_id) REFERENCES intensities(id)
);

CREATE TABLE configuration_addons (
  configuration_id INT NOT NULL,
  add_on_id INT NOT NULL,
  PRIMARY KEY (configuration_id, add_on_id),
  FOREIGN KEY (configuration_id) REFERENCES configurations(id),
  FOREIGN KEY (add_on_id) REFERENCES add_ons(id)
);
```

Seed only combinations that should be valid for the Wellness package catalog.

- [ ] **Step 2: Add configurator service tests for `/configurations`**

Expected API shape:

```javascript
{
  id: 101,
  package: { slug: "neck-shoulder-relief", name: "Neck & Shoulder Relief" },
  duration: { minutes: 60, label: "60 min" },
  intensity: { slug: "medium", label: "Medium" },
  allowedAddOns: [{ slug: "aroma-oil", name: "Aroma Oil" }],
  priceDelta: 0,
  enabled: true
}
```

Run:

```powershell
npm test --prefix services/package-configurator
```

Expected before implementation: new endpoint tests fail.

- [ ] **Step 3: Implement `GET /configurations` and optional `GET /configurations/:id`**

The service must query through its own MySQL pool only. No gateway or web layer may query configuration tables.

`GET /configurations` should return enabled valid combinations with package, duration, intensity, and allowed add-on metadata.

`GET /configurations/:id` may be added if helpful for parity with the original initialization design.

- [ ] **Step 4: Gate calculation through valid combinations**

`POST /configuration/calculate` must:

- Resolve package, duration, and intensity.
- Find one enabled `configurations` row.
- Reject missing combinations with HTTP 400 and `configuration is not valid`.
- Verify every requested add-on is allowed by `configuration_addons`.
- Return the existing frontend-compatible result shape with `package`, `duration`, `intensity`, `addOns`, `price`, and `summary`.

- [ ] **Step 5: Add gateway routes**

Expose:

```text
GET /api/configurator/configurations
GET /api/configurator/configurations/:id
```

Gateway routes must proxy JSON only; they must not calculate or query storage.

- [ ] **Step 6: Verify**

Run:

```powershell
npm test --prefix services/package-configurator
npm test --prefix api-gateway
docker compose config --quiet
.\scripts\smoke-test.ps1 -SkipAi
```

Expected:

```text
Valid combinations are visible through the API gateway.
Invalid package x duration x intensity x add-on combinations are rejected.
Existing valid smoke calculation still passes.
```

### Task 3: Consume Valid Configurations In UI And AI Context

**Files:**
- Modify: `web/views/package-configurator.ejs`
- Modify: `web/public/app.js` if configurator behavior remains global
- Modify: `services/web-backend/test/browser-interactions.test.js`
- Modify: `services/ai-feature/src/server.js`
- Modify: `services/ai-feature/src/recommendation.js`
- Modify: `services/ai-feature/test/recommendation.smoke.js`
- Modify: `services/ai-feature/test/recommendation.compose-smoke.js`

- [ ] **Step 1: Add frontend tests for valid-combination use**

The browser interaction test should assert that runtime configurator code fetches:

```text
/api/configurator/configurations
```

and no longer treats package, duration, intensity, and add-ons as independent cartesian-product choices.

- [ ] **Step 2: Drive configurator UI from valid combinations**

Runtime behavior:

- Load packages/options for labels and display.
- Load `/api/configurator/configurations` for truth.
- When package changes, filter durations and intensities to combinations for that package.
- When duration/intensity changes, filter add-ons to the selected configuration.
- If the initial URL selection is invalid, select the first enabled valid combination and render a non-blocking message.
- Submit only selections that map to a valid configuration.

- [ ] **Step 3: Send valid configurations into AI context**

In `services/ai-feature/src/server.js`, context fetches should include:

```text
GET ${CONFIGURATOR_URL}/configurations
GET ${AFTERCARE_URL}/products
```

Keep packages/options if they are still needed for human-readable prompt context, but the valid configurations list must be the source for allowed recommendation choices.

- [ ] **Step 4: Verify**

Run:

```powershell
npm test --prefix services/web-backend
npm test --prefix services/ai-feature
```

Expected:

```text
Configurator browser code references valid configurations.
AI smoke tests confirm context includes valid configurations.
```

### Task 4: Add Google Weather Provider With Fallback Reporting

**Files:**
- Modify: `services/visit-context-service/src/server.js`
- Modify: `services/visit-context-service/src/visitContext.js`
- Modify: `services/visit-context-service/test/visit-context.test.js`
- Modify: `api-gateway/test/visit-context-proxy.test.js`
- Modify: `web/public/app.js` or page-specific visit script
- Modify: `scripts/smoke-test.ps1`

- [ ] **Step 1: Add weather mapping tests**

Test a Google response mapper that returns:

```javascript
{
  provider: "google",
  condition: "Sunny",
  temperatureC: 13.7,
  summary: "Sunny, 13.7 C. Suitable for a calm Wellness Center visit.",
  sourceTime: "2025-01-28T22:04:12.025273178Z"
}
```

Also test fallback remains:

```javascript
{
  provider: "fallback",
  condition: "mild",
  temperatureC: 19,
  summary: "Mild weather is suitable for a calm visit."
}
```

- [ ] **Step 2: Implement provider selection**

Use fallback when:

- `GOOGLE_WEATHER_API_KEY` is missing.
- `GOOGLE_WEATHER_API_KEY` is `replace_me`.
- The Google API request fails.
- The Google API response cannot be mapped.

Use Google when a real key is configured:

```text
https://weather.googleapis.com/v1/currentConditions:lookup?key=<key>&location.latitude=<lat>&location.longitude=<lng>
```

The implementation must use the selected location's latitude and longitude from `locations`.

- [ ] **Step 3: Return provider in `/weather/current` and `/visit-summary`**

Both endpoints must expose `weather.provider` so smoke tests and the demo can prove which path ran.

- [ ] **Step 4: Verify**

Run:

```powershell
npm test --prefix services/visit-context-service
npm test --prefix api-gateway
.\scripts\smoke-test.ps1 -SkipAi
```

Expected:

```text
Without a real key, provider is fallback and smoke still passes.
With a real key, provider can be google without code changes.
```

### Task 5: Harden AI Recommendation Context And Output Validation

**Files:**
- Modify: `services/ai-feature/src/server.js`
- Modify: `services/ai-feature/src/recommendation.js`
- Modify: `services/ai-feature/test/recommendation.smoke.js`
- Modify: `services/ai-feature/test/recommendation.compose-smoke.js`
- Modify: `scripts/smoke-test.ps1`

- [ ] **Step 1: Add tests for failed context responses**

Stub at least one context endpoint as HTTP 500. Expected AI response:

```json
{ "error": "failed to load recommendation context" }
```

The service must not call `response.json()` on a failed context response as if it were valid domain context.

- [ ] **Step 2: Add tests for invalid Gemini recommendations**

Test cases:

- Unknown package slug.
- Duration not present in valid configurations.
- Intensity not present in valid configurations.
- Add-on not allowed for the selected valid configuration.
- Aftercare product id not present in fetched products.

Expected: the service rejects or repairs invalid output deterministically. Prefer rejection with a clear 502 error over returning broken links.

- [ ] **Step 3: Implement context loading helper**

Use a helper equivalent to:

```javascript
async function fetchJsonOrThrow(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label} returned ${response.status}`);
  }
  return response.json();
}
```

- [ ] **Step 4: Validate recommendation against context**

Before `buildRecommendationResponse`, validate that:

- `packageRecommendation.package` exists in configurations.
- `duration`, `intensity`, and `addOns` match one enabled configuration.
- Each aftercare id exists in products.

- [ ] **Step 5: Verify**

Run:

```powershell
npm test --prefix services/ai-feature
npm run smoke:ai --prefix services/ai-feature
```

Expected:

```text
Local AI unit smoke passes.
Compose AI smoke passes when services and a real Gemini key are configured.
```

### Task 6: Retheme Cart Review And Demo Checkout Semantics

**Files:**
- Modify: `web/views/shopping-cart.ejs`
- Modify: `services/web-backend/test/browser-interactions.test.js`
- Modify: `services/shopping-cart/test/cart-validation.test.js`
- Modify: `scripts/smoke-test.ps1`

- [ ] **Step 1: Add tests for visible semantics**

Search assertions should fail if the cart view contains:

```text
item--car
item--merch
Ihre Auswahl
Cart leeren
Farbe
Größe
```

- [ ] **Step 2: Rename classes and copy**

Use:

```text
item--package
item--aftercare
Your wellness selection
Clear cart
Demo checkout
Session details
```

Checkout remains out of scope for P0. The UI should say it is a demo review/confirmation and should not imply payment or order persistence.

- [ ] **Step 3: Expand cart CRUD tests**

Cover:

- add item
- update quantity
- remove item
- clear cart
- invalid item type rejection

- [ ] **Step 4: Verify**

Run:

```powershell
npm test --prefix services/shopping-cart
npm test --prefix services/web-backend
.\scripts\smoke-test.ps1 -SkipAi
```

Expected:

```text
Cart remains Redis-backed and CRUD-capable.
Visible cart copy is Wellness Center language only.
```

### Task 7: Make `/visit-context` The Canonical Rich Map Experience

**Files:**
- Modify: `web/views/visit-context.ejs`
- Modify: `web/views/home.ejs`
- Modify: `web/public/app.js` or create page-scoped visit script if splitting global JS
- Modify: `services/web-backend/test/backend-routing.test.js`
- Modify: `services/web-backend/test/browser-interactions.test.js`

- [ ] **Step 1: Add route tests for canonical visit page**

Expected route behavior:

- `/visit-context` renders rich map shell, summary, arrival note, provider-aware weather area, and fallback text.
- Home page links to `/visit-context` and can keep a short teaser, but the full route planner/map section is canonical on `/visit-context`.

- [ ] **Step 2: Move or reuse rich map behavior**

Reuse the home page's richer map behavior rather than building a new unrelated widget. The visit page should:

- Fetch `/api/visit-context/visit-summary`.
- Render location name, address, opening note, arrival tip, and weather summary.
- Load Google Maps JS only when `SERENITY_MAPS_KEY` is configured.
- Render useful text fallback when the key is missing.

- [ ] **Step 3: Keep home focused**

Home should link to `/visit-context` and avoid duplicating the full map implementation. If a teaser remains, it must be clearly lighter than the canonical visit page.

- [ ] **Step 4: Verify**

Run:

```powershell
npm test --prefix services/web-backend
.\scripts\smoke-test.ps1 -SkipAi
```

Expected:

```text
/visit-context is no longer weaker than the home map section.
```

### Task 8: Improve Aftercare Shop Visual Parity Without Losing Commerce Flow

**Files:**
- Modify: `web/views/aftercare-shop.ejs`
- Modify: `web/views/aftercare-product.ejs` if detail cards share styling
- Modify: `services/web-backend/test/backend-routing.test.js`
- Modify: `services/web-backend/test/browser-interactions.test.js`

- [ ] **Step 1: Add regression assertions for aftercare shop cards**

Expected:

- SSR product names still render.
- Product cards still expose add-to-cart controls.
- Product detail links still route to `/aftercare-shop/:productId`.
- Product images still use `/api/aftercare/assets/aftercare-shop/*`.

- [ ] **Step 2: Reuse stronger card treatment**

Adopt the group-style full-image card with overlay/hover reveal, but keep solo behavior:

- quantity selector
- add-to-cart button
- product detail link
- Wellness Center product categories and usage notes

- [ ] **Step 3: Verify**

Run:

```powershell
npm test --prefix services/web-backend
.\scripts\smoke-test.ps1 -SkipAi
```

Expected:

```text
Aftercare shop remains functional and looks closer to the richer group shop pattern.
```

### Task 9: Clean Dead Browser Handlers And Expand Regression Coverage

**Files:**
- Modify: `web/public/app.js`
- Modify or remove: `web/public/styles.css`
- Modify: page EJS files if moving scripts inline or page-scoped
- Modify: `services/web-backend/test/browser-interactions.test.js`
- Modify: `services/web-frontend/test/frontend-proxy.test.js`
- Modify: `api-gateway/test/visit-context-proxy.test.js`
- Modify: `scripts/smoke-test.ps1`
- Modify: `README.md`
- Modify: `docs/project-status.md`

- [ ] **Step 1: Decide shared JS shape**

Use one of these patterns:

- Keep `web/public/app.js` as shared helpers plus active page bootstraps only.
- Split page code into page-specific scripts loaded by the matching EJS view.

Do not leave inactive handlers that target removed DOM IDs such as `#configurator-form`, `#ai-form`, or `#cart-items` if current pages do not use them.

Handle `web/public/styles.css` explicitly:

- Remove it if it is not loaded or needed.
- Or move needed visit-context/global styles into the active design system and document why the file remains.

- [ ] **Step 2: Add stale-handler tests**

The test should fail on obsolete selectors or old domain terms in active browser sources unless a selector is actually present in the corresponding rendered page.

- [ ] **Step 3: Expand gateway and smoke coverage**

Add regression coverage for:

- visit-context locations/weather/summary proxy behavior
- media boundary positive and negative checks
- configurations endpoint
- cart update/remove/clear
- weather provider field

- [ ] **Step 4: Update docs**

`README.md` and `docs/project-status.md` should mention:

- MinIO ownership prefix enforcement
- valid configurations endpoint
- Google Weather provider plus fallback
- checkout remains demo-only
- exact `.env` key migration mapping from group to solo:
  - copy same-name `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GOOGLE_MAPS_API_KEY`, and `GOOGLE_WEATHER_API_KEY`
  - map `DBE_CLOUDDEV_MERCH*` to `DBE_CLOUDDEV_AFTERCARE*`
  - map `DBE_CLOUDDEV_ROUTE*` to `DBE_CLOUDDEV_VISIT_CONTEXT*`
  - keep `MINIO_BUCKET=wellness-media`
  - do not commit `.env`
- N1 fail-fast env decision:
  - either add a small `requiredEnv` helper for DB-backed service DB variables
  - or record in `docs/project-status.md` that scaffold defaults are intentionally retained for the course demo

- [ ] **Step 5: Verify final stack**

Run:

```powershell
npm test --prefix api-gateway
npm test --prefix services/web-frontend
npm test --prefix services/web-backend
npm test --prefix services/package-configurator
npm test --prefix services/aftercare-shop
npm test --prefix services/visit-context-service
npm test --prefix services/ai-feature
npm test --prefix services/shopping-cart
docker compose config --quiet
.\scripts\smoke-test.ps1 -SkipAi
```

With real keys configured locally:

```powershell
.\scripts\smoke-test.ps1
npm run smoke:ai --prefix services/ai-feature
```

Expected:

```text
All service tests pass.
No-AI smoke passes.
Live AI and Google weather paths are demoable when local keys are configured.
```

## Verification

Focused gates are listed inside each task. The final gate is Task 9 Step 5.

Do not claim completion until:

- Service tests pass for every touched service.
- `docker compose config --quiet` passes.
- `.\scripts\smoke-test.ps1 -SkipAi` passes.
- If local keys are configured, `.\scripts\smoke-test.ps1` and `npm run smoke:ai --prefix services/ai-feature` pass.
- `git grep -n -F -e "BMW" -e "item--car" -e "item--merch" -e "Cart leeren" -e "Ihre Auswahl"` returns no runtime leaks outside historical docs.

## Open Questions

- Owner must decide whether to configure `GOOGLE_WEATHER_API_KEY` as the same value as `GOOGLE_MAPS_API_KEY` or keep a separate Weather-enabled key. The code should support the separate variable already present in `.env.example`.
- Owner must provide local live keys for Gemini and Google Weather if live-demo verification is required. The committed plan and code must still pass fallback smoke tests without keys.
- Checkout remains demo-only in this plan. A real order service is out of scope unless the owner expands the project.

## Self-Check

Source traceability:

| Gap report item | Covered by |
| --- | --- |
| C1 MinIO ownership leak | Task 1 |
| I1 Missing `GET /configurations` | Task 2 |
| I2 Weather key configured but unused | Task 4 |
| I3 `.env` migration mapping | Task 0 and Task 9 docs |
| I4 AI validation gaps | Task 3 and Task 5 |
| I5 Cart old semantics | Task 6 |
| I6 Split visit context experience | Task 7 |
| I7 Aftercare visual parity | Task 8 |
| I8 Dead/divergent frontend assets | Task 9 |
| N1 fail-fast env defaults | Task 9 requires an explicit `requiredEnv` implementation or a documented decision to keep scaffold defaults |
| N2 media smoke coverage | Task 1 and Task 9 |
| N3 uneven test coverage | Tasks 4, 6, and 9 |

Placeholder scan:

- No implementation step depends on unspecified placeholder behavior.
- External Weather API request shape is grounded in the official current-conditions docs checked on 2026-06-12.
- The only owner decisions are live key provisioning and whether checkout scope expands beyond demo-only.

Type and route consistency:

- Public configurator routes remain under `/api/configurator/*`.
- Public aftercare routes remain under `/api/aftercare/*`.
- Valid cart item types remain `package` and `aftercare`.
- MinIO object prefixes remain `package-configurator/`, `aftercare-shop/`, `center/`, and homepage-only `home/*.mp4`.
- Runtime chain remains `web-frontend -> web-backend -> api-gateway -> services -> infrastructure`.
