# Restore valid package configurations

## What to build

Reintroduce an explicit valid-combination truth model for package configuration and expose it through the package configurator service and gateway. Calculation must only succeed for enabled package, duration, intensity, and add-on combinations.

## Acceptance criteria

- [x] The configurator seed SQL creates and seeds valid configuration rows.
- [x] `GET /configurations` returns enabled combinations with package, duration, intensity, and allowed add-on metadata.
- [x] `GET /api/configurator/configurations` proxies the same data through the gateway.
- [x] `POST /configuration/calculate` rejects invalid combinations even when every individual option exists.
- [x] Existing valid smoke-test package calculation still succeeds.

## Blocked by

None - can start immediately.

## Ownership Boundary / Out Of Scope

Owns package configuration truth inside `package-configurator` and its gateway proxy. Does not change cart storage, AI prompt logic, or visual configurator UX beyond preserving the existing response shape.

## Verification

Schema/API contract gate:

- Service tests must prove seeded valid combinations are mapped into `GET /configurations`.
- Gateway tests or smoke checks must prove `GET /api/configurator/configurations` is exposed.
- Service tests must prove invalid package, duration, intensity, and add-on combinations are rejected by `POST /configuration/calculate`.

```powershell
npm test --prefix services/package-configurator
npm test --prefix api-gateway
docker compose config --quiet
.\scripts\smoke-test.ps1 -SkipAi
```

## Completion note

Status: implemented and verified.

Files changed:

- `infrastructure/mysql/init/02_package_configurator.sql`
- `services/package-configurator/src/server.js`
- `services/package-configurator/test/package-configurator.test.js`
- `api-gateway/src/server.js`
- `api-gateway/test/asset-proxy.test.js`
- `docs/exchange/issue-drafts/wellness-gap-migration/02-restore-valid-package-configurations.md`

Test results:

- `npm test --prefix services/package-configurator` passed.
- `npm test --prefix api-gateway` passed.
- `docker compose config --quiet` passed.
- `.\scripts\smoke-test.ps1 -SkipAi` passed after rebuilding the running `dbe-cloud-soloproject` compose project from this worktree with `docker compose -p dbe-cloud-soloproject up -d --build`.

Changed API response shape:

- Added `GET /configurations` and gateway proxy `GET /api/configurator/configurations`.
- Response is an array of enabled combinations:
  `{ id, package, duration, intensity, addOns }`.
- `package` includes `id`, `slug`, `name`, `goal`, `description`, `basePrice`, `baseMinutes`, and `imageUrl`.
- `duration` includes `id`, `minutes`, `label`, and `priceDelta`.
- `intensity` includes `id`, `slug`, `label`, `description`, and `priceDelta`.
- `addOns` contains allowed add-on metadata with `id`, `slug`, `name`, `description`, `priceDelta`, and `imageUrl`.

Docker Compose restart status:

- `docker compose -p dbe-cloud-soloproject up -d --build` rebuilt the existing local project from this worktree.
- Configurator seed container reran and exited successfully, applying the new valid-configuration tables and seed rows to the existing MySQL volume.

Remaining risks:

- Issue 03/05 still need to consume and validate the new configurations in UI/AI context.
- `.env` remains ignored and uncommitted.
