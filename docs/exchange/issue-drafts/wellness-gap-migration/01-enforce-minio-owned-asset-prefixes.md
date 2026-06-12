# Enforce MinIO owned asset prefixes

## What to build

Prevent package and aftercare asset routes from acting as cross-prefix MinIO proxies. Package media may only be served through the package configurator asset route when the object key starts with `package-configurator/`; aftercare media may only be served through the aftercare route when the key starts with `aftercare-shop/`.

## Acceptance criteria

- [ ] Owned package assets still stream through `/api/configurator/assets/package-configurator/*`.
- [ ] Owned aftercare assets still stream through `/api/aftercare/assets/aftercare-shop/*`.
- [ ] Cross-prefix requests are rejected before the wrong owning service reads from MinIO.
- [ ] Homepage `home/*.mp4` remains accessible only through the existing homepage media exception, not through configurator or aftercare asset APIs.
- [ ] Smoke tests include positive owned-media checks and negative cross-prefix checks.

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

