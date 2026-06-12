# Restore valid package configurations

## What to build

Reintroduce an explicit valid-combination truth model for package configuration and expose it through the package configurator service and gateway. Calculation must only succeed for enabled package, duration, intensity, and add-on combinations.

## Acceptance criteria

- [ ] The configurator seed SQL creates and seeds valid configuration rows.
- [ ] `GET /configurations` returns enabled combinations with package, duration, intensity, and allowed add-on metadata.
- [ ] `GET /api/configurator/configurations` proxies the same data through the gateway.
- [ ] `POST /configuration/calculate` rejects invalid combinations even when every individual option exists.
- [ ] Existing valid smoke-test package calculation still succeeds.

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
