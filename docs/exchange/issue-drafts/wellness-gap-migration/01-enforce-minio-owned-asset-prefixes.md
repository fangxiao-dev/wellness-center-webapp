# Enforce MinIO owned asset prefixes

## What to build

Prevent package and aftercare asset routes from acting as cross-prefix MinIO proxies. Package media may only be served through the package configurator asset route when the object key starts with `package-configurator/`; aftercare media may only be served through the aftercare route when the key starts with `aftercare-shop/`.

## Acceptance criteria

- [x] Owned package assets still stream through `/api/configurator/assets/package-configurator/*`.
- [x] Owned aftercare assets still stream through `/api/aftercare/assets/aftercare-shop/*`.
- [x] Cross-prefix requests are rejected before the wrong owning service reads from MinIO.
- [x] Homepage `home/*.mp4` remains accessible only through the existing homepage media exception, not through configurator or aftercare asset APIs.
- [x] Smoke tests include positive owned-media checks and negative cross-prefix checks.

## Blocked by

None - can start immediately.

## Ownership Boundary / Out Of Scope

Owns the asset key normalization and public media boundary for package and aftercare business assets. Does not redesign MinIO seeding, add center media exposure, or change the homepage-only `/media/home/*.mp4` behavior.

## Verification

```powershell
npm test --prefix services/package-configurator
npm test --prefix services/aftercare-shop
npm test --prefix api-gateway
.\scripts\smoke-test.ps1 -SkipAi
```

## Completion note - 2026-06-12

Files changed:
- `services/package-configurator/src/asset-paths.js`
- `services/package-configurator/src/server.js`
- `services/package-configurator/test/package-configurator.test.js`
- `services/aftercare-shop/src/asset-paths.js`
- `services/aftercare-shop/src/server.js`
- `services/aftercare-shop/test/product-images.test.js`
- `api-gateway/src/server.js`
- `api-gateway/test/asset-proxy.test.js`
- `scripts/smoke-test.ps1`
- `docs/exchange/issue-drafts/wellness-gap-migration/01-enforce-minio-owned-asset-prefixes.md`

Test results:
- PASS: `npm test --prefix services/package-configurator`
- PASS: `npm test --prefix services/aftercare-shop`
- PASS: `npm test --prefix api-gateway`
- PASS: `.\scripts\smoke-test.ps1 -SkipAi` after rebuilding the running `dbe-cloud-soloproject` compose project from this worktree with `docker compose -p dbe-cloud-soloproject up -d --build`.

Remaining risks:
- Live AI/weather gates are outside this issue and remain covered by later Wave 1/Final verification.
- `.env` remains ignored and uncommitted.
