# Add Google Weather provider with fallback reporting

## What to build

Use Google Weather current conditions when `GOOGLE_WEATHER_API_KEY` is configured, and keep the current MySQL fallback when the key is absent, placeholder, the upstream call fails, or mapping fails. Return a provider field so the demo can prove whether the app is using Google or fallback data.

## Acceptance criteria

- [ ] `/weather/current` uses the selected location latitude and longitude for Google Weather requests.
- [ ] `/weather/current` returns `provider: "google"` when a real Weather key succeeds.
- [ ] `/weather/current` returns `provider: "fallback"` when no real key is configured or Google fails.
- [ ] `/visit-summary` includes the same provider-aware weather object.
- [ ] Gateway and smoke tests continue to pass without live Google credentials.

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
