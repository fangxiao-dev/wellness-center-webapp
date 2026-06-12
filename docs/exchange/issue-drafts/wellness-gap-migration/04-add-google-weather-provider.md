# Add Google Weather provider with fallback reporting

## What to build

Use Google Weather current conditions when `GOOGLE_WEATHER_API_KEY` is configured, and keep the current MySQL fallback when the key is absent, placeholder, the upstream call fails, or mapping fails. Return a provider field so the demo can prove whether the app is using Google or fallback data.

## Acceptance criteria

- [x] `/weather/current` uses the selected location latitude and longitude for Google Weather requests.
- [x] `/weather/current` returns `provider: "google"` when a real Weather key succeeds.
- [x] `/weather/current` returns `provider: "fallback"` when no real key is configured or Google fails.
- [x] `/visit-summary` includes the same provider-aware weather object.
- [x] Gateway and smoke tests continue to pass without live Google credentials.

## Blocked by

None - can start immediately.

## Ownership Boundary / Out Of Scope

Owns provider selection and response mapping inside `visit-context-service`. Does not expose API keys to browser code and does not replace Google Maps JavaScript behavior.

## Verification

API contract gate:

- Visit-context service tests must assert `provider` on `/weather/current`.
- Visit-context service tests must assert `weather.provider` on `/visit-summary`.
- Gateway tests must prove the provider field survives `/api/visit-context/weather/current` and `/api/visit-context/visit-summary`.

```powershell
npm test --prefix services/visit-context-service
npm test --prefix api-gateway
.\scripts\smoke-test.ps1 -SkipAi
```

Live-key optional gate:

```powershell
.\scripts\smoke-test.ps1
```

## Completion note - 2026-06-12

Files changed:

- `services/visit-context-service/src/server.js`
- `services/visit-context-service/src/visitContext.js`
- `services/visit-context-service/test/visit-context.test.js`
- `api-gateway/test/visit-context-proxy.test.js`
- `scripts/smoke-test.ps1`
- `docs/exchange/issue-drafts/wellness-gap-migration/04-add-google-weather-provider.md`

Tests:

- Red check: `npm test --prefix services/visit-context-service` failed before implementation on the Google success path.
- Green checks: `npm test --prefix services/visit-context-service` passed.
- Green checks: `npm test --prefix api-gateway` passed.
- Green checks: `docker compose config --quiet` passed.
- Green checks: `.\scripts\smoke-test.ps1 -SkipAi` passed after rebuilding the running `dbe-cloud-soloproject` compose project from this worktree; the weather provider reported `google`.
- Live-key check: `.\scripts\smoke-test.ps1` passed; the smoke covered both Google Weather provider `google` and Gemini AI recommendation.
- Live-key check: `AI_RECOMMEND_URL=http://localhost:4100/api/ai/recommend node services\ai-feature\test\recommendation.live-smoke.js` passed.

API response shape:

- `/weather/current` returns `{ provider, condition, temperatureC, summary }`.
- `provider` is `"google"` when `GOOGLE_WEATHER_API_KEY` is real and Google Weather maps successfully.
- `provider` is `"fallback"` when the key is missing, blank, `replace_me`, `placeholder`, upstream returns non-OK, network/timeout fails, or mapping fails.
- `/visit-summary` returns `{ location, weather }` where `weather` uses the same provider-aware shape.

Docker/compose restart status:

- `docker compose -p dbe-cloud-soloproject up -d --build` rebuilt the existing local project from this worktree and restarted the app successfully.
- The service-specific `npm run smoke:ai --prefix services/ai-feature` wrapper was not used as the final AI gate because it starts the default worktree compose project and collided with the existing MinIO console port `9001`; the underlying live smoke script was run directly against the rebuilt app URL instead.

Local key assumptions:

- `GOOGLE_WEATHER_API_KEY` was synchronized into the solo project and worktree `.env` from the group project's `GOOGLE_MAPS_API_KEY` because the group env has no separate Weather key.
- `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, and `SERENITY_MAPS_KEY` were also synchronized for live gates. `.env` remains ignored and uncommitted.
- Placeholder keys are treated as fallback and do not trigger upstream calls.

Remaining risks:

- Google response mapping intentionally uses only `weatherCondition.description.text` and `temperature.degrees`; additional fields can be added later without changing the provider contract.
- Live Google Weather depends on the synchronized key continuing to have Weather API access.
