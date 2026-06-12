# Clean browser JS and expand regression gates

## What to build

Remove or split stale global browser handlers and expand final regression coverage for the architecture boundaries fixed by the migration. Update docs so the final project status matches the implementation.

## Acceptance criteria

- [x] Active browser sources no longer contain handlers for removed DOM contracts unless the corresponding page still renders those elements.
- [x] Runtime sources do not contain old cart or group-theme leaks outside historical docs.
- [x] Smoke test covers configurations, media boundaries, cart CRUD, visit context, and weather provider field.
- [x] Gateway tests cover visit-context locations/weather/summary proxies.
- [x] README and project status document MinIO ownership, configurations, Weather fallback/provider behavior, demo checkout scope, and exact local API key migration.
- [x] API key migration docs state: copy same-name `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GOOGLE_MAPS_API_KEY`, and `GOOGLE_WEATHER_API_KEY`; map `DBE_CLOUDDEV_MERCH*` to `DBE_CLOUDDEV_AFTERCARE*`; map `DBE_CLOUDDEV_ROUTE*` to `DBE_CLOUDDEV_VISIT_CONTEXT*`; keep `MINIO_BUCKET=wellness-media`; do not commit `.env`.
- [x] `web/public/styles.css` is either removed if unused, or needed styles are moved into the active design system and the remaining file is documented as intentionally used.
- [x] N1 fail-fast env defaults are closed explicitly: either DB-backed domain services use a small `requiredEnv` helper for required DB variables, or `docs/project-status.md` records why scaffold defaults remain intentional for the course demo.
- [x] Full service test suite and no-AI smoke test pass.

## Blocked by

- Enforce MinIO owned asset prefixes.
- Restore valid package configurations.
- Consume valid configurations in UI and AI context.
- Add Google Weather provider with fallback reporting.
- Harden AI recommendation context and output validation.
- Retheme cart review and demo checkout.
- Make visit context the canonical rich map route.
- Improve aftercare shop visual parity.

## Ownership Boundary / Out Of Scope

Owns cleanup, docs, and final regression gates. Does not introduce new product scope beyond documenting existing decisions and verifying the migrated architecture.

## Verification

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

Live-key optional gate:

```powershell
.\scripts\smoke-test.ps1
npm run smoke:ai --prefix services/ai-feature
```

## Completion note

Completed on 2026-06-12 in worktree `D:\CodeSpace\dbe-cloud-soloproject\.worktrees\wellness-gap-migration-wave1`.

Changed files:

- `web/public/app.js`
- `web/views/home.ejs`
- `web/views/ai-feature.ejs`
- `web/views/layouts/main.ejs`
- `web/public/ci/wellness-ci.css`
- `web/public/images/home-video.mp4`
- `web/public/styles.css` deleted
- `scripts/smoke-test.ps1`
- `api-gateway/test/visit-context-proxy.test.js`
- `services/web-backend/src/server.js`
- `services/web-backend/test/backend-routing.test.js`
- `services/web-backend/test/browser-interactions.test.js`
- `services/web-frontend/test/frontend-proxy.test.js`
- `README.md`
- `docs/project-status.md`
- `.env.example`
- `docker-compose.yml`

Behavior completed:

- Removed stale global browser handlers from `web/public/app.js`; the remaining shared script only owns visit-context behavior and is wrapped in an IIFE so page-local inline scripts cannot collide with helper names.
- Renamed active runtime/page naming from stale shop `merch` language to aftercare naming.
- Removed unused `web/public/styles.css`; active static CSS is `web/public/ci/wellness-ci.css`.
- Replaced the homepage MP4 asset so runtime media no longer carries old group identity strings.
- Expanded smoke coverage for configurations, service-owned media, homepage media exception, business asset prefix boundaries, cart create/update/delete/clear, visit context, and weather provider reporting.
- Added gateway visit-context proxy coverage.
- Documented MinIO ownership, configurations, Weather fallback/provider behavior, demo checkout scope, exact local key migration, and intentional scaffold defaults for the course demo.
- Fixed maps key migration so `replace_me` placeholders are ignored before choosing between `SERENITY_MAPS_KEY` and same-name `GOOGLE_MAPS_API_KEY`.

Verification:

- `npm test --prefix api-gateway`: 15/15 passed.
- `npm test --prefix services/web-frontend`: 8/8 passed.
- `npm test --prefix services/web-backend`: 32/32 passed.
- `npm test --prefix services/package-configurator`: 11/11 passed.
- `npm test --prefix services/aftercare-shop`: 5/5 passed.
- `npm test --prefix services/visit-context-service`: 7/7 passed.
- `npm test --prefix services/ai-feature`: recommendation smoke test passed.
- `npm test --prefix services/shopping-cart`: 3/3 passed.
- `docker compose config --quiet`: passed.
- `docker compose -p dbe-cloud-soloproject up -d --build web-backend web-frontend`: passed after final browser/runtime fixes.
- `.\scripts\smoke-test.ps1 -SkipAi`: passed on `http://localhost:4100`.
- Browser sanity via in-app Browser: `/package-configurator` and `/ai-feature` loaded, AI page had aftercare copy and no stale `merch` copy, console errors empty.
- `git diff --check`: exited 0 with only CRLF normalization warnings.

Reviewer result:

- Spec reviewer: passed.
- Code-quality reviewer: initially found maps-key placeholder precedence risk; fixed and re-reviewed as pass.

Residual risk:

- Optional live-key gate was not rerun for this final Issue 09 cleanup pass. Earlier Wave 1 live-key Weather/AI gates passed; final no-AI smoke remains the required gate for Issue 09.
