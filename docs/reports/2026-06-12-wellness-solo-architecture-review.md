# Wellness Solo Project Architecture Review

Date: 2026-06-12

Scope:

- Current solo project: `D:\CodeSpace\dbe-cloud-soloproject`
- Reference group project: `D:\CodeSpace\dbe-cloud-groupproject`
- Running frontend checked at `http://localhost:4100`

## Executive Summary

The solo project is not a superficial one-service rewrite. The main cloud-style architecture is present and running:

```text
Browser -> web-frontend -> web-backend -> api-gateway -> domain services -> infrastructure
```

The strongest parts are the Docker Compose topology, SSR/EJS shell, gateway routing, service-owned MySQL/Redis usage, package configurator, aftercare product APIs, cart persistence, and the main smoke-testable flow.

The biggest gaps are architectural boundary details and parity with the group project's richer behavior:

1. Critical: MinIO business asset ownership is not enforced by service prefix. Cross-prefix asset reads currently work through the wrong owning service.
2. Important: `package-configurator` no longer exposes the group/design-level `GET /configurations` valid-combination surface.
3. Important: Weather is only MySQL fallback; `GOOGLE_WEATHER_API_KEY` is configured but unused.
4. Important: Cart and some UI areas still show old or mixed semantics, especially German checkout copy and `car/merch` class naming.
5. Important: `/visit-context` is weaker than the rich map section on the home page.

Scores:

| Area | Score | Rationale |
|---|---:|---|
| Architecture parity | 7.5/10 | Topology and service ownership mostly match group; MinIO ownership and valid-combination API are the main deductions. |
| UI/UX parity | 6/10 | Home and configurator preserve the strong group feel; aftercare, cart, and standalone visit page are weaker. |
| Functional flow completeness | 7/10 | Discover/configure/shop/cart/visit mostly work; AI needs key, checkout is frontend-only, weather is fallback-only. |
| Submission readiness | 7/10 | Demoable, but the critical MinIO boundary issue should be fixed before treating architecture as clean. |

## What Is Working

### Runtime Topology

The service graph is preserved in `docker-compose.yml`:

- `web-frontend` exposes `4100`.
- `web-backend` renders EJS and receives frontend traffic.
- `api-gateway` routes `/api/*`.
- Domain services are separate containers.
- MySQL, Redis, and MinIO remain separate infrastructure components.

Evidence:

- `docker-compose.yml:24` defines `web-frontend`.
- `docker-compose.yml:44` defines `web-backend`.
- `docker-compose.yml:59` defines `package-configurator`.
- `docker-compose.yml:77` defines `aftercare-shop`.
- `docker-compose.yml:95` defines `shopping-cart`.
- `docker-compose.yml:107` defines `ai-feature`.
- `docker-compose.yml:123` defines `visit-context-service`.
- `docker-compose.yml:232` defines MinIO.

The application chain is real:

- `services/web-frontend/src/server.js:178` proxies dynamic requests to `web-backend`.
- `services/web-backend/src/server.js:180` forwards `/api/*` to `api-gateway`.
- `api-gateway/src/server.js:106` onward routes to configurator, aftercare, visit context, cart, and AI.

### Service Ownership

No direct MySQL access was found in `web-backend`, `api-gateway`, or `ai-feature`.

Data access is mostly owned correctly:

- `services/package-configurator/src/server.js:16` creates the configurator MySQL pool.
- `services/aftercare-shop/src/server.js:14` creates the aftercare MySQL pool.
- `services/visit-context-service/src/db.js:7` creates the visit-context MySQL pool.
- `services/shopping-cart/src/cartRoutes.js:9` reads Redis cart state.

### Smoke-Testable Flow

`.\scripts\smoke-test.ps1 -SkipAi` passed against `http://localhost:4100`:

```text
OK home page
OK visit context locations
OK visit context weather
OK configurator packages
OK configurator calculate
OK aftercare products
OK aftercare product detail
OK fresh-session cart persistence
SKIP AI recommendation
Smoke test passed
```

API spot checks returned real data:

- `/api/configurator/packages` returned Wellness packages.
- `/api/aftercare/products` returned aftercare products.
- `/api/visit-context/visit-summary` returned location plus fallback weather.
- `/api/ai/recommend` returned expected `503` while `GEMINI_API_KEY` is still placeholder.

## Critical Findings

### C1. MinIO Asset Ownership Is Not Enforced

The current package and aftercare asset normalizers only block empty path segments and traversal. They do not restrict object keys to the owning service prefix.

Evidence:

- `services/package-configurator/src/asset-paths.js:1` normalizes any legal object key.
- `services/aftercare-shop/src/asset-paths.js:1` does the same.
- `services/package-configurator/src/server.js:225` streams any normalized MinIO object key.
- `services/aftercare-shop/src/server.js:79` streams any normalized MinIO object key.

The group project did enforce prefixes:

- `D:\CodeSpace\dbe-cloud-groupproject\services\car-configurator\src\asset-paths.js:7` requires `configurator/`.
- `D:\CodeSpace\dbe-cloud-groupproject\services\merch-shop\src\asset-paths.js:7` requires `merch-shop/`.

I verified the issue against the running stack:

| Request | Result |
|---|---:|
| `/api/configurator/assets/aftercare-shop/heated-neck-wrap.png` | 200 `image/png` |
| `/api/aftercare/assets/package-configurator/neck-shoulder-relief.png` | 200 `image/png` |
| `/api/configurator/assets/home/home-video.mp4` | 200 `video/mp4` |

Impact:

MinIO itself is not exposed directly to the browser, but the API asset routes become cross-prefix bucket proxies. That breaks the documented boundary: business media should stay behind the owning service API.

Recommended fix:

- Add `normalizePackageAssetKey()` requiring `package-configurator/`.
- Add `normalizeAftercareAssetKey()` requiring `aftercare-shop/`.
- Reject `home/`, `center/`, and the other service's prefix.
- Add API gateway and service tests for both allowed paths and cross-prefix rejection.

## Important Findings

### I1. Configurator Missing `GET /configurations` And Valid-Combination Model

The service-boundary doc still declares:

- `docs/func-design/wellness-center-service-boundaries.md:41` includes `GET /configurations`.

The solo SQL drops `configurations` but does not recreate it:

- `infrastructure/mysql/init/02_package_configurator.sql:6` drops `configuration_addons`.
- `infrastructure/mysql/init/02_package_configurator.sql:8` drops `configurations`.
- The file then creates only `packages`, `durations`, `intensities`, and `add_ons`.

The solo service exposes packages/options/calculate/assets, but no `/configurations` endpoint:

- `services/package-configurator/src/server.js:112` exposes `/packages`.
- `services/package-configurator/src/server.js:120` exposes durations.
- `services/package-configurator/src/server.js:128` exposes intensities.
- `services/package-configurator/src/server.js:136` exposes add-ons.
- `services/package-configurator/src/server.js:144` calculates a configuration.

Impact:

The current configurator allows any package x duration x intensity x add-on combination as long as each independent option exists. That is simpler than the group project's valid-combination truth table and weakens architecture parity.

Recommended fix:

- Reintroduce an explicit valid-combination table or an equivalent `package_configurations` model.
- Implement `GET /configurations`.
- Let AI context and frontend configuration use this endpoint for valid recommendation choices.
- Keep `/configuration/calculate`, but calculate only from valid combinations.

### I2. Weather API Is Configured But Not Implemented

`GOOGLE_WEATHER_API_KEY` exists in config:

- `.env.example:36`
- `docker-compose.yml:134`

But the service always uses fallback rows:

- `services/visit-context-service/src/server.js:56` handles `/weather/current`.
- `services/visit-context-service/src/server.js:59` calls `loadFallbackWeather()`.
- `services/visit-context-service/src/visitContext.js:18` returns `provider: "fallback"`.

Runtime check confirmed:

```json
{
  "provider": "fallback",
  "condition": "mild",
  "temperatureC": 19,
  "summary": "Mild weather is suitable for a calm visit..."
}
```

Impact:

For a course demo this is acceptable if fallback is explicitly documented. It is not a real Google Weather integration yet.

Recommended fix:

- Use Google Weather API when `GOOGLE_WEATHER_API_KEY` is set and not `replace_me`.
- Keep MySQL fallback when the external call fails or no key is configured.
- Return `provider: "google"` or `provider: "fallback"` so the demo can prove which path ran.

### I3. `.env` Migration From Group Project Needs Mapping

The user note says API keys can come from the group project. That is true for API keys, not for the whole `.env` file.

Only in group `.env.example`:

- `DBE_CLOUDDEV_MERCH*`
- `DBE_CLOUDDEV_ROUTE*`

Only in solo `.env.example`:

- `DBE_CLOUDDEV_AFTERCARE*`
- `DBE_CLOUDDEV_VISIT_CONTEXT*`
- `GOOGLE_WEATHER_API_KEY`

Recommended migration:

- Copy same-name values: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GOOGLE_MAPS_API_KEY`.
- Map group `DBE_CLOUDDEV_MERCH*` values to solo `DBE_CLOUDDEV_AFTERCARE*`.
- Map group `DBE_CLOUDDEV_ROUTE*` values to solo `DBE_CLOUDDEV_VISIT_CONTEXT*`.
- Keep `MINIO_BUCKET=wellness-media` for solo unless compose and seeds are changed together.
- Do not commit `.env`.

### I4. AI Flow Is Structurally Correct But Not Fully Validated

Good:

- `services/ai-feature/src/server.js:33` fetches packages, durations, intensities, add-ons, and products.
- `services/ai-feature/src/server.js:57` uses `@google/genai`.
- `services/ai-feature/src/server.js:68` tries configured model and fallback model.
- `services/ai-feature/src/recommendation.js:100` returns frontend-compatible `text`, `packageLink`, `packageRecommendation`, and `aftercareLinks`.
- `web/views/ai-feature.ejs:597` posts to `/api/ai/recommend`.

Gaps:

- Context fetches do not check `response.ok` before parsing JSON.
- Gemini output is shape-validated but not validated against current package/product IDs after coercion.
- AI cannot be smoke-tested in the current solo `.env` because `GEMINI_API_KEY` is still placeholder.

Runtime check:

```text
POST /api/ai/recommend -> 503 {"error":"GEMINI_API_KEY not configured"}
```

Recommended fix:

- Add explicit `response.ok` checks for all context fetches.
- Validate recommended package slug, duration, intensity, add-ons, and product IDs against fetched context before returning links.
- After migrating the group key, run `.\scripts\smoke-test.ps1` without `-SkipAi` and `npm run smoke:ai --prefix services/ai-feature`.

### I5. Cart UI Still Contains Old/Mixed Semantics

The cart service itself is functional:

- `api-gateway/src/server.js:153` proxies cart reads.
- `api-gateway/src/server.js:156` proxies cart item creation.
- `api-gateway/src/server.js:163` proxies quantity update.
- `api-gateway/src/server.js:170` and `:173` proxy clear/remove.
- `services/shopping-cart/src/cartRoutes.js:53` restricts item type to `package` or `aftercare`.

But `web/views/shopping-cart.ejs` still shows mixed German/ecommerce copy and old class naming:

- `shopping-cart.ejs:67` uses `.item--car`.
- `shopping-cart.ejs:242` says `Ihre Auswahl.`
- `shopping-cart.ejs:244` says `Cart leeren`.
- `shopping-cart.ejs:262` uses checkout steps in German.
- `shopping-cart.ejs:402` assigns `item--car` or `item--merch`.
- `shopping-cart.ejs:649` checkout only clears the cart with `DELETE /api/cart`.

Impact:

Cart CRUD is usable, but it looks like a partially rethemed leftover. Checkout is a frontend-only demo, not an order service.

Recommended fix:

- Change copy to English Wellness Center language.
- Rename `item--car` and `item--merch` to `item--package` and `item--aftercare`.
- Decide whether checkout is out of scope. If out of scope, label it as a demo review/confirmation. If in scope, add a minimal order service or order endpoint.

### I6. Visit Context Experience Is Split

The richer map route experience is embedded on the home page:

- `web/views/home.ejs:1171` starts the Google Maps branch.
- `web/views/home.ejs:1356` fetches `/api/visit-context/locations`.
- `web/views/home.ejs:1555` loads Google Maps JS.

The standalone `/visit-context` page is much simpler:

- `web/views/visit-context.ejs:7` contains only `#visit-summary` and `#map`.
- `web/public/app.js:239` fills the standalone visit page.

Impact:

The nav link takes users to a weaker experience than the home page's rich map section. That makes the map feature feel fragmented.

Recommended fix:

- Move the rich home map component into `/visit-context`.
- Keep home as a teaser that links to `/visit-context`.
- Or make the nav link point to `/#route-planner` if the home map is intended to be canonical.

### I7. Aftercare UI Works But Is Visually Weaker Than Group Shop

Aftercare is functional:

- `services/web-backend/src/server.js:217` SSR-fetches products.
- `services/web-backend/src/server.js:231` SSR-fetches product detail.
- `web/views/aftercare-shop.ejs:96` adds products to cart.
- `web/views/aftercare-product.ejs:86` adds detail products to cart.

But the group shop used a stronger full-image card with overlay and hover reveal. The solo aftercare shop is a simpler product-card grid:

- `web/views/aftercare-shop.ejs:13` defines ordinary product cards.

Impact:

Business function improved, because list cards can add to cart directly. Visual parity with the group project is lower.

Recommended fix:

- Reuse the group shop card motion/overlay style.
- Keep the solo quantity selector and add-to-cart behavior.

### I8. Dead Or Divergent Frontend Assets Add Confusion

The layout loads:

- `web/views/layouts/main.ejs:7` -> `/static/ci/wellness-ci.css`
- `web/views/layouts/main.ejs:59` -> `/static/app.js`

But `web/public/app.js` expects old/simple DOM IDs:

- `web/public/app.js:52` expects `#configurator-form`, which current configurator no longer has.
- `web/public/app.js:138` expects `#ai-form`, which current AI page no longer has.
- `web/public/app.js:168` expects `#cart-items`, which current cart page no longer has.

Most current pages use inline scripts instead, so the dead global script mostly returns early. It still contains visit-context behavior and can be confusing.

`web/public/styles.css` is also not loaded by the layout but still contains scaffold page styles.

Recommended fix:

- Split runtime JS by page or remove dead handlers from `app.js`.
- Keep only shared helpers in global JS.
- Move needed visit-context CSS into the active design system.

## Nice-To-Have Findings

### N1. Domain Services Should Fail Fast On Missing Env

Solo services default DB credentials to placeholder strings:

- `services/package-configurator/src/server.js:17`
- `services/aftercare-shop/src/server.js:15`
- `services/visit-context-service/src/db.js:8`

This works for scaffold demos, but missing env becomes a later DB authentication error. The group project used stricter required env handling in some services.

Recommendation:

- Add a small `requiredEnv(name)` helper for DB host/user/password.
- Keep local defaults only where genuinely intended.

### N2. Smoke Tests Should Cover Media Boundaries

The smoke test covers business data and cart persistence, but not business asset routes.

Recommendation:

- Add positive checks for:
  - `/api/configurator/assets/package-configurator/neck-shoulder-relief.png`
  - `/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png`
- Add negative checks for cross-prefix access:
  - `/api/configurator/assets/aftercare-shop/heated-neck-wrap.png`
  - `/api/aftercare/assets/package-configurator/neck-shoulder-relief.png`
  - `/api/configurator/assets/home/home-video.mp4`

### N3. Test Coverage Gaps

Current tests pass after local dependencies are installed, but coverage is uneven:

- `services/visit-context-service/test/visit-context.test.js` only tests fallback builder.
- `api-gateway/test/visit-context-proxy.test.js` only checks health.
- `services/shopping-cart/test/cart-validation.test.js` only covers create validation, not update/remove/clear.

Recommendation:

- Add gateway proxy tests for visit-context locations/weather/summary.
- Add cart update/remove/clear tests.
- Add Weather provider fallback tests once Google Weather integration is added.

## Verification Performed

Commands and results:

```powershell
docker compose ps
```

Result: all app services, MySQL services, Redis, and MinIO were running; MinIO and MySQL containers were healthy.

```powershell
Invoke-WebRequest http://localhost:4100/health
```

Result: `200 {"ok":true,"service":"web-frontend"}`.

```powershell
.\scripts\smoke-test.ps1 -SkipAi
```

Result: passed.

```powershell
npm test --prefix api-gateway
npm test --prefix services/web-frontend
npm test --prefix services/web-backend
npm test --prefix services/package-configurator
npm test --prefix services/aftercare-shop
npm test --prefix services/visit-context-service
npm test --prefix services/ai-feature
npm test --prefix services/shopping-cart
```

Result:

- All passed after installing local `shopping-cart` dependencies with `npm ci --prefix services/shopping-cart`.
- An initial parallel `api-gateway` run produced one transient `502` test failure, but a direct rerun passed all 8 tests.
- `git status --short` still only showed the pre-existing untracked `docs/exchange/session-archives/` directory before this report was added.

Browser checks:

- `/`, `/package-configurator`, `/aftercare-shop`, `/ai-feature`, `/visit-context`, and `/shopping-cart` all rendered at `localhost:4100`.
- No visible BMW strings were found in those rendered pages.
- Cart page still rendered German copy.
- Visit page rendered fallback map text because `GOOGLE_MAPS_API_KEY` is placeholder in solo `.env`.

## Recommended Next Steps

### P0 Before Submission

1. Fix MinIO owning-service prefix enforcement and add tests.
2. Restore or replace the configurator valid-combination model and add `GET /configurations`.
3. Migrate only API key values from the group `.env`, not the whole file.
4. Run no-AI smoke test and service tests again.

### P1 Improve Feature Completeness

1. Add Google Weather integration with fallback provider reporting.
2. Validate AI recommendation values against live context before returning links.
3. Move the rich map route planner into `/visit-context` or make the nav link target the rich home section.
4. Clean cart language and old `car/merch` naming.

### P2 Improve UI/UX Parity

1. Reuse group shop overlay/hover card style for aftercare.
2. Replace home placeholder/scaffold media section with real Wellness content.
3. Remove or split dead global `app.js` handlers and unused `styles.css`.
4. Decide whether checkout is out of scope or backed by a minimal order API.

## Bottom Line

The project is already demoable and architecture-shaped in the way the course likely wants. It should not be collapsed or rewritten. The next work should be targeted hardening:

- close the asset boundary leak,
- restore valid configuration truth,
- make env migration explicit,
- and clean the visible old-theme leftovers.

Those changes would move the project from "working retheme with architecture scaffold" to "defensible solo project that clearly preserves the group architecture under a Wellness domain."
