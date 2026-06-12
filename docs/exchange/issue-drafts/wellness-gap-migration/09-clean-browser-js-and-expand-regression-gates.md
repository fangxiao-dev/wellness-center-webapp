# Clean browser JS and expand regression gates

## What to build

Remove or split stale global browser handlers and expand final regression coverage for the architecture boundaries fixed by the migration. Update docs so the final project status matches the implementation.

## Acceptance criteria

- [ ] Active browser sources no longer contain handlers for removed DOM contracts unless the corresponding page still renders those elements.
- [ ] Runtime sources do not contain old cart or group-theme leaks outside historical docs.
- [ ] Smoke test covers configurations, media boundaries, cart CRUD, visit context, and weather provider field.
- [ ] Gateway tests cover visit-context locations/weather/summary proxies.
- [ ] README and project status document MinIO ownership, configurations, Weather fallback/provider behavior, demo checkout scope, and exact local API key migration.
- [ ] API key migration docs state: copy same-name `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GOOGLE_MAPS_API_KEY`, and `GOOGLE_WEATHER_API_KEY`; map `DBE_CLOUDDEV_MERCH*` to `DBE_CLOUDDEV_AFTERCARE*`; map `DBE_CLOUDDEV_ROUTE*` to `DBE_CLOUDDEV_VISIT_CONTEXT*`; keep `MINIO_BUCKET=wellness-media`; do not commit `.env`.
- [ ] `web/public/styles.css` is either removed if unused, or needed styles are moved into the active design system and the remaining file is documented as intentionally used.
- [ ] N1 fail-fast env defaults are closed explicitly: either DB-backed domain services use a small `requiredEnv` helper for required DB variables, or `docs/project-status.md` records why scaffold defaults remain intentional for the course demo.
- [ ] Full service test suite and no-AI smoke test pass.

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
