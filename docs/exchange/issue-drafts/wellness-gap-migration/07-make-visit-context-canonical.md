# Make visit context the canonical rich map route

## What to build

Move or reuse the richer home map/arrival experience so `/visit-context` becomes the canonical route for location, map, weather, and arrival preparation. Home should become a teaser that links to the canonical visit route.

## Acceptance criteria

- [ ] `/visit-context` renders location, address, opening note, arrival tip, weather summary, and map/fallback shell.
- [ ] The route fetches `/api/visit-context/visit-summary` through the existing gateway chain.
- [ ] Google Maps JavaScript loads only when `SERENITY_MAPS_KEY` is configured.
- [ ] Missing maps key produces a useful text fallback with address and arrival information.
- [ ] Home links to `/visit-context` and does not remain the only rich map experience.

## Blocked by

None - can start immediately.

## Ownership Boundary / Out Of Scope

Owns EJS/browser rendering for visit context. It should render the weather object it receives, with or without a provider field, so it can proceed before Weather provider hardening. Does not change location data ownership, add directions APIs, or expose center media through a new route.

## Verification

```powershell
npm test --prefix services/web-backend
.\scripts\smoke-test.ps1 -SkipAi
```
