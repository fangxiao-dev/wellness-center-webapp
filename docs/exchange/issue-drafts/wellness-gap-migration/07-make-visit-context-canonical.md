# Make visit context the canonical rich map route

## What to build

Move or reuse the richer home map/arrival experience so `/visit-context` becomes the canonical route for location, map, weather, and arrival preparation. Home should become a teaser that links to the canonical visit route.

## Acceptance criteria

- [x] `/visit-context` renders location, address, opening note, arrival tip, weather summary, and map/fallback shell.
- [x] The route fetches `/api/visit-context/visit-summary` through the existing gateway chain.
- [x] Google Maps JavaScript loads only when `SERENITY_MAPS_KEY` is configured.
- [x] Missing maps key produces a useful text fallback with address and arrival information.
- [x] Home links to `/visit-context` and does not remain the only rich map experience.

## Blocked by

None - can start immediately.

## Ownership Boundary / Out Of Scope

Owns EJS/browser rendering for visit context. It should render the weather object it receives, with or without a provider field, so it can proceed before Weather provider hardening. Does not change location data ownership, add directions APIs, or expose center media through a new route.

## Verification

```powershell
npm test --prefix services/web-backend
.\scripts\smoke-test.ps1 -SkipAi
```

## Completion note

- Files changed: `.env.example`, `docker-compose.yml`, `services/web-backend/src/server.js`, `services/web-backend/test/backend-routing.test.js`, `services/web-backend/test/browser-interactions.test.js`, `web/public/app.js`, `web/views/home.ejs`, `web/views/visit-context.ejs`.
- Test results: `npm test --prefix services/web-backend` passed; `docker compose config --quiet` passed; `.\scripts\smoke-test.ps1 -SkipAi` passed after rebuilding the running `dbe-cloud-soloproject` compose project from this worktree.
- Remaining risks: Existing deployments must provide `SERENITY_MAPS_KEY` for browser maps. The local solo project and this worktree `.env` were updated from the group project's `GOOGLE_MAPS_API_KEY`; `.env` remains ignored and uncommitted.
